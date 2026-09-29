(() => {
  'use strict';
  const root = document.documentElement;
  const all = (selector) => [...document.querySelectorAll(selector)];
  const byId = (id) => document.getElementById(id);
  const filters = all('[data-area-filter]');
  const points = all('.matrix-point');
  const dossiers = all('[data-dossier]');
  const error = byId('matrix-error');
  const empty = byId('matrix-empty');
  const status = byId('matrix-status');
  const showAll = byId('show-all');
  const labels = {all: 'todas as áreas', atendimento: 'Atendimento', comercial: 'Comercial', operacao: 'Operação'};
  let failed = false;
  let initiatives;
  const state = {area: 'all', selected: 'opp-fila', metric: 'primeira-resposta', plan: 'plan-1'};

  function failOpen() {
    failed = true;
    root.classList.remove('js-ready');
    all('[data-dossier], [data-series], [data-plan-inspector], .matrix-point').forEach((node) => { node.hidden = false; });
    all('[data-select], [data-metric-select], [data-plan-select]').forEach((button) => { button.disabled = true; });
    if (empty) empty.hidden = true;
    if (error) error.hidden = false;
  }
  const guarded = (fn) => (...args) => {
    if (failed) return;
    try { fn(...args); } catch { failOpen(); }
  };
  function renderSelection() {
    const selected = initiatives.find((item) => item.id === state.selected);
    if (!selected) throw new Error('Selection unavailable');
    let visible = 0;
    points.forEach((point) => {
      const matches = state.area === 'all' || point.dataset.area === state.area;
      point.hidden = !matches;
      if (matches) visible++;
    });
    all('[data-select]').forEach((button) => {
      const active = button.dataset.select === selected.id;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
    });
    all('[data-queue]').forEach((item) => { item.dataset.active = String(item.dataset.queue === selected.id); });
    dossiers.forEach((node) => { node.hidden = node.dataset.dossier !== selected.id; });
    all('[data-bottleneck]').forEach((node) => { node.dataset.linked = String(node.dataset.bottleneck === selected.bottleneck); });
    all('[data-source]').forEach((node) => { node.dataset.linked = String(selected.sourceIds.includes(node.dataset.source)); });
    all('[data-phase]').forEach((node) => { node.dataset.linked = String(selected.phases.includes(node.dataset.phase)); });
    filters.forEach((button) => { button.setAttribute('aria-pressed', String(button.dataset.areaFilter === state.area)); });
    byId('trace-code').textContent = 'Rastro ativo · ' + selected.code;
    byId('trace-title').textContent = selected.title;
    byId('trace-description').textContent = selected.trace;
    byId('trace-link').href = '#' + selected.id;
    byId('source-count').textContent = selected.sourceIds.length + (selected.sourceIds.length === 1 ? ' fonte ligada' : ' fontes ligadas') + ' a ' + selected.code;
    const within = state.area === 'all' || selected.area === state.area;
    status.textContent = visible + (visible === 1 ? ' oportunidade' : ' oportunidades') + ' em ' + labels[state.area] + '. ' +
      (within ? 'Selecionada: ' + selected.title + '.' : 'Seleção preservada fora deste filtro: ' + selected.title + '. O dossiê e o rastro continuam disponíveis.');
    showAll.hidden = state.area === 'all';
    empty.hidden = visible !== 0;
  }
  function renderMetric() {
    all('[data-metric]').forEach((node) => { node.dataset.active = String(node.dataset.metric === state.metric); });
    all('[data-metric-select]').forEach((button) => { button.setAttribute('aria-pressed', String(button.dataset.metricSelect === state.metric)); });
    all('[data-series]').forEach((node) => { node.hidden = node.dataset.series !== state.metric; });
  }
  function renderPlan() {
    all('[data-plan-select]').forEach((button) => {
      const selected = button.dataset.planSelect === state.plan;
      button.setAttribute('aria-pressed', String(selected));
      button.closest('.metric-row').dataset.selected = String(selected);
    });
    all('[data-plan-inspector]').forEach((node) => { node.hidden = node.dataset.planInspector !== state.plan; });
  }
  function linkedInitiative(hash) {
    const selected = initiatives.find((item) => '#' + item.id === hash);
    if (!selected) return;
    state.selected = selected.id;
    state.area = 'all';
    renderSelection();
  }

  try {
    initiatives = JSON.parse(byId('initiative-data').textContent);
    if (initiatives.length !== 3 || points.length !== 3 || dossiers.length !== 3 || filters.length !== 4 ||
        !showAll || !status || !empty || !error ||
        initiatives.some((item) => !byId(item.id) || !labels[item.area]) ||
        !byId('chart-status') || all('[data-series]').length !== 4 || all('[data-plan-inspector]').length !== 4) {
      throw new Error('Incomplete report controls');
    }
    filters.forEach((button) => button.addEventListener('click', guarded(() => {
      state.area = button.dataset.areaFilter;
      renderSelection();
    })));
    all('[data-select]').forEach((button) => button.addEventListener('click', guarded(() => {
      state.selected = button.dataset.select;
      renderSelection();
    })));
    showAll.addEventListener('click', guarded(() => {
      state.area = 'all';
      renderSelection();
      filters.find((button) => button.dataset.areaFilter === 'all').focus();
    }));
    all('[data-metric-select]').forEach((button) => button.addEventListener('click', guarded(() => {
      state.metric = button.dataset.metricSelect;
      renderMetric();
      byId('chart-status').textContent = 'Indicador selecionado: ' + button.querySelector('span').textContent + '. Série e tabela de fontes atualizadas.';
    })));
    all('[data-plan-select]').forEach((button) => button.addEventListener('click', guarded(() => {
      state.plan = button.dataset.planSelect;
      renderPlan();
      byId('chart-status').textContent = 'Comparação selecionada: ' + button.closest('.metric-row').querySelector('strong').textContent + '. Base observada e meta de teste; resultado do piloto não medido.';
    })));
    // Handle every click, including repeated links whose hash does not change.
    document.addEventListener('click', guarded((event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      linkedInitiative(link.hash);
      const menu = link.closest('.mobile-menu');
      if (menu) menu.open = false;
    }));
    window.addEventListener('hashchange', guarded(() => linkedInitiative(window.location.hash)));
    const menu = document.querySelector('.mobile-menu');
    menu?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary').focus();
      }
    });
    let printDetails = [];
    window.addEventListener('beforeprint', () => {
      printDetails = all('.observed-data-table').map((node) => ({node, open: node.open}));
      printDetails.forEach(({node}) => { node.open = true; });
      resizeCharts();
    });
    window.addEventListener('afterprint', () => {
      printDetails.forEach(({node, open}) => { node.open = open; });
      resizeCharts();
    });
    all('[data-select], [data-metric-select], [data-plan-select]').forEach((button) => { button.disabled = false; });
    root.classList.add('js-ready');
    renderSelection(); renderMetric(); renderPlan();
    linkedInitiative(window.location.hash);
    // Resize SVG coordinates instead of stretching text and strokes with the viewBox.
    // Unlabelled sparklines keep their intrinsic ratio, avoiding resize feedback.
    const charts = all('.history-svg, .metric-comparison-chart > svg').filter((svg) => svg.querySelector('text'));
    const originals = new Map(charts.map((svg) => [svg, {
      box: svg.viewBox.baseVal.width,
      height: svg.viewBox.baseVal.height,
      nodes: [...svg.querySelectorAll('line,text,circle,polyline,rect')].map((node) => ({
        node, attrs: Object.fromEntries([...node.attributes].map((attr) => [attr.name,attr.value]))
      }))
    }]));
    const resizeCharts = () => charts.forEach((svg) => {
      const {width, height} = svg.getBoundingClientRect();
      if (!width || !height) return;
      const original = originals.get(svg), sx = width / original.box, sy = height / original.height;
      const hasLabels = original.nodes.some(({node}) => node.localName === 'text');
      const left = svg.classList.contains('history-svg') ? 42 : 34;
      const right = svg.classList.contains('history-svg') ? 18 : 10;
      const plotScale = hasLabels ? Math.max(1,width-left-right)/(original.box-left-right) : sx;
      const mapX = (value) => hasLabels ? left+(value-left)*plotScale : value*sx;
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.setAttribute('preserveAspectRatio','none');
      original.nodes.forEach(({node,attrs}) => {
        ['x','x1','x2','cx'].forEach((key) => {
          if (attrs[key] === undefined) return;
          const value = Number(attrs[key]);
          // Axis labels stay in the fixed gutter outside the scaled data area.
          const fixedLabel = node.localName === 'text' && key === 'x' && value < left;
          node.setAttribute(key, String(fixedLabel ? value : mapX(value)));
        });
        ['y','y1','y2','cy'].forEach((key) => { if (attrs[key] !== undefined) node.setAttribute(key, String(Number(attrs[key])*sy)); });
        if (attrs.width) node.setAttribute('width', String(Number(attrs.width)*plotScale));
        if (attrs.height) node.setAttribute('height', String(Number(attrs.height)*sy));
        if (attrs.points) node.setAttribute('points',attrs.points.split(' ').map((pair) => {
          const [x,y] = pair.split(',').map(Number); return mapX(x) + ',' + (y*sy);
        }).join(' '));
      });
      // Match the reference's 28px minimum tick gap, keeping the final period.
      if (svg.classList.contains('history-svg')) {
        let nextStart = Infinity;
        original.nodes.filter(({node,attrs}) => node.localName === 'text' && Number(attrs.y) > original.height-10).reverse().forEach(({node}) => {
          node.style.display = '';
          const size = node.getComputedTextLength();
          const x = Math.min(width-size/2-2,Math.max(size/2+2,Number(node.getAttribute('x'))));
          node.setAttribute('x',String(x));
          if (x+size/2+28 > nextStart) node.style.display = 'none';
          else nextStart = x-size/2;
        });
      }
    });
    const chartObserver = new ResizeObserver(resizeCharts);
    charts.forEach((svg) => chartObserver.observe(svg));
    resizeCharts();
  } catch { failOpen(); }
})();
