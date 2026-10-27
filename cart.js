(function () {
  var PRODUCT = { id: 'voya-passport-bag', name: 'Voya Passport Bag', price: 64 };
  var FREE_SHIPPING = 50;
  var SHIPPING_FEE = 6;
  var MAX_QTY = 10;
  var KEY = 'voya-cart-v1';

  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return '$' + n.toFixed(2).replace(/\.00$/, ''); };

  var color = { name: 'Forest', hex: '#1c2e29' };
  var cart = load();

  function load() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY));
      if (Array.isArray(data)) {
        return data.filter(function (l) {
          return l && typeof l.color === 'string' && l.qty > 0;
        }).map(function (l) {
          return { color: l.color, hex: String(l.hex || '#000'), qty: Math.min(MAX_QTY, l.qty | 0) };
        });
      }
    } catch (e) {}
    return [];
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {}
  }

  /* ---------- state changes ---------- */
  function add(qty) {
    var line = cart.find(function (l) { return l.color === color.name; });
    if (line) line.qty = Math.min(MAX_QTY, line.qty + qty);
    else cart.push({ color: color.name, hex: color.hex, qty: Math.min(MAX_QTY, qty) });
    commit();
  }
  function setQty(colorName, qty) {
    cart = cart.filter(function (l) {
      if (l.color === colorName) {
        if (qty <= 0) return false;
        l.qty = Math.min(MAX_QTY, qty);
      }
      return true;
    });
    commit();
  }
  function commit() { save(); render(); }

  /* ---------- rendering ---------- */
  function totals() {
    var count = cart.reduce(function (s, l) { return s + l.qty; }, 0);
    var subtotal = count * PRODUCT.price;
    var shipping = count === 0 ? 0 : (subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE);
    return { count: count, subtotal: subtotal, shipping: shipping, total: subtotal + shipping };
  }

  function render() {
    var t = totals();
    var badge = $('cartCount');
    badge.textContent = t.count;
    badge.hidden = t.count === 0;

    var lines = $('lines');
    lines.innerHTML = '';
    cart.forEach(function (l) {
      var li = document.createElement('li');
      li.className = 'line';
      li.innerHTML =
        '<span class="line__img" style="background:' + l.hex + '"></span>' +
        '<div class="line__info">' +
          '<strong>' + PRODUCT.name + '</strong>' +
          '<span class="muted">' + l.color + '</span>' +
          '<div class="stepper">' +
            '<button data-act="dec" aria-label="Decrease quantity">−</button>' +
            '<span aria-live="polite">' + l.qty + '</span>' +
            '<button data-act="inc" aria-label="Increase quantity"' + (l.qty >= MAX_QTY ? ' disabled' : '') + '>+</button>' +
          '</div>' +
        '</div>' +
        '<div class="line__side"><strong>' + fmt(l.qty * PRODUCT.price) + '</strong>' +
          '<button class="link" data-act="rm">Remove</button></div>';
      li.dataset.color = l.color;
      lines.appendChild(li);
    });

    var empty = t.count === 0;
    $('empty').hidden = !empty;
    $('foot').hidden = empty;
    $('ship').hidden = empty;
    $('subtotal').textContent = fmt(t.subtotal);
    $('shipping').textContent = t.shipping ? fmt(t.shipping) : 'Free';
    $('total').textContent = fmt(t.total);

    var left = FREE_SHIPPING - t.subtotal;
    var pct = Math.min(100, (t.subtotal / FREE_SHIPPING) * 100);
    $('ship').innerHTML =
      '<p>' + (left > 0 ? 'Add <strong>' + fmt(left) + '</strong> for free shipping' : '🎉 You\'ve unlocked free shipping') + '</p>' +
      '<div class="bar"><span style="width:' + pct + '%"></span></div>';
  }

  /* ---------- drawer ---------- */
  var lastFocus = null;
  function openCart() {
    lastFocus = document.activeElement;
    $('overlay').hidden = false;
    $('drawer').classList.add('is-open');
    $('drawer').setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    $('cartClose').focus();
  }
  function closeCart() {
    $('overlay').hidden = true;
    $('drawer').classList.remove('is-open');
    $('drawer').setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  var toastTimer;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  /* ---------- events ---------- */
  $('cartOpen').addEventListener('click', openCart);
  $('cartClose').addEventListener('click', closeCart);
  $('overlay').addEventListener('click', closeCart);
  $('emptyCta').addEventListener('click', closeCart);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && $('drawer').classList.contains('is-open')) closeCart();
  });

  $('lines').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    var name = btn.closest('.line').dataset.color;
    var line = cart.find(function (l) { return l.color === name; });
    if (!line) return;
    var act = btn.dataset.act;
    if (act === 'inc') setQty(name, line.qty + 1);
    else if (act === 'dec') setQty(name, line.qty - 1);
    else setQty(name, 0);
  });

  $('add').addEventListener('click', function () {
    var qty = parseInt($('qty').value, 10) || 1;
    add(qty);
    openCart();
  });

  document.querySelectorAll('.swatch').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.swatch').forEach(function (b) {
        b.classList.remove('is-active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-checked', 'true');
      color = { name: btn.dataset.name, hex: btn.style.getPropertyValue('--c') };
      $('chosenColor').textContent = color.name;
      document.querySelector('.hero__art rect').setAttribute('fill', color.hex);
    });
  });

  $('checkout').addEventListener('click', function () {
    var t = totals();
    // Demo only: a real store would redirect to a hosted checkout (Shopify, Stripe, ...) here.
    closeCart();
    toast('Demo checkout — ' + t.count + ' item' + (t.count > 1 ? 's' : '') + ', ' + fmt(t.total) + ' total. Connect a payment provider to go live.');
  });

  // keep multiple tabs in sync
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { cart = load(); render(); }
  });

  $('yr').textContent = new Date().getFullYear();
  render();
})();
