/**
 * orderRepository.js — Order Data Access
 *
 * Owns every SQL statement that touches the orders and
 * order_items tables. The service tells it WHAT to save;
 * this file decides HOW (parameterized INSERTs, transaction
 * management, ROLLBACK on failure).
 *
 * WHY TRANSACTION HERE AND NOT IN THE SERVICE?
 * Transactions are a storage concern — they guarantee that
 * the DB stays consistent if a write fails mid-way. The
 * service doesn't need to know that SQLite requires
 * BEGIN/COMMIT; it just calls save() and gets a result.
 * Swapping to PostgreSQL later means updating only this
 * file's transaction syntax, not the service.
 *
 * Used by: services/checkoutService.js
 */

'use strict';

const db = require('../db');


// -------------------------------------------------------------
// save(header, items)
// Inserts one orders row and N order_items rows in a single
// atomic transaction.
//
// header: { order_id, user_id, email, card_last4, total, placed_at }
// items:  [{ id, quantity, price, subtotal }, ...]
//
// Returns the integer PK (orders.id) assigned by SQLite.
// Throws the raw DB error so the service can wrap it.
// -------------------------------------------------------------
async function save(header, items) {
    await db.runAsync('BEGIN');

    try {
        const { lastID: dbOrderId } = await db.runAsync(
            'INSERT INTO orders (order_id, user_id, email, card_last4, total, placed_at) VALUES (?, ?, ?, ?, ?, ?)',
            [header.order_id, header.user_id, header.email, header.card_last4, header.total, header.placed_at]
        );

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            await db.runAsync(
                'INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
                [dbOrderId, item.id, item.quantity, item.price, item.subtotal]
            );
        }

        await db.runAsync('COMMIT');
        return dbOrderId;

    } catch (err) {
        try { await db.runAsync('ROLLBACK'); } catch (_) { /* ignore rollback error */ }
        throw err;
    }
}


module.exports = { save };
