/**
 * userRepository.js — User Data Access
 *
 * Owns all reads and writes for the users collection.
 * Currently uses two storage targets in parallel:
 *   auth_user.json — the authoritative auth source (login lookups)
 *   SQLite users   — the FK target for orders.user_id
 *
 * WHY TWO TARGETS?
 * auth_user.json was the original user store. The SQLite users
 * table was added later to satisfy the FK constraint on orders.
 * This dual-write is acknowledged technical debt — a future
 * migration could consolidate to SQLite only, and only this
 * file would need to change.
 *
 * Used by: services/authService.js
 */

'use strict';

const path    = require('path');
const fs      = require('fs').promises;
const { readJSON } = require('../utils/fileReader');
const db      = require('../db');

const USERS_FILE = path.join(__dirname, '..', 'data', 'auth_user.json');


// -------------------------------------------------------------
// findByEmail(email)
// Case-insensitive lookup against auth_user.json.
// Returns the full user object or null.
// -------------------------------------------------------------
async function findByEmail(email) {
    const users = await readJSON(USERS_FILE);
    return users.find(function (u) {
        return u.username.toLowerCase() === email.toLowerCase();
    }) || null;
}


// -------------------------------------------------------------
// create({ first_name, email, passwordHash })
// Computes the next id, persists to JSON and SQLite, and returns
// the complete new user object.
//
// WHY nextId HERE?
// The id generation strategy is a storage detail — if this ever
// moves to a UUID or to SQLite AUTOINCREMENT, only this method
// changes. The service just calls create() and gets a user back.
// -------------------------------------------------------------
async function create({ first_name, email, passwordHash }) {
    const users  = await readJSON(USERS_FILE);
    const nextId = users.length > 0
        ? Math.max.apply(null, users.map(function (u) { return u.id; })) + 1
        : 1;

    var newUser = {
        id:            nextId,
        username:      email,
        password:      passwordHash,
        first_name:    first_name,
        registered_at: new Date().toISOString().split('T')[0]
    };

    // Persist to JSON first — auth source of truth
    users.push(newUser);
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

    // Mirror to SQLite so orders.user_id FK is satisfiable
    await db.runAsync(
        'INSERT INTO users (id, email, password_hash, first_name, registered_at) VALUES (?, ?, ?, ?, ?)',
        [newUser.id, newUser.username, newUser.password, newUser.first_name, newUser.registered_at]
    );

    return newUser;
}


module.exports = { findByEmail, create };
