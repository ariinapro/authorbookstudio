// js/product.js
// Reads ?id= from the URL and populates the single-product page.
// Requires products.js to be loaded first (see <head> in product.html).

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const product = products.find((p) => p.id === id);

  if (!product) {
    console.warn(`[product.js] Товар не найден: id="${id}"`);
    return;
  }

  // Page title
  document.title = `${product.name} — Искусство неидеального`;

  // Heading
  const heading = document.querySelector(".single-product-heading");
  if (heading) heading.textContent = product.name;

  // Description
  const desc = document.querySelector(".single-prouct-description");
  if (desc) desc.textContent = product.description;

  // Main image (top section)
  const mainImg = document.querySelector(".single-product-info img");
  if (mainImg) {
    mainImg.src = product.imgs[0];
    mainImg.alt = product.name;
  }

  // Secondary image row — render all product images
  const imageRow = document.querySelector(".single-product-row");
  if (imageRow) {
    imageRow.innerHTML = product.imgs
      .slice(1)
      .map((src) => `<img src="${src}" alt="${product.name}" loading="lazy" />`)
      .join("");
  }

  // Quantity counter
  let qty = 1;
  const totalEl = document.getElementById("total");
  const minusBtn = document.getElementById("minus-one");
  const plusBtn = document.getElementById("plus-one");

  function setQty(n) {
    qty = Math.max(1, n);
    if (totalEl) totalEl.textContent = qty;
  }

  if (minusBtn) minusBtn.addEventListener("click", () => setQty(qty - 1));
  if (plusBtn) plusBtn.addEventListener("click", () => setQty(qty + 1));

  // "Заказать" button → mailto
  const orderBtn = document.querySelector(".product-order");
  if (orderBtn) {
    orderBtn.addEventListener("click", () => {
      const subject = encodeURIComponent(`Заказ: ${product.name} × ${qty}`);
      // window.location.href = `mailto:hello@theartofnotperfect.com?subject=${subject}`;
    });
  }

  // "Вам может понравиться" — fill with the other products
  const cols = document.querySelectorAll(".single-product-featurefd-col");
  const others = products.filter((p) => p.id !== product.id);

  cols.forEach((col, i) => {
    const other = others[i];
    if (!other) {
      col.style.display = "none";
      return;
    }

    const img = col.querySelector("img");
    if (img) {
      img.src = other.thumb;
      img.alt = other.name;
    }

    // Insert name + price label before the "купить" link
    let label = col.querySelector(".featured-name");
    if (!label) {
      label = document.createElement("p");
      label.className = "featured-name";
      const link = col.querySelector("a");
      col.insertBefore(label, link);
    }
    label.textContent = `${other.name} — ${other.price} ₽`;

    const link = col.querySelector("a");
    if (link) link.href = `./product.html?id=${other.id}`;
  });
});
