/**
 * checkoutService.js — Checkout Business Logic
 *
 * Owns the rules of placing an order:
 *   1. Re-verify every item exists in the catalogue (Product Service HTTP call)
 *   2. Re-calculate the total server-side — never trust client prices
 *   3. Build the order record (orderId, cardLast4, timestamp)
 *   4. Delegate persistence to orderRepository — no SQL here
 *
 * SIMULATED MICROSERVICE:
 * productRepository.findById() has been replaced with a fetch() call to
 * the Product Service API. In a real microservice deployment the URL
 * would point to a separate host (http://product-service/api/products/:id).
 * Here it points to our own Express server to simulate the HTTP boundary
 * without moving any code.
 *
 * BEFORE (monolith):
 *   const product = await productRepository.findById(item.id);
 *   product.price_current  ← flat DB column
 *
 * AFTER (simulated microservice):
 *   const product = await fetchProductFromService(item.id);
 *   product.price.current  ← shaped API response
 *
 * Used by: controllers/checkoutController.js
 */

'use strict';

const orderRepository = require('../repositories/orderRepository');

// Base URL of the Product microservice — set in .env.
// Swap to a real host (http://product-service/api/products) when extracting.
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL;


// -------------------------------------------------------------
// fetchProductFromService(id)
// Simulates an inter-service HTTP call to the Product Service.
// Returns the shaped product object or null when not found.
//
// Response envelope: { success: true, data: { id, name, price: { current, … }, … } }
// Requires Node.js 18+ (global fetch built-in).
// -------------------------------------------------------------
async function fetchProductFromService(id) {
    var response = await fetch(PRODUCT_SERVICE_URL + '/' + id);
    var json     = await response.json();

    if (!json.success || !json.data) return null;
    return json.data;   // shaped: price.current, not price_current
}


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

    // --- Step 1: Verify every item via Product Service HTTP call ---
    // Client prices are NEVER trusted — a user could send price:0.01.
    // SIMULATED MICROSERVICE: fetch() replaces productRepository.findById()
    var total         = 0;
    var verifiedItems = [];

    for (var i = 0; i < items.length; i++) {
        var item    = items[i];
        var product = await fetchProductFromService(item.id);   // ← HTTP call

        if (!product) {
            throw { field: 'items', error: 'Product ID ' + item.id + ' not found in catalogue' };
        }

        var lineTotal = product.price.current * item.quantity;  // shaped response: price.current
        total += lineTotal;

        verifiedItems.push({
            id:       product.id,
            name:     product.name,
            price:    product.price.current,   // authoritative price from Product Service
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


module.exports = { placeOrder, fetchProductFromService };
