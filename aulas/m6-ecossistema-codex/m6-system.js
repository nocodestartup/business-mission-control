(() => {
  'use strict';

  const copyButtons = document.querySelectorAll('[data-copy-source]');
  copyButtons.forEach((button) => {
    const source = document.getElementById(button.dataset.copySource);
    const feedback = document.querySelector(`[data-copy-feedback="${button.dataset.copySource}"]`);
    if (!source || !feedback) return;
    button.addEventListener('click', async () => {
      const value = 'value' in source ? source.value : source.textContent;
      if (!value.trim()) { feedback.textContent = 'Preencha o campo antes de copiar.'; source.focus(); return; }
      try {
        await navigator.clipboard.writeText(value.trim());
        feedback.textContent = 'Texto copiado. Confira o contexto antes de usar.';
      } catch {
        feedback.textContent = 'Selecione o texto e copie manualmente.';
      }
    });
    button.hidden = false;
  });

  const routes = {
    repeat: { tool: 'Skill', why: 'A necessidade é um método repetível com instruções, critérios e, quando útil, arquivos de apoio.', smallest: 'Registre o fluxo em uma skill e invoque quando precisar. Para o curso, use a skill handoff já revisada.', risk: 'Regras desatualizadas podem repetir um erro. Revise a skill quando o processo mudar.' },
    service: { tool: 'Plugin ou MCP', why: 'A tarefa precisa ler dados vivos ou executar ações em um serviço externo.', smallest: 'Comece por um plugin existente. Considere MCP próprio quando você controla a integração e os limites.', risk: 'Autenticação, acesso e ações externas ampliam o impacto. Use o menor escopo e confirme operações sensíveis.' },
    parallel: { tool: 'Subagente', why: 'Há partes independentes que podem avançar em paralelo e retornar para uma síntese.', smallest: 'Delegue perguntas separadas com entregas claras; mantenha passos dependentes no agente principal.', risk: 'Contextos separados podem divergir. O agente principal precisa reconciliar fontes e conflitos.' },
    long: { tool: 'Tarefa longa', why: 'Um único objetivo exige continuidade por várias etapas e verificações.', smallest: 'Mantenha o mesmo resultado, um critério de conclusão e checkpoints verificáveis.', risk: 'Tempo maior não amplia autorização. Gates humanos continuam valendo.' },
    scheduled: { tool: 'Automação', why: 'O trabalho precisa acontecer depois ou se repetir em uma agenda.', smallest: 'Agende somente quando entrada, frequência, saída e condição de notificação forem estáveis.', risk: 'Uma regra recorrente também repete erros. Defina quando ficar em silêncio, quando avisar e como interromper.' }
  };

  document.querySelectorAll('[data-router]').forEach((router) => {
    const buttons = [...router.querySelectorAll('[data-route]')];
    const result = router.querySelector('[data-route-result]');
    if (!buttons.length || !result) return;
    const render = (key) => {
      const route = routes[key];
      if (!route) return;
      result.innerHTML = `<span class="tag state">Menor recurso suficiente</span><h3>${route.tool}</h3><p>${route.why}</p><div class="verdict"><strong>Comece assim</strong><p>${route.smallest}</p></div><p><strong>Risco a controlar:</strong> ${route.risk}</p>`;
      buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.route === key)));
    };
    buttons.forEach((button) => button.addEventListener('click', () => render(button.dataset.route)));
    render(buttons[0].dataset.route);
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
