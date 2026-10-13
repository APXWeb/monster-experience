"""Turn saved official pt-BR product pages into an auditable catalog JSON.

Usage: python -I tools/extract-catalog.py <pages-dir> <out.json>
Every field comes from the saved page; nothing is computed or filled in.
"""
import json, re, sys, html as H, pathlib

BASE = 'https://www.monsterenergy.com/pt-br/energy-drinks/'
ORDER = [
  ('monster-energy', 'monster-energy-original'), ('monster-energy', 'monster-energy-zero-sugar'),
  ('monster-energy', 'monster-energy-absolutely-zero'), ('monster-energy', 'monster-energy-269ml'),
  ('monster-ultra', 'monster-energy-zero-ultra'), ('monster-ultra', 'monster-energy-ultra-violet'),
  ('monster-ultra', 'monster-energy-ultra-watermelon'), ('monster-ultra', 'monster-energy-ultra-peachy-keen'),
  ('monster-ultra', 'monster-ultra-fiesta'), ('monster-ultra', 'monster-ultra-strawberry-dreams'),
  ('dragon-tea', 'monster-energy-dragon-ice-tea-limão'), ('dragon-tea', 'monster-energy-dragon-ice-tea-pêssego'),
  ('juice-monster', 'monster-energy-juice-pacific-punch'), ('juice-monster', 'monster-energy-juice-mango-loco'),
  ('juice-monster', 'monster-energy-juice-khaotic'), ('juice-monster', 'monster-energy-juice-pipeline-punch'),
  ('juice-monster', 'monster-energy-juice-rio-punch'),
]

def lines(txt):
    return [l.strip() for l in txt.splitlines() if l.strip()]

def main(d, out):
    d = pathlib.Path(d); items = []
    for line, slug in ORDER:
        txt = (d / f'{slug}.txt').read_text(encoding='utf-8')
        page = (d / f'{slug}.html').read_text(encoding='utf-8')
        L = lines(txt)
        i = L.index('Os preferidos dos nossos fãs') + 1
        name = L[i]
        flavor = L[i + 1]
        flavor = re.sub(r'^SOBRE O SABOR', '', flavor).strip()
        j = i + 2
        if L[j] == 'COMPRA ONLINE': j += 1
        desc = []
        while not re.match(r'^\d+([.,]\d+)?\s*(KCAL|MG|G)$', L[j], re.I):
            desc.append(L[j]); j += 1
        figs = []
        while j + 1 < len(L) and re.match(r'^\d+([.,]\d+)?\s*(KCAL|MG|G)$', L[j], re.I):
            v, u = re.match(r'^(\d+(?:[.,]\d+)?)\s*(\w+)$', L[j]).groups()
            figs.append({'value': float(v.replace(',', '.')), 'unit': u.lower(), 'label': L[j + 1]})
            j += 2
        can = re.search(r'<img class="can" src="([^"]+)"', page)
        title = re.search(r'<title>([^<]*)</title>', page)
        buy = sorted(set(H.unescape(m) for m in re.findall(r'href="(https?://[^"]+)"[^>]*target="_blank"[^>]*>\s*([^<]*)', page) for m in [m[0]] if not re.search(r'monsterenergy|facebook|instagram|twitter|youtube|tiktok|google|onetrust|cookie', m)))
        items.append({
            'slug': slug, 'line': line, 'url': f'{BASE}{line}/{slug}/', 'pageTitle': H.unescape(title.group(1)).strip() if title else None,
            'name': name, 'flavor': flavor, 'description': ' '.join(desc), 'figures': figs,
            'canImage': can.group(1) if can else None, 'retailLinks': buy,
        })
    pathlib.Path(out).write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding='utf-8')
    for it in items:
        print(it['slug'], '|', it['name'], '|', [(f["value"], f["unit"], f["label"]) for f in it['figures']], '|', bool(it['canImage']), len(it['retailLinks']))

main(*sys.argv[1:])
