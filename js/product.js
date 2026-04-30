/*!
 * product.js — Product Detail Page
 * Reads ?id=X from the URL, fetches products.json, renders the matching
 * product, and handles "Add to cart".
 *
 * Shared helpers (cart[], loadCart, saveToLocalStorage, updateCartBadge,
 * formatPrice) are defined in cart-utils.js, loaded before this file.
 *
 * DATA FLOW:
 *   DOMContentLoaded
 *     ├── loadCart()  ←── cart-utils.js  (restores badge)
 *     └── requestProduct()
 *           ├── reads ?id from URL via URLSearchParams
 *           └── fetch('products.json')
 *                 └── response.json()
 *                       └── find product by id
 *                             ├── found → renderProduct(p)
 *                             └── not found → renderNotFound()
 *
 *   user clicks "Add to cart"
 *     └── addToCart(p, qty)
 *           ├── cart.find()  → exists  → quantity += qty
 *           │               → missing → cart.push(new item)
 *           ├── saveToLocalStorage()  ←── cart-utils.js
 *           └── updateCartBadge()     ←── cart-utils.js
 */


// -------------------------------------------------------------
// MODULE-LEVEL STORE
// product — the single product object being viewed (set after fetch).
// cart    — declared in cart-utils.js (shared across all pages).
// -------------------------------------------------------------
var product = null;


// -------------------------------------------------------------
// ENTRY POINT
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    loadCart();       // shared — reads localStorage, updates badge
    requestProduct();
});


// -------------------------------------------------------------
// requestProduct()
// 1. Reads the ?id query parameter from the current URL.
// 2. Fetches products.json.
// 3. Finds the matching product by id.
// 4. Renders the product detail or a "not found" message.
//
// URLSearchParams parses the query string:
//   window.location.search → "?id=3"
//   params.get('id')       → "3"  (string — parseInt converts it)
// -------------------------------------------------------------
function requestProduct() {
    var params    = new URLSearchParams(window.location.search);
    var productId = parseInt(params.get('id'), 10);

    // No valid id in the URL — show not-found immediately
    if (isNaN(productId)) {
        renderNotFound();
        return;
    }

    fetch('products.json')
        .then(function (response) {
            return response.json();
        })
        .then(function (products) {
            // .find() returns the matching item or undefined
            product = products.find(function (p) {
                return p.id === productId;
            });

            if (product) {
                renderProduct(product);
            } else {
                renderNotFound();
            }
        })
        .catch(function () {
            // fetch() fails when opened via file:// (no server)
            var container = document.getElementById('product-detail');
            container.innerHTML =
                '<div class="col-12">' +
                    '<div class="alert alert-warning" role="alert">' +
                        '<h5 class="fw-bolder">Could not load product data</h5>' +
                        '<p class="mb-0">Please run the site through a local server ' +
                        '(<code>npx serve .</code> or VS Code Live Server). ' +
                        'The <code>fetch()</code> API does not work on <code>file://</code> URLs.</p>' +
                    '</div>' +
                '</div>';
        });
}


// -------------------------------------------------------------
// renderProduct(p)
// Builds the product detail layout and injects it into #product-detail.
//   Left  col — product image
//   Right col — name, category badge, price, qty selector,
//               "Add to cart" button, confirmation alert, back link
// formatPrice() is shared — defined in cart-utils.js.
// -------------------------------------------------------------
function renderProduct(p) {
    var container = document.getElementById('product-detail');
    var priceHTML = formatPrice(p.price);  // shared — cart-utils.js

    container.innerHTML =
        '<div class="row gx-5 align-items-start">' +

            // ── Left column: product image ──────────────────────────
            '<div class="col-md-6 mb-4 mb-md-0">' +
                '<img class="img-fluid rounded shadow-sm" src="' + p.image + '" alt="' + p.name + '" />' +
            '</div>' +

            // ── Right column: product info + controls ───────────────
            '<div class="col-md-6 d-flex flex-column gap-3">' +

                '<span class="badge bg-secondary fs-6 align-self-start">' + p.category + '</span>' +

                '<h2 class="fw-bolder mb-0">' + p.name + '</h2>' +

                '<div class="fs-4 fw-bold">' + priceHTML + '</div>' +

                // Quantity selector
                '<div>' +
                    '<label class="form-label fw-semibold" for="qty-input">Quantity</label>' +
                    '<div class="input-group" style="max-width:160px">' +
                        '<button class="btn btn-outline-dark" type="button" id="qty-minus">&#8722;</button>' +
                        '<input class="form-control text-center fw-bold" type="number" ' +
                               'id="qty-input" value="1" min="1" max="99" readonly />' +
                        '<button class="btn btn-outline-dark" type="button" id="qty-plus">&#43;</button>' +
                    '</div>' +
                '</div>' +

                '<button class="btn btn-dark btn-lg" type="button" id="add-to-cart-btn">' +
                    '<i class="bi-cart-fill me-2"></i>Add to cart' +
                '</button>' +

                // Shown after the user adds the item
                '<div id="cart-confirmation" class="alert alert-success d-none" role="alert">' +
                    '<i class="bi-check-circle-fill me-2"></i>' +
                    'Added to cart! <a href="cart.html" class="alert-link">View cart</a>' +
                '</div>' +

                '<a href="index.html" class="text-muted small">' +
                    '<i class="bi-arrow-left me-1"></i>Back to shop' +
                '</a>' +

            '</div>' +
        '</div>';

    // Wire controls after the HTML exists in the DOM
    setupProductControls(p);
}


// -------------------------------------------------------------
// setupProductControls(p)
// Attaches event listeners to the qty –/+ buttons and the
// "Add to cart" button rendered by renderProduct().
// Must be called after renderProduct() so getElementById works.
// -------------------------------------------------------------
function setupProductControls(p) {
    var qtyInput      = document.getElementById('qty-input');
    var qtyMinus      = document.getElementById('qty-minus');
    var qtyPlus       = document.getElementById('qty-plus');
    var addBtn        = document.getElementById('add-to-cart-btn');
    var confirmation  = document.getElementById('cart-confirmation');

    // Decrement — min 1
    qtyMinus.addEventListener('click', function () {
        var current = parseInt(qtyInput.value, 10);
        if (current > 1) qtyInput.value = current - 1;
    });

    // Increment — max 99
    qtyPlus.addEventListener('click', function () {
        var current = parseInt(qtyInput.value, 10);
        if (current < 99) qtyInput.value = current + 1;
    });

    // Add selected quantity to cart then show confirmation
    addBtn.addEventListener('click', function () {
        var qty = parseInt(qtyInput.value, 10);
        addToCart(p, qty);
        confirmation.classList.remove('d-none');
    });
}


// -------------------------------------------------------------
// renderNotFound()
// Shown when the ?id param is missing or matches no product.
// -------------------------------------------------------------
function renderNotFound() {
    var container = document.getElementById('product-detail');
    container.innerHTML =
        '<div class="text-center py-5">' +
            '<i class="bi-exclamation-circle fs-1 text-muted d-block mb-3"></i>' +
            '<h4 class="fw-bolder">Product not found</h4>' +
            '<p class="text-muted">The product you\'re looking for doesn\'t exist.</p>' +
            '<a href="index.html" class="btn btn-dark mt-2">Back to Shop</a>' +
        '</div>';
}


// -------------------------------------------------------------
// addToCart(p, qty)
// Adds `qty` units of the product to the shared cart array.
//
// .find() returns a reference to the actual object in cart[],
// so mutating existingItem.quantity updates the array in place.
//
// saveToLocalStorage() and updateCartBadge() are shared —
// defined in cart-utils.js.
// -------------------------------------------------------------
function addToCart(p, qty) {
    var existingItem = cart.find(function (item) {
        return item.id === p.id;
    });

    if (existingItem) {
        existingItem.quantity += qty;
    } else {
        cart.push({
            id:       p.id,
            name:     p.name,
            image:    p.image,
            price:    p.price.current,
            quantity: qty
        });
    }

    saveToLocalStorage();  // shared — cart-utils.js
    updateCartBadge();     // shared — cart-utils.js
}
