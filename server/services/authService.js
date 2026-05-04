/**
 * authService.js — Authentication Business Logic
 *
 * Handles two jobs:
 *   1. Finding a user by email in auth_user.json
 *   2. Verifying a plaintext password against its bcrypt hash
 *
 * WHY BCRYPT?
 * MD5 and SHA hashes are fast — an attacker with a GPU can test
 * billions of guesses per second. bcrypt is intentionally slow
 * (cost factor 10 = ~100ms per hash), making brute-force attacks
 * impractical even if the database is leaked.
 *
 * WHY SEPARATE FROM THE CONTROLLER?
 * The controller handles HTTP (req/res). This service handles data
 * and security logic. Keeping them separate means you can swap the
 * data source (JSON → SQLite → PostgreSQL) without touching the route.
 *
 * Used by: controllers/authController.js
 */

const path    = require('path');
const fs      = require('fs').promises;
const bcrypt  = require('bcryptjs');
const { readJSON } = require('../utils/fileReader');

// Path to the user database (JSON file for now — swap for DB later)
const USERS_FILE = path.join(__dirname, '..', 'data', 'auth_user.json');


// -------------------------------------------------------------
// findUserByEmail(email)
// Searches auth_user.json for a user whose username matches
// the submitted email (case-insensitive).
//
// Returns the full user object if found, or null if not found.
// The controller translates null into a 401 Unauthorized response.
// -------------------------------------------------------------
async function findUserByEmail(email) {
    const users = await readJSON(USERS_FILE);

    // .toLowerCase() on both sides so "Alice@Email.com" still matches
    return users.find(function (u) {
        return u.username.toLowerCase() === email.toLowerCase();
    }) || null;
}


// -------------------------------------------------------------
// verifyPassword(plaintext, hash)
// Uses bcrypt.compare() to check whether the submitted plaintext
// password produces the same hash stored in the database.
//
// WHY NOT HASH AND COMPARE DIRECTLY?
// bcrypt hashes include a random salt in the stored string
// (the "$2b$10$..." prefix). bcrypt.compare() extracts the salt
// from the stored hash, re-hashes the plaintext with it, and
// compares — you can't do this with a simple === check.
//
// Returns a Promise<boolean> — true if match, false if not.
// -------------------------------------------------------------
async function verifyPassword(plaintext, hash) {
    return bcrypt.compare(plaintext, hash);
}


// -------------------------------------------------------------
// createUser({ first_name, email, password })
// Hashes the plaintext password, builds a new user object, appends
// it to auth_user.json, and writes the file back to disk.
//
// WHY HASH HERE (SERVICE) NOT IN THE CONTROLLER?
// Password hashing is business/security logic, not HTTP logic.
// The controller only knows "create a user" — it shouldn't care
// how the password is stored.
//
// Returns the new user object (without the password hash) so the
// controller can sign a JWT and auto-login the user.
// -------------------------------------------------------------
async function createUser({ first_name, email, password }) {
    const users = await readJSON(USERS_FILE);

    // Generate the next id — max existing id + 1, or 1 for an empty file
    const nextId = users.length > 0
        ? Math.max(...users.map(function (u) { return u.id; })) + 1
        : 1;

    // Hash the password before storing — never save plaintext
    const hash = await bcrypt.hash(password, 10);

    const newUser = {
        id:            nextId,
        username:      email,
        password:      hash,
        first_name:    first_name,
        registered_at: new Date().toISOString().split('T')[0]  // YYYY-MM-DD
    };

    users.push(newUser);

    // Write the updated array back to the JSON file
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

    return newUser;
}


module.exports = { findUserByEmail, verifyPassword, createUser };
