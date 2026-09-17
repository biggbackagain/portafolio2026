"use strict";
// Preserve every credential; highlight three complementary specialties first.
const certList = document.querySelector("#cert-list");
const certToggle = document.querySelector("#cert-toggle");
const certFilters = document.querySelector("#cert-filters");
const certCount = document.querySelector("#cert-count");
let expanded = false;
let category = "Todas";
const featuredTitles = ["Django Web Framework", "Junior Cybersecurity Analyst Career Path", "Data Science for Business - Level 1"];
const featured = featuredTitles.map((title) => certifications.find((cert) => cert.title === title)).filter(Boolean);
function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}
function credentialCard(cert) {
  const card = makeElement("article", "cert-card");
  const badgeId = /credly\.com\/badges\/([0-9a-f-]{36})/i.exec(cert.link || "");
  if (badgeId) {
    const img = makeElement("img", "cert-badge");
    img.src = `assets/badges/${badgeId[1]}.png`; img.alt = `Insignia de ${cert.org}`;
    img.width = 66; img.height = 66; img.loading = "lazy";
    card.append(img);
  } else card.append(makeElement("span", "issuer-mark", cert.org.split(" ")[0]));
  const info = makeElement("div", "cert-info");
  info.append(makeElement("p", "cert-org", cert.org));
  info.append(makeElement("h3", "", cert.title));
  info.append(makeElement("p", "cert-date", `${cert.cat} · ${cert.date}`));
  if (cert.link) {
    const link = makeElement("a", "text-link", "Ver credencial ↗");
    link.href = cert.link; link.target = "_blank"; link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `Ver credencial: ${cert.title} (abre otra pestaña)`);
    info.append(link);
  } else info.append(makeElement("p", "cert-date", "Disponible a solicitud"));
  card.append(info);
  return card;
}
function renderCredentials() {
  const items = expanded ? certifications.filter((cert) => category === "Todas" || cert.cat === category) : featured;
  certList.replaceChildren(...items.map(credentialCard));
  certCount.textContent = expanded ? `${items.length} de ${certifications.length} certificaciones${category !== "Todas" ? ` · ${category}` : ""}` : `3 destacadas de ${certifications.length} certificaciones`;
  certToggle.textContent = expanded ? "Mostrar solo destacadas −" : `Explorar las ${certifications.length} certificaciones +`;
  certToggle.setAttribute("aria-expanded", String(expanded));
  certFilters.hidden = !expanded;
}
for (const cat of ["Todas", ...new Set(certifications.map((cert) => cert.cat))]) {
  const button = makeElement("button", "filter", cat);
  button.type = "button"; button.setAttribute("aria-pressed", String(cat === category));
  button.addEventListener("click", () => {
    category = cat;
    certFilters.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    renderCredentials();
  });
  certFilters.append(button);
}
certToggle.addEventListener("click", () => {
  expanded = !expanded; category = "Todas";
  certFilters.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item.textContent === category)));
  renderCredentials();
  if (expanded) certFilters.querySelector("button").focus({ preventScroll: true });
  else document.querySelector("#certificaciones").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
});
renderCredentials();

// Load EmailJS on submission, using the existing account and email template.
let emailClient;
function loadEmailClient() {
  if (emailClient) return emailClient;
  emailClient = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true; clearTimeout(timeout);
      if (error) { script.remove(); reject(error); } else resolve(window.emailjs);
    };
    const timeout = setTimeout(() => finish(new Error("Email service timeout")), 12000);
    script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    script.onload = () => finish(window.emailjs ? null : new Error("Email client unavailable"));
    script.onerror = () => finish(new Error("Email service unavailable"));
    document.head.append(script);
  }).catch((error) => { emailClient = null; throw error; });
  return emailClient;
}
const form = document.querySelector("#contact-form");
const submitButton = document.querySelector("#submit-button");
const formStatus = document.querySelector("#form-status");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity() || submitButton.disabled) return;
  submitButton.disabled = true; submitButton.textContent = "Enviando…";
  formStatus.hidden = false; formStatus.className = "form-status"; formStatus.textContent = "Enviando tu mensaje…";
  try {
    const client = await loadEmailClient();
    client.init({ publicKey: CONFIG.emailjsPublicKey });
    // Hidden fields preserve compatibility with the original email template.
    await client.sendForm(CONFIG.emailjsServiceId, CONFIG.emailjsTemplateId, form);
    formStatus.textContent = "Mensaje enviado. Te respondo en menos de 24 horas hábiles.";
    form.reset();
  } catch (_) {
    formStatus.classList.add("error");
    const link = makeElement("a", "", "Continuar por WhatsApp");
    link.href = waUrl(`Hola Irán, soy ${form.elements.name.value}. ${form.elements.message.value}`);
    link.target = "_blank"; link.rel = "noopener noreferrer";
    formStatus.replaceChildren(document.createTextNode("No se pudo confirmar el envío. Tus datos siguen aquí. "), link);
  } finally { submitButton.disabled = false; submitButton.textContent = "Enviar consulta →"; }
});
// With JavaScript unavailable, the form cannot accidentally submit personal data in a URL.
submitButton.disabled = false;
