"use strict";
const reservationApi = (window.COURSE_API_BASE || "").replace(/\/$/, "");
const lookupForm = document.querySelector("#lookup-form");
const lookupButton = document.querySelector("#lookup-button");
const lookupNote = document.querySelector("#lookup-note");
const returnBox = document.querySelector("#return-status");
const resultBox = document.querySelector("#lookup-result");
const token = new URLSearchParams(location.search).get("r");
// Remove provider status/IDs and the private lookup token from the visible URL.
if (location.search) history.replaceState(null, "", location.pathname);
function displayReservation(box, data) {
  box.hidden = false; box.replaceChildren();
  const titles = { confirmed: "Tu lugar está confirmado.", pending: "Estamos esperando la confirmación del pago.", rejected: "El pago no fue aprobado.", cancelled: "El pago fue cancelado.", refunded: "La reservación tiene un reembolso.", charged_back: "El pago está en revisión por contracargo." };
  const title = document.createElement("h2"); title.textContent = titles[data.status] || "Consulta el estado con el organizador."; box.append(title);
  if (data.code) { const code = document.createElement("strong"); code.className = "reservation-code"; code.textContent = data.code; box.append(code); }
  const info = document.createElement("p");
  info.textContent = `${data.courseTitle} · ${data.date} · ${data.location}`; box.append(info);
  const total = document.createElement("p"); total.textContent = `Importe registrado: $${data.totalCents / 100} MXN. ${data.gemini ? "Incluye el acceso compartido opcional a Gemini Pro." : "Asistencia al curso, sin complemento."}`; box.append(total);
  const note = document.createElement("p");
  note.textContent = data.status === "confirmed" ? "Tu confirmación se enviará al correo de inscripción. Conserva este código y preséntalo el día del evento." : "Este estado no confirma un lugar para asistir. Si necesitas ayuda, contacta al organizador.";
  box.append(note);
  if (data.status === "pending" && token) {
    const refresh = document.createElement("button"); refresh.className = "btn secondary"; refresh.type = "button"; refresh.textContent = "Volver a consultar";
    refresh.addEventListener("click", loadReturn); box.append(refresh);
  }
}
async function loadReturn() {
  if (!/^[a-f0-9]{64}$/.test(token || "")) return;
  returnBox.hidden = false; returnBox.textContent = "Verificando el estado de tu reservación…";
  try {
    const response = await fetch(`${reservationApi}/api/reservation-status?r=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "No fue posible consultar tu reservación.");
    displayReservation(returnBox, data);
  } catch (_) { returnBox.textContent = "No pudimos consultar el estado. Esto no significa que el pago haya fallado. Revisa tu correo o contacta al organizador antes de volver a pagar."; }
}
fetch(`${reservationApi}/api/course`, { signal: AbortSignal.timeout(6000) }).then((response) => {
  if (!response.ok) return;
  lookupButton.disabled = false;
  lookupNote.textContent = "El código y el correo deben coincidir con tu inscripción. No compartas tu código con otras personas.";
}).catch(() => {});
lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!lookupForm.reportValidity() || lookupButton.disabled) return;
  lookupButton.disabled = true; lookupNote.textContent = "Consultando…"; resultBox.hidden = true;
  try {
    const response = await fetch(`${reservationApi}/api/reservations/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Bypass-Tunnel-Reminder": "true" },
      body: JSON.stringify({ code: lookupForm.elements.code.value.trim(), email: lookupForm.elements.email.value.trim() }),
      signal: AbortSignal.timeout(6000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "No fue posible realizar la consulta.");
    displayReservation(resultBox, data); lookupNote.textContent = "Consulta completada.";
  } catch (error) { lookupNote.textContent = error.name === "TimeoutError" ? "La consulta tardó demasiado. Inténtalo de nuevo." : error.message; }
  finally { lookupButton.disabled = false; }
});
void loadReturn();
