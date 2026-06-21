// ===== AOS INIT =====
AOS.init({ duration: 700, easing: "ease-out-cubic", once: true, offset: 60 });

// ===== HEADER SCROLL STATE =====
const header = document.getElementById("header");
const onScroll = () => {
  header.classList.toggle("scrolled", window.scrollY > 40);
  updateScrollProgress();
};
window.addEventListener("scroll", onScroll, { passive: true });

// ===== SCROLL PROGRESS BAR =====
const progressBar = document.querySelector(".scroll-progress");
function updateScrollProgress() {
  const h = document.documentElement;
  const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
  progressBar.style.width = pct + "%";
}

// ===== MOBILE MENU =====
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

// ===== CUSTOM CURSOR (desktop) =====
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

// ===== HERO PARALLAX =====
const heroImg = document.querySelector(".hero-img");
window.addEventListener(
  "scroll",
  () => {
    const y = window.scrollY;
    if (y < window.innerHeight)
      heroImg.style.transform = `translateY(${y * 0.3}px) scale(1.05)`;
  },
  { passive: true },
);

// ===== PARTICLES (lightweight canvas) =====
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

// ===== LIGHTBOX GALLERY =====
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxClose = document.getElementById("lightboxClose");

document.querySelectorAll(".g-item img").forEach((img) => {
  img.addEventListener("click", () => {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.classList.add("active");
    document.body.style.overflow = "hidden";
  });
});
function closeLightbox() {
  lightbox.classList.remove("active");
  document.body.style.overflow = "";
}
lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});

// ===== SMOOTH ANCHOR OFFSET (sticky header) =====
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const id = link.getAttribute("href");
    if (id.length <= 1) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const offset = target.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top: offset, behavior: "smooth" });
  });
});
