// Roteiro local de verificacao. Nao publica, instala dependencias ou altera fontes.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const {chromium} = require(process.env.BMC_PLAYWRIGHT_MODULE || 'playwright');

const root = fs.realpathSync(path.resolve(process.argv[2] || path.join(__dirname, '..')));
const out = path.resolve(process.argv[3] || path.join(root, 'output', 'verificacao'));
fs.mkdirSync(out, {recursive: true});
const report = {date: new Date().toISOString(), method: 'Chrome headless; HTTP loopback limitado a copia isolada; todas as requisicoes externas bloqueadas.', checks: [], errors: [], consoleErrors: [], localFailures: [], screenshots: [], limitations: ['Sem teste com leitor de tela ou dispositivos fisicos.', 'Somente Chrome; sem certificacao de PDF acessivel.', 'Links externos nao foram validados; fonte web opcional das aulas bloqueada neste ensaio.']};
let browser;
const types = {'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2'};
const server = http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let target = path.resolve(root, '.' + pathname);
    if (target !== root && !target.startsWith(root + path.sep)) {res.writeHead(403); res.end(); return;}
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    if (!fs.existsSync(target)) {res.writeHead(404); res.end(); return;}
    const real = fs.realpathSync(target);
    if (real !== root && !real.startsWith(root + path.sep)) {res.writeHead(403); res.end(); return;}
    res.writeHead(200, {'Content-Type': types[path.extname(real)] || 'application/octet-stream'});
    fs.createReadStream(real).pipe(res);
  } catch {res.writeHead(400); res.end();}
});
function check(name, success, detail) {
  report.checks.push({name, passed: Boolean(success), ...(detail === undefined ? {} : {detail})});
}
function walk(folder) {
  return fs.readdirSync(folder, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(folder, e.name)) : [path.join(folder, e.name)]);
}
report.runnerSha256 = crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex');
report.testedArtifacts = ['aulas', 'projeto-inicial', 'projeto-concluido/site', 'referencias-visuais'].flatMap(folder => walk(path.join(root, folder))).sort().map(file => ({
  file: path.relative(root, file).replaceAll(path.sep, '/'),
  sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
}));

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({channel: 'chrome', headless: true});
  report.browser = await browser.version();
  const newContext = async options => {
    const ctx = await browser.newContext({viewport: {width: 1440, height: 1000}, deviceScaleFactor: 1, ...options});
    await ctx.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
    return ctx;
  };
  const context = await newContext({reducedMotion: 'reduce'});
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => {if (m.type() === 'error' && m.location().url.startsWith(base)) report.consoleErrors.push(m.text());});
  page.on('response', r => {if (r.url().startsWith(base) && r.status() >= 400) report.localFailures.push({path: new URL(r.url()).pathname, status: r.status()});});
  const load = async (p, rel) => {await p.goto(base + '/' + rel); await p.evaluate(() => document.fonts.ready);};
  const overflow = async p => {
    // Permite ao layout apos resize estabilizar inclusive quando JavaScript esta desativado.
    await p.waitForTimeout(80);
    return p.evaluate(() => ({width: innerWidth, content: document.documentElement.scrollWidth, ok: document.documentElement.scrollWidth <= innerWidth + 1,
      offenders: [...document.querySelectorAll('body *')].filter(n => n.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(n).position !== 'absolute').slice(-8).map(n => ({tag: n.tagName, class: n.className, right: Math.round(n.getBoundingClientRect().right), text: (n.textContent || '').slice(0, 65)}))}));
  };
  const screenshot = async (p, name) => {await p.screenshot({path: path.join(out, name), fullPage: false}); report.screenshots.push(name);};

  // Todas as aulas carregadas sem acesso a qualquer arquivo de origem.
  for (const file of walk(path.join(root, 'aulas')).filter(p => p.endsWith('.html')).sort()) {
    const rel = path.relative(root, file).replaceAll(path.sep, '/');
    await page.setViewportSize({width: 1440, height: 1000});
    await load(page, rel);
    const text = await page.locator('body').innerText();
    check(`${rel}: conteudo`, text.length > 500);
    check(`${rel}: desktop`, (await overflow(page)).ok);
    await page.setViewportSize({width: 390, height: 844});
    await load(page, rel);
    const mobile = await overflow(page);
    check(`${rel}: celular`, mobile.ok, mobile);
    if (rel.includes('m5-5.4')) await screenshot(page, 'aula-5-4-mobile.png');
    await page.setViewportSize({width: 375, height: 844});
    const narrow = await overflow(page);
    check(`${rel}: 375px`, narrow.ok, narrow);
    const images = await page.locator('img').evaluateAll(async list => {
      // Solicita tambem as imagens lazy fora da janela antes de avaliar os recursos.
      list.forEach(img => {img.loading = 'eager';});
      await Promise.all(list.map(img => img.decode().catch(() => {})));
      return list.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.getAttribute('src'));
    });
    check(`${rel}: imagens`, images.length === 0, images);
  }
  await page.setViewportSize({width: 1440, height: 1000});
  await load(page, 'projeto-concluido/site/index.html');
  check('Site: inicializacao', await page.locator('html').evaluate(n => n.classList.contains('js-ready')));
  check('Site: Figtree local', await page.evaluate(() => [...document.fonts].some(f => f.family.includes('Figtree') && f.status === 'loaded')));
  const contrast = await page.evaluate(() => {
    const rgba = value => {const nums = value.match(/[\d.]+/g).map(Number); return [...nums.slice(0, 3), nums[3] ?? 1];};
    const blend = (front, back) => front.slice(0, 3).map((c, i) => c * front[3] + back[i] * (1 - front[3]));
    const lum = rgb => rgb.map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((a, c, i) => a + c * [.2126, .7152, .0722][i], 0);
    return ['h1', '.source-copy strong', '.source-hash', '.tag-evidence', '.tag-hypothesis', '.tag-rule', '#matrix-status'].map(selector => {
      const n = document.querySelector(selector), style = getComputedStyle(n);
      const ancestors = []; for (let a = n; a; a = a.parentElement) ancestors.unshift(a);
      let bg = [255, 255, 255]; for (const a of ancestors) bg = blend(rgba(getComputedStyle(a).backgroundColor), bg);
      const fg = blend(rgba(style.color), bg), a = lum(fg), b = lum(bg);
      const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && parseInt(style.fontWeight) >= 700);
      return {selector, ratio: Math.round(ratio * 100) / 100, minimum: large ? 3 : 4.5};
    });
  });
  check('Site: contraste textual nas sete amostras', contrast.every(c => c.ratio >= c.minimum), contrast);
  check('Site: tres oportunidades', await page.locator('.matrix-point:visible').count() === 3);
  check('Site: dossie inicial', await page.locator('[data-dossier="opp-fila"]').isVisible());
  const sourceLinks = await page.locator('.source-copy a').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
  check('Site: quatro fontes podem ser abertas', sourceLinks.length === 4);
  for (const href of sourceLinks) {
    const response = await context.request.get(new URL(href, page.url()).href);
    check(`Site: download ${href.split('/').at(-1)}`, response.ok() && (await response.body()).length > 1000);
  }
  await screenshot(page, 'site-desktop.png');

  // Teclado real: Tab ate a triagem e Enter para selecionar.
  let reached = false;
  for (let i = 0; i < 65; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement?.dataset.select === 'opp-triagem')) {reached = true; break;}
  }
  check('Site: triagem alcancada por Tab', reached);
  if (reached) {
    const focus = await page.evaluate(() => {const c = getComputedStyle(document.activeElement); return {outline: c.outlineStyle, width: c.outlineWidth};});
    check('Site: foco visivel', focus.outline !== 'none' && parseFloat(focus.width) > 0, focus);
    await page.keyboard.press('Enter');
    check('Site: Enter sincroniza dossie', await page.locator('[data-dossier="opp-triagem"]').isVisible());
    check('Site: rastro sincronizado', (await page.locator('#trace-title').innerText()).includes('Triagem'));
    const dossier = await page.locator('[data-dossier="opp-triagem"]').innerText();
    check('Site: fonte, hipotese e responsavel', /F02/.test(dossier) && /hipótese/i.test(dossier) && /responsável/i.test(dossier));
  }
  await page.locator('[data-area-filter="operacao"]').click();
  check('Site: filtro vazio', await page.locator('#matrix-empty').isVisible() && await page.locator('.matrix-point:visible').count() === 0);
  check('Site: selecao preservada fora do filtro', await page.locator('[data-dossier="opp-triagem"]').isVisible());
  await page.locator('#show-all').click();
  check('Site: retorno restaura conjunto', await page.locator('.matrix-point:visible').count() === 3 && await page.locator('[data-dossier="opp-triagem"]').isVisible());
  for (const area of ['atendimento', 'comercial']) {
    await page.locator(`[data-area-filter="${area}"]`).click();
    check(`Site: filtro ${area}`, await page.locator('.matrix-point:visible').count() === (area === 'atendimento' ? 1 : 2));
  }
  await page.locator('#show-all').click();
  await page.locator('[data-metric-select="sem-followup"]').click();
  check('Site: indicador sincronizado', await page.locator('[data-series="sem-followup"]').isVisible());
  await page.locator('[data-plan-select="plan-2"]').click();
  check('Site: comparacao base e meta', await page.locator('[data-plan-inspector="plan-2"]').isVisible());
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({width, height: width < 500 ? 844 : 1000});
    check(`Site: largura ${width}`, (await overflow(page)).ok, await overflow(page));
  }
  await page.setViewportSize({width: 390, height: 844});
  await page.evaluate(() => scrollTo(0, 0));
  await screenshot(page, 'site-mobile.png');
  check('Site: movimento reduzido', await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
  const motion = await page.locator('body *').evaluateAll(nodes => nodes.filter(n => n.getBoundingClientRect().width > 0).some(n => {
    const c = getComputedStyle(n); return c.animationName !== 'none' && c.animationDuration.split(',').some(v => parseFloat(v) > .01);
  }));
  check('Site: sem animacao longa com movimento reduzido', !motion);

  await page.setViewportSize({width: 1440, height: 1000});
  await page.emulateMedia({media: 'print'});
  await page.evaluate(() => dispatchEvent(new Event('beforeprint')));
  check('Site: impressao revela tres dossies', await page.locator('[data-dossier]:visible').count() === 3);
  await page.pdf({path: path.join(out, 'site-impressao.pdf'), format: 'A4', printBackground: true});
  check('Site: PDF gerado', fs.statSync(path.join(out, 'site-impressao.pdf')).size > 10000);
  await page.evaluate(() => dispatchEvent(new Event('afterprint')));
  await page.emulateMedia({media: 'screen'});

  const nojsContext = await newContext({javaScriptEnabled: false});
  const nojs = await nojsContext.newPage();
  await load(nojs, 'projeto-concluido/site/index.html');
  check('Site sem JavaScript: tres dossies', await nojs.locator('[data-dossier]:visible').count() === 3);
  check('Site sem JavaScript: fontes legiveis', await nojs.locator('.source-hash').count() === 4);
  await nojs.setViewportSize({width: 390, height: 844});
  check('Site sem JavaScript: celular', (await overflow(nojs)).ok);
  await nojs.pdf({path: path.join(out, 'site-sem-javascript.pdf'), format: 'A4', printBackground: false});
  await nojsContext.close();

  const failure = await context.newPage();
  await failure.route('**/interactions.js', async route => {
    const original = fs.readFileSync(path.join(root, 'projeto-concluido/site/interactions.js'), 'utf8');
    await route.fulfill({contentType: 'text/javascript', body: "document.getElementById('initiative-data').textContent = '{';\n" + original});
  });
  await load(failure, 'projeto-concluido/site/index.html');
  check('Site: falha de inicializacao explicita', await failure.locator('#matrix-error').isVisible());
  check('Site: falha preserva tres dossies', await failure.locator('[data-dossier]:visible').count() === 3);
  await failure.close();
  check('Sem erros JavaScript nas paginas', report.errors.length === 0, report.errors);
  check('Sem recurso local com erro HTTP', report.localFailures.length === 0, report.localFailures);
})().catch(e => {report.errors.push(e.message); check('Execucao completa', false, e.message);}).finally(async () => {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
  report.summary = {passed: report.checks.filter(c => c.passed).length, failed: report.checks.filter(c => !c.passed).length};
  fs.writeFileSync(path.join(out, 'resultado-navegador.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({browser: report.browser, ...report.summary, failures: report.checks.filter(c => !c.passed)}));
  process.exitCode = report.summary.failed ? 1 : 0;
});
