/**
 * productService.js — Product Business Logic
 *
 * Reads from the `products` table in store.db via the sqlite3 driver.
 * Returns the same nested object shape the frontend expects:
 *   { id, name, category, image, badge, rating, reviewCount,
 *     price: { type, original, current, max }, action }
 *
 * WHY PARAMETERIZED QUERIES?
 * ? placeholders let sqlite3 bind values safely — the driver escapes
 * them before sending to the engine. String concatenation into SQL
 * allows injection attacks; it is never used here.
 *
 * WHY LOWER() IN SQL INSTEAD OF JS .toLowerCase()?
 * The case fold happens inside the DB engine during the scan, so no
 * JS-side filtering loop is needed after fetching rows.
 *
 * Used by: controllers/productController.js
 */

const db = require('../db');   // resolves to server/db/index.js


// -------------------------------------------------------------
// toProductShape(row)
// Maps a flat SQLite row to the nested product object the frontend
// and controller expect. Two transformations needed:
//   price_type / price_current / … → price: { type, current, … }
//   review_count (snake_case)       → reviewCount (camelCase)
// -------------------------------------------------------------
function toProductShape(row) {
    return {
        id:          row.id,
        name:        row.name,
        category:    row.category,
        image:       row.image,
        badge:       row.badge,
        rating:      row.rating,
        reviewCount: row.review_count,
        price: {
            type:     row.price_type,
            original: row.price_original,
            current:  row.price_current,
            max:      row.price_max
        },
        action: row.action
    };
}


// -------------------------------------------------------------
// getAllProducts({ category, badge })
// Returns all products, optionally filtered by category and/or badge.
// Category comparison is case-insensitive via LOWER() in SQL.
// The controller validates the category value before calling here.
// -------------------------------------------------------------
async function getAllProducts({ category, badge } = {}) {
    var rows;

    if (category && badge) {
        rows = await db.allAsync(
            'SELECT * FROM products WHERE LOWER(category) = LOWER(?) AND badge = ?',
            [category, badge]
        );
    } else if (category) {
        rows = await db.allAsync(
            'SELECT * FROM products WHERE LOWER(category) = LOWER(?)',
            [category]
        );
    } else if (badge) {
        rows = await db.allAsync(
            'SELECT * FROM products WHERE badge = ?',
            [badge]
        );
    } else {
        rows = await db.allAsync('SELECT * FROM products', []);
    }

    return rows.map(toProductShape);
}


// -------------------------------------------------------------
// getProductsByCategory(category)
// Convenience wrapper — returns only products in the given category.
// Case-insensitive: "electronics" matches "Electronics" in the DB.
// -------------------------------------------------------------
async function getProductsByCategory(category) {
    var rows = await db.allAsync(
        'SELECT * FROM products WHERE LOWER(category) = LOWER(?)',
        [category]
    );
    return rows.map(toProductShape);
}


// -------------------------------------------------------------
// getProductById(id)
// Returns the single product whose id matches, or null if not found.
// The controller translates null into a 404 response.
// db.getAsync resolves with null when no row matches.
// -------------------------------------------------------------
async function getProductById(id) {
    var row = await db.getAsync(
        'SELECT * FROM products WHERE id = ?',
        [id]
    );
    return row ? toProductShape(row) : null;
}


module.exports = { getAllProducts, getProductsByCategory, getProductById };
