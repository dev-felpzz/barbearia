// ===== LENIS: SCROLL SUAVE PROFISSIONAL =====
// Lenis substitui o scroll nativo por um scroll com inércia/easing real,
// sem mexer no transform do body (diferente da gambiarra manual anterior),
// então window.scrollY / getBoundingClientRect() continuam 100% corretos
// e o parallax abaixo funciona sem conflito.
const lenis = new Lenis({
  duration: 1.1, // quanto maior, mais "pesado" o scroll
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // ease-out expo
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 1.2,
});

// loop de atualização do Lenis (precisa rodar a cada frame)
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// liga o Lenis aos links de âncora (substitui o scrollTo manual)
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const id = link.getAttribute("href");
    if (id.length <= 1) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -72, duration: 1.2 }); // -72 = altura do header fixo
  });
});

// ===== AOS INIT (Animate On Scroll) =====
AOS.init({ duration: 700, easing: "ease-out-cubic", once: true, offset: 60 });
// AOS precisa recalcular as posições quando o Lenis move a página
lenis.on("scroll", AOS.refresh);

// ===== ESTADO DO HEADER (glassmorphism) + BARRA DE PROGRESSO =====
const header = document.getElementById("header");
const progressBar = document.querySelector(".scroll-progress");

function updateOnScroll() {
  const scrollY = window.scrollY;
  header.classList.toggle("scrolled", scrollY > 40);

  const h = document.documentElement;
  const pct = (scrollY / (h.scrollHeight - h.clientHeight)) * 100;
  progressBar.style.width = pct + "%";
}
lenis.on("scroll", updateOnScroll);

// ===== MENU MOBILE (hambúrguer) =====
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
burger.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  burger.classList.toggle("open", isOpen);
  burger.setAttribute("aria-expanded", isOpen);
});
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    burger.classList.remove("open");
  }),
);

// ===== CURSOR PERSONALIZADO (apenas desktop) =====
const cursorDot = document.querySelector(".cursor-dot");
if (matchMedia("(hover:hover)").matches) {
  window.addEventListener("mousemove", (e) => {
    cursorDot.style.left = e.clientX + "px";
    cursorDot.style.top = e.clientY + "px";
  });
  document.querySelectorAll("a,button").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      cursorDot.style.width = "22px";
      cursorDot.style.height = "22px";
    });
    el.addEventListener("mouseleave", () => {
      cursorDot.style.width = "10px";
      cursorDot.style.height = "10px";
    });
  });
}

// ===== EFEITO PARALLAX + ZOOM NO HERO =====
// Versão simples e direta: usa window.scrollY puro (sem rect, sem ticking
// manual) porque o Lenis já entrega scroll em alta frequência via rAF,
// então não precisamos do nosso próprio requestAnimationFrame extra aqui.
const heroBg = document.querySelector(".hero-bg");
const heroImg = document.querySelector(".hero-img");
const heroSection = document.querySelector(".hero");
const heroHeight = () => heroSection.offsetHeight;

function applyHeroEffects() {
  const scrollY = window.scrollY;

  // só processa enquanto o hero ainda está na tela (economia de cálculo)
  if (scrollY < heroHeight()) {
    // parallax: fundo se move mais devagar que o scroll (sensação de profundidade)
    heroBg.style.transform = `translate3d(0, ${scrollY * 0.4}px, 0)`;

    // zoom progressivo na imagem conforme rola (efeito usado em sites premium)
    const zoomProgress = Math.min(scrollY / heroHeight(), 1);
    const scale = 1.08 + zoomProgress * 0.12; // de 1.08 até 1.20
    heroImg.style.transform = `scale(${scale})`;
  }
}
lenis.on("scroll", applyHeroEffects);
applyHeroEffects(); // estado inicial correto, mesmo sem ter rolado ainda

// ===== PARTÍCULAS DOURADAS (canvas leve) =====
(function particles() {
  const canvas = document.getElementById("particles");
  const ctx = canvas.getContext("2d");
  let w, h, particlesArr;

  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  }

  function init() {
    resize();
    const count = window.innerWidth < 768 ? 25 : 55;
    particlesArr = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.8 + 0.4,
      vy: Math.random() * 0.4 + 0.1,
      o: Math.random() * 0.5 + 0.1,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    particlesArr.forEach((p) => {
      p.y -= p.vy;
      if (p.y < -5) p.y = h + 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(201,162,39,${p.o})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    init();
    draw();
  }
})();

// ===== LIGHTBOX DA GALERIA =====
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxClose = document.getElementById("lightboxClose");

document.querySelectorAll(".g-item img").forEach((img) => {
  img.addEventListener("click", () => {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.classList.add("active");
    document.body.style.overflow = "hidden";
    lenis.stop(); // pausa o scroll suave enquanto o lightbox está aberto
  });
});

function closeLightbox() {
  lightbox.classList.remove("active");
  document.body.style.overflow = "";
  lenis.start(); // retoma o scroll suave
}
lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});
