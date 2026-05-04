/*!
 * register.js — Register Page Logic
 *
 * DATA FLOW:
 *   DOMContentLoaded
 *     └── loadCart()              ← cart-utils.js (restores navbar badge)
 *     └── checkAlreadyLoggedIn() ← redirect if already authenticated
 *     └── wire password input    → validatePassword() on every keystroke
 *     └── wire form submit       → handleSubmit()
 *
 *   user types in password field
 *     └── validatePassword()
 *           └── checks 3 rules, updates the checklist UI in real time
 *
 *   user submits the form
 *     └── handleSubmit(e)
 *           └── re-runs all validation — blocks submit if any rule fails
 *           └── POST /api/register  { first_name, email, password }
 *                 ├── 201 → saveSession() → redirect to index.html
 *                 ├── 409 → showError("Email already registered")
 *                 └── other → showError(server message)
 */


// Password rules — defined once, used by both the live checker and submit guard
var RULES = {
    length:    { test: function (p) { return p.length >= 8; },              label: 'At least 8 characters'              },
    uppercase: { test: function (p) { return /[A-Z]/.test(p); },           label: 'At least one uppercase letter'       },
    special:   { test: function (p) { return /[!@#$%^&*]/.test(p); },      label: 'At least one special character (!@#$%^&*)' }
};


// -------------------------------------------------------------
// ENTRY POINT
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    loadCart();              // shared — restores cart badge in navbar
    checkAlreadyLoggedIn();  // skip register page if already authenticated

    // Update the password rule checklist on every keystroke
    document.getElementById('password').addEventListener('input', validatePassword);

    // Also re-check "passwords match" whenever confirm changes
    document.getElementById('confirm-password').addEventListener('input', checkConfirm);

    // Show/hide password toggle
    document.getElementById('toggle-password').addEventListener('click', togglePasswordVisibility);

    // Wire the form submit
    document.getElementById('register-form').addEventListener('submit', handleSubmit);
});


// -------------------------------------------------------------
// checkAlreadyLoggedIn()
// Redirect to shop if the user is already logged in.
// -------------------------------------------------------------
function checkAlreadyLoggedIn() {
    if (localStorage.getItem('token')) {
        window.location.href = 'index.html';
    }
}


// -------------------------------------------------------------
// validatePassword()
// Runs all three rules against the current password value and
// updates each checklist item to show ✓ (green) or ✗ (red).
// Called on every keystroke so feedback is immediate.
// -------------------------------------------------------------
function validatePassword() {
    var password = document.getElementById('password').value;

    // Update each rule indicator individually
    Object.keys(RULES).forEach(function (key) {
        var passes = RULES[key].test(password);
        var item   = document.getElementById('rule-' + key);

        // Toggle Bootstrap text colour classes
        item.className        = passes ? 'text-success' : 'text-danger';
        // Replace icon to give a clear visual signal
        item.querySelector('i').className = passes ? 'bi-check-circle-fill me-1' : 'bi-x-circle-fill me-1';
    });

    // Also refresh the "passwords match" indicator
    checkConfirm();
}


// -------------------------------------------------------------
// checkConfirm()
// Shows whether the confirm-password field matches the password.
// -------------------------------------------------------------
function checkConfirm() {
    var password = document.getElementById('password').value;
    var confirm  = document.getElementById('confirm-password').value;
    var item     = document.getElementById('rule-match');

    // Only show the match indicator once the user has started typing in confirm
    if (confirm.length === 0) {
        item.className = 'text-muted';
        item.querySelector('i').className = 'bi-circle me-1';
        return;
    }

    var matches = password === confirm;
    item.className = matches ? 'text-success' : 'text-danger';
    item.querySelector('i').className = matches ? 'bi-check-circle-fill me-1' : 'bi-x-circle-fill me-1';
}


// -------------------------------------------------------------
// allRulesPass()
// Returns true only when every password rule passes AND the
// confirm field matches. Used to guard form submission.
// -------------------------------------------------------------
function allRulesPass() {
    var password = document.getElementById('password').value;
    var confirm  = document.getElementById('confirm-password').value;

    var rulesPass = Object.keys(RULES).every(function (key) {
        return RULES[key].test(password);
    });

    return rulesPass && password === confirm;
}


// -------------------------------------------------------------
// handleSubmit(e)
// 1. Prevents native form submission
// 2. Blocks submit if any password rule fails
// 3. POSTs to /api/register
// 4. On 201 → saves session → redirects to shop
// 5. On error → shows the API error message
// -------------------------------------------------------------
async function handleSubmit(e) {
    e.preventDefault();

    var firstName = document.getElementById('first-name').value.trim();
    var email     = document.getElementById('email').value.trim();
    var password  = document.getElementById('password').value;

    // Run the full validation check before sending anything to the server
    if (!allRulesPass()) {
        showError('Please make sure your password meets all the requirements.');
        // Trigger the visual checklist so the user sees what failed
        validatePassword();
        return;
    }

    hideError();
    setLoading(true);

    try {
        var response = await fetch('http://localhost:3000/api/register', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ first_name: firstName, email: email, password: password })
        });

        var data = await response.json();

        if (response.ok && data.success) {
            // Registration succeeded — save the session and go to the shop
            saveSession(data);
            window.location.href = 'index.html';
        } else {
            // Server returned an error (e.g. 409 email already registered)
            showError(data.error || 'Registration failed. Please try again.');
        }
    } catch (err) {
        // Network error — backend not running
        showError('Could not reach the server. Make sure the backend is running.');
    } finally {
        setLoading(false);
    }
}


// -------------------------------------------------------------
// saveSession(data)
// Persists JWT and user info to localStorage — identical to login.js
// so both paths leave the app in the same authenticated state.
// -------------------------------------------------------------
function saveSession(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // New users start with an empty cart — ensure no stale cart leaks in
    var savedCart = localStorage.getItem('cart_' + data.user.id) || '[]';
    localStorage.setItem('cart', savedCart);
}


// -------------------------------------------------------------
// togglePasswordVisibility()
// -------------------------------------------------------------
function togglePasswordVisibility() {
    var input = document.getElementById('password');
    var icon  = document.getElementById('toggle-icon');

    if (input.type === 'password') {
        input.type         = 'text';
        icon.className     = 'bi-eye-slash';
    } else {
        input.type         = 'password';
        icon.className     = 'bi-eye';
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
    document.getElementById('error-alert').classList.add('d-none');
}

function setLoading(isLoading) {
    var btn  = document.getElementById('register-btn');
    var text = document.getElementById('btn-text');
    var spin = document.getElementById('btn-spinner');

    btn.disabled     = isLoading;
    text.textContent = isLoading ? 'Creating account…' : 'Create account';
    spin.classList.toggle('d-none', !isLoading);
}
