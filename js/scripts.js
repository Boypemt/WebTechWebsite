/*!
* Start Bootstrap - Shop Homepage v5.0.6 (https://startbootstrap.com/template/shop-homepage)
* Copyright 2013-2023 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-shop-homepage/blob/master/LICENSE)
*/

fetch('products.json')
    .then(res => res.json())
    .then(products => renderProducts(products))
    .catch(err => console.error('Failed to load products:', err));

function formatPrice(price) {
    if (price.type === 'range') {
        return `$${price.current.toFixed(2)} &ndash; $${price.max.toFixed(2)}`;
    }
    if (price.type === 'sale') {
        return `<span class="text-muted text-decoration-line-through">$${price.original.toFixed(2)}</span>
                $${price.current.toFixed(2)}`;
    }
    return `$${price.current.toFixed(2)}`;
}

function renderStars() {
    return `<div class="d-flex justify-content-center small text-warning mb-2">
                <div class="bi-star-fill"></div>
                <div class="bi-star-fill"></div>
                <div class="bi-star-fill"></div>
                <div class="bi-star-fill"></div>
                <div class="bi-star-fill"></div>
            </div>`;
}

function renderProduct(product) {
    const badge = product.badge
        ? `<div class="badge bg-dark text-white position-absolute" style="top:0.5rem;right:0.5rem">${product.badge}</div>`
        : '';

    const stars = product.rating !== null ? renderStars() : '';

    const actionBtn = product.action === 'view-options'
        ? `<a class="btn btn-outline-dark mt-auto" href="#">View options</a>`
        : `<a class="btn btn-outline-dark mt-auto" href="#">Add to cart</a>`;

    return `
        <div class="col mb-5">
            <div class="card h-100">
                ${badge}
                <img class="card-img-top" src="${product.image}" alt="${product.name}" />
                <div class="card-body p-4">
                    <div class="text-center">
                        <h5 class="fw-bolder">${product.name}</h5>
                        ${stars}
                        ${formatPrice(product.price)}
                    </div>
                </div>
                <div class="card-footer p-4 pt-0 border-top-0 bg-transparent">
                    <div class="text-center">${actionBtn}</div>
                </div>
            </div>
        </div>`;
}

function renderProducts(products) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = products.map(renderProduct).join('');
}
