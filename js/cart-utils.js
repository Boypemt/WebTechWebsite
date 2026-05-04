/*!
 * cart-utils.js — Shared Cart Utilities
 * Loaded on every page BEFORE the page-specific script.
 *
 * WHY A SHARED FILE?
 * loadCart(), saveToLocalStorage(), updateCartBadge(), and formatPrice()
 * were copy-pasted in all three JS files. Any bug fix or change had to be
 * made in three places. This file is the single source of truth for those
 * helpers. Each page script calls them without redefining them.
 *
 * Shared globals (available to every script on the same page):
 *   cart               — array of cart-item objects [{ id, name, image, price, quantity }]
 *   loadCart()         — reads localStorage → fills cart[] → updateCartBadge()
 *   saveToLocalStorage() — persists cart[] as JSON to localStorage
 *   updateCartBadge()  — sums all quantities → updates #cart-badge in the navbar
 *   formatPrice(price) — converts a price object into display HTML
 */


// -------------------------------------------------------------
// SHARED CART STATE
// Declared once here. All three page scripts read and write this
// same global variable because they share the same browser window.
//
// Cart item shape: { id, name, image, price, quantity }
// Starts empty — loadCart() fills it from localStorage on page load.
// -------------------------------------------------------------
var cart = [];


// -------------------------------------------------------------
// loadCart()
// Reads the saved cart from localStorage so the navbar badge
// reflects items added on other pages.
//
// localStorage stores strings only, so the cart was saved with
// JSON.stringify() and is restored with JSON.parse().
// If nothing is stored yet, cart stays [] (empty).
//
// Called once on DOMContentLoaded on every page.
// -------------------------------------------------------------
function loadCart() {
    var stored = localStorage.getItem('cart');

    // Only parse when data exists — JSON.parse(null) would throw.
    if (stored) {
        cart = JSON.parse(stored);  // JSON string → JS array
    }

    updateCartBadge();
    updateNavAuth();  // sync login/logout button on every page load
}


// -------------------------------------------------------------
// saveToLocalStorage()
// Serialises cart[] to a JSON string and writes it to localStorage.
// Called after every cart mutation (add, remove, quantity change).
//
// JSON.stringify: JS array → string  (what localStorage stores)
// JSON.parse     (on next load):  string → JS array
// -------------------------------------------------------------
function saveToLocalStorage() {
    localStorage.setItem('cart', JSON.stringify(cart));

    // Also write under 'cart_<userId>' so each user's cart is preserved
    // across logout/login. Without this, logging out and back in would
    // start a fresh cart even though the user added items this session.
    var storedUser = localStorage.getItem('user');
    if (storedUser) {
        var user = JSON.parse(storedUser);
        localStorage.setItem('cart_' + user.id, JSON.stringify(cart));
    }
}


// -------------------------------------------------------------
// updateCartBadge()
// Recalculates the total item count and updates the navbar badge.
// .reduce() walks cart[] and sums every item.quantity into a
// running total starting at 0.
// -------------------------------------------------------------
function updateCartBadge() {
    // cart.length = number of unique products (not total quantity)
    var badge = document.getElementById('cart-badge');
    if (badge) {
        badge.textContent = cart.length;
    }
}


// -------------------------------------------------------------
// formatPrice(price)
// Converts a price object into display HTML.
// Used by scripts.js (product cards) and product.js (detail page).
//
// price.type values:
//   "fixed" → "$X.XX"
//   "sale"  → strikethrough original + current price
//   "range" → "$X.XX – $Y.YY"
// -------------------------------------------------------------
// -------------------------------------------------------------
// updateNavAuth()
// Reads localStorage for a logged-in user and updates #nav-auth:
//   Logged in  → "Hi, Alice" + Logout button
//   Logged out → Login button linking to login.html
//
// Called automatically by loadCart() on every page load so the
// navbar always reflects the current auth state without extra calls.
// -------------------------------------------------------------
function updateNavAuth() {
    var navAuth = document.getElementById('nav-auth');
    if (!navAuth) return;  // page has no #nav-auth element — skip

    var stored = localStorage.getItem('user');

    if (stored) {
        // User is logged in — show their first name and a logout button
        var user = JSON.parse(stored);
        navAuth.innerHTML =
            '<span class="text-muted me-1 d-none d-md-inline">Hi, ' + user.first_name + '</span>' +
            '<button class="btn btn-outline-secondary btn-sm" onclick="logout()">Logout</button>';
    } else {
        // No session — show a login button
        navAuth.innerHTML = '<a href="login.html" class="btn btn-outline-dark">Login</a>';
    }
}


// -------------------------------------------------------------
// logout()
// Clears the JWT and user info from localStorage and sends the
// user back to the login page.
// Called by the Logout button injected by updateNavAuth().
// -------------------------------------------------------------
function logout() {
    // Save the cart one final time under the user key before wiping 'cart'.
    // This ensures items added in this session survive the logout so they
    // are restored when the same user logs back in.
    var storedUser = localStorage.getItem('user');
    if (storedUser) {
        var user = JSON.parse(storedUser);
        localStorage.setItem('cart_' + user.id, localStorage.getItem('cart') || '[]');
    }

    // Clear the active cart so the next user starts with an empty cart
    localStorage.removeItem('cart');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}


function formatPrice(price) {
    if (price.type === 'sale') {
        return (
            '<span class="text-muted text-decoration-line-through">$' + price.original.toFixed(2) + '</span>' +
            ' $' + price.current.toFixed(2)
        );
    }
    if (price.type === 'range') {
        return '$' + price.current.toFixed(2) + ' &ndash; $' + price.max.toFixed(2);
    }
    // Default: fixed price
    return '$' + price.current.toFixed(2);
}
