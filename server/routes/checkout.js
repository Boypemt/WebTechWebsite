/**
 * routes/checkout.js — Checkout Route
 *
 * Maps POST / → checkoutController.placeOrder.
 * Mounted at /api/checkout in app.js, so the full path is:
 *   POST /api/checkout
 *
 * Keeping the route thin (URL → handler mapping only, no logic)
 * follows the Controller → Route → Service pattern used across
 * this project.
 *
 * Used by: app.js
 */

const express          = require('express');
const router           = express.Router();
const { placeOrder }   = require('../controllers/checkoutController');


// POST /api/checkout — accepts cart items, returns order confirmation
router.post('/', placeOrder);


module.exports = router;
