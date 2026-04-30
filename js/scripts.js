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
//    |   setupSearch()        |                  |                |
//    |   loadCart() ←──── cart-utils.js          |                |
//    |   #catalog delegation  |                  |                |
//    |                        |-- fetch(path) -> |                |
//    |                        |                  |-- HTTP GET --> |
//    |                        |                  |<-- JSON ------ |
//    |                        |<-- res.json() ---|                |
//    |            allProducts = products          |                |
//    |          buildCategoryDropdown(products)   |                |
//    |                   renderUI(allProducts)    |                |
//    |<-- DOM updated --------|                  |                |
//    |                        |                  |                |
//    |-- user clicks 🔍 or presses Enter         |                |
//    |   OR selects a category → searchProducts()                 |
//    |         filterProducts(searchTerm, category)               |
//    |                   renderUI(filtered)       |                |
//    |<-- DOM updated --------|                  |                |
// =============================================================


// -------------------------------------------------------------
// MODULE-LEVEL STORE
// allProducts      — populated once by fetch('products.json').
// selectedCategory — tracks the active dropdown choice, default 'All'.
// cart             — declared in cart-utils.js (shared across all pages).
// -------------------------------------------------------------
var allProducts      = [];
var selectedCategory = 'All';


// -------------------------------------------------------------
// ENTRY POINT
// Single DOMContentLoaded block — all page startup in one place:
//   1. Fetch and render the product grid.
//   2. Wire up search/filter listeners.
//   3. Restore cart badge from localStorage (via cart-utils.js).
//   4. Attach Add-to-cart event delegation on the stable #catalog parent.
//
// WHY ONE BLOCK?
// Having multiple DOMContentLoaded listeners works, but splitting
// startup logic across them makes the entry point hard to follow.
// One block = one clear list of everything that runs on page load.
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    requestProducts('products.json');
    setupSearch();
    loadCart();  // shared — defined in cart-utils.js

    // WHY EVENT DELEGATION?
    // Product cards are injected dynamically by renderUI(). Attaching
    // a listener to each .add-to-cart button directly would break on
    // every re-render because the old elements are destroyed and
    // recreated. ONE listener on the stable parent #catalog survives
    // every re-render without needing to be re-attached.
    //
    // Flow: user clicks "Add to cart"
    //   → click event bubbles up to #catalog
    //   → listener fires → e.target.closest('.add-to-cart') finds button
    //   → addToCart(productId) updates cart[]
    var catalog = document.getElementById('catalog');
    catalog.addEventListener('click', function (e) {
        // .closest() walks up the DOM from the clicked element to find
        // an .add-to-cart ancestor. Returns null for unrelated clicks.
        var btn = e.target.closest('.add-to-cart');
        if (!btn) return;

        // data-id is always a string from HTML — parseInt converts it
        // to a number to match the numeric id values in allProducts.
        var productId = parseInt(btn.getAttribute('data-id'), 10);
        addToCart(productId);
    });
});


// -------------------------------------------------------------
// requestProducts(path)
// Fetches products.json — the single source of truth for product
// data. Stores the result, builds the category dropdown, and
// renders all product cards.
// If fetch fails (e.g. page opened via file://), shows an error
// card telling the user to use a local server.
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
// filterProducts(searchTerm, category)
// Returns a filtered subset of allProducts matching BOTH:
//   1. searchTerm — case-insensitive partial match on product.name
//   2. category   — exact match, or 'All' to skip the check
//
// Uses Array.filter() — keeps only items where the callback is true.
// If searchTerm is '', indexOf('') === 0, so every name matches.
// -------------------------------------------------------------
function filterProducts(searchTerm, category) {
    // Normalise once so we don't repeat .toLowerCase() per product
    var lowerTerm = searchTerm.toLowerCase();

    return allProducts.filter(function (product) {
        // Partial, case-insensitive match anywhere in the name
        var nameMatches = product.name.toLowerCase().indexOf(lowerTerm) !== -1;

        // 'All' skips the category check (short-circuit)
        var categoryMatches = (category === 'All') || (product.category === category);

        return nameMatches && categoryMatches;
    });
}


// -------------------------------------------------------------
// searchProducts()
// Called when the user clicks 🔍, presses Enter, selects a
// category, or clears the search input.
// Reads the current input value and selectedCategory, then
// re-renders the grid with the filtered results.
// -------------------------------------------------------------
function searchProducts() {
    var searchTerm = document.getElementById('search-input').value.trim();

    // Show the × clear button only when there is text to clear
    var clearBtn = document.getElementById('search-clear');
    clearBtn.style.display = searchTerm.length > 0 ? 'inline-block' : 'none';

    var results = filterProducts(searchTerm, selectedCategory);
    renderUI(results);
}


// -------------------------------------------------------------
// renderUI(products)
// Injects product cards into #product-grid.
// Shows an empty-state message when no products match.
// Always calls updateSearchStatus() to refresh the result count.
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

    // Map each product object to a card HTML string, join, inject
    grid.innerHTML = products.map(function (product) {
        return buildProductCard(product);
    }).join('');

    updateSearchStatus(products.length);
}


// -------------------------------------------------------------
// setupSearch()
// Attaches event listeners for the search bar.
// Search fires on explicit user action only (button click or Enter),
// not on every keystroke — keeps the grid stable while typing.
// -------------------------------------------------------------
function setupSearch() {
    var input     = document.getElementById('search-input');
    var searchBtn = document.getElementById('search-btn');
    var clearBtn  = document.getElementById('search-clear');

    // Spyglass button click → run the search
    searchBtn.addEventListener('click', searchProducts);

    // Enter key inside the input → same as clicking the button
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            searchProducts();
        }
    });

    // Clear button: wipe the input and reset the grid
    clearBtn.addEventListener('click', function () {
        input.value = '';
        clearBtn.style.display = 'none';
        searchProducts();
        input.focus();
    });
}


// -------------------------------------------------------------
// buildCategoryDropdown(products)
// Extracts unique categories from the products array, sorts them
// A→Z, and appends <li><a> items to #category-filter-menu.
// Handles clicks to update selectedCategory, the button label,
// the active highlight, and re-filter the grid.
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

    categories.sort();

    // Append one <li><a> per category below the existing divider
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

        var target = e.target.closest('.dropdown-item');
        if (!target) return;

        // 1. Store the chosen category globally
        selectedCategory = target.getAttribute('data-value');

        // 2. Update the button label
        btn.textContent = selectedCategory === 'All' ? 'All Categories' : selectedCategory;

        // 3. Move the active highlight to the clicked item
        menu.querySelectorAll('.dropdown-item').forEach(function (item) {
            item.classList.remove('active');
        });
        target.classList.add('active');

        // 4. Re-filter the grid immediately
        searchProducts();
    });
}


// -------------------------------------------------------------
// updateSearchStatus(count)
// Shows the result count below the search bar only when a filter
// is active. Hides the line when showing all products unfiltered.
// -------------------------------------------------------------
function updateSearchStatus(count) {
    var searchTerm = document.getElementById('search-input').value.trim();
    var status     = document.getElementById('search-status');

    if (searchTerm === '' && selectedCategory === 'All') {
        status.textContent = '';
        return;
    }

    status.textContent = count + (count === 1 ? ' product' : ' products') + ' found';
}


// -------------------------------------------------------------
// buildProductCard(product)
// Converts one product object into a Bootstrap card HTML string.
// "View options" links to product.html?id=X.
// "Add to cart" relies on event delegation wired in DOMContentLoaded.
// formatPrice() is shared — defined in cart-utils.js.
// -------------------------------------------------------------
function buildProductCard(product) {
    var badge = product.badge
        ? '<div class="badge bg-dark text-white position-absolute" style="top:0.5rem;right:0.5rem">' + product.badge + '</div>'
        : '';

    var stars     = product.rating !== null ? buildStars() : '';
    var price     = formatPrice(product.price);  // shared — cart-utils.js

    // "View options" links to the product detail page.
    // "Add to cart" is caught by the #catalog event delegation listener.
    var actionBtn = product.action === 'view-options'
        ? '<a class="btn btn-outline-dark mt-auto" href="product.html?id=' + product.id + '">View options</a>'
        : '<button class="btn btn-outline-dark mt-auto add-to-cart" type="button" data-id="' + product.id + '">Add to cart</button>';

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
// buildStars()
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
// addToCart(productID)
// Manages the cart array. Uses .find() to check whether the
// product is already in the cart:
//   EXISTS  → increment item.quantity
//   MISSING → find the full product from allProducts, push new item
//
// saveToLocalStorage() and updateCartBadge() are shared —
// defined in cart-utils.js.
// -------------------------------------------------------------
function addToCart(productID) {
    // .find() returns the actual cart item object (not a copy),
    // so mutating existingItem.quantity updates cart[] in place.
    var existingItem = cart.find(function (item) {
        return item.id === productID;
    });

    if (existingItem) {
        existingItem.quantity++;
    } else {
        var product = allProducts.find(function (p) {
            return p.id === productID;
        });
        if (!product) return;

        // Store only the fields the cart needs — price as a flat
        // number simplifies the arithmetic in cart.js.
        cart.push({
            id:       product.id,
            name:     product.name,
            image:    product.image,
            price:    product.price.current,
            quantity: 1
        });
    }

    saveToLocalStorage();  // shared — cart-utils.js
    updateCartBadge();     // shared — cart-utils.js
}
