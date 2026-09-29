(function () {
  "use strict";

  document.documentElement.classList.add("js");

  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

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

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.inset = "0 auto auto 0";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    if (!copied) throw new Error("copy-not-supported");
  }

  function announce(element, message, state) {
    if (!element) return;
    element.textContent = message;
    element.classList.remove("is-success", "is-warning");
    if (state) element.classList.add(`is-${state}`);
  }

  function setupGenericCopy() {
    document.querySelectorAll("[data-copy-source]").forEach((button) => {
      const source = document.getElementById(button.dataset.copySource);
      const feedback = document.querySelector(`[data-copy-feedback="${button.dataset.copySource}"]`);
      if (!source) return;

      button.addEventListener("click", async () => {
        const text = source.value ?? source.textContent ?? "";
        try {
          await copyText(text.trim());
          announce(feedback, "Prompt copiado. Leia e ajuste antes de enviar.", "success");
          button.textContent = "Copiado";
          window.setTimeout(() => {
            button.textContent = button.dataset.defaultLabel || "Copiar prompt";
          }, 1800);
        } catch (_error) {
          announce(feedback, "A cópia automática não funcionou. Selecione o texto manualmente.", "warning");
        }
      });
    });
  }

  function setupInventory(root) {
    const choices = Array.from(root.querySelectorAll("[data-source-choice]"));
    const count = root.querySelector("[data-selected-count]");
    const list = root.querySelector("[data-selected-list]");
    const feedback = root.querySelector("[data-inventory-feedback]");
    const checkButton = root.querySelector("[data-check-inventory]");
    const copyButton = root.querySelector("[data-copy-inventory]");
    if (!choices.length || !count || !list) return;

    function selectedChoices() {
      return choices.filter((choice) => choice.checked);
    }

    function render() {
      const selected = selectedChoices();
      count.textContent = `${selected.length}/${choices.length}`;
      list.replaceChildren();

      if (!selected.length) {
        const item = document.createElement("li");
        item.textContent = "Nenhuma fonte selecionada.";
        list.appendChild(item);
      } else {
        selected.forEach((choice) => {
          const item = document.createElement("li");
          item.textContent = choice.dataset.sourceName || choice.value;
          list.appendChild(item);
        });
      }

      announce(feedback, "Antes de seguir, confira se cada item é realmente necessário para esta inspeção.");
    }

    function verify() {
      const missingRecommended = choices.filter((choice) => choice.dataset.recommended === "true" && !choice.checked);
      const includedRisk = choices.filter((choice) => choice.dataset.recommended === "false" && choice.checked);

      if (!missingRecommended.length && !includedRisk.length) {
        announce(feedback, "Tudo certo. Você escolheu as seis referências sintéticas e deixou de fora os itens de risco.", "success");
        return;
      }

      const parts = [];
      if (missingRecommended.length === 1) parts.push("Faltou uma referência útil.");
      if (missingRecommended.length > 1) parts.push(`Faltaram ${missingRecommended.length} referências úteis.`);
      if (includedRisk.length === 1) parts.push("Um item de risco foi incluído.");
      if (includedRisk.length > 1) parts.push(`${includedRisk.length} itens de risco foram incluídos.`);
      announce(feedback, `${parts.join(" ")} Ajuste a seleção antes de executar.`, "warning");
    }

    async function copyInventory() {
      const selected = selectedChoices();
      const selectedNames = selected.map((choice) => `- ${choice.dataset.sourceName || choice.value}`).join("\n") || "- [selecionar]";
      const inventory = [
        "Inventário de contexto: Business Mission Control",
        "",
        "Projeto: Business Mission Control do Curso",
        "Tarefa: Inspecionar o kit da Lume",
        "Pasta: lume-manutencao-comercial/ (dados sintéticos)",
        "",
        "Fontes selecionadas:",
        selectedNames,
        "",
        "Limite: inspecionar e inventariar sem editar, diagnosticar, publicar ou enviar.",
      ].join("\n");

      try {
        await copyText(inventory);
        announce(feedback, "Inventário copiado. Releia antes de usar.", "success");
      } catch (_error) {
        announce(feedback, "Não foi possível copiar automaticamente. Selecione o inventário e copie manualmente.", "warning");
      }
    }

    choices.forEach((choice) => choice.addEventListener("change", render));
    checkButton?.addEventListener("click", verify);
    copyButton?.addEventListener("click", copyInventory);
    root.classList.add("is-enhanced");
    render();
  }

  function setupScenarioPicker(root) {
    const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    const panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));
    if (!tabs.length || !panels.length) return;

    function activate(tab, moveFocus) {
      const target = tab.getAttribute("aria-controls");
      tabs.forEach((item) => {
        const active = item === tab;
        item.setAttribute("aria-selected", String(active));
        item.tabIndex = active ? 0 : -1;
      });
      panels.forEach((panel) => {
        panel.hidden = panel.id !== target;
      });
      if (moveFocus) tab.focus();
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activate(tab, false));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        let next = index;
        if (["ArrowRight", "ArrowDown"].includes(event.key)) next = (index + 1) % tabs.length;
        if (["ArrowLeft", "ArrowUp"].includes(event.key)) next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = tabs.length - 1;
        activate(tabs[next], true);
      });
    });

    root.classList.add("is-enhanced");
    activate(tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || tabs[0], false);
  }

  function setupPolicy(root) {
    const items = Array.from(root.querySelectorAll("[data-policy-item]"));
    const button = root.querySelector("[data-check-policy]");
    const feedback = root.querySelector("[data-policy-feedback]");
    if (!items.length || !button) return;

    items.forEach((item) => {
      item.addEventListener("change", () => announce(feedback, "Quando terminar, confira se cada escolha é necessária para a tarefa."));
    });

    button.addEventListener("click", () => {
      let answered = 0;
      let correct = 0;

      items.forEach((item) => {
        const selected = item.querySelector("input:checked");
        if (selected) answered += 1;
        if (selected?.value === item.dataset.expected) correct += 1;
      });

      if (answered < items.length) {
        const remaining = items.length - answered;
        const message = remaining === 1
          ? "Responda à ação que falta antes de verificar."
          : `Responda às ${remaining} ações que faltam antes de verificar.`;
        announce(feedback, message, "warning");
        return;
      }

      if (correct === items.length) {
        announce(feedback, "Tudo certo. A leitura faz parte do pedido, as exceções pedem aprovação e as ações desnecessárias ficam bloqueadas.", "success");
        return;
      }

      announce(feedback, `Você acertou ${correct} de ${items.length}. Revise o que a tarefa realmente precisa e o impacto de cada ação.`, "warning");
    });

    root.classList.add("is-enhanced");
  }

  function setupPreflight(root) {
    const checks = Array.from(root.querySelectorAll("[data-preflight-check]"));
    const count = root.querySelector("[data-preflight-count]");
    const track = root.querySelector("[data-preflight-track]");
    const status = root.querySelector("[data-preflight-status]");
    const badge = root.querySelector("[data-ready-badge]");
    if (!checks.length || !count || !track || !status || !badge) return;

    function render() {
      const completed = checks.filter((check) => check.checked).length;
      const ratio = completed / checks.length;
      count.textContent = `${completed}/${checks.length}`;
      track.style.width = `${ratio * 100}%`;

      if (completed === checks.length) {
        announce(status, "Tudo conferido. Você já pode iniciar a inspeção somente de leitura.", "success");
        badge.textContent = "Pronto para inspecionar";
      } else {
        const remaining = checks.length - completed;
        announce(status, remaining === 1 ? "Falta 1 verificação." : `Faltam ${remaining} verificações.`);
        badge.textContent = "Ainda não executar";
      }
    }

    checks.forEach((check) => check.addEventListener("change", render));
    root.classList.add("is-enhanced");
    render();
  }

  function setupReveals() {
    const elements = Array.from(document.querySelectorAll(".reveal"));
    if (!elements.length || motionPreference.matches || !("IntersectionObserver" in window)) return;

    document.documentElement.classList.add("motion-ready");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

    window.requestAnimationFrame(() => elements.forEach((element) => observer.observe(element)));
  }

  setupProgress();
  setupGenericCopy();
  document.querySelectorAll("[data-inventory]").forEach(setupInventory);
  document.querySelectorAll("[data-scenario-picker]").forEach(setupScenarioPicker);
  document.querySelectorAll("[data-policy]").forEach(setupPolicy);
  document.querySelectorAll("[data-preflight]").forEach(setupPreflight);
  setupReveals();
}());
