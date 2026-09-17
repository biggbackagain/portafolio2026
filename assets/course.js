"use strict";
const apiBase = (window.COURSE_API_BASE || "").replace(/\/$/, "");
let courseInfo = { priceCents: 80000, addonPriceCents: 60000 };
let enrollmentOpen = false;
const addon = document.querySelector("#gemini-addon");
const enrollmentForm = document.querySelector("#registration-form");
const checkoutButton = document.querySelector("#checkout-button");
const money = (cents) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(cents / 100) + " MXN";
function updateTotal() {
  document.querySelector("#base-price").textContent = money(courseInfo.priceCents);
  document.querySelector("#addon-price").textContent = addon.checked ? money(courseInfo.addonPriceCents) : "No seleccionado";
  document.querySelector("#course-total").textContent = money(courseInfo.priceCents + (addon.checked ? courseInfo.addonPriceCents : 0));
}
addon.addEventListener("change", updateTotal);
const checklist = document.querySelector("#course-checklist");
checklist.addEventListener("change", () => {
  document.querySelector("#check-progress").textContent = `${checklist.querySelectorAll("input:checked").length} de 5 elementos listos`;
});
function showDetails(data) {
  document.querySelectorAll("[data-course]").forEach((element) => {
    if (typeof data[element.dataset.course] === "string") element.textContent = data[element.dataset.course];
  });
}
async function loadAvailability() {
  try {
    const response = await fetch("assets/course.json");
    if (response.ok) { courseInfo = await response.json(); showDetails(courseInfo); updateTotal(); }
  } catch (_) { /* Static content remains available. */ }
  try {
    const response = await fetch(`${apiBase}/api/course`, { signal: AbortSignal.timeout(6000), headers: { "Bypass-Tunnel-Reminder": "true" } });
    if (!response.ok) return;
    const data = await response.json();
    courseInfo = data; showDetails(data); updateTotal();
    enrollmentOpen = data.enrollmentOpen === true;
    document.querySelector("#registration-availability").textContent = data.message;
    document.querySelector("#registration-badge").textContent = enrollmentOpen ? "Inscripciones abiertas" : "Inscripciones no disponibles";
    checkoutButton.disabled = !enrollmentOpen;
    checkoutButton.textContent = enrollmentOpen ? "Continuar a Mercado Pago ↗" : "Inscripciones no disponibles";
    if (enrollmentOpen && data.addonAvailable !== true) {
      addon.checked = false; addon.disabled = true; updateTotal();
      document.querySelector("#addon-availability").textContent = "El complemento no está disponible por ahora. Puedes inscribirte solo al curso.";
    }
  } catch (_) { /* Do not imply that registration succeeded without a backend. */ }
}
loadAvailability();
const confirmEmail = document.querySelector("#confirm-email");
function checkEmail() {
  const same = confirmEmail.value.trim().toLowerCase() === enrollmentForm.elements.email.value.trim().toLowerCase();
  confirmEmail.setCustomValidity(same ? "" : "Los correos deben coincidir.");
}
confirmEmail.addEventListener("input", checkEmail);
enrollmentForm.elements.email.addEventListener("input", checkEmail);
let requestKey = crypto.randomUUID();
enrollmentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!enrollmentOpen || checkoutButton.disabled) return;
  checkEmail();
  if (!enrollmentForm.reportValidity()) return;
  checkoutButton.disabled = true; checkoutButton.textContent = "Preparando tu inscripción…";
  const message = document.querySelector("#registration-message");
  message.hidden = true;
  try {
    const response = await fetch(`${apiBase}/api/registrations`, {
      method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey, "Bypass-Tunnel-Reminder": "true" },
      body: JSON.stringify({ name: enrollmentForm.elements.name.value.trim(), email: enrollmentForm.elements.email.value.trim(), gemini: addon.checked, consent: enrollmentForm.elements.consent.checked }),
      signal: AbortSignal.timeout(18000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "No fue posible preparar tu inscripción.");
    const target = new URL(data.checkoutUrl);
    if (target.protocol !== "https:" || !["www.mercadopago.com.mx", "sandbox.mercadopago.com.mx"].includes(target.hostname)) throw new Error("No se recibió un enlace de pago válido.");
    window.location.assign(target.href);
  } catch (error) {
    message.hidden = false;
    message.textContent = error.name === "TimeoutError" ? "La conexión tardó demasiado. Puedes reintentar; todavía no se ha confirmado un pago." : error.message;
    checkoutButton.disabled = false; checkoutButton.textContent = "Continuar a Mercado Pago ↗";
  }
});
