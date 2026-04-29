/*!
* Start Bootstrap - Shop Homepage v5.0.6 (https://startbootstrap.com/template/shop-homepage)
* Copyright 2013-2023 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-shop-homepage/blob/master/LICENSE)
*/

// =============================================================
// DATA FLOW OVERVIEW
//
//  Browser              requestProducts()     fetch()        products.json
//    |                        |                  |                |
//    |-- DOMContentLoaded --> |                  |                |
//    |                        |-- fetch(path) -> |                |
//    |                        |                  |-- HTTP GET --> |
//    |                        |                  |<-- JSON ------ |
//    |                        |<-- res.json() ---|                |
//    |                        |                  |                |
//    |            allProducts = products (stored)|                |
//    |          buildCategoryDropdown(products)  |                |
//    |                   renderUI(allProducts)   |                |
//    |<-- DOM updated --------|                  |                |
//    |                        |                  |                |
//    |-- user types/selects -> searchProducts()  |                |
//    |          filterProducts(searchTerm, category)              |
//    |                   renderUI(filtered)      |                |
//    |<-- DOM updated --------|                  |                |
// =============================================================


// -------------------------------------------------------------
// MODULE-LEVEL STORE
// allProducts      — populated once by fetch('products.json').
// selectedCategory — tracks the active dropdown choice.
// All filtering reads from these two variables.
// -------------------------------------------------------------
var allProducts      = [];
var selectedCategory = 'All';


// -------------------------------------------------------------
// ENTRY POINT
// Waits for the full DOM to load, then starts the data flow
// and wires up all search/filter event listeners.
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    requestProducts('products.json');
    setupSearch();
});


// -------------------------------------------------------------
// STEP 1 — requestProducts(path)
// Fetches products.json — the single source of truth for all
// product data. If the fetch fails, shows an error message in
// the grid telling the user to open the page via a local server.
// -------------------------------------------------------------
function requestProducts(path) {
    fetch(path)
        .then(function (response) {
            // Parse the HTTP response body into a JS array
            return response.json();
        })
        .then(function (products) {
            // Store every product so filterProducts() can read them later
            allProducts = products;
            buildCategoryDropdown(allProducts);
            renderUI(allProducts);
        })
        .catch(function (error) {
            // fetch failed — most likely the page was opened via file://
            // instead of a local server. Show a helpful message in the grid.
            console.error('Could not load products.json:', error);
            document.getElementById('product-grid').innerHTML =
                '<div class="col-12 text-center py-5">' +
                    '<i class="bi-exclamation-circle fs-1 text-danger d-block mb-3"></i>' +
                    '<p class="fw-bold">Could not load products.json</p>' +
                    '<p class="text-muted small">Open this page through a local server<br>' +
                    '(e.g. VS Code Live Server or <code>npx serve .</code>)</p>' +
                '</div>';
        });
}


// -------------------------------------------------------------
// STEP 2 — filterProducts(searchTerm, category)
//
// Filters the allProducts array and returns a new array of
// products that match BOTH conditions:
//
//   1. searchTerm — compared against product.name only
//                   (case-insensitive, partial match allowed)
//
//   2. category   — if 'All', every product passes this check;
//                   otherwise only products in that exact
//                   category are included
//
// Uses Array.filter() which loops every item and keeps it only
// when the callback returns true.
// -------------------------------------------------------------
function filterProducts(searchTerm, category) {

    // Normalise the search term to lower-case once so we don't
    // repeat .toLowerCase() inside the loop for every product.
    var lowerTerm = searchTerm.toLowerCase();

    return allProducts.filter(function (product) {

        // --- Name match ---
        // Convert product.name to lower-case and check whether
        // it contains the search term anywhere (partial match).
        // e.g. "wallet" matches "Classic Leather Wallet"
        var nameMatches = product.name.toLowerCase().indexOf(lowerTerm) !== -1;

        // --- Category match ---
        // When category is 'All' every product qualifies, so we
        // skip the category check entirely with a short-circuit.
        // Otherwise compare the product's category exactly.
        var categoryMatches = (category === 'All') || (product.category === category);

        // Only keep this product if BOTH conditions are true.
        // If searchTerm is empty, lowerTerm is '' and indexOf always
        // returns 0, so nameMatches is true for every product.
        return nameMatches && categoryMatches;
    });
}


// -------------------------------------------------------------
// STEP 3 — searchProducts()
// Called on every keystroke and every category selection.
// Reads the search input and the selectedCategory variable,
// calls filterProducts(), then re-renders the grid.
// -------------------------------------------------------------
function searchProducts() {
    var searchTerm = document.getElementById('search-input').value.trim();

    // Show/hide the × clear button based on whether there is text
    var clearBtn = document.getElementById('search-clear');
    clearBtn.style.display = searchTerm.length > 0 ? 'inline-block' : 'none';

    // selectedCategory is set by the dropdown click handler
    var results = filterProducts(searchTerm, selectedCategory);

    renderUI(results);
}


// -------------------------------------------------------------
// STEP 4 — renderUI(products)
// Injects product cards into #product-grid.
// Shows an empty-state message when no products match.
// Always updates the search status line.
// -------------------------------------------------------------
function renderUI(products) {
    var grid = document.getElementById('product-grid');

    if (products.length === 0) {
        grid.innerHTML =
            '<div class="col-12 text-center py-5">' +
                '<i class="bi-search fs-1 text-muted d-block mb-3"></i>' +
                '<p class="text-muted">No products found. Try a different search or category.</p>' +
            '</div>';
        updateSearchStatus(0);
        return;
    }

    // Map each product object to an HTML card string, join, inject
    grid.innerHTML = products.map(function (product) {
        return buildProductCard(product);
    }).join('');

    updateSearchStatus(products.length);
}


// -------------------------------------------------------------
// HELPER — setupSearch()
// Attaches event listeners for search interaction.
// Search fires only on explicit user action (button click or Enter),
// not on every keystroke — keeps the grid stable while typing.
// Category changes are handled inside buildCategoryDropdown().
// Called once on DOMContentLoaded.
// -------------------------------------------------------------
function setupSearch() {
    var input    = document.getElementById('search-input');
    var searchBtn = document.getElementById('search-btn');
    var clearBtn  = document.getElementById('search-clear');

    // Spyglass button click → run the search
    searchBtn.addEventListener('click', searchProducts);

    // Pressing Enter inside the input → same as clicking the button
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            searchProducts();
        }
    });

    // Clear button: wipe the text input and reset the grid
    clearBtn.addEventListener('click', function () {
        input.value = '';
        clearBtn.style.display = 'none';
        searchProducts();
        input.focus();
    });
}


// -------------------------------------------------------------
// HELPER — buildCategoryDropdown(products)
// Reads all unique category values from the products array,
// sorts them A→Z, and appends <li><a> items to #category-filter-menu.
// Also handles click events so selecting an item:
//   1. Updates selectedCategory
//   2. Updates the button label
//   3. Highlights the active item
//   4. Triggers searchProducts()
// The "All Categories" item and divider already exist in the HTML.
// -------------------------------------------------------------
function buildCategoryDropdown(products) {
    var menu = document.getElementById('category-filter-menu');
    var btn  = document.getElementById('category-filter-btn');

    // Collect unique categories using an object as a lookup set
    var seen = {};
    var categories = [];
    products.forEach(function (product) {
        if (!seen[product.category]) {
            seen[product.category] = true;
            categories.push(product.category);
        }
    });

    // Sort alphabetically for a predictable, readable list
    categories.sort();

    // Append one <li><a> per unique category below the divider
    categories.forEach(function (category) {
        var li = document.createElement('li');
        var a  = document.createElement('a');
        a.className = 'dropdown-item';
        a.href = '#';
        a.setAttribute('data-value', category);
        a.textContent = category;
        li.appendChild(a);
        menu.appendChild(li);
    });

    // Single delegated click handler for the entire menu
    menu.addEventListener('click', function (e) {
        e.preventDefault();

        // Find the clicked <a> even if a child element was hit
        var target = e.target.closest('.dropdown-item');
        if (!target) return;

        // 1. Store the chosen category globally
        selectedCategory = target.getAttribute('data-value');

        // 2. Update the button label to show the active choice
        btn.textContent = selectedCategory === 'All' ? 'All Categories' : selectedCategory;

        // 3. Move the "active" highlight to the clicked item
        menu.querySelectorAll('.dropdown-item').forEach(function (item) {
            item.classList.remove('active');
        });
        target.classList.add('active');

        // 4. Re-filter the product grid immediately
        searchProducts();
    });
}


// -------------------------------------------------------------
// HELPER — updateSearchStatus(count)
// Shows the result count below the search bar only when a
// filter is active. Hides the line when no filter is applied.
// Reads selectedCategory from the module-level variable.
// -------------------------------------------------------------
function updateSearchStatus(count) {
    var searchTerm = document.getElementById('search-input').value.trim();
    var status     = document.getElementById('search-status');

    // No active filter — hide the status line entirely
    if (searchTerm === '' && selectedCategory === 'All') {
        status.textContent = '';
        return;
    }

    // Build a readable message: "3 products found"
    status.textContent = count + (count === 1 ? ' product' : ' products') + ' found';
}


// -------------------------------------------------------------
// HELPER — buildProductCard(product)
// Converts one product object into a Bootstrap card HTML string.
// -------------------------------------------------------------
function buildProductCard(product) {

    var badge = product.badge
        ? '<div class="badge bg-dark text-white position-absolute" style="top:0.5rem;right:0.5rem">' + product.badge + '</div>'
        : '';

    var stars  = product.rating !== null ? buildStars() : '';
    var price  = formatPrice(product.price);

    var actionBtn = product.action === 'view-options'
        ? '<a class="btn btn-outline-dark mt-auto" href="#">View options</a>'
        : '<a class="btn btn-outline-dark mt-auto" href="#">Add to cart</a>';

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
// Returns 5 filled Bootstrap Icons star elements.
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
//   "fixed" → $29.99
//   "range" → $29.99 – $59.99
//   "sale"  → ~~$50.00~~ $29.99
// -------------------------------------------------------------
function formatPrice(price) {
    if (price.type === 'range') {
        return '$' + price.current.toFixed(2) + ' &ndash; $' + price.max.toFixed(2);
    }
    if (price.type === 'sale') {
        return (
            '<span class="text-muted text-decoration-line-through">$' + price.original.toFixed(2) + '</span>' +
            ' $' + price.current.toFixed(2)
        );
    }
    return '$' + price.current.toFixed(2);
}
