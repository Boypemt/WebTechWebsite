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
