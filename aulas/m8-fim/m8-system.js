(() => {
  'use strict';

  document.querySelectorAll('[data-copy-source]').forEach((button) => {
    const source = document.getElementById(button.dataset.copySource);
    const feedback = document.querySelector(`[data-copy-feedback="${button.dataset.copySource}"]`);
    if (!source || !feedback) return;
    button.addEventListener('click', async () => {
      const value = 'value' in source ? source.value : source.textContent;
      if (!value.trim()) { feedback.textContent = 'Preencha o plano antes de copiar.'; source.focus(); return; }
      try { await navigator.clipboard.writeText(value.trim()); feedback.textContent = 'Plano copiado. Revise antes de iniciar.'; }
      catch { feedback.textContent = 'Selecione o plano e copie manualmente.'; }
    });
    button.hidden = false;
  });

  document.querySelectorAll('[data-plan-builder]').forEach((builder) => {
    const fields = [...builder.querySelectorAll('textarea[data-plan-field]')];
    const output = builder.querySelector('[data-plan-output]');
    const generate = builder.querySelector('[data-generate-plan]');
    if (!fields.length || !output || !generate) return;
    const render = () => {
      const values = Object.fromEntries(fields.map((field) => [field.dataset.planField, field.value.trim()]));
      const missing = fields.filter((field) => !field.value.trim());
      if (missing.length) {
        output.replaceChildren();
        const empty = document.createElement('p');
        empty.className = 'empty';
        empty.textContent = `Preencha os ${missing.length} campo(s) restante(s). O plano só será montado quando objetivo, fonte, entrega, medida e reversão estiverem explícitos.`;
        output.append(empty);
        missing[0].focus();
        return;
      }
      output.replaceChildren();
      const tag = document.createElement('span');
      tag.className = 'tag state';
      tag.textContent = 'Plano pessoal';
      const heading = document.createElement('h3');
      heading.textContent = values.objective;
      const source = document.createElement('p');
      const sourceLabel = document.createElement('strong');
      sourceLabel.textContent = 'Fontes autorizadas: ';
      source.append(sourceLabel, values.source);
      const steps = document.createElement('ol');
      [
        ['Planejar: ', 'confirmar objetivo, audiência, limites e critério de pronto.'],
        ['Construir: ', `produzir ${values.delivery} sem ampliar o escopo.`],
        ['Testar: ', `conferir ${values.measure} com a mesma definição.`],
        ['Iterar ou interromper: ', values.rollback]
      ].forEach(([label, text]) => {
        const item = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = label;
        item.append(strong, text);
        steps.append(item);
      });
      const firstStep = document.createElement('p');
      const firstStepLabel = document.createElement('strong');
      firstStepLabel.textContent = 'Primeiro passo: ';
      firstStep.append(firstStepLabel, 'criar o projeto, reunir somente as fontes autorizadas e pedir um plano antes de executar.');
      output.append(tag, heading, source, steps, firstStep);
    };
    generate.addEventListener('click', render);
    generate.hidden = false;
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

  document.documentElement.classList.add('has-print-mirrors');
  const closed = [];
  window.addEventListener('beforeprint', () => document.querySelectorAll('details:not([open])').forEach((detail) => { closed.push(detail); detail.open = true; }));
  window.addEventListener('afterprint', () => closed.splice(0).forEach((detail) => { detail.open = false; }));

  const progress = document.querySelector('.nav-progress');
  if (progress) {
    let pending = false;
    const update = () => {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 1})`;
      pending = false;
    };
    window.addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
})();
