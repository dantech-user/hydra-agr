const revealSelector = [
  ".screen > .screen-header",
  ".home-screen > .home-brandbar",
  ".home-screen > .greeting-block",
  ".home-screen > .home-announcements",
  ".home-screen .shortcut-row > button",
  ".home-screen > .nfc-banner",
  ".home-screen > .property-hero",
  ".home-screen > .home-summary-section",
  ".home-screen > .home-section:not(.home-summary-section)",
  ".screen > .water-overview",
  ".screen > .action-pair",
  ".screen > .nfc-inline-card",
  ".screen > .herd-care-launch",
  ".animal-list > .animal-card",
  ".post-list > .post-card",
  ".community-screen > .community-tabs",
  ".community-screen > .community-composer",
  ".profile-screen > .profile-hero",
  ".profile-screen > .profile-social-tabs",
  ".profile-screen > .plan-card",
  ".profile-screen .profile-menu-row",
  ".profile-screen > .logout-button",
  ".screen > .content-section",
  ".screen .task-card",
  ".screen .activity-card",
  ".screen .monitor-card",
  ".screen .monitoring-card",
  ".screen .sector-card",
  ".screen .challenge-card",
  ".screen .setting-card",
  ".screen .compact-row",
  ".screen .first-action-card",
  ".screen .assistant-home-card",
  ".screen .today-home-card",
  ".screen .history-home-row",
  ".screen .empty-state",
  ".screen .nfc-manual-card",
  ".screen .nfc-result-card",
  ".screen .notification-list > div",
  ".quick-grid > button"
].join(",");

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const observed = new WeakSet<Element>();

function revealImmediately(element: Element) {
  element.classList.add("scroll-reveal", "is-scroll-visible");
}

const observer = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        element.classList.add("is-scroll-visible");
        observer?.unobserve(element);
      }
    }, {
      root: null,
      rootMargin: "0px 0px -7% 0px",
      threshold: 0.08,
    })
  : null;

function revealVariant(element: Element, index: number) {
  if (element.matches(".nfc-banner, .property-hero, .water-overview, .profile-hero, .plan-card")) {
    return "scroll-reveal-pop";
  }

  if (element.matches(".animal-card, .post-card, .task-card, .activity-card, .monitor-card, .monitoring-card, .sector-card, .challenge-card, .profile-menu-row, .quick-grid > button")) {
    return index % 2 === 0 ? "scroll-reveal-left" : "scroll-reveal-right";
  }

  return "scroll-reveal-up";
}

function registerRevealElements(root: ParentNode | Element = document) {
  const candidates: Element[] = [];

  if (root instanceof Element && root.matches(revealSelector)) candidates.push(root);
  root.querySelectorAll?.(revealSelector).forEach((element) => candidates.push(element));

  candidates.forEach((element, index) => {
    if (observed.has(element) || element.closest(".bottom-nav")) return;
    observed.add(element);

    const htmlElement = element as HTMLElement;
    htmlElement.classList.add("scroll-reveal", revealVariant(element, index));
    htmlElement.style.setProperty("--scroll-reveal-delay", `${Math.min(index % 7, 6) * 48}ms`);

    if (motionQuery.matches || !observer) {
      revealImmediately(element);
      return;
    }

    observer.observe(element);
  });
}

function revealEverything() {
  document.querySelectorAll<HTMLElement>(".scroll-reveal").forEach((element) => {
    element.classList.add("is-scroll-visible");
    observer?.unobserve(element);
  });
}

document.documentElement.classList.add("scroll-motion-ready");

const start = () => {
  registerRevealElements(document);

  const root = document.getElementById("root") ?? document.body;
  const mutations = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (node instanceof Element) registerRevealElements(node);
      });
    }
  });

  mutations.observe(root, { childList: true, subtree: true });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}

motionQuery.addEventListener?.("change", (event) => {
  if (event.matches) revealEverything();
});
