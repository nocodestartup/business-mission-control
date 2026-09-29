(function () {
  "use strict";

  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  function motionAllowed() {
    return !motionPreference.matches;
  }

  function animateActivation(element) {
    if (!element || !gsap || !motionAllowed()) return;

    const targets = element.querySelectorAll(
      "h3, p, li, .trace-step, .surface-fit > div, [data-map-preview-row]",
    );
    if (!targets.length) return;

    gsap.fromTo(
      targets,
      { autoAlpha: 0, y: 10 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.28,
        stagger: 0.025,
        ease: "power2.out",
        overwrite: "auto",
        clearProps: "opacity,visibility,transform",
      },
    );
  }

  function setupProgress() {
    const progress = document.querySelector(".nav-progress");
    if (!progress) return;

    let frame = 0;

    function update() {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(Math.max(window.scrollY / scrollable, 0), 1) : 0;
      progress.style.transform = `scaleX(${ratio})`;
    }

    function requestUpdate() {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("pageshow", requestUpdate);
    update();
  }

  function setupTabs(root) {
    const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    const panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));
    if (!tabs.length || !panels.length) return;

    function activate(tab, moveFocus, animate) {
      const panelId = tab.getAttribute("aria-controls");
      let activePanel = null;

      tabs.forEach((item) => {
        const selected = item === tab;
        item.setAttribute("aria-selected", String(selected));
        item.tabIndex = selected ? 0 : -1;
      });

      panels.forEach((panel) => {
        const active = panel.id === panelId;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
        if (active) activePanel = panel;
      });

      if (moveFocus) tab.focus();
      if (animate) animateActivation(activePanel);
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activate(tab, false, true));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        event.preventDefault();

        let targetIndex = index;
        if (["ArrowRight", "ArrowDown"].includes(event.key)) targetIndex = (index + 1) % tabs.length;
        if (["ArrowLeft", "ArrowUp"].includes(event.key)) targetIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") targetIndex = 0;
        if (event.key === "End") targetIndex = tabs.length - 1;
        activate(tabs[targetIndex], true, true);
      });
    });

    root.classList.add("is-enhanced");
    activate(tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || tabs[0], false, false);
  }

  function setupAccordion(root) {
    const items = Array.from(root.querySelectorAll("[data-accordion-item]"));
    if (!items.length) return;

    function activate(selected, animate) {
      let activeContent = null;

      items.forEach((item) => {
        const active = item === selected;
        const trigger = item.querySelector("[data-accordion-trigger]");
        const content = item.querySelector(".logic-content, .surface-content");
        item.classList.toggle("is-active", active);
        if (trigger) trigger.setAttribute("aria-expanded", String(active));
        if (content) {
          content.hidden = !active;
          if (active) activeContent = content;
        }
      });

      if (animate) animateActivation(activeContent);
    }

    items.forEach((item, index) => {
      const trigger = item.querySelector("[data-accordion-trigger]");
      if (!trigger) return;

      trigger.addEventListener("click", () => activate(item, true));
      trigger.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        event.preventDefault();

        let targetIndex = index;
        if (["ArrowRight", "ArrowDown"].includes(event.key)) targetIndex = (index + 1) % items.length;
        if (["ArrowLeft", "ArrowUp"].includes(event.key)) targetIndex = (index - 1 + items.length) % items.length;
        if (event.key === "Home") targetIndex = 0;
        if (event.key === "End") targetIndex = items.length - 1;

        const next = items[targetIndex];
        activate(next, true);
        next.querySelector("[data-accordion-trigger]")?.focus();
      });
    });

    root.m1ActivatePanel = function (panelId) {
      const target = items.find((item) => item.querySelector(".logic-content, .surface-content")?.id === panelId);
      if (target) activate(target, true);
    };

    root.classList.add("is-enhanced");
    activate(items.find((item) => item.classList.contains("is-active")) || items[0], false);
  }

  function setupCarousel(root) {
    const slides = Array.from(root.querySelectorAll("[data-carousel-slide]"));
    const previous = root.querySelector("[data-carousel-prev]");
    const next = root.querySelector("[data-carousel-next]");
    const indexLabel = root.querySelector("[data-carousel-index]");
    const markers = Array.from(root.querySelectorAll("[data-carousel-marker]"));
    if (!slides.length || !previous || !next) return;

    let current = Math.max(slides.findIndex((slide) => slide.classList.contains("is-active")), 0);

    function render(animate) {
      let activeSlide = null;

      slides.forEach((slide, index) => {
        const active = index === current;
        slide.classList.toggle("is-active", active);
        slide.hidden = !active;
        slide.setAttribute("aria-hidden", String(!active));
        if (active) activeSlide = slide;
      });

      markers.forEach((marker, index) => {
        marker.classList.toggle("is-active", index === current);
      });

      if (indexLabel) {
        indexLabel.textContent = `${String(current + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
      }

      if (animate) animateActivation(activeSlide);
    }

    previous.addEventListener("click", () => {
      current = (current - 1 + slides.length) % slides.length;
      render(true);
    });

    next.addEventListener("click", () => {
      current = (current + 1) % slides.length;
      render(true);
    });

    root.classList.add("is-enhanced");
    render(false);
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }

  function setupExercise(root) {
    const fields = Array.from(root.querySelectorAll("[data-map-field]"));
    const button = root.querySelector("[data-copy-map]");
    const status = root.querySelector("[data-copy-status]");
    const previewValues = Array.from(root.querySelectorAll("[data-map-preview-value]"));
    if (!fields.length || !button) return;

    function updatePreview() {
      previewValues.forEach((value) => {
        const matchingField = fields.find((field) => field.dataset.mapLabel === value.dataset.mapPreviewValue);
        value.textContent = matchingField?.value.trim() || value.dataset.emptyText || "Aguardando definição.";
        value.closest("[data-map-preview-row]")?.classList.toggle("has-value", Boolean(matchingField?.value.trim()));
      });
    }

    fields.forEach((field) => field.addEventListener("input", updatePreview));

    button.addEventListener("click", async () => {
      const text = fields
        .map((field) => `${field.dataset.mapLabel}: ${field.value.trim() || "[preencher]"}`)
        .join("\n\n");

      try {
        await copyText(text);
        if (status) status.textContent = "Mapa copiado. Você pode colá-lo no seu projeto.";
      } catch (error) {
        if (status) status.textContent = "Não foi possível copiar automaticamente. Selecione os campos manualmente.";
      }
    });

    root.classList.add("is-enhanced");
    updatePreview();
  }

  function setupScenarioLab(root) {
    const buttons = Array.from(root.querySelectorAll("[data-scenario-target]"));
    const title = root.querySelector("[data-scenario-result-title]");
    const reason = root.querySelector("[data-scenario-result-reason]");
    const surfaceDecision = document.querySelector("[data-surface-decision]");
    if (!buttons.length || !surfaceDecision) return;

    function activate(button, moveFocus) {
      buttons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      if (title) title.textContent = button.dataset.scenarioTitle || "App desktop";
      if (reason) reason.textContent = button.dataset.scenarioReason || "";
      surfaceDecision.m1ActivatePanel?.(button.dataset.scenarioTarget);
      if (moveFocus) button.focus();
    }

    buttons.forEach((button, index) => {
      button.addEventListener("click", () => activate(button, false));
      button.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        event.preventDefault();

        let targetIndex = index;
        if (["ArrowRight", "ArrowDown"].includes(event.key)) targetIndex = (index + 1) % buttons.length;
        if (["ArrowLeft", "ArrowUp"].includes(event.key)) targetIndex = (index - 1 + buttons.length) % buttons.length;
        if (event.key === "Home") targetIndex = 0;
        if (event.key === "End") targetIndex = buttons.length - 1;
        activate(buttons[targetIndex], true);
      });
    });

    root.classList.add("is-enhanced");
    activate(buttons.find((button) => button.getAttribute("aria-pressed") === "true") || buttons[0], false);
  }

  function setupChecklist(root) {
    const items = Array.from(root.querySelectorAll(".check-item"));
    const progress = root.querySelector("[data-checklist-progress]");
    const count = root.querySelector("[data-checklist-count]");
    const storageKey = `codex-course-${document.body.dataset.lesson || "m1"}-checklist`;
    let saved = [];

    try {
      saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch (error) {
      saved = [];
    }

    function updateSummary() {
      const completed = items.filter((item) => item.getAttribute("aria-pressed") === "true").length;
      if (progress) progress.value = completed;
      if (count) count.textContent = `${completed} de ${items.length} concluídos`;
    }

    function persist() {
      const completed = items
        .map((entry, itemIndex) => (entry.getAttribute("aria-pressed") === "true" ? itemIndex : null))
        .filter((value) => value !== null);

      try {
        localStorage.setItem(storageKey, JSON.stringify(completed));
      } catch (error) {
        return;
      }
    }

    items.forEach((item, index) => {
      item.setAttribute("aria-pressed", String(saved.includes(index)));
      item.addEventListener("click", () => {
        item.setAttribute("aria-pressed", String(item.getAttribute("aria-pressed") !== "true"));
        persist();
        updateSummary();
      });
    });

    root.classList.add("is-enhanced");
    updateSummary();
  }

  function setupProgressiveDetails(root) {
    let stateBeforePrint = root.open;

    root.open = false;
    root.classList.add("is-enhanced");

    window.addEventListener("beforeprint", () => {
      stateBeforePrint = root.open;
      root.open = true;
    });

    window.addEventListener("afterprint", () => {
      root.open = stateBeforePrint;
    });
  }

  function setupGsap() {
    if (!gsap) return;
    if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    const media = gsap.matchMedia();
    media.add(
      {
        reduceMotion: "(prefers-reduced-motion: reduce)",
        desktop: "(min-width: 981px)",
      },
      (context) => {
        const { reduceMotion } = context.conditions;
        if (reduceMotion) return;

        gsap.utils.toArray("[data-hero]").forEach((hero) => {
          const copy = hero.querySelectorAll("[data-hero-copy] > *");
          const visual = hero.querySelector("[data-hero-visual]");
          const timeline = gsap.timeline({
            defaults: { ease: "power3.out" },
          });

          timeline
            .addLabel("copy")
            .from(copy, {
              y: 18,
              autoAlpha: 0,
              duration: 0.48,
              stagger: 0.055,
              clearProps: "opacity,visibility,transform",
            }, "copy");

          if (visual) {
            timeline
              .addLabel("visual", "copy+=0.08")
              .from(visual, {
                x: 24,
                autoAlpha: 0,
                duration: 0.56,
                clearProps: "opacity,visibility,transform",
              }, "visual");
          }
        });

        const lowPower = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
        if (!ScrollTrigger || lowPower) return;

        const revealTargets = gsap.utils.toArray(
          "[data-reveal], .chapter-heading, .chapter-intro, .story-panel",
        ).filter((element) => !element.closest("[data-hero]"));

        gsap.set(revealTargets, { autoAlpha: 0, y: 16 });
        ScrollTrigger.batch(revealTargets, {
          start: "top 88%",
          once: true,
          interval: 0.08,
          batchMax: 4,
          onEnter: (batch) => {
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: 0.42,
              stagger: 0.055,
              ease: "power2.out",
              overwrite: "auto",
              clearProps: "opacity,visibility,transform",
            });
          },
        });

        const refresh = () => window.requestAnimationFrame(() => ScrollTrigger.refresh());
        document.fonts?.ready.then(refresh);
        window.addEventListener("load", refresh, { once: true });
      },
    );
  }

  function initialize(selector, setup) {
    document.querySelectorAll(selector).forEach((root) => {
      try {
        setup(root);
      } catch (error) {
        root.classList.remove("is-enhanced");
      }
    });
  }

  setupProgress();
  initialize("[data-tabs]", setupTabs);
  initialize("[data-accordion]", setupAccordion);
  initialize("[data-carousel]", setupCarousel);
  initialize("[data-exercise]", setupExercise);
  initialize("[data-scenario-lab]", setupScenarioLab);
  initialize("[data-checklist]", setupChecklist);
  initialize("[data-progressive-details]", setupProgressiveDetails);
  setupGsap();
  document.documentElement.classList.add("m1-js");
})();
