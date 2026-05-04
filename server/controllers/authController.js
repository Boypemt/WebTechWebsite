/**
 * authController.js — HTTP Layer for Authentication
 *
 * Handles POST /api/login:
 *   1. Validate that email and password are present in the request body
 *   2. Look up the user by email via authService
 *   3. Verify the submitted password against the stored bcrypt hash
 *   4. On success — sign a JWT and return it with 200
 *   5. On failure — return 401 Unauthorized (intentionally vague message
 *      so attackers can't tell whether the email or password was wrong)
 *
 * WHY VAGUE ERROR MESSAGES?
 * Saying "email not found" vs "wrong password" tells an attacker which
 * emails are registered. A single "Invalid credentials" message for both
 * cases leaks nothing about which part failed.
 *
 * WHY JWT?
 * JSON Web Tokens let the client prove its identity on every request
 * without the server storing session state. The server only needs the
 * secret key to verify the token's signature.
 *
 * Used by: routes/auth.js
 */

const jwt         = require('jsonwebtoken');
const authService = require('../services/authService');

// JWT_SECRET must be set in .env — never hardcode secrets in source code
const JWT_SECRET  = process.env.JWT_SECRET;
// Token expires after 2 hours — balance between convenience and security
const JWT_EXPIRES = '2h';


// -------------------------------------------------------------
// login(req, res)
// POST /api/login
// Body: { "email": "...", "password": "..." }
//
// Response on success (200):
//   { success: true, token: "<jwt>", user: { id, first_name } }
//
// Response on failure (400 / 401):
//   { success: false, error: "..." }
// -------------------------------------------------------------
async function login(req, res) {
    const { email, password } = req.body;

    // --- Input validation ---
    // Both fields are required — reject early before hitting the DB
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error:   'Email and password are required'
        });
    }

    // --- Step 1: Find the user by email ---
    const user = await authService.findUserByEmail(email);

    // Use the same vague message whether email or password is wrong.
    // This prevents user enumeration (attackers probing which emails exist).
    if (!user) {
        return res.status(401).json({
            success: false,
            error:   'Invalid email or password'
        });
    }

    // --- Step 2: Verify the password against the bcrypt hash ---
    // bcrypt.compare() is intentionally slow — this is expected (~100ms)
    const passwordMatch = await authService.verifyPassword(password, user.password);

    if (!passwordMatch) {
        // Same 401 and same message as "user not found" — no information leak
        return res.status(401).json({
            success: false,
            error:   'Invalid email or password'
        });
    }

    // --- Step 3: Sign a JWT ---
    // Payload carries only non-sensitive identity fields.
    // Never put the password hash or full user object in a JWT payload —
    // the payload is base64-encoded (not encrypted) and readable by anyone.
    const token = jwt.sign(
        {
            id:         user.id,
            email:      user.username,
            first_name: user.first_name
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    );

    // --- Step 4: Return the token ---
    res.status(200).json({
        success: true,
        token,
        user: {
            id:         user.id,
            first_name: user.first_name
        }
    });
}


// -------------------------------------------------------------
// register(req, res)
// POST /api/register
// Body: { "first_name": "...", "email": "...", "password": "..." }
//
// Steps:
//   1. Validate all fields are present
//   2. Check the email isn't already registered (409 if taken)
//   3. Create the user — service hashes the password and writes to JSON
//   4. Auto-login: sign a JWT so the user lands on the shop immediately
//
// WHY AUTO-LOGIN AFTER REGISTER?
// Making the user fill in the login form right after registering is
// friction with no security benefit — they just proved they own the
// email by completing the form. Signing a token here skips that step.
//
// Password strength is enforced on the frontend. The backend only
// checks presence — frontend validation is the first line, not the last.
// -------------------------------------------------------------
async function register(req, res) {
    const { first_name, email, password } = req.body;

    // --- Input validation: all three fields required ---
    if (!first_name || !email || !password) {
        return res.status(400).json({
            success: false,
            error:   'Name, email, and password are required'
        });
    }

    // --- Check for duplicate email ---
    const existing = await authService.findUserByEmail(email);
    if (existing) {
        // 409 Conflict — the resource (this email) already exists
        return res.status(409).json({
            success: false,
            error:   'This email is already registered'
        });
    }

    // --- Create the user (service hashes the password) ---
    const newUser = await authService.createUser({ first_name, email, password });

    // --- Sign a JWT — same shape as login so the frontend works identically ---
    const token = jwt.sign(
        {
            id:         newUser.id,
            email:      newUser.username,
            first_name: newUser.first_name
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    );

    // 201 Created — new resource was successfully created
    res.status(201).json({
        success: true,
        token,
        user: {
            id:         newUser.id,
            first_name: newUser.first_name
        }
    });
}


module.exports = { login, register };
