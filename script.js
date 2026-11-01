(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const money = (n) => n.toLocaleString("ru-RU") + " ₽";

  /* ---------- Header ---------- */
  const header = $("#header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  const burger = $("#burger");
  const mobileMenu = $("#mobileMenu");
  const closeMenu = () => {
    mobileMenu.hidden = true;
    burger.setAttribute("aria-expanded", "false");
  };
  burger.addEventListener("click", () => {
    const open = mobileMenu.hidden;
    mobileMenu.hidden = !open;
    burger.setAttribute("aria-expanded", String(open));
  });
  $$("#mobileMenu a").forEach((a) => a.addEventListener("click", closeMenu));

  /* ---------- Reveal ---------- */
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );
    revealEls.forEach((el, i) => {
      el.style.transitionDelay = (i % 4) * 55 + "ms";
      io.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- Filters ---------- */
  const chips = $$(".chip");
  const products = $$(".product");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.toggle("is-active", c === chip));
      const cat = chip.dataset.filter;
      products.forEach((p) => {
        const show = cat === "all" || p.dataset.cat === cat;
        p.classList.toggle("is-hidden", !show);
      });
    });
  });

  /* ---------- Cart ---------- */
  const STORAGE_KEY = "list-cart-v1";
  const cartEl = $("#cart");
  const overlay = $("#cartOverlay");
  const cartBtn = $("#cartBtn");
  const cartClose = $("#cartClose");
  const cartItemsEl = $("#cartItems");
  const cartEmptyEl = $("#cartEmpty");
  const cartCountEl = $("#cartCount");
  const cartTotalEl = $("#cartTotal");
  const checkoutBtn = $("#checkoutBtn");
  const toast = $("#toast");

  const productData = {};
  products.forEach((card) => {
    productData[card.dataset.id] = {
      id: card.dataset.id,
      name: card.dataset.name,
      price: Number(card.dataset.price),
      tint: card.dataset.tint,
      svg: card.querySelector(".media svg").cloneNode(true),
    };
  });

  let cart = {};
  try {
    cart = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    cart = {};
  }
  Object.keys(cart).forEach((id) => {
    if (!productData[id] || !(cart[id] > 0)) delete cart[id];
  });

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      /* cart stays for the session */
    }
  };

  const totalCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = () =>
    Object.entries(cart).reduce((sum, [id, qty]) => sum + productData[id].price * qty, 0);

  let toastTimer;
  const showToast = (text) => {
    toast.textContent = text;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  };

  const renderCart = () => {
    cartItemsEl.innerHTML = "";

    Object.keys(cart).forEach((id) => {
      const p = productData[id];
      const qty = cart[id];
      const item = document.createElement("div");
      item.className = "cart-item";

      const thumb = document.createElement("div");
      thumb.className = "cart-thumb";
      thumb.style.setProperty("--tint", p.tint);
      thumb.appendChild(p.svg.cloneNode(true));

      const body = document.createElement("div");
      const name = document.createElement("div");
      name.className = "cart-item-name";
      name.textContent = p.name;
      const price = document.createElement("div");
      price.className = "cart-item-price";
      price.textContent = money(p.price * qty);

      const qtyWrap = document.createElement("div");
      qtyWrap.className = "cart-qty";
      const minus = document.createElement("button");
      minus.type = "button";
      minus.textContent = "−";
      minus.setAttribute("aria-label", "Уменьшить количество");
      minus.addEventListener("click", () => changeQty(id, -1));
      const num = document.createElement("span");
      num.textContent = qty;
      const plus = document.createElement("button");
      plus.type = "button";
      plus.textContent = "+";
      plus.setAttribute("aria-label", "Увеличить количество");
      plus.addEventListener("click", () => changeQty(id, 1));
      qtyWrap.append(minus, num, plus);

      body.append(name, price, qtyWrap);

      const remove = document.createElement("button");
      remove.className = "cart-remove";
      remove.type = "button";
      remove.setAttribute("aria-label", "Удалить " + p.name);
      remove.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
      remove.addEventListener("click", () => {
        delete cart[id];
        save();
        renderCart();
      });

      item.append(thumb, body, remove);
      cartItemsEl.appendChild(item);
    });

    const count = totalCount();
    cartEmptyEl.hidden = count > 0;
    cartCountEl.hidden = count === 0;
    cartCountEl.textContent = count;
    cartTotalEl.textContent = money(totalPrice());
    checkoutBtn.disabled = count === 0;
    save();
  };

  const changeQty = (id, delta) => {
    cart[id] = (cart[id] || 0) + delta;
    if (cart[id] <= 0) delete cart[id];
    renderCart();
  };

  const lockScroll = () => {
    const locked = cartEl.classList.contains("is-open") || reader.classList.contains("is-open");
    document.body.classList.toggle("no-scroll", locked);
  };

  let cartReturnFocus = null;
  const openCart = () => {
    cartReturnFocus = document.activeElement;
    renderCart();
    cartEl.classList.add("is-open");
    overlay.classList.add("is-open");
    cartEl.setAttribute("aria-hidden", "false");
    cartBtn.setAttribute("aria-expanded", "true");
    lockScroll();
    cartClose.focus();
  };
  const closeCart = () => {
    cartEl.classList.remove("is-open");
    overlay.classList.remove("is-open");
    cartEl.setAttribute("aria-hidden", "true");
    cartBtn.setAttribute("aria-expanded", "false");
    lockScroll();
    if (cartReturnFocus) cartReturnFocus.focus();
  };

  cartBtn.addEventListener("click", openCart);
  cartClose.addEventListener("click", closeCart);
  overlay.addEventListener("click", closeCart);

  const addToCart = (id) => {
    if (!productData[id]) return;
    cart[id] = (cart[id] || 0) + 1;
    renderCart();
    showToast(productData[id].name + " — в корзине");
    cartCountEl.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(1)" }],
      { duration: 320, easing: "ease-out" }
    );
  };

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (btn) {
      e.preventDefault();
      addToCart(btn.dataset.id);
    }
  });

  checkoutBtn.addEventListener("click", () => {
    if (!totalCount()) return;
    cart = {};
    renderCart();
    closeCart();
    showToast("Демо-заказ оформлен. Мы напишем вам в течение дня.");
  });

  renderCart();

  /* ---------- Journal reader ---------- */
  const reader = $("#reader");
  const readerInner = $("#readerInner");
  const readerScroll = $("#readerScroll");
  const readerClose = $("#readerClose");
  let readerReturnFocus = null;

  const openArticle = (id) => {
    const tpl = document.getElementById("tpl-" + id);
    if (!tpl) return;

    readerInner.innerHTML = tpl.innerHTML;

    const card = document.querySelector('.journal-card[data-article="' + id + '"]');
    const cover = readerInner.querySelector(".js-reader-cover");
    if (card && cover) {
      const art = card.querySelector(".art svg");
      if (art) cover.appendChild(art.cloneNode(true));
    }

    readerReturnFocus = document.activeElement;
    reader.classList.add("is-open");
    reader.setAttribute("aria-hidden", "false");
    lockScroll();
    readerScroll.scrollTop = 0;
    readerClose.focus();
  };

  const closeArticle = () => {
    reader.classList.remove("is-open");
    reader.setAttribute("aria-hidden", "true");
    lockScroll();
    if (readerReturnFocus) readerReturnFocus.focus();
  };

  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-article]");
    if (!link) return;
    e.preventDefault();
    openArticle(link.dataset.article);
  });

  readerClose.addEventListener("click", closeArticle);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (reader.classList.contains("is-open")) closeArticle();
    else if (cartEl.classList.contains("is-open")) closeCart();
  });

  /* ---------- Subscribe ---------- */
  const form = $("#subscribeForm");
  const email = $("#email");
  const note = $("#formNote");
  const noteDefault = note.textContent;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = email.value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    note.classList.remove("is-success", "is-error");
    if (!valid) {
      note.textContent = "Проверьте адрес — кажется, в нём опечатка.";
      note.classList.add("is-error");
      email.focus();
      return;
    }
    note.textContent = "Готово. Ближайшее письмо придёт в пятницу.";
    note.classList.add("is-success");
    form.reset();
    setTimeout(() => {
      note.textContent = noteDefault;
      note.classList.remove("is-success");
    }, 5000);
  });

  /* ---------- Year ---------- */
  $("#year").textContent = new Date().getFullYear();
})();
