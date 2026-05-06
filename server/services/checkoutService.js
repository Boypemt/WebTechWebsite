/**
 * checkoutService.js — Checkout Business Logic
 *
 * Responsibilities:
 *   1. Re-calculate the order total server-side using prices from
 *      products.json — the client's prices are NEVER trusted.
 *   2. Verify every item id exists in the catalogue.
 *   3. Persist the completed order to store.db (one row per line item).
 *
 * WHY RE-CALCULATE SERVER-SIDE?
 * A user could edit the fetch payload in DevTools and send
 * price: 0.01 for a $500 item. By ignoring req.body prices and
 * looking up the real price from products.json, we close that hole.
 *
 * WHY NOT STORE THE FULL CARD NUMBER?
 * Storing raw card numbers violates PCI-DSS. We keep only the
 * last 4 digits for receipt display — the rest is discarded here.
 *
 * WHY ONE ROW PER LINE ITEM?
 * Normalised storage makes it straightforward to query sales by
 * product, revenue by category, or reorder rates later — things
 * that would require JSON parsing if stored as a blob.
 *
 * Used by: controllers/checkoutController.js
 */

const path         = require('path');
const { readJSON } = require('../utils/fileReader');
const db           = require('../db/database');

const PRODUCTS_FILE = path.join(__dirname, '..', '..', 'products.json');

// Prepared statement — compiled once, reused on every checkout
const insertOrderRow = db.prepare(`
    INSERT INTO orders
        (order_id, user_id, email, card_last4,
         product_id, product_name, quantity, unit_price, total_price, placed_at)
    VALUES
        (@order_id, @user_id, @email, @card_last4,
         @product_id, @product_name, @quantity, @unit_price, @total_price, @placed_at)
`);

// Wraps multiple inserts in one atomic transaction so an order is
// either fully saved or not saved at all — no partial writes.
const insertOrderTransaction = db.transaction(function (rows) {
    for (const row of rows) {
        insertOrderRow.run(row);
    }
});


// -------------------------------------------------------------
// placeOrder({ items, email, cardNumber, userId })
// items      — array of { id, quantity } from the client
// email      — customer email for the receipt
// cardNumber — validated 16-digit string (only last 4 stored)
// userId     — integer from auth session, or null for guest
//
// Returns the saved order object on success.
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

    // --- Step 2: Build the order record ---
    const orderId   = 'ORD-' + Date.now();
    const cardLast4 = cardNumber.slice(-4);
    const placedAt  = new Date().toISOString();

    // --- Step 3: Persist to SQLite — one row per line item ---
    // Build the row array then insert inside a single transaction.
    // If any insert fails, the transaction rolls back automatically.
    try {
        const rows = verifiedItems.map(function (item) {
            return {
                order_id:     orderId,
                user_id:      userId || null,   // null = guest checkout
                email:        email,
                card_last4:   cardLast4,
                product_id:   item.id,
                product_name: item.name,
                quantity:     item.quantity,
                unit_price:   item.price,
                total_price:  item.subtotal,
                placed_at:    placedAt
            };
        });

        insertOrderTransaction(rows);

    } catch (dbErr) {
        console.error('[checkoutService] DB insert failed:', dbErr);
        throw { field: 'save', error: 'Failed to save order. Please try again.' };
    }

    // Return a summary the controller can send back to the client
    return {
        orderId:  orderId,
        email:    email,
        cardLast4: cardLast4,
        items:    verifiedItems,
        total:    total,
        placedAt: placedAt
    };
}


module.exports = { placeOrder };
