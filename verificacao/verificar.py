"""Verifica a distribuicao sem dependencias Python externas e sem altera-la."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import hashlib
import json
import re
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def digest(data):
    return hashlib.sha256(data).hexdigest()


class Page(HTMLParser):
    def __init__(self, body):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.refs = []
        self.feed(body)

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if 'id' in values:
            self.ids.add(values['id'])
        for attr in ('href', 'src'):
            if values.get(attr):
                self.refs.append(values[attr])


def files():
    # Um clone tem metadados Git locais; eles nao pertencem a distribuicao.
    # .git aninhado continua proibido pela verificacao de conteudo.
    return sorted(p for p in ROOT.rglob('*') if p.is_file() and p.relative_to(ROOT).parts[0] != '.git')


def inspect_package(check_inventory=True):
    problems = []
    paths = files()
    pages = sorted((ROOT / 'aulas').rglob('*.html'))
    if len(pages) != 22:
        problems.append(f'Esperadas 22 aulas, encontradas {len(pages)}')
    text_types = {'.md', '.html', '.css', '.js', '.mjs', '.cjs', '.json', '.tsx', '.ts', '.yaml', '.yml', '.py'}
    forbidden_parts = {'.git', '.openai', '.codex', '.playwright-cli', 'node_modules', '__pycache__'}
    private_patterns = [r'[A-Za-z]:[\\/](?:Users|Development)[\\/]',
                        'appg' + r'(?:prj|dep|ver)_[a-zA-Z0-9_]+',
                        r'https://[\w.-]+' + r'\.chatgpt\.site',
                        r'-----BEGIN ' + r'(?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
                        r'\bsk-' + r'[A-Za-z0-9_-]{24,}',
                        r'\bgh[pousr]_' + r'[A-Za-z0-9]{30,}']
    link_count = 0
    external = set()
    for path in paths:
        rel = path.relative_to(ROOT).as_posix()
        if forbidden_parts.intersection(path.relative_to(ROOT).parts) or path.name.startswith(('.env', '~$')) or path.relative_to(ROOT).parts[0] == 'output' or path.is_symlink():
            problems.append(f'Artefato excluido presente: {rel}')
        if path.suffix not in text_types:
            continue
        body = path.read_text(encoding='utf-8')
        for pattern in private_patterns:
            if re.search(pattern, body, re.I):
                problems.append(f'Referencia privada/credencial detectada em {rel}')
        refs = []
        if path.suffix == '.html':
            refs = Page(body).refs
        elif path.suffix == '.md':
            refs = re.findall(r'\[[^\]]*\]\(([^\s)]+)\)', body)
        elif path.suffix == '.css':
            refs = [m.strip(' \"\'') for m in re.findall(r'url\(([^)]+)\)', body)]
        for raw in refs:
            parsed = urlsplit(raw)
            if parsed.scheme or raw.startswith('//'):
                if parsed.scheme in {'http', 'https'}:
                    external.add(raw)
                continue
            target = (path.parent / unquote(parsed.path)).resolve() if parsed.path else path
            link_count += 1
            if not target.is_relative_to(ROOT):
                problems.append(f'Link escapa da distribuicao: {rel}: {raw}')
                continue
            if not target.exists():
                problems.append(f'Link ausente: {rel}: {raw}')
                continue
            if parsed.fragment and target.suffix == '.html':
                if unquote(parsed.fragment) not in Page(target.read_text(encoding='utf-8')).ids:
                    problems.append(f'Ancora ausente: {rel}: {raw}')
    comparison = json.loads((ROOT / 'verificacao/comparacao-fontes.json').read_text(encoding='utf-8'))
    html = (ROOT / 'projeto-concluido/site/index.html').read_text(encoding='utf-8')
    initiatives = json.loads(re.search(r'<script[^>]*id="initiative-data"[^>]*>(.*?)</script>', html, re.S).group(1))
    calculated_scores = []
    for item in initiatives:
        dossier = re.search(r'<article[^>]*id="' + re.escape(item['id']) + r'"[^>]*>(.*?)</article>', html, re.S).group(1)
        ledger = {label: int(value) for label, value in re.findall(r'<dt>(Impacto|Velocidade|Esforço|Risco)</dt><dd>([1-5])/5</dd>', dossier)}
        total = ledger['Impacto'] + ledger['Velocidade'] + (6 - ledger['Esforço']) + (6 - ledger['Risco'])
        calculated_scores.append(total)
        if total != item['score'] or f'<strong>{total}/20</strong>' not in dossier:
            problems.append(f'Pontuacao divergente: {item["id"]}')
    if calculated_scores != [17, 14, 13]:
        problems.append('Prioridades do exemplo divergiram das decisoes registradas')
    evidence_path = ROOT / 'verificacao/resultado-navegador.json'
    if evidence_path.exists():
        evidence = json.loads(evidence_path.read_text(encoding='utf-8'))
        if evidence.get('summary', {}).get('failed') != 0:
            problems.append('Evidencia de navegador contem falhas')
        if evidence.get('runnerSha256') != digest((ROOT / 'verificacao/navegador.cjs').read_bytes()):
            problems.append('Roteiro de navegador difere daquele executado')
        for item in evidence.get('testedArtifacts', []):
            target = ROOT / item['file']
            if not target.is_file() or digest(target.read_bytes()) != item['sha256']:
                problems.append(f'Arquivo difere da evidencia de navegador: {item["file"]}')
    else:
        problems.append('Evidencia de navegador ausente')
    for item in comparison['fontes']:
        actual = digest((ROOT / 'projeto-inicial' / item['arquivo']).read_bytes())
        if actual != item['sha256_distribuido']:
            problems.append(f'Fonte modificada: {item["arquivo"]}')
        if actual.upper() not in html:
            problems.append(f'Hash da fonte ausente no exemplo: {item["arquivo"]}')
    with zipfile.ZipFile(ROOT / 'referencias-visuais/bmc-visual-kit.zip') as archive:
        expected = {p.relative_to(ROOT).as_posix(): p for p in (ROOT / 'referencias-visuais/bmc-original').rglob('*') if p.is_file()}
        expected['PROMPT-APLICAR-VISUAL-BMC.md'] = ROOT / 'referencias-visuais/PROMPT-APLICAR-VISUAL-BMC.md'
        if sorted(archive.namelist()) != sorted(expected):
            problems.append('ZIP visual diverge da lista de arquivos distribuida')
        for name in archive.namelist():
            if name not in expected or digest(archive.read(name)) != digest(expected[name].read_bytes()):
                problems.append(f'ZIP visual diverge em {name}')
    if check_inventory:
        inventory_path = ROOT / 'verificacao/inventario.json'
        if not inventory_path.exists():
            problems.append('Inventario ausente')
        else:
            inventory = json.loads(inventory_path.read_text(encoding='utf-8'))
            expected_names = sorted(row['arquivo'] for row in inventory['arquivos'])
            actual_names = sorted(p.relative_to(ROOT).as_posix() for p in paths if p != inventory_path)
            if expected_names != actual_names:
                problems.append('Inventario nao corresponde ao conjunto de arquivos')
            for row in inventory['arquivos']:
                p = ROOT / row['arquivo']
                if not p.is_file() or p.stat().st_size != row['bytes'] or digest(p.read_bytes()) != row['sha256']:
                    problems.append(f'Integridade divergente: {row["arquivo"]}')
    print(json.dumps({'arquivos': len(paths), 'aulas': len(pages), 'links_locais': link_count, 'prioridades_recalculadas': calculated_scores,
                      'links_externos_nao_verificados': len(external), 'problemas': problems}, ensure_ascii=False, indent=2))
    return problems


if __name__ == '__main__':
    errors = inspect_package('--sem-inventario' not in sys.argv)
    if errors:
        raise SystemExit(1)
    result = subprocess.run(['node', '--test', str(ROOT / 'verificacao/fontes.test.mjs')], cwd=ROOT, check=False)
    raise SystemExit(result.returncode)
