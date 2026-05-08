/**
 * productService.js — Product Business Logic
 *
 * Responsible for two things only:
 *   1. Choosing which repository query to call based on filters
 *   2. Shaping raw DB rows into the nested object the frontend expects
 *
 * No SQL lives here. All data access is delegated to productRepository.
 * If the DB schema changes, productRepository changes — not this file.
 * If the output shape changes, toProductShape() changes — not the repo.
 *
 * Used by: controllers/productController.js
 */

'use strict';

const productRepository = require('../repositories/productRepository');


// -------------------------------------------------------------
// toProductShape(row)
// Maps a flat SQLite row to the nested product object the
// frontend expects. This is a BUSINESS concern (what shape
// does our API return?) not a storage concern.
//
// Transformations:
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
// Picks the right repository query for the active filter
// combination, then shapes every row before returning.
// -------------------------------------------------------------
async function getAllProducts({ category, badge } = {}) {
    var rows;

    if (category && badge) {
        rows = await productRepository.findByCategoryAndBadge(category, badge);
    } else if (category) {
        rows = await productRepository.findByCategory(category);
    } else if (badge) {
        rows = await productRepository.findByBadge(badge);
    } else {
        rows = await productRepository.findAll();
    }

    return rows.map(toProductShape);
}


// -------------------------------------------------------------
// getProductsByCategory(category)
// Convenience wrapper used by internal callers that always
// have a category — avoids the multi-branch logic above.
// -------------------------------------------------------------
async function getProductsByCategory(category) {
    var rows = await productRepository.findByCategory(category);
    return rows.map(toProductShape);
}


// -------------------------------------------------------------
// getProductById(id)
// Returns a fully shaped product or null.
// Null signals "not found" to the controller → 404.
// -------------------------------------------------------------
async function getProductById(id) {
    var row = await productRepository.findFullById(id);
    return row ? toProductShape(row) : null;
}


module.exports = { getAllProducts, getProductsByCategory, getProductById };
