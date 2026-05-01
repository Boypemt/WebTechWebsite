/**
 * productController.js — HTTP Layer for Products
 *
 * Controllers handle only HTTP concerns:
 *   - reading from req (params, query, body)
 *   - calling the service layer for data
 *   - writing to res (status code, JSON body)
 *
 * WHY SEPARATE FROM THE SERVICE?
 * The service doesn't know about HTTP. The controller doesn't know
 * about where data comes from. Each layer has one job.
 *
 * Express 5 automatically catches errors thrown inside async functions
 * and forwards them to the error handler in app.js — no try/catch needed
 * in each handler.
 *
 * Used by: routes/products.js
 */

const productService = require('../services/productService');


// -------------------------------------------------------------
// Response envelope shape (all endpoints):
//   success  {boolean} — true on success, false on error
//   count    {number}  — item count (list endpoints only)
//   data     {*}       — the payload (array or single object)
//   error    {string}  — human-readable message (error responses only)
//
// WHY AN ENVELOPE?
// Wrapping all responses in a consistent shape lets the frontend
// check response.success before using response.data, and makes it
// easy to add pagination or metadata later without breaking callers.
// -------------------------------------------------------------


// -------------------------------------------------------------
// listProducts(req, res)
// GET /api/products
// GET /api/products?category=Electronics
// GET /api/products?badge=Sale
//
// Passes optional query params to the service for filtering.
// Always responds with the envelope — data is the products array.
// -------------------------------------------------------------
async function listProducts(req, res) {
    const { category, badge } = req.query;
    const products = await productService.getAllProducts({ category, badge });
    res.json({
        success: true,
        count:   products.length,
        data:    products
    });
}


// -------------------------------------------------------------
// getProduct(req, res)
// GET /api/products/:id
//
// Converts :id from a URL string to an integer before passing to
// the service — product ids in products.json are numeric.
// Returns 404 envelope if no match is found.
// -------------------------------------------------------------
async function getProduct(req, res) {
    const id      = parseInt(req.params.id, 10);
    const product = await productService.getProductById(id);

    if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, data: product });
}


module.exports = { listProducts, getProduct };
