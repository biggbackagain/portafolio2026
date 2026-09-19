"use strict";
const waUrl = (message) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
document.querySelectorAll("[data-whatsapp]").forEach((link) => { link.href = waUrl(link.dataset.whatsapp || "Hola Irán, me gustaría cotizar una solución para mi negocio."); });
document.querySelectorAll("[data-email]").forEach((link) => { link.href = `mailto:${CONFIG.email}`; });
document.querySelector("#year").textContent = new Date().getFullYear();

const themeButton = document.querySelector("#theme-button");
function applyTheme(theme) {
  const dark = theme === "dark";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]').content = dark ? "#111a17" : "#f9f9f5";
  themeButton.setAttribute("aria-pressed", String(dark));
  themeButton.setAttribute("aria-label", dark ? "Activar modo día" : "Activar modo noche");
  themeButton.title = dark ? "Activar modo día" : "Activar modo noche";
}
applyTheme(document.documentElement.dataset.theme || "light");
themeButton.hidden = false;
themeButton.addEventListener("click", () => {
  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(theme);
  try { localStorage.setItem("portafolio-theme", theme); } catch (_) { /* Optional persistence. */ }
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
  try { if (localStorage.getItem("portafolio-theme")) return; } catch (_) {}
  applyTheme(event.matches ? "dark" : "light");
});

const menuButton = document.querySelector("#menu-button");
const mobileMenu = document.querySelector("#mobile-nav");
function closeMenu(returnFocus = false) {
  mobileMenu.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Abrir menú");
  document.body.classList.remove("menu-open");
  if (returnFocus) menuButton.focus();
}
menuButton.addEventListener("click", () => {
  if (!mobileMenu.hidden) return closeMenu(true);
  mobileMenu.hidden = false;
  menuButton.setAttribute("aria-expanded", "true");
  menuButton.setAttribute("aria-label", "Cerrar menú");
  document.body.classList.add("menu-open");
  mobileMenu.querySelector("a").focus();
});
mobileMenu.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link) return;
  closeMenu();
  const href = link.getAttribute("href");
  const section = href.startsWith("#") ? document.querySelector(href) : null;
  if (section) { section.setAttribute("tabindex", "-1"); section.focus({ preventScroll: true }); }
});
document.addEventListener("keydown", (event) => {
  if (mobileMenu.hidden) return;
  if (event.key === "Escape") closeMenu(true);
  if (event.key !== "Tab") return;
  const items = [themeButton, menuButton, ...mobileMenu.querySelectorAll("a")];
  const first = items[0], last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
window.matchMedia("(min-width: 851px)").addEventListener("change", (event) => { if (event.matches) closeMenu(); });

