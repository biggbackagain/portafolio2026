"use strict";
let products = [];

const form = document.querySelector("#license-order-form");
const productSelect = document.querySelector("#license-product");
const qtyInput = document.querySelector("#license-qty");
const emailInput = document.querySelector("#buyer-email");
const confirmEmailInput = document.querySelector("#buyer-confirm-email");
const submitBtn = document.querySelector("#license-checkout-btn");
const modeBadge = document.querySelector("#license-mode-badge");
const modeNote = document.querySelector("#license-mode-note");
const statusMsg = document.querySelector("#license-order-message");
const returnBox = document.querySelector("#license-return-status");

const money = (cents) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(cents / 100) + " MXN";

function selectedProduct() {
  return products.find((p) => p.id === productSelect.value) || products[0];
}

function currentQty() {
  const n = Number.parseInt(qtyInput.value, 10);
  return Number.isInteger(n) && n >= 1 && n <= 20 ? n : 1;
}

function makeOrderCode() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return "LIC-" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function updateSummary() {
  const p = selectedProduct();
  if (!p) return;
  const q = currentQty();
  const total = p.priceCents * q;
  document.querySelector("#summary-title").textContent = p.title;
  document.querySelector("#summary-unit").textContent = money(p.priceCents);
  document.querySelector("#summary-qty").textContent = String(q);
  document.querySelector("#summary-total").textContent = money(total);
  document.querySelector("#summary-big-price").innerHTML = `${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(total / 100)} <span>MXN</span>`;
}

function populateSelect() {
  const prev = productSelect.value;
  productSelect.replaceChildren(
    ...products.map((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.title} — ${money(p.priceCents)}`;
      return opt;
    })
  );
  if (prev && products.some((p) => p.id === prev)) productSelect.value = prev;
  updateSummary();
}

document.querySelectorAll("[data-select-license]").forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    const id = btn.dataset.selectLicense;
    if (products.some((p) => p.id === id)) {
      productSelect.value = id;
      updateSummary();
    }
    document.querySelector("#comprar")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    qtyInput.focus({ preventScroll: true });
  });
});

productSelect.addEventListener("change", updateSummary);
qtyInput.addEventListener("input", updateSummary);

function checkEmailMatch() {
  const same = confirmEmailInput.value.trim().toLowerCase() === emailInput.value.trim().toLowerCase();
  confirmEmailInput.setCustomValidity(same ? "" : "Los correos deben coincidir para poder enviarte tu licencia.");
}
emailInput.addEventListener("input", checkEmailMatch);
confirmEmailInput.addEventListener("input", checkEmailMatch);

async function initCatalog() {
  try {
    const res = await fetch("assets/licenses.json");
    if (res.ok) {
      const data = await res.json();
      products = data.products || [];
      populateSelect();
    }
  } catch (_) {}

  modeBadge.textContent = "Pago con Mercado Pago · Sin comisiones ocultas";
  modeNote.textContent = "Completa tus datos de compra para recibir tu enlace de Mercado Pago por WhatsApp o correo. Al acreditarse tu pago, entre 1 y 2 horas llegará tu licencia a tu correo.";
  submitBtn.disabled = false;
  submitBtn.textContent = "Confirmar pedido y pagar por Mercado Pago ↗";
}

let emailClientPromise;
function loadEmailClient() {
  if (emailClientPromise) return emailClientPromise;
  emailClientPromise = new Promise((resolve, reject) => {
    if (window.emailjs) return resolve(window.emailjs);
    const script = document.createElement("script");
    const timeout = setTimeout(() => reject(new Error("Email service timeout")), 12000);
    script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    script.onload = () => { clearTimeout(timeout); resolve(window.emailjs); };
    script.onerror = () => { clearTimeout(timeout); reject(new Error("Email service unavailable")); };
    document.head.append(script);
  }).catch((err) => { emailClientPromise = null; throw err; });
  return emailClientPromise;
}

function showOrderConfirmation({ code, product, qty, total, email, waHref, directMpUrl }) {
  returnBox.hidden = false;
  returnBox.replaceChildren();
  const h = document.createElement("h3");
  h.textContent = "¡Pedido registrado correctamente!";
  returnBox.append(h);

  const codeEl = document.createElement("strong");
  codeEl.className = "reservation-code";
  codeEl.textContent = code;
  returnBox.append(codeEl);

  const detail = document.createElement("p");
  detail.textContent = `Concepto: ${product.title} · Cantidad: ${qty} · Total: ${money(total)}`;
  returnBox.append(detail);

  const delivery = document.createElement("p");
  delivery.innerHTML = `<strong>Entrega estimada:</strong> Una vez procesado tu pago en Mercado Pago, entre <strong>1 y 2 horas</strong> recibirás tu licencia e instrucciones en <strong>${email.replace(/[<>&]/g, "")}</strong>.`;
  returnBox.append(delivery);

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.style.marginTop = "18px";

  if (directMpUrl && qty === 1) {
    const mpLink = document.createElement("a");
    mpLink.className = "btn";
    mpLink.href = directMpUrl;
    mpLink.target = "_blank";
    mpLink.rel = "noopener noreferrer";
    mpLink.textContent = "Pagar ahora en Mercado Pago ↗";
    actions.append(mpLink);
  }

  const waLink = document.createElement("a");
  waLink.className = directMpUrl && qty === 1 ? "text-link" : "btn";
  waLink.href = waHref;
  waLink.target = "_blank";
  waLink.rel = "noopener noreferrer";
  waLink.textContent = directMpUrl && qty === 1 ? "Confirmar comprobante por WhatsApp ↗" : "Recibir enlace de Mercado Pago por WhatsApp ↗";
  actions.append(waLink);

  returnBox.append(actions);
  returnBox.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  checkEmailMatch();
  if (!form.reportValidity() || submitBtn.disabled) return;
  const product = selectedProduct();
  const qty = currentQty();
  const total = product.priceCents * qty;
  const code = makeOrderCode();
  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  const phone = form.elements.phone.value.trim();
  const notes = form.elements.notes.value.trim();

  submitBtn.disabled = true;
  submitBtn.textContent = "Registrando tu pedido…";
  statusMsg.hidden = true;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: "license_order_submit", order_code: code, product_id: product.id, quantity: qty, total_mxn: total / 100 });

  const summaryText = `Nuevo pedido de licencia (${code}):\nConcepto: ${product.title}\nCantidad: ${qty}\nTotal: ${money(total)}\nNombre: ${name}\nCorreo de entrega: ${email}\nTeléfono/WhatsApp: ${phone}${notes ? `\nNotas: ${notes}` : ""}`;
  const waHref = waUrl(`Hola Irán, registré mi pedido de licencia (${code}):\n• Concepto: ${product.title}\n• Cantidad: ${qty}\n• Total: ${money(total)}\n• Nombre: ${name}\n• Correo para entrega: ${email}${notes ? `\n• Notas: ${notes}` : ""}\nQuedo atento al enlace de Mercado Pago.`);

  try {
    const client = await loadEmailClient();
    client.init({ publicKey: CONFIG.emailjsPublicKey });
    await client.send(CONFIG.emailjsServiceId, CONFIG.emailjsTemplateId, {
      name,
      email,
      company: `Pedido ${code} — irangarcia.dev`,
      phone,
      service: `${product.title} × ${qty}`,
      budget: money(total),
      message: summaryText,
    });
  } catch (_) {
    // Even if EmailJS fails, WhatsApp handoff carries the complete order immediately.
  }

  const directMpUrl = typeof product.paymentLink === "string" && product.paymentLink.startsWith("https://") ? product.paymentLink : "";
  showOrderConfirmation({ code, product, qty, total, email, waHref, directMpUrl });

  form.reset();
  qtyInput.value = "1";
  updateSummary();
  submitBtn.disabled = false;
  submitBtn.textContent = "Confirmar pedido y pagar por Mercado Pago ↗";

  // Open WhatsApp (or direct Mercado Pago link if configured for qty 1) right away.
  window.open(directMpUrl && qty === 1 ? directMpUrl : waHref, "_blank", "noopener,noreferrer");
});

initCatalog();
