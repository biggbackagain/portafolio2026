// Apply the saved choice before painting the page. Light remains the default.
(() => {
  let theme = "light";
  try {
    if (localStorage.getItem("portafolio-theme") === "dark") theme = "dark";
  } catch (_) { /* The toggle still works when storage is unavailable. */ }
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#111a17" : "#f9f9f5";
})();
