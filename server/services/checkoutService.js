/**
 * checkoutService.js — Checkout Business Logic
 *
 * Responsibilities:
 *   1. Re-calculate the order total server-side using prices from
 *      products.json — the client's prices are NEVER trusted.
 *   2. Verify every item id exists in the catalogue.
 *   3. Persist the order to store.db:
 *        orders      — one header row (order_id, user_id, total, …)
 *        order_items — one row per line item (product_id, quantity, …)
 *
 * WHY RE-CALCULATE SERVER-SIDE?
 * A user could edit the fetch payload in DevTools and send
 * price: 0.01 for a $500 item. By ignoring req.body prices and
 * looking up the real price from products.json, we close that hole.
 *
 * WHY STORE unit_price IN order_items?
 * Products change price over time. Storing the price at purchase time
 * means the receipt always reflects what the customer actually paid,
 * not today's price.
 *
 * WHY NOT STORE THE FULL CARD NUMBER?
 * Storing raw card numbers violates PCI-DSS. We keep only the
 * last 4 digits for receipt display — the rest is discarded here.
 *
 * Used by: controllers/checkoutController.js
 */

const path         = require('path');
const { readJSON } = require('../utils/fileReader');
const db           = require('../db/database');

const PRODUCTS_FILE = path.join(__dirname, '..', '..', 'products.json');

// Prepared statements — compiled once, reused on every checkout.
// Named parameters (@name) are safer than positional (?) for multi-column inserts.
const insertOrder = db.prepare(`
    INSERT INTO orders (order_id, user_id, email, card_last4, total, placed_at)
    VALUES (@order_id, @user_id, @email, @card_last4, @total, @placed_at)
`);

const insertOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
    VALUES (@order_id, @product_id, @quantity, @unit_price, @total_price)
`);

// Wraps the header + all line item inserts in one atomic transaction.
// If any INSERT fails (e.g. FK violation), the whole order rolls back —
// no partial orders are ever saved.
const saveOrderTransaction = db.transaction(function (header, items) {
    // Insert header row — SQLite returns the auto-incremented PK in lastInsertRowid
    const result  = insertOrder.run(header);
    const rowId   = result.lastInsertRowid;

    // Insert one line item row per product
    for (const item of items) {
        insertOrderItem.run({
            order_id:    rowId,        // INTEGER FK → orders.id
            product_id:  item.id,
            quantity:    item.quantity,
            unit_price:  item.price,
            total_price: item.subtotal
        });
    }
});


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

    // --- Step 1: Load the catalogue and verify every item ---
    const products = await readJSON(PRODUCTS_FILE);

    let total = 0;
    const verifiedItems = [];

    for (const item of items) {
        const product = products.find(function (p) { return p.id === item.id; });

        if (!product) {
            throw { field: 'items', error: 'Product ID ' + item.id + ' not found in catalogue' };
        }

        // Use the server's price — ignore whatever the client sent
        const lineTotal = product.price.current * item.quantity;
        total += lineTotal;

        verifiedItems.push({
            id:       product.id,
            name:     product.name,
            price:    product.price.current,
            quantity: item.quantity,
            subtotal: parseFloat(lineTotal.toFixed(2))
        });
    }

    total = parseFloat(total.toFixed(2));

    // --- Step 2: Build the records ---
    const orderId   = 'ORD-' + Date.now();
    const cardLast4 = cardNumber.slice(-4);
    const placedAt  = new Date().toISOString();

    const header = {
        order_id:   orderId,
        user_id:    userId || null,  // null = guest checkout
        email:      email,
        card_last4: cardLast4,
        total:      total,
        placed_at:  placedAt
    };

    // --- Step 3: Persist to SQLite in one atomic transaction ---
    try {
        saveOrderTransaction(header, verifiedItems);
    } catch (dbErr) {
        console.error('[checkoutService] DB insert failed:', dbErr);
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
