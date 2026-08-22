/* Hydra Agro — scroll leve.
   O antigo sistema de IntersectionObserver foi desativado para evitar
   elementos invisiveis, travadinhas e animacoes repetidas durante a rolagem. */

document.documentElement.classList.remove("scroll-motion-ready");

function keepContentVisible(root: ParentNode = document) {
  root.querySelectorAll?.<HTMLElement>(
    ".scroll-reveal, .scroll-reveal-up, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-pop",
  ).forEach((element) => {
    element.classList.add("is-scroll-visible");
    element.style.removeProperty("--scroll-reveal-delay");
    element.style.opacity = "1";
    element.style.translate = "0 0";
    element.style.scale = "1";
    element.style.filter = "none";
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => keepContentVisible(), { once: true });
} else {
  keepContentVisible();
}
