/* ============================================================
   HEADER GLOBAL — dropdown do usuário + logout
   Reaproveitável em qualquer página que inclua partials/header.html.
   Não depende de Lenis/AOS — funciona isolado em páginas simples
   (como em_construcao.html) ou junto com script.js na home.
   ============================================================ */
(function () {
  const userArea = document.getElementById("userArea");
  const trigger = document.getElementById("userTrigger");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!userArea || !trigger) return; // ninguém logado nesta página

  function closeDropdown() {
    userArea.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = userArea.classList.toggle("open");
    trigger.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (e) => {
    if (!userArea.contains(e.target)) closeDropdown();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDropdown();
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      logoutBtn.disabled = true;
      try {
        await fetch("/api/logout", { method: "POST" });
      } finally {
        window.location.href = "/";
      }
    });
  }
})();
