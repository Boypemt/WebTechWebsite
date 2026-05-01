/**
 * routes/products.js — Product Routes
 *
 * Maps URL patterns to controller functions.
 * The router itself has no logic — it's just a wiring table.
 *
 * Mounted at /api/products in app.js, so:
 *   GET /      → /api/products        → listProducts
 *   GET /:id   → /api/products/:id    → getProduct
 *
 * Used by: app.js
 */

const express           = require('express');
const router            = express.Router();
const { listProducts,
        getProduct }    = require('../controllers/productController');


// GET /api/products          — list all (with optional ?category / ?badge filters)
router.get('/', listProducts);

// GET /api/products/:id      — single product by numeric id
router.get('/:id', getProduct);


module.exports = router;
