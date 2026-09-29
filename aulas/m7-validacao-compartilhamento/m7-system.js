(() => {
  'use strict';

  document.querySelectorAll('[data-copy-source]').forEach((button) => {
    const source = document.getElementById(button.dataset.copySource);
    const feedback = document.querySelector(`[data-copy-feedback="${button.dataset.copySource}"]`);
    if (!source || !feedback) return;
    button.addEventListener('click', async () => {
      const value = 'value' in source ? source.value : source.textContent;
      if (!value.trim()) { feedback.textContent = 'Preencha o campo antes de copiar.'; source.focus(); return; }
      try { await navigator.clipboard.writeText(value.trim()); feedback.textContent = 'Texto copiado. Confira antes de usar.'; }
      catch { feedback.textContent = 'Selecione o texto e copie manualmente.'; }
    });
    button.hidden = false;
  });

  document.querySelectorAll('[data-audit]').forEach((audit) => {
    const checks = [...audit.querySelectorAll('input[type="checkbox"]')];
    const panel = audit.querySelector('[data-verdict]');
    const mark = panel?.querySelector('[data-verdict-mark]');
    const title = panel?.querySelector('[data-verdict-title]');
    const detail = panel?.querySelector('[data-verdict-detail]');
    if (!checks.length || !panel || !mark || !title || !detail) return;
    const update = () => {
      const mandatory = checks.filter((check) => check.dataset.blocker === 'true');
      const pendingMandatory = mandatory.filter((check) => !check.checked).length;
      const pending = checks.filter((check) => !check.checked).length;
      if (pendingMandatory) {
        panel.dataset.state = 'blocked';
        mark.textContent = 'PARE';
        title.textContent = 'Não pronto';
        detail.textContent = `${pendingMandatory} bloqueador(es) ou critério(s) obrigatório(s) continuam aberto(s). Não corrija nem publique antes de registrar o achado e obter decisão.`;
      } else if (pending) {
        panel.dataset.state = 'caution';
        mark.textContent = 'REVER';
        title.textContent = 'Pronto com ressalvas';
        detail.textContent = `${pending} verificação(ões) não bloqueante(s) precisam aparecer no relatório e na nota de escopo.`;
      } else {
        panel.dataset.state = 'ready';
        mark.textContent = 'OK';
        title.textContent = 'Pronto para decisão de publicação';
        detail.textContent = 'As verificações do exercício foram marcadas. Ainda é necessária autorização humana explícita para publicar e definir acesso.';
      }
    };
    checks.forEach((check) => check.addEventListener('change', update));
    update();
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
