/*!
 * login.js — Login Page Logic
 *
 * DATA FLOW:
 *   DOMContentLoaded
 *     └── loadCart()         ← cart-utils.js (restores navbar badge)
 *     └── checkAlreadyLoggedIn()
 *           └── if token exists in localStorage → redirect to index.html
 *
 *   user submits form
 *     └── handleSubmit(e)
 *           └── POST /api/login  { email, password }
 *                 ├── 200 → saveSession() → redirect to index.html
 *                 └── 400/401 → showError(message)
 */


// -------------------------------------------------------------
// ENTRY POINT
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    loadCart();             // shared — restores cart badge in navbar
    checkAlreadyLoggedIn(); // skip login page if already authenticated

    // Wire the form submit event
    var form = document.getElementById('login-form');
    form.addEventListener('submit', handleSubmit);

    // Show/hide password toggle
    var toggleBtn = document.getElementById('toggle-password');
    toggleBtn.addEventListener('click', togglePasswordVisibility);
});


// -------------------------------------------------------------
// checkAlreadyLoggedIn()
// If a token is already stored, the user is still logged in —
// send them straight to the shop instead of showing the form.
// -------------------------------------------------------------
function checkAlreadyLoggedIn() {
    if (localStorage.getItem('token')) {
        window.location.href = 'index.html';
    }
}


// -------------------------------------------------------------
// handleSubmit(e)
// Intercepts the native form submit so we can use fetch() instead
// of a full-page POST (which would navigate away from the SPA).
//
// Steps:
//   1. Prevent the browser's default form submission
//   2. Read email + password from the form fields
//   3. POST to /api/login
//   4. On success → save token and user to localStorage → redirect
//   5. On error   → show the error message returned by the API
// -------------------------------------------------------------
async function handleSubmit(e) {
    // Stop the browser from submitting the form the traditional way
    e.preventDefault();

    var email    = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;

    // Clear any previous error before a new attempt
    hideError();
    setLoading(true);

    try {
        var response = await fetch('http://localhost:3000/api/login', {
            method:  'POST',
            // Tell the server we're sending JSON
            headers: { 'Content-Type': 'application/json' },
            // Serialise the credentials into the request body
            body:    JSON.stringify({ email: email, password: password })
        });

        var data = await response.json();

        if (response.ok && data.success) {
            // --- Login succeeded ---
            saveSession(data);
            // Redirect to the shop — user is now authenticated
            window.location.href = 'index.html';
        } else {
            // --- API returned 400 or 401 ---
            // Show the server's error message (e.g. "Invalid email or password")
            showError(data.error || 'Login failed. Please try again.');
        }
    } catch (err) {
        // --- Network error — backend is likely not running ---
        showError('Could not reach the server. Make sure the backend is running.');
    } finally {
        setLoading(false);
    }
}


// -------------------------------------------------------------
// saveSession(data)
// Persists the JWT and basic user info to localStorage so other
// pages can read them without requiring another login.
//
// Keys stored:
//   'token' — the raw JWT string (sent as Authorization header later)
//   'user'  — JSON string of { id, first_name } for display purposes
// -------------------------------------------------------------
function saveSession(data) {
    // Store the JWT so protected routes can include it in requests
    localStorage.setItem('token', data.token);
    // Store non-sensitive user info for display (e.g. "Welcome, Alice")
    localStorage.setItem('user', JSON.stringify(data.user));

    // Restore this user's cart from their personal key ('cart_<id>').
    // If they've never logged in before, the key won't exist and they
    // start with an empty cart — JSON.parse('[]') handles both cases.
    var savedCart = localStorage.getItem('cart_' + data.user.id) || '[]';
    localStorage.setItem('cart', savedCart);
}


// -------------------------------------------------------------
// togglePasswordVisibility()
// Switches the password input between type="password" (dots)
// and type="text" (visible), and updates the eye icon.
// -------------------------------------------------------------
function togglePasswordVisibility() {
    var input = document.getElementById('password');
    var icon  = document.getElementById('toggle-icon');

    if (input.type === 'password') {
        input.type   = 'text';
        icon.className = 'bi-eye-slash';  // show "hide" icon
    } else {
        input.type   = 'password';
        icon.className = 'bi-eye';        // show "show" icon
    }
}


// -------------------------------------------------------------
// UI helpers
// -------------------------------------------------------------

function showError(message) {
    var alert = document.getElementById('error-alert');
    alert.textContent = message;
    alert.classList.remove('d-none');
}

function hideError() {
    var alert = document.getElementById('error-alert');
    alert.classList.add('d-none');
}

// Disables the submit button and shows a spinner while the fetch is in flight
function setLoading(isLoading) {
    var btn  = document.getElementById('login-btn');
    var text = document.getElementById('btn-text');
    var spin = document.getElementById('btn-spinner');

    btn.disabled          = isLoading;
    text.textContent      = isLoading ? 'Signing in…' : 'Sign in';
    spin.classList.toggle('d-none', !isLoading);
}
