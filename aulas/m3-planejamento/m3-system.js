(() => {
  "use strict";

  const text = (element) => element?.value.trim() || "[Preencher antes de usar]";

  function initPrompt() {
    const builder = document.querySelector("[data-prompt-builder]");
    if (!builder) return;
    const fields = [...builder.querySelectorAll("[data-prompt-part]")];
    const output = builder.querySelector("[data-prompt-output]");
    const update = () => {
      output.textContent = fields.map(field => `${field.dataset.promptPart}\n${text(field)}`).join("\n\n");
    };
    fields.forEach(field => field.addEventListener("input", update));
    update();
    builder.classList.add("is-enhanced");
  }

  function initCriteria() {
    const component = document.querySelector("[data-criteria]");
    if (component) {
      const tablist = component.querySelector(".criterion-tabs");
      const tabs = [...tablist.querySelectorAll("button")];
      const panels = tabs.map(tab => document.getElementById(tab.getAttribute("aria-controls")));
      const select = (index, focus = false) => {
        tabs.forEach((tab, i) => {
          tab.setAttribute("aria-selected", String(i === index));
          tab.tabIndex = i === index ? 0 : -1;
          panels[i].hidden = i !== index;
        });
        if (focus) tabs[index].focus();
      };
      tabs.forEach((tab, i) => {
        tab.setAttribute("role", "tab");
        panels[i].setAttribute("role", "tabpanel");
        panels[i].tabIndex = 0;
        panels[i].setAttribute("aria-labelledby", tab.id);
        tab.addEventListener("click", () => select(i));
        tab.addEventListener("keydown", event => {
          let index = i;
          if (["ArrowRight", "ArrowDown"].includes(event.key)) index = (i + 1) % tabs.length;
          else if (["ArrowLeft", "ArrowUp"].includes(event.key)) index = (i - 1 + tabs.length) % tabs.length;
          else if (event.key === "Home") index = 0;
          else if (event.key === "End") index = tabs.length - 1;
          else return;
          event.preventDefault();
          select(index, true);
        });
      });
      tablist.setAttribute("role", "tablist");
      const narrow = window.matchMedia("(max-width: 760px)");
      const orientation = () => tablist.setAttribute("aria-orientation", narrow.matches ? "vertical" : "horizontal");
      orientation();
      narrow.addEventListener("change", orientation);
      select(0);
      tablist.hidden = false;
      component.classList.add("is-enhanced");
    }
    const builder = document.querySelector("[data-criterion-builder]");
    if (!builder) return;
    const fields = ["condicao", "conferencia", "correcao"].map(id => document.getElementById(id));
    const labels = ["Condição", "Como conferir", "Se não cumprir"];
    const update = () => {
      builder.querySelector("[data-criterion-output]").textContent = fields.map((field, i) => `${labels[i]}\n${text(field)}`).join("\n\n");
    };
    fields.forEach(field => field.addEventListener("input", update));
    update();
    builder.classList.add("is-enhanced");
  }

  function initReview() {
    const review = document.querySelector("[data-plan-review]");
    if (!review) return;
    const plan = document.getElementById("plano-texto");
    const changes = document.getElementById("ajustes");
    const questions = document.getElementById("pendencias");
    const fields = [plan, changes, questions];
    const checks = [...review.querySelectorAll('input[name="revisao"]')];
    const status = review.querySelector("[data-approval-status]");
    const progress = review.querySelector("[data-review-progress]");
    const output = review.querySelector("[data-plan-output]");
    let state = "Em revisão";
    const render = () => {
      const count = checks.filter(check => check.checked).length;
      progress.textContent = `${count} de ${checks.length} pontos conferidos.`;
      output.textContent = `REGISTRO DO EXERCÍCIO LOCAL\nEstado: ${state}\nNenhuma autorização foi enviada ao Codex.\n\n${text(plan)}\n\nAjustes e decisões preservadas\n${text(changes)}\n\nDúvidas e respostas\n${text(questions)}\n\nConferência\n${checks.map(check => `${check.checked ? "[x]" : "[ ]"} ${check.value}`).join("\n")}\n\nA aprovação do plano encerra o planejamento. A próxima etapa depende de comando separado.`;
    };
    fields.forEach(field => field.addEventListener("input", () => {
      fields.forEach(item => item.removeAttribute("aria-invalid"));
      checks.forEach(check => { check.checked = false; });
      state = "Em revisão";
      status.textContent = "O texto mudou. Releia esta versão e confira novamente os seis pontos.";
      status.classList.remove("is-success");
      render();
    }));
    checks.forEach(check => check.addEventListener("change", () => {
      state = "Em revisão";
      status.textContent = "Conferência atualizada. Registre a decisão apenas depois de revisar a versão completa.";
      status.classList.remove("is-success");
      render();
    }));
    review.querySelector("[data-request-revision]").addEventListener("click", () => {
      state = "Revisão pendente";
      status.textContent = "Revisão pendente registrada neste exercício. Indique nos campos o ajuste ou a resposta que falta e peça uma nova versão no Codex.";
      status.classList.remove("is-success");
      render();
    });
    review.querySelector("[data-approve]").addEventListener("click", () => {
      const missing = fields.find(field => !field.value.trim());
      if (missing) {
        missing.setAttribute("aria-invalid", "true");
        status.textContent = `Preencha o campo “${review.querySelector(`label[for="${missing.id}"]`).textContent}” antes de registrar a aprovação.`;
        missing.focus();
        return;
      }
      const unchecked = checks.find(check => !check.checked);
      if (unchecked) {
        status.textContent = "Ainda há pontos sem conferência. Revise os seis itens; se faltar resposta, registre revisão pendente.";
        unchecked.focus();
        return;
      }
      state = "Plano revisado e aprovado por você no exercício local";
      status.textContent = "Plano marcado como revisado neste exercício. Nenhuma autorização foi enviada ao Codex. Guarde esta versão e registre sua decisão na tarefa quando estiver pronto.";
      status.classList.add("is-success");
      render();
    });
    render();
    review.querySelector("[data-review-actions]").hidden = false;
    review.classList.add("is-enhanced");
  }

  function initCopy() {
    document.querySelectorAll("[data-copy]").forEach(button => {
      const output = document.getElementById(button.dataset.copy);
      if (!output) return;
      const status = button.nextElementSibling?.matches("[data-copy-status]")
        ? button.nextElementSibling
        : button.parentElement.nextElementSibling;
      button.addEventListener("click", async () => {
        try {
          if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
          await navigator.clipboard.writeText(output.textContent);
          status.textContent = "Texto copiado para a área de transferência. Nada foi enviado ao Codex.";
        } catch {
          const range = document.createRange();
          range.selectNodeContents(output);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          status.textContent = "Não foi possível copiar automaticamente. O texto foi selecionado; use Ctrl+C ou a opção Copiar do seu dispositivo.";
        }
      });
      button.hidden = false;
    });
  }

  function initPrint() {
    document.querySelectorAll(".field textarea, .field input").forEach(field => {
      const mirror = document.createElement("div");
      mirror.className = "print-value";
      mirror.setAttribute("aria-hidden", "true");
      const update = () => { mirror.textContent = field.value || "[Não preenchido]"; };
      update();
      field.after(mirror);
      field.closest(".field").classList.add("has-print-value");
      field.addEventListener("input", update);
      window.addEventListener("beforeprint", update);
    });
    document.querySelectorAll('.check-row input[type="checkbox"]').forEach(check => {
      const mirror = document.createElement("span");
      mirror.className = "print-check";
      mirror.setAttribute("aria-hidden", "true");
      const update = () => { mirror.textContent = check.checked ? "[x]" : "[ ]"; };
      check.after(mirror);
      check.closest(".check-row").classList.add("has-print-value");
      check.addEventListener("change", update);
      window.addEventListener("beforeprint", update);
      update();
    });
  }

  function initProgress() {
    const progress = document.querySelector(".nav-progress");
    if (!progress) return;
    let pending = false;
    const update = () => {
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 1})`;
      pending = false;
    };
    window.addEventListener("scroll", () => {
      if (!pending) { pending = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  [initPrompt, initCriteria, initReview, initCopy, initPrint, initProgress].forEach(init => {
    try { init(); } catch (error) { console.warn("O aprimoramento desta atividade não pôde iniciar.", error); }
  });
})();
