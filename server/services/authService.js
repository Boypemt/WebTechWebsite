/**
 * authService.js — Authentication Business Logic
 *
 * Owns security-sensitive operations:
 *   findUserByEmail  — delegates lookup to userRepository
 *   verifyPassword   — bcrypt comparison (timing-safe, no DB needed)
 *   createUser       — hashes password, delegates persistence to userRepository
 *
 * WHY HASH HERE AND NOT IN THE REPOSITORY?
 * Password hashing is a security rule ("always use bcrypt, cost 10"),
 * not a storage rule. If we switched from bcrypt to Argon2 tomorrow,
 * only this file changes — the repository just stores whatever hash
 * it receives and never needs to know which algorithm was used.
 *
 * WHY VAGUE 401 MESSAGE FOR LOGIN FAILURES?
 * "Invalid email or password" is the same for both "email not found"
 * and "wrong password." Separate messages would let an attacker
 * enumerate valid emails by observing which error they get.
 *
 * Used by: controllers/authController.js
 */

'use strict';

const bcrypt         = require('bcryptjs');
const userRepository = require('../repositories/userRepository');


// -------------------------------------------------------------
// findUserByEmail(email)
// Thin delegation to the repository. Kept in the service layer
// so the controller always talks to services, never repositories.
// -------------------------------------------------------------
async function findUserByEmail(email) {
    return userRepository.findByEmail(email);
}


// -------------------------------------------------------------
// verifyPassword(plaintext, hash)
// bcrypt.compare() extracts the salt from the stored hash,
// re-hashes the plaintext, and compares — safe against timing
// attacks. Returns Promise<boolean>.
// -------------------------------------------------------------
async function verifyPassword(plaintext, hash) {
    return bcrypt.compare(plaintext, hash);
}


// -------------------------------------------------------------
// createUser({ first_name, email, password })
// Business logic: hash the plaintext password (cost 10 = ~100ms,
// making brute-force impractical even if the DB is leaked).
// Storage: delegated entirely to userRepository.create().
// Returns the new user object so the controller can sign a JWT.
// -------------------------------------------------------------
async function createUser({ first_name, email, password }) {
    var rounds       = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
    var passwordHash = await bcrypt.hash(password, rounds);
    return userRepository.create({ first_name, email, passwordHash });
}


module.exports = { findUserByEmail, verifyPassword, createUser };
