(() => {
  'use strict';

  document.querySelectorAll('[data-evidence-switch]').forEach((section) => {
    const controls = section.querySelector('[data-evidence-controls]');
    const cards = [...section.querySelectorAll('[data-evidence-kind]')];
    if (!controls || !cards.length) return;
    controls.querySelectorAll('[data-evidence-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        const kind = button.dataset.evidenceFilter;
        cards.forEach((card) => { card.hidden = kind !== 'all' && card.dataset.evidenceKind !== kind; });
        controls.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        const status = section.querySelector('[data-evidence-status]');
        if (status) status.textContent = `${cards.filter((card) => !card.hidden).length} registros visíveis. Use Todos para rever o conjunto.`;
      });
    });
    controls.hidden = false;
    section.classList.add('is-enhanced');
  });

  document.querySelectorAll('[data-score-lab]').forEach((lab) => {
    const inputs = [...lab.querySelectorAll('select')];
    const result = lab.querySelector('[data-score-result]');
    const explanation = lab.querySelector('[data-score-explanation]');
    if (inputs.length !== 4 || !result || !explanation) return;
    const update = () => {
      const [impact, speed, effort, risk] = inputs.map((input) => Number(input.value));
      result.textContent = String(impact + speed + (6 - effort) + (6 - risk));
      explanation.textContent = `${impact} + ${speed} + (6 − ${effort}) + (6 − ${risk}). ${risk >= 4 ? 'Risco elevado: reduza o escopo e reveja os controles antes de considerar o teste.' : 'Esta é uma simulação de notas. Justifique cada escolha antes de usar no plano.'} A pontuação não autoriza ações nem prevê retorno financeiro.`;
    };
    inputs.forEach((input) => input.addEventListener('change', update));
    update();
    result.closest('.score-result').hidden = false;
    lab.classList.add('is-enhanced');
  });

  document.querySelectorAll('[data-copy-source]').forEach((button) => {
    const source = document.getElementById(button.dataset.copySource);
    const feedback = [...document.querySelectorAll('[data-copy-feedback]')].find((node) => node.dataset.copyFeedback === button.dataset.copySource);
    if (!source || !feedback) return;
    button.addEventListener('click', async () => {
      const value = 'value' in source ? source.value : source.textContent;
      if (!value.trim()) { feedback.textContent = 'Escreva sua resposta antes de copiar.'; source.focus(); return; }
      try {
        await navigator.clipboard.writeText(value.trim());
        feedback.textContent = 'Texto copiado. Releia antes de usar no projeto.';
      } catch {
        feedback.textContent = 'A cópia automática não está disponível. Selecione o texto e copie manualmente.';
      }
    });
    button.hidden = false;
  });

  // Espelhos de impressão preservam respostas longas sem a caixa rolável do formulário.
  document.querySelectorAll('textarea').forEach((field) => {
    const mirror = document.createElement('div');
    mirror.className = 'print-answer';
    mirror.setAttribute('aria-hidden', 'true');
    field.after(mirror);
    const update = () => { mirror.textContent = field.value || 'Resposta: __________________________________________________'; };
    field.addEventListener('input', update);
    window.addEventListener('beforeprint', update);
    update();
    field.parentElement.classList.add('print-ready');
  });

  const closedDetails = [];
  window.addEventListener('beforeprint', () => {
    document.querySelectorAll('details:not([open])').forEach((detail) => { closedDetails.push(detail); detail.open = true; });
  });
  window.addEventListener('afterprint', () => { closedDetails.splice(0).forEach((detail) => { detail.open = false; }); });

  const progress = document.querySelector('.nav-progress');
  if (progress) {
    let scheduled = false;
    const update = () => {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 1})`;
      scheduled = false;
    };
    window.addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
})();
