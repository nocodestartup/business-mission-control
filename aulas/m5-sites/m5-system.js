(() => {
  'use strict';

  document.querySelectorAll('[data-copy-source]').forEach((button) => {
    const source = document.getElementById(button.dataset.copySource);
    const feedback = document.querySelector(`[data-copy-feedback="${button.dataset.copySource}"]`);
    if (!source || !feedback) return;
    button.addEventListener('click', async () => {
      const value = 'value' in source ? source.value : source.textContent;
      if (!value.trim()) {
        feedback.textContent = 'Preencha o campo antes de copiar.';
        source.focus();
        return;
      }
      try {
        await navigator.clipboard.writeText(value.trim());
        feedback.textContent = 'Texto copiado. Releia antes de enviar ao Codex.';
      } catch {
        feedback.textContent = 'A cópia automática não está disponível. Selecione o texto e copie manualmente.';
      }
    });
    button.hidden = false;
  });

  const decisions = {
    fila: {
      title: 'Fila de acompanhamento',
      decision: 'Quais propostas precisam de conferência primeiro?',
      interaction: 'Filtrar por idade e status; selecionar uma linha para abrir o rastro.',
      trace: 'Proposta → regra do corte → registro de acompanhamento → responsável.',
      human: 'A pessoa responsável decide se haverá contato e qual mensagem usar.'
    },
    rascunho: {
      title: 'Rascunho de proposta',
      decision: 'O que precisa ser revisado antes de uma proposta sair?',
      interaction: 'Comparar campos completos e pendentes; abrir fonte e limite comercial.',
      trace: 'Modelo aprovado → campos da proposta → fonte → revisão da Direção.',
      human: 'Preço, condição, prazo e envio continuam sob aprovação humana.'
    },
    triagem: {
      title: 'Triagem assistida',
      decision: 'O pedido tem contexto suficiente para uma primeira análise?',
      interaction: 'Alternar completo, incompleto e urgente sem ocultar o motivo do estado.',
      trace: 'Mensagem → campos mínimos → sinal → pergunta que falta.',
      human: 'Urgência e resposta externa são conferidas pelo Atendimento.'
    }
  };

  document.querySelectorAll('[data-decision-lab]').forEach((lab) => {
    const buttons = [...lab.querySelectorAll('[data-decision]')];
    const panel = lab.querySelector('[data-decision-panel]');
    if (!buttons.length || !panel) return;
    const render = (key) => {
      const item = decisions[key];
      if (!item) return;
      panel.innerHTML = `<span class="tag state">Oportunidade ativa</span><h3>${item.title}</h3><dl><dt>Decisão</dt><dd>${item.decision}</dd><dt>Interação útil</dt><dd>${item.interaction}</dd><dt>Rastro</dt><dd>${item.trace}</dd><dt>Limite humano</dt><dd>${item.human}</dd></dl>`;
      buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.decision === key)));
    };
    buttons.forEach((button) => button.addEventListener('click', () => render(button.dataset.decision)));
    render(buttons[0].dataset.decision);
    lab.classList.add('is-enhanced');
  });

  document.querySelectorAll('textarea').forEach((field) => {
    const mirror = document.createElement('div');
    mirror.className = 'print-answer';
    mirror.setAttribute('aria-hidden', 'true');
    field.after(mirror);
    const update = () => { mirror.textContent = field.value || 'Resposta: __________________________________________________'; };
    field.addEventListener('input', update);
    window.addEventListener('beforeprint', update);
    update();
  });

  const closedDetails = [];
  window.addEventListener('beforeprint', () => {
    document.querySelectorAll('details:not([open])').forEach((detail) => {
      closedDetails.push(detail);
      detail.open = true;
    });
  });
  window.addEventListener('afterprint', () => {
    closedDetails.splice(0).forEach((detail) => { detail.open = false; });
  });

  const progress = document.querySelector('.nav-progress');
  if (progress) {
    let scheduled = false;
    const update = () => {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 1})`;
      scheduled = false;
    };
    window.addEventListener('scroll', () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
})();
