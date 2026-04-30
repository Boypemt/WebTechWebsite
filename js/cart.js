/*!
 * cart.js — Shopping Cart Page
 * Renders and manages cart items from the shared localStorage cart.
 *
 * Shared helpers (cart[], loadCart, saveToLocalStorage, updateCartBadge)
 * are defined in cart-utils.js, loaded before this file.
 *
 * DATA FLOW:
 *   DOMContentLoaded
 *     ├── loadCart()  ←── cart-utils.js  (reads localStorage → fills cart[])
 *     └── renderCartPage()
 *           ├── renderCartItems()    → injects item rows into #cart-items
 *           └── renderOrderSummary() → injects totals into #order-summary
 *
 *   user clicks – / + / Remove
 *     └── changeQuantity() / removeItem()
 *           ├── mutates cart[]
 *           ├── saveToLocalStorage()  ←── cart-utils.js
 *           ├── updateCartBadge()     ←── cart-utils.js
 *           └── renderCartPage()      → re-renders both panels
 */


// -------------------------------------------------------------
// ENTRY POINT
// loadCart() (from cart-utils.js) reads localStorage and fills cart[].
// renderCartPage() then uses cart[] to build the full cart UI.
// Separated so loadCart() stays a clean shared utility without
// knowing about cart-page-specific rendering logic.
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    loadCart();       // shared — reads localStorage, updates badge
    renderCartPage(); // page-specific — renders items + order summary
});


// -------------------------------------------------------------
// renderCartPage()
// Calls both render functions to refresh the full cart UI.
// Called on load and after every cart mutation.
// -------------------------------------------------------------
function renderCartPage() {
    renderCartItems();
    renderOrderSummary();
}


// -------------------------------------------------------------
// renderCartItems()
// Injects a card row for each item in cart[] into #cart-items.
// Shows an empty-state message when the cart is empty.
// -------------------------------------------------------------
function renderCartItems() {
    var container = document.getElementById('cart-items');

    if (cart.length === 0) {
        container.innerHTML =
            '<div class="text-center py-5">' +
                '<i class="bi-cart-x fs-1 text-muted d-block mb-3"></i>' +
                '<p class="text-muted fs-5">Your cart is empty.</p>' +
                '<a href="index.html" class="btn btn-dark mt-2">Continue Shopping</a>' +
            '</div>';
        return;
    }

    // Map each cart item to a card row HTML string and join them
    container.innerHTML = cart.map(function (item) {
        return buildCartRow(item);
    }).join('');
}


// -------------------------------------------------------------
// buildCartRow(item)
// Returns the Bootstrap card HTML for one cart item.
// Includes: image, name, unit price, quantity controls (– n +),
// line total, and a remove button.
//
// onclick handlers pass item.id directly into the JS functions.
// -------------------------------------------------------------
function buildCartRow(item) {
    var lineTotal = (item.price * item.quantity).toFixed(2);

    return (
        '<div class="card mb-3">' +
            '<div class="card-body">' +
                '<div class="row align-items-center g-3">' +

                    // Product image
                    '<div class="col-3 col-md-2">' +
                        '<img src="' + item.image + '" alt="' + item.name + '" class="img-fluid rounded" />' +
                    '</div>' +

                    // Product name + unit price
                    '<div class="col-9 col-md-4">' +
                        '<h6 class="fw-bolder mb-1">' + item.name + '</h6>' +
                        '<span class="text-muted small">$' + item.price.toFixed(2) + ' each</span>' +
                    '</div>' +

                    // Quantity controls: – [n] +
                    '<div class="col-7 col-md-3">' +
                        '<div class="input-group input-group-sm">' +
                            '<button class="btn btn-outline-dark" type="button" ' +
                                    'onclick="changeQuantity(' + item.id + ', -1)">&#8722;</button>' +
                            '<span class="form-control text-center fw-bold">' + item.quantity + '</span>' +
                            '<button class="btn btn-outline-dark" type="button" ' +
                                    'onclick="changeQuantity(' + item.id + ', 1)">&#43;</button>' +
                        '</div>' +
                    '</div>' +

                    // Line total (price × quantity)
                    '<div class="col-3 col-md-2 text-end fw-bold">' +
                        '$' + lineTotal +
                    '</div>' +

                    // Remove button
                    '<div class="col-2 col-md-1 text-end">' +
                        '<button class="btn btn-sm btn-outline-danger" type="button" ' +
                                'onclick="removeItem(' + item.id + ')" title="Remove">' +
                            '<i class="bi-trash"></i>' +
                        '</button>' +
                    '</div>' +

                '</div>' +
            '</div>' +
        '</div>'
    );
}


// -------------------------------------------------------------
// renderOrderSummary()
// Calculates and displays the subtotal and total in #order-summary.
// Hidden when the cart is empty (cart items panel already shows message).
// -------------------------------------------------------------
function renderOrderSummary() {
    var container = document.getElementById('order-summary');

    if (cart.length === 0) {
        container.innerHTML = '';
        return;
    }

    // Subtotal: sum of (price × quantity) for every item
    var subtotal = cart.reduce(function (sum, item) {
        return sum + (item.price * item.quantity);
    }, 0);

    container.innerHTML =
        '<div class="card">' +
            '<div class="card-body">' +
                '<h5 class="fw-bolder mb-3">Order Summary</h5>' +

                '<div class="d-flex justify-content-between mb-2 text-muted small">' +
                    '<span>Items (' + cart.length + ')</span>' +
                    '<span>$' + subtotal.toFixed(2) + '</span>' +
                '</div>' +

                '<hr />' +

                '<div class="d-flex justify-content-between fw-bold fs-5 mb-4">' +
                    '<span>Total</span>' +
                    '<span>$' + subtotal.toFixed(2) + '</span>' +
                '</div>' +

                '<button class="btn btn-dark w-100 mb-2" type="button">' +
                    '<i class="bi-lock-fill me-2"></i>Proceed to Checkout' +
                '</button>' +

                '<a href="index.html" class="btn btn-outline-dark w-100">Continue Shopping</a>' +
            '</div>' +
        '</div>';
}


// -------------------------------------------------------------
// removeItem(productId)
// Removes the item with the given id from cart[] using .filter(),
// which returns a new array excluding that item.
// saveToLocalStorage() and updateCartBadge() are shared —
// defined in cart-utils.js.
// -------------------------------------------------------------
function removeItem(productId) {
    // .filter() keeps every item EXCEPT the one being removed
    cart = cart.filter(function (item) {
        return item.id !== productId;
    });

    saveToLocalStorage();  // shared — cart-utils.js
    updateCartBadge();     // shared — cart-utils.js
    renderCartPage();
}


// -------------------------------------------------------------
// changeQuantity(productId, delta)
// Increments or decrements a cart item's quantity by delta (+1/-1).
// If quantity drops to 0 or below, the item is removed entirely.
//
// .find() returns a reference to the actual object in cart[] so
// mutating item.quantity updates the array in place.
// -------------------------------------------------------------
function changeQuantity(productId, delta) {
    var item = cart.find(function (i) {
        return i.id === productId;
    });

    if (!item) return;

    item.quantity += delta;

    // Quantity hit zero — treat as a removal
    if (item.quantity <= 0) {
        removeItem(productId);
        return;
    }

    saveToLocalStorage();  // shared — cart-utils.js
    updateCartBadge();     // shared — cart-utils.js
    renderCartPage();
}
