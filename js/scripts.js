/*!
* Start Bootstrap - Shop Homepage v5.0.6 (https://startbootstrap.com/template/shop-homepage)
* Copyright 2013-2023 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-shop-homepage/blob/master/LICENSE)
*/

// =============================================================
// DATA FLOW OVERVIEW (matches sequence diagram)
//
//  Browser                 requestProducts()           fetch()                products.json
//    |                           |                        |                        |
//    |-- DOMContentLoaded -----> |                        |                        |
//    |                           |-- fetch(path) -------> |                        |
//    |                           |                        |-- HTTP GET ----------> |
//    |                           |                        |<-- JSON response ------ |
//    |                           |<-- res.json() ---------|                        |
//    |                           |                        |                        |
//    |                    renderUI(products)              |                        |
//    |                           |                        |                        |
//    |<-- DOM updated -----------|                        |                        |
//
// Step 1 → DOMContentLoaded fires requestProducts()
// Step 2 → requestProducts() calls fetch() with the path to products.json
// Step 3 → fetch() makes an HTTP GET request and returns a Promise
// Step 4 → The resolved response is parsed as JSON (array of product objects)
// Step 5 → The parsed array is passed into renderUI()
// Step 6 → renderUI() builds HTML cards and injects them into #product-grid
// =============================================================


// -------------------------------------------------------------
// ENTRY POINT
// Waits for the full DOM to load before starting the data flow.
// Ensures #product-grid exists before we try to write into it.
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    requestProducts('products.json');
});


// -------------------------------------------------------------
// STEP 1 — requestProducts(path)
// Initiates the data flow by calling fetch() with the given
// JSON file path. Handles errors if the file cannot be loaded.
// -------------------------------------------------------------
function requestProducts(path) {
    fetch(path)                         // Step 2: send HTTP GET to products.json
        .then(function (response) {
            // Step 3: parse the raw HTTP response body as a JSON array
            return response.json();
        })
        .then(function (products) {
            // Step 4: products is now a JavaScript array of product objects.
            // Pass the data downstream to renderUI() to build the page.
            renderUI(products);
        })
        .catch(function (error) {
            // If fetch fails (wrong path, network error, invalid JSON)
            // log the error so it is visible in the browser DevTools console.
            console.error('requestProducts failed:', error);
        });
}


// -------------------------------------------------------------
// STEP 2 — renderUI(products)
// Receives the full array of product objects and injects the
// generated HTML into the #product-grid container in index.html.
// Each product is converted to a card via buildProductCard().
// -------------------------------------------------------------
function renderUI(products) {
    var grid = document.getElementById('product-grid');

    // Map each product object → HTML string, then join into one block
    grid.innerHTML = products.map(function (product) {
        return buildProductCard(product);
    }).join('');
}


// -------------------------------------------------------------
// HELPER — buildProductCard(product)
// Converts a single product object into a Bootstrap card HTML
// string. Called once per product inside renderUI().
//
// Data used from the product object:
//   product.badge   → shows "Sale" label when not null
//   product.image   → <img> src attribute
//   product.name    → card title
//   product.rating  → shows star icons when not null
//   product.price   → formatted by formatPrice()
//   product.action  → decides button label ("View options" / "Add to cart")
// -------------------------------------------------------------
function buildProductCard(product) {

    // Badge: only rendered when product.badge is not null
    var badge = product.badge
        ? '<div class="badge bg-dark text-white position-absolute" style="top:0.5rem;right:0.5rem">' + product.badge + '</div>'
        : '';

    // Stars: only rendered when product.rating is not null
    var stars = product.rating !== null ? buildStars() : '';

    // Price: formatted differently based on price.type
    var price = formatPrice(product.price);

    // Action button: label depends on the product's action field
    var actionBtn = product.action === 'view-options'
        ? '<a class="btn btn-outline-dark mt-auto" href="#">View options</a>'
        : '<a class="btn btn-outline-dark mt-auto" href="#">Add to cart</a>';

    // Return the full Bootstrap card HTML for this product
    return (
        '<div class="col mb-5">' +
            '<div class="card h-100">' +
                badge +
                '<img class="card-img-top" src="' + product.image + '" alt="' + product.name + '" />' +
                '<div class="card-body p-4">' +
                    '<div class="text-center">' +
                        '<h5 class="fw-bolder">' + product.name + '</h5>' +
                        stars +
                        price +
                    '</div>' +
                '</div>' +
                '<div class="card-footer p-4 pt-0 border-top-0 bg-transparent">' +
                    '<div class="text-center">' + actionBtn + '</div>' +
                '</div>' +
            '</div>' +
        '</div>'
    );
}


// -------------------------------------------------------------
// HELPER — buildStars()
// Returns the Bootstrap Icons star row HTML.
// All 5 stars are filled (bi-star-fill).
// -------------------------------------------------------------
function buildStars() {
    return (
        '<div class="d-flex justify-content-center small text-warning mb-2">' +
            '<div class="bi-star-fill"></div>' +
            '<div class="bi-star-fill"></div>' +
            '<div class="bi-star-fill"></div>' +
            '<div class="bi-star-fill"></div>' +
            '<div class="bi-star-fill"></div>' +
        '</div>'
    );
}


// -------------------------------------------------------------
// HELPER — formatPrice(price)
// Reads price.type and returns the correct HTML string:
//
//   "fixed" → plain price          e.g.  $29.99
//   "range" → min – max            e.g.  $29.99 – $59.99
//   "sale"  → strikethrough + new  e.g.  ~~$50.00~~  $29.99
// -------------------------------------------------------------
function formatPrice(price) {
    if (price.type === 'range') {
        // price.current = lower bound, price.max = upper bound
        return '$' + price.current.toFixed(2) + ' &ndash; $' + price.max.toFixed(2);
    }
    if (price.type === 'sale') {
        // price.original = old price (struck through), price.current = sale price
        return (
            '<span class="text-muted text-decoration-line-through">$' + price.original.toFixed(2) + '</span>' +
            ' $' + price.current.toFixed(2)
        );
    }
    // "fixed" — single price, no decoration
    return '$' + price.current.toFixed(2);
}
