/**
 * checkoutService.js — Checkout Business Logic
 *
 * Responsibilities:
 *   1. Re-calculate the order total server-side using prices from
 *      products.json — the client's prices are NEVER trusted.
 *   2. Verify every item id exists in the catalogue.
 *   3. Persist the completed order to server/data/orders.json.
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
 * Used by: controllers/checkoutController.js
 */

const path             = require('path');
const fs               = require('fs').promises;
const { readJSON }     = require('../utils/fileReader');

const PRODUCTS_FILE = path.join(__dirname, '..', '..', 'products.json');
const ORDERS_FILE   = path.join(__dirname, '..', 'data', 'orders.json');


// -------------------------------------------------------------
// placeOrder({ items, email, cardNumber })
// items      — array of { id, quantity } from the client
// email      — customer email for the receipt
// cardNumber — validated 16-digit string (only last 4 stored)
//
// Returns the saved order object on success.
// Throws { field, error } on any failure so the controller can
// return a field-specific 400 response.
// -------------------------------------------------------------
async function placeOrder({ items, email, cardNumber }) {

    // --- Step 1: Load the catalogue and verify every item ---
    const products = await readJSON(PRODUCTS_FILE);

    let total = 0;
    const verifiedItems = [];

    for (const item of items) {
        // Find the product by numeric id
        const product = products.find(function (p) { return p.id === item.id; });

        if (!product) {
            // Throw a structured error — controller turns this into 400 + field
            throw { field: 'items', error: 'Product ID ' + item.id + ' not found in catalogue' };
        }

        // Use the server's price, not the client's — this is the key security step
        const lineTotal = product.price.current * item.quantity;
        total += lineTotal;

        verifiedItems.push({
            id:       product.id,
            name:     product.name,
            price:    product.price.current,  // authoritative server price
            quantity: item.quantity,
            subtotal: parseFloat(lineTotal.toFixed(2))
        });
    }

    // --- Step 2: Build the order record ---
    const order = {
        orderId:   'ORD-' + Date.now(),          // simple unique id — swap for UUID in production
        email:     email,
        cardLast4: cardNumber.slice(-4),          // only the last 4 digits — never store full number
        items:     verifiedItems,
        total:     parseFloat(total.toFixed(2)),  // 2 decimal places for currency
        placedAt:  new Date().toISOString()
    };

    // --- Step 3: Persist the order to orders.json ---
    // Wrapped in try/catch so file I/O failures return a clean 400
    // rather than a 500 from the global error handler.
    try {
        // Read existing orders — if the file is missing or empty, start fresh
        let orders = [];
        try {
            orders = await readJSON(ORDERS_FILE);
        } catch (_) {
            // File doesn't exist yet — [] is the correct starting state
            orders = [];
        }

        // Append the new order and write the whole array back
        orders.push(order);
        await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');

    } catch (writeErr) {
        // Surface as a structured error so the controller returns 400, not 500
        throw { field: 'save', error: 'Failed to save order. Please try again.' };
    }

    return order;
}


module.exports = { placeOrder };
