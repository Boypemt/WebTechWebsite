/**
 * productService.js — Product Business Logic
 *
 * Reads from the `products` table in store.db via better-sqlite3.
 * Returns the same nested object shape the frontend expects:
 *   { id, name, category, image, badge, rating, reviewCount,
 *     price: { type, original, current, max }, action }
 *
 * WHY SYNCHRONOUS?
 * better-sqlite3 uses a synchronous API — no callbacks, no Promises.
 * The functions here are plain (not async), but calling them with
 * `await` in the controller is harmless: await on a non-Promise
 * returns the value immediately. The controller signature stays unchanged.
 *
 * WHY PREPARED STATEMENTS?
 * Prepared statements are compiled once and reused on every call —
 * faster than re-parsing SQL each time, and they use ? placeholders
 * (parameterized queries) which prevent SQL injection by design.
 * String concatenation into SQL is never used here.
 *
 * WHY LOWER() IN SQL INSTEAD OF JS .toLowerCase()?
 * Pushing the case fold into the DB lets SQLite handle it in the
 * index scan rather than filtering in JS after a full table scan.
 *
 * Used by: controllers/productController.js
 */

const db = require('../db/database');


// -------------------------------------------------------------
// Prepared statements — compiled once at module load.
// ? placeholders are bound at call time; no string interpolation.
// -------------------------------------------------------------
const stmtAll = db.prepare(
    'SELECT * FROM products'
);

const stmtByCategory = db.prepare(
    'SELECT * FROM products WHERE LOWER(category) = LOWER(?)'
);

const stmtByBadge = db.prepare(
    'SELECT * FROM products WHERE badge = ?'
);

const stmtByCategoryAndBadge = db.prepare(
    'SELECT * FROM products WHERE LOWER(category) = LOWER(?) AND badge = ?'
);

const stmtById = db.prepare(
    'SELECT * FROM products WHERE id = ?'
);


// -------------------------------------------------------------
// toProductShape(row)
// Maps a flat SQLite row to the nested product object the frontend
// and controller expect. Two transformations:
//   1. Flat price_* columns → nested price: { type, original, current, max }
//   2. Snake-case review_count → camelCase reviewCount
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
// Category comparison is case-insensitive (LOWER() in SQL).
// The controller validates category before calling here — by the
// time this runs, category is either undefined or a clean string.
// -------------------------------------------------------------
function getAllProducts({ category, badge } = {}) {
    let rows;

    if (category && badge) {
        rows = stmtByCategoryAndBadge.all(category, badge);
    } else if (category) {
        rows = stmtByCategory.all(category);
    } else if (badge) {
        rows = stmtByBadge.all(badge);
    } else {
        rows = stmtAll.all();
    }

    return rows.map(toProductShape);
}


// -------------------------------------------------------------
// getProductsByCategory(category)
// Convenience wrapper — returns only products in the given category.
// Case-insensitive: "electronics" matches "Electronics" in the DB.
// -------------------------------------------------------------
function getProductsByCategory(category) {
    return stmtByCategory.all(category).map(toProductShape);
}


// -------------------------------------------------------------
// getProductById(id)
// Returns the single product whose id matches, or null if not found.
// The controller translates null into a 404 response.
// .get() returns one row or undefined — || null normalises to null.
// -------------------------------------------------------------
function getProductById(id) {
    const row = stmtById.get(id);
    return row ? toProductShape(row) : null;
}


module.exports = { getAllProducts, getProductsByCategory, getProductById };
