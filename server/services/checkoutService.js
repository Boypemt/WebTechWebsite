/**
 * checkoutService.js — Checkout Business Logic
 *
 * Responsibilities:
 *   1. Re-look up the authoritative price from the products table for
 *      every cart item — the client's prices are NEVER trusted.
 *   2. Verify every item id exists in the catalogue.
 *   3. Persist the completed order to store.db:
 *        orders      — one header row  (db.run INSERT INTO orders)
 *        order_items — one row per item (db.run INSERT INTO order_items)
 *      Both inserts share a single BEGIN/COMMIT transaction so the
 *      order is either fully saved or not saved at all.
 *
 * WHY RE-CALCULATE SERVER-SIDE?
 * A user could edit the fetch payload in DevTools and send price: 0.01
 * for a $500 item. Reading the real price from the DB closes that hole.
 *
 * WHY STORE unit_price IN order_items?
 * Products change price over time. Storing the price at purchase time
 * means the receipt always reflects what the customer actually paid.
 *
 * WHY NOT STORE THE FULL CARD NUMBER?
 * Storing raw card numbers violates PCI-DSS. We keep only the last 4
 * digits for receipt display — the rest is discarded here.
 *
 * Used by: controllers/checkoutController.js
 */

const db = require('../db');   // resolves to server/db/index.js


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

    // --- Step 1: Verify every item and re-calculate total from DB ---
    var total         = 0;
    var verifiedItems = [];

    for (var i = 0; i < items.length; i++) {
        var item    = items[i];
        var product = await db.getAsync(
            'SELECT id, name, price_current FROM products WHERE id = ?',
            [item.id]
        );

        if (!product) {
            throw { field: 'items', error: 'Product ID ' + item.id + ' not found in catalogue' };
        }

        var lineTotal = product.price_current * item.quantity;
        total += lineTotal;

        verifiedItems.push({
            id:       product.id,
            name:     product.name,
            price:    product.price_current,   // authoritative server price
            quantity: item.quantity,
            subtotal: parseFloat(lineTotal.toFixed(2))
        });
    }

    total = parseFloat(total.toFixed(2));

    // --- Step 2: Build order identifiers ---
    var orderId   = 'ORD-' + Date.now();
    var cardLast4 = cardNumber.slice(-4);    // only last 4 — PCI-DSS
    var placedAt  = new Date().toISOString();

    // --- Step 3: Persist to SQLite in a single transaction ---
    // BEGIN → INSERT orders header → INSERT each order_item → COMMIT
    // Any failure rolls back so no partial order is ever saved.
    try {
        await db.runAsync('BEGIN');

        // Insert the order header — lastID is the auto-increment PK (orders.id)
        var headerResult = await db.runAsync(
            'INSERT INTO orders (order_id, user_id, email, card_last4, total, placed_at) VALUES (?, ?, ?, ?, ?, ?)',
            [orderId, userId || null, email, cardLast4, total, placedAt]
        );

        var dbOrderId = headerResult.lastID;   // INTEGER FK used in order_items

        // Insert one row per line item
        for (var j = 0; j < verifiedItems.length; j++) {
            var vi = verifiedItems[j];
            await db.runAsync(
                'INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
                [dbOrderId, vi.id, vi.quantity, vi.price, vi.subtotal]
            );
        }

        await db.runAsync('COMMIT');

    } catch (dbErr) {
        // Roll back so partial writes don't linger
        try { await db.runAsync('ROLLBACK'); } catch (_) {}
        console.error('[checkoutService] DB error:', dbErr.message || dbErr);
        throw { field: 'save', error: 'Failed to save order. Please try again.' };
    }

    return {
        orderId:   orderId,
        email:     email,
        cardLast4: cardLast4,
        items:     verifiedItems,
        total:     total,
        placedAt:  placedAt
    };
}


module.exports = { placeOrder };
