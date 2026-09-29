"""Gera inventario e ZIP local; nao acessa o GitHub nem o Sites."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def sha(data):
    return hashlib.sha256(data).hexdigest()


version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
inventory_path = ROOT / 'verificacao/inventario.json'
paths = sorted(p for p in ROOT.rglob('*') if p.is_file() and p != inventory_path and p.relative_to(ROOT).parts[0] != '.git')
inventory = {'versao': version, 'algoritmo': 'SHA-256',
             'nota': 'O inventario nao inclui a si proprio. O SHA-256 externo cobre o ZIP completo, incluindo este inventario.',
             'arquivos': [{'arquivo': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p.read_bytes())} for p in paths]}
inventory_path.write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
subprocess.run([sys.executable, str(ROOT / 'verificacao/verificar.py')], cwd=ROOT, check=True)
target = ROOT.parent / f'business-mission-control-v{version}.zip'
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for p in sorted(ROOT.rglob('*')):
        if not p.is_file() or p.relative_to(ROOT).parts[0] == '.git':
            continue
        info = zipfile.ZipInfo('business-mission-control/' + p.relative_to(ROOT).as_posix(), (2026, 9, 28, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, p.read_bytes())
checksum = target.with_suffix('.sha256')
checksum.write_text(f'{sha(target.read_bytes())}  {target.name}\n', encoding='ascii')
print(json.dumps({'zip': target.name, 'bytes': target.stat().st_size, 'sha256': sha(target.read_bytes())}))
