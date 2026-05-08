/**
 * productRepository.js — Product Data Access
 *
 * Owns every SQL statement that touches the products table.
 * Returns raw DB rows — no business logic, no data shaping.
 * Shape transformation (price nesting, camelCase) belongs in
 * the service layer, not here.
 *
 * WHY RAW ROWS?
 * The repository's contract is "give me rows from storage."
 * If the DB column names change, only this file changes.
 * If the output shape changes, only the service changes.
 * The two concerns never collide.
 *
 * Used by: services/productService.js
 *           services/checkoutService.js (findById for price lookup)
 */

'use strict';

const db = require('../db');


// Returns all product rows — no filter applied
async function findAll() {
    return db.allAsync('SELECT * FROM products', []);
}

// Case-insensitive category match via LOWER() in SQL
async function findByCategory(category) {
    return db.allAsync(
        'SELECT * FROM products WHERE LOWER(category) = LOWER(?)',
        [category]
    );
}

// Combines both filters in one query — avoids two round trips
async function findByCategoryAndBadge(category, badge) {
    return db.allAsync(
        'SELECT * FROM products WHERE LOWER(category) = LOWER(?) AND badge = ?',
        [category, badge]
    );
}

async function findByBadge(badge) {
    return db.allAsync(
        'SELECT * FROM products WHERE badge = ?',
        [badge]
    );
}

// Only fetches the columns the checkout service needs for price lookup
async function findById(id) {
    return db.getAsync(
        'SELECT id, name, price_current FROM products WHERE id = ?',
        [id]
    );
}

// Full row — used by product detail page
async function findFullById(id) {
    return db.getAsync(
        'SELECT * FROM products WHERE id = ?',
        [id]
    );
}


module.exports = { findAll, findByCategory, findByCategoryAndBadge, findByBadge, findById, findFullById };
