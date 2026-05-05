/**
 * checkoutController.js — HTTP Layer for Checkout
 *
 * Handles POST /api/checkout:
 *   1. Validate cart is not empty
 *   2. Validate email format with regex
 *   3. Validate card number is exactly 16 digits
 *   4. Delegate to checkoutService.placeOrder()
 *   5. On success → 201 with orderId and total
 *   6. On failure → 400 with the field that failed and why
 *
 * WHY VALIDATE HERE AND NOT IN THE SERVICE?
 * The controller owns HTTP concerns — reading req, writing res,
 * and input validation. The service owns business logic — price
 * lookup and persistence. Keeping them separate means the service
 * can be called from other places (CLI, tests) without HTTP context.
 *
 * Used by: routes/checkout.js
 */

const checkoutService = require('../services/checkoutService');

// Regex: at least one char, @, at least one char, dot, at least one char
// Covers the vast majority of valid email formats without over-engineering.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Exactly 16 digits — spaces stripped before testing so "4111 1111 1111 1111" also passes
const CARD_REGEX  = /^\d{16}$/;


// -------------------------------------------------------------
// placeOrder(req, res)
// POST /api/checkout
// Body: {
//   items:      [{ id, quantity }, ...],
//   email:      "customer@example.com",
//   cardNumber: "4111111111111111"
// }
//
// Success (201):
//   { success: true, orderId: "ORD-...", total: 59.98 }
//
// Failure (400):
//   { success: false, field: "<fieldName>", error: "<reason>" }
// -------------------------------------------------------------
async function placeOrder(req, res) {
    const { items, email, cardNumber } = req.body;

    // --- Validate 1: items must be a non-empty array ---
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            field:   'items',
            error:   'Cart is empty'
        });
    }

    // --- Validate 2: email must match the regex ---
    if (!email || !EMAIL_REGEX.test(email)) {
        return res.status(400).json({
            success: false,
            field:   'email',
            error:   'Invalid email address'
        });
    }

    // --- Validate 3: card number must be exactly 16 digits ---
    // Strip spaces first so formatted input ("4111 1111 1111 1111") also passes
    const strippedCard = (cardNumber || '').replace(/\s/g, '');
    if (!CARD_REGEX.test(strippedCard)) {
        return res.status(400).json({
            success: false,
            field:   'cardNumber',
            error:   'Card number must be exactly 16 digits'
        });
    }

    // --- Delegate to the service ---
    // The service re-calculates the total from products.json and saves the order.
    // Any error it throws is a structured { field, error } object.
    try {
        const order = await checkoutService.placeOrder({
            items,
            email,
            cardNumber: strippedCard   // pass the cleaned version
        });

        // 201 Created — new order resource was successfully saved
        return res.status(201).json({
            success: true,
            orderId: order.orderId,
            total:   order.total
        });

    } catch (err) {
        // Service threw a structured { field, error } — forward it as 400
        return res.status(400).json({
            success: false,
            field:   err.field  || 'unknown',
            error:   err.error  || 'Checkout failed. Please try again.'
        });
    }
}


module.exports = { placeOrder };
