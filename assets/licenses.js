"use strict";
const licenseApi = (window.COURSE_API_BASE || "").replace(/\/$/, "");
let products = [];
let mpCheckoutOpen = false;
let requestKey = crypto.randomUUID();

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

productSelect.addEventListener("change", () => {
  requestKey = crypto.randomUUID();
  updateSummary();
});
qtyInput.addEventListener("input", () => {
  requestKey = crypto.randomUUID();
  updateSummary();
});

function checkEmailMatch() {
  const same = confirmEmailInput.value.trim().toLowerCase() === emailInput.value.trim().toLowerCase();
  confirmEmailInput.setCustomValidity(same ? "" : "Los correos deben coincidir para poder enviarte tu licencia.");
}
emailInput.addEventListener("input", checkEmailMatch);
confirmEmailInput.addEventListener("input", checkEmailMatch);

function renderOrderReturn(data) {
  returnBox.hidden = false;
  returnBox.replaceChildren();
  const titles = {
    confirmed: "¡Pago confirmado! Tu licencia está en camino.",
    pending: "Estamos esperando la confirmación de tu pago.",
    rejected: "El pago no fue aprobado.",
    cancelled: "El pago fue cancelado.",
    refunded: "Este pedido tiene un reembolso registrado.",
    charged_back: "Este pago está en revisión.",
  };
  const h = document.createElement("h3");
  h.textContent = titles[data.status] || "Estado de tu pedido";
  returnBox.append(h);
  if (data.orderCode) {
    const code = document.createElement("strong");
    code.className = "reservation-code";
    code.textContent = data.orderCode;
    returnBox.append(code);
  }
  const detail = document.createElement("p");
  detail.textContent = `${data.productTitle} × ${data.quantity} · Total: ${money(data.totalCents)}`;
  returnBox.append(detail);
  const note = document.createElement("p");
  note.textContent =
    data.status === "confirmed"
      ? `Entre 1 y 2 horas recibirás tu licencia e instrucciones en ${data.email}. Revisa también tu bandeja de correo no deseado.`
      : "Si ya realizaste tu pago en Mercado Pago, espera unos segundos y vuelve a consultar o escríbenos por WhatsApp.";
  returnBox.append(note);
}

const returnToken = new URLSearchParams(location.search).get("orden");
if (location.search) history.replaceState(null, "", location.pathname);

async function checkReturnStatus() {
  if (!/^[a-f0-9]{64}$/.test(returnToken || "") || !licenseApi) return;
  returnBox.hidden = false;
  returnBox.textContent = "Verificando el estado de tu pago con Mercado Pago…";
  try {
    const res = await fetch(`${licenseApi}/api/license-order-status?o=${encodeURIComponent(returnToken)}`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "No se encontró el pedido.");
    renderOrderReturn(data);
  } catch (_) {
    returnBox.textContent = "No pudimos verificar el estado en este momento. Si ya pagaste en Mercado Pago, entre 1 y 2 horas recibirás tu licencia en tu correo o escríbenos por WhatsApp.";
  }
}

async function initCatalog() {
  try {
    const res = await fetch("assets/licenses.json");
    if (res.ok) {
      const data = await res.json();
      products = data.products || [];
      populateSelect();
    }
  } catch (_) {}

  if (licenseApi) {
    try {
      const res = await fetch(`${licenseApi}/api/licenses`, {
        signal: AbortSignal.timeout(5000),
        headers: { "Bypass-Tunnel-Reminder": "true" },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.products) && data.products.length) {
          products = data.products;
          populateSelect();
        }
        mpCheckoutOpen = data.checkoutOpen === true;
      }
    } catch (_) {
      mpCheckoutOpen = false;
    }
  }

  submitBtn.disabled = false;
  if (mpCheckoutOpen) {
    modeBadge.textContent = "Pago en línea con Mercado Pago";
    modeNote.textContent = "Al procesar tu pago en Mercado Pago, entre 1 y 2 horas recibirás tu licencia e instrucciones en el correo que registres.";
    submitBtn.textContent = "Pagar con Mercado Pago ↗";
  } else {
    modeBadge.textContent = "Pedido directo + enlace de Mercado Pago";
    modeNote.textContent = "Completa tus datos de compra para enviarte tu enlace de Mercado Pago al instante. Al confirmar tu pago, entre 1 y 2 horas llegará tu licencia a tu correo.";
    submitBtn.textContent = "Confirmar pedido y pagar por Mercado Pago ↗";
  }
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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  checkEmailMatch();
  if (!form.reportValidity() || submitBtn.disabled) return;
  const p = selectedProduct();
  const qty = currentQty();
  const total = p.priceCents * qty;
  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  const phone = form.elements.phone.value.trim();
  const notes = form.elements.notes.value.trim();

  submitBtn.disabled = true;
  statusMsg.hidden = true;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: "license_order_submit", product_id: p.id, quantity: qty, total_mxn: total / 100 });

  if (mpCheckoutOpen) {
    submitBtn.textContent = "Conectando con Mercado Pago…";
    try {
      const res = await fetch(`${licenseApi}/api/license-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey, "Bypass-Tunnel-Reminder": "true" },
        body: JSON.stringify({ productId: p.id, quantity: qty, name, email, phone, notes, consent: form.elements.consent.checked }),
        signal: AbortSignal.timeout(18000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No fue posible iniciar el pago.");
      const target = new URL(data.checkoutUrl);
      if (target.protocol !== "https:" || !["www.mercadopago.com.mx", "sandbox.mercadopago.com.mx"].includes(target.hostname)) {
        throw new Error("Enlace de pago no válido.");
      }
      window.location.assign(target.href);
      return;
    } catch (err) {
      statusMsg.hidden = false;
      statusMsg.textContent = err.message || "No fue posible conectar con Mercado Pago. Intenta de nuevo o escríbenos por WhatsApp.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Pagar con Mercado Pago ↗";
      return;
    }
  }

  // Fallback when backend API is offline: send structured order via EmailJS + offer instant WhatsApp handoff.
  submitBtn.textContent = "Registrando tu pedido…";
  const summaryText = `Nuevo pedido de licencia:\nConcepto: ${p.title}\nCantidad: ${qty}\nTotal: ${money(total)}\nNombre: ${name}\nCorreo de entrega: ${email}\nTeléfono/WhatsApp: ${phone}${notes ? `\nNotas: ${notes}` : ""}`;
  const waHref = waUrl(`Hola Irán, acabo de registrar mi pedido de licencia:\n• Concepto: ${p.title}\n• Cantidad: ${qty}\n• Total: ${money(total)}\n• Correo de entrega: ${email}${notes ? `\n• Notas: ${notes}` : ""}\n¿Me compartes el enlace de Mercado Pago?`);

  try {
    const client = await loadEmailClient();
    client.init({ publicKey: CONFIG.emailjsPublicKey });
    await client.send(CONFIG.emailjsServiceId, CONFIG.emailjsTemplateId, {
      name,
      email,
      company: "Pedido de licencia — irangarcia.dev",
      phone,
      service: `${p.title} × ${qty}`,
      budget: money(total),
      message: summaryText,
    });
    statusMsg.hidden = false;
    statusMsg.replaceChildren(
      document.createTextNode(`¡Pedido registrado para ${email}! Te enviaremos tu enlace de Mercado Pago en breve. Una vez acreditado el pago, entre 1 y 2 horas recibirás tu licencia en tu correo. Si prefieres acelerar el envío, `),
      (() => { const a = document.createElement("a"); a.href = waHref; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = "ábrelo en WhatsApp aquí ↗"; return a; })()
    );
    form.reset();
    qtyInput.value = "1";
    updateSummary();
  } catch (_) {
    statusMsg.hidden = false;
    statusMsg.replaceChildren(
      document.createTextNode("No se pudo enviar automáticamente por correo, pero tu pedido está listo. "),
      (() => { const a = document.createElement("a"); a.href = waHref; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = "Envíalo por WhatsApp para recibir tu enlace de Mercado Pago ↗"; return a; })()
    );
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirmar pedido y pagar por Mercado Pago ↗";
  }
});

initCatalog();
void checkReturnStatus();
