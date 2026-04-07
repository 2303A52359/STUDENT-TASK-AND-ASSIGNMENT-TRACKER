document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const sidebar = document.querySelector(".sidebar");

  if (!menuToggle || !sidebar) {
    return;
  }

  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("sidebar-open");
  });
});

