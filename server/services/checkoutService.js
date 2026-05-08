/**
 * checkoutService.js — Checkout Business Logic
 *
 * Owns the rules of placing an order:
 *   1. Re-verify every item exists in the catalogue (productRepository)
 *   2. Re-calculate the total server-side — never trust client prices
 *   3. Build the order record (orderId, cardLast4, timestamp)
 *   4. Delegate persistence to orderRepository — no SQL here
 *
 * WHY NO SQL IN THIS FILE?
 * Business rules (price integrity, PCI-DSS card masking, total
 * rounding) change independently from storage details (which table,
 * which columns, how transactions work). Keeping them in separate
 * files means a DB schema change never accidentally breaks pricing
 * logic, and vice versa.
 *
 * Used by: controllers/checkoutController.js
 */

'use strict';

const productRepository = require('../repositories/productRepository');
const orderRepository   = require('../repositories/orderRepository');


// -------------------------------------------------------------
// placeOrder({ items, email, cardNumber, userId })
// items      — array of { id, quantity } from the client
// email      — customer email for the receipt
// cardNumber — validated 16-digit string (only last 4 stored)
// userId     — integer from auth session, or null for guest
//
// Returns a summary object on success.
// Throws { field, error } on any failure so the controller can
// return a field-specific 400 response.
// -------------------------------------------------------------
async function placeOrder({ items, email, cardNumber, userId }) {

    // --- Step 1: Verify every item and re-price from DB ---
    // Client prices are NEVER trusted — a user could send price:0.01.
    var total         = 0;
    var verifiedItems = [];

    for (var i = 0; i < items.length; i++) {
        var item    = items[i];
        var product = await productRepository.findById(item.id);

        if (!product) {
            throw { field: 'items', error: 'Product ID ' + item.id + ' not found in catalogue' };
        }

        var lineTotal = product.price_current * item.quantity;
        total += lineTotal;

        verifiedItems.push({
            id:       product.id,
            name:     product.name,
            price:    product.price_current,   // authoritative price
            quantity: item.quantity,
            subtotal: parseFloat(lineTotal.toFixed(2))
        });
    }

    total = parseFloat(total.toFixed(2));

    // --- Step 2: Build the order record (business logic) ---
    var header = {
        order_id:   'ORD-' + Date.now(),
        user_id:    userId || null,            // null = guest checkout
        email:      email,
        card_last4: cardNumber.slice(-4),      // PCI-DSS: discard the rest
        total:      total,
        placed_at:  new Date().toISOString()
    };

    // --- Step 3: Persist via repository (no SQL here) ---
    try {
        await orderRepository.save(header, verifiedItems);
    } catch (dbErr) {
        console.error('[checkoutService] persistence error:', dbErr.message || dbErr);
        throw { field: 'save', error: 'Failed to save order. Please try again.' };
    }

    return {
        orderId:   header.order_id,
        email:     email,
        cardLast4: header.card_last4,
        items:     verifiedItems,
        total:     total,
        placedAt:  header.placed_at
    };
}


module.exports = { placeOrder };
