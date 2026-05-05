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
    loadCart();           // shared — reads localStorage, updates badge
    renderCartPage();     // page-specific — renders items + order summary
    setupCheckoutForm();  // wire the checkout form submit event
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

    // Show or hide the checkout form depending on whether the cart has items
    var checkoutSection = document.getElementById('checkout-section');
    if (cart.length === 0) {
        container.innerHTML = '';
        checkoutSection.classList.add('d-none');   // hide form when cart is empty
        return;
    }
    checkoutSection.classList.remove('d-none');    // reveal form when cart has items

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
// setupCheckoutForm()
// Wires the checkout form's submit event to handleCheckout().
// Called once on DOMContentLoaded — the form is always in the DOM
// (static HTML in cart.html) even when hidden, so getElementById
// is safe to call here without waiting for renderCartPage().
// -------------------------------------------------------------
function setupCheckoutForm() {
    document.getElementById('checkout-form').addEventListener('submit', handleCheckout);
}


// -------------------------------------------------------------
// handleCheckout(e)
// Called when the user submits the checkout form.
//
// Steps:
//   1. Prevent the native browser form submit
//   2. Read email and card number from the form
//   3. POST { items: cart, email, cardNumber } to /api/checkout
//   4. 201 → clear the cart from localStorage → redirect to
//            index.html?order=success
//   5. 400 → show the field-specific error and keep the cart intact
// -------------------------------------------------------------
async function handleCheckout(e) {
    // Stop the browser from navigating away via a traditional POST
    e.preventDefault();

    var email      = document.getElementById('checkout-email').value.trim();
    var cardNumber = document.getElementById('checkout-card').value.trim();

    // Hide any previous error before a new attempt
    hideCheckoutError();
    setCheckoutLoading(true);

    try {
        var response = await fetch('http://localhost:3000/api/checkout', {
            method:  'POST',
            // Tell the server we're sending JSON
            headers: { 'Content-Type': 'application/json' },
            // Build the payload: real cart items + form fields
            body: JSON.stringify({
                items:      cart,       // the shared cart[] array from cart-utils.js
                email:      email,
                cardNumber: cardNumber
            })
        });

        var data = await response.json();

        if (response.ok && data.success) {
            // --- Order placed successfully ---

            // Clear the active cart so the navbar badge resets
            localStorage.removeItem('cart');

            // If the user is logged in, clear their personal cart key too
            // so they don't see the same items if they visit the cart again
            var storedUser = localStorage.getItem('user');
            if (storedUser) {
                var user = JSON.parse(storedUser);
                localStorage.removeItem('cart_' + user.id);
            }

            // Redirect to the shop with a flag so index.html can show a banner
            window.location.href = 'index.html?order=success';

        } else {
            // --- API returned 400 with a field-specific error ---
            // Show the error next to the relevant field if we can identify it,
            // otherwise show it in the general error banner at the top of the form.
            var message = data.error || 'Checkout failed. Please try again.';

            // Highlight the specific field that failed when the server tells us which one
            if (data.field === 'email') {
                document.getElementById('checkout-email').classList.add('is-invalid');
            } else if (data.field === 'cardNumber') {
                document.getElementById('checkout-card').classList.add('is-invalid');
            }

            showCheckoutError(message);
        }

    } catch (err) {
        // Network error — backend not running or unreachable
        showCheckoutError('Could not reach the server. Make sure the backend is running.');
    } finally {
        setCheckoutLoading(false);
    }
}


// -------------------------------------------------------------
// Checkout UI helpers
// -------------------------------------------------------------

function showCheckoutError(message) {
    // Remove any previous is-invalid highlights when showing a new error
    document.getElementById('checkout-email').classList.remove('is-invalid');
    document.getElementById('checkout-card').classList.remove('is-invalid');

    var alert = document.getElementById('checkout-error');
    alert.textContent = message;
    alert.classList.remove('d-none');
}

function hideCheckoutError() {
    document.getElementById('checkout-email').classList.remove('is-invalid');
    document.getElementById('checkout-card').classList.remove('is-invalid');
    document.getElementById('checkout-error').classList.add('d-none');
}

function setCheckoutLoading(isLoading) {
    var btn     = document.getElementById('place-order-btn');
    var spinner = document.getElementById('checkout-spinner');
    var text    = document.getElementById('checkout-btn-text');

    btn.disabled = isLoading;
    spinner.classList.toggle('d-none', !isLoading);
    text.innerHTML = isLoading
        ? 'Placing order…'
        : '<i class="bi-lock-fill me-2"></i>Place Order';
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
