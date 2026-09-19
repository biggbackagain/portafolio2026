// Apply the saved choice or system preference before painting the page.
(() => {
  let theme = "light";
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    theme = "dark";
  }
  try {
    const saved = localStorage.getItem("portafolio-theme");
    if (saved) theme = saved;
  } catch (_) { /* The toggle still works when storage is unavailable. */ }
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#111a17" : "#f9f9f5";
})();
