/**
 * productService.js — Product Business Logic
 *
 * Reads the shared products.json at the project root (the same file
 * the frontend fetches directly). The server does NOT duplicate it —
 * one file, one source of truth for both layers.
 *
 * Product schema:
 *   { id, name, category, image, badge, rating, reviewCount,
 *     price: { type, original, current, max }, action }
 *
 * WHY A SERVICE LAYER?
 * The controller only handles HTTP (req/res). Business logic — reading
 * data, filtering, finding by id — lives here. When the data source
 * later moves to SQLite, only this file needs to change; the controller
 * and routes stay the same.
 *
 * Used by: controllers/productController.js
 */

const path       = require('path');
const { readJSON } = require('../utils/fileReader');

// Two levels up from server/services/ → project root → products.json
const PRODUCTS_FILE = path.join(__dirname, '..', '..', 'products.json');


// -------------------------------------------------------------
// getAllProducts({ category, badge })
// Returns all products, optionally filtered by category and/or badge.
// Both filters are applied together when both are provided.
//
// Category match is case-insensitive so ?category=electronics
// matches products whose category is "Electronics".
// The controller validates the raw query string before calling here,
// so by the time this runs, category is either undefined or a valid
// non-empty string under 50 chars.
//
// Query param examples:
//   GET /api/products                      → all 20 products
//   GET /api/products?category=Electronics → 4 electronics products
//   GET /api/products?category=electronics → same 4 (case-insensitive)
//   GET /api/products?badge=Sale           → only sale items
// -------------------------------------------------------------
async function getAllProducts({ category, badge } = {}) {
    const products = await readJSON(PRODUCTS_FILE);

    return products.filter(function (p) {
        // toLowerCase() on both sides makes the match case-insensitive.
        // No category param → !category is true → every product passes.
        const categoryMatch = !category ||
            p.category.toLowerCase() === category.toLowerCase();

        const badgeMatch = !badge || p.badge === badge;

        return categoryMatch && badgeMatch;
    });
}


// -------------------------------------------------------------
// getProductById(id)
// Returns the single product whose id matches, or null if not found.
// The controller translates null into a 404 response.
// -------------------------------------------------------------
async function getProductById(id) {
    const products = await readJSON(PRODUCTS_FILE);
    return products.find(function (p) { return p.id === id; }) || null;
}


module.exports = { getAllProducts, getProductById };
