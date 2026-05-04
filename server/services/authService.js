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


module.exports = { findUserByEmail, verifyPassword };
