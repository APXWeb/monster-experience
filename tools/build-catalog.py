"""Build src/data/catalog.json from the extracted official pages.

Usage: python -I tools/build-catalog.py
Input: tools/data/catalog-raw.json (official pt-BR product pages, saved 2026-10-12,
produced by tools/extract-catalog.py).
Editorial additions are limited to: display name, art-direction colors, and notes
on what the official render visibly shows. No nutrition value is computed or filled in.
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
raw = json.loads((ROOT / 'tools/data/catalog-raw.json').read_text(encoding='utf-8'))
ACCESSED = '2026-10-12'
INDEX = 'https://www.monsterenergy.com/pt-br/energy-drinks/'

SEAL = 'Selo frontal visível na embalagem oficial: "Alto em açúcar adicionado".'
RETAIL = 'Volume citado nos links de compra exibidos na página oficial do produto.'

# slug -> (id, line, displayName, (accent, deep), volume basis, pack notes)
META = {
    'monster-energy-original': ('original-green', 'monster-energy', 'Original Green', ('#8fe03a', '#5fbf1c'), 'retail', [SEAL]),
    'monster-energy-zero-sugar': ('zero-sugar', 'monster-energy', 'Zero Sugar', ('#b6ec4f', '#7ccf22'), 'retail', []),
    'monster-energy-absolutely-zero': ('absolutely-zero', 'monster-energy', 'Absolutely Zero', ('#8fd6ec', '#2f9ccf'), 'retail', []),
    'monster-energy-269ml': ('original-green-269ml', 'monster-energy', 'Original Green 269 ml', ('#8fe03a', '#5fbf1c'), 'page269', [SEAL]),
    'monster-energy-zero-ultra': ('ultra-white', 'monster-ultra', 'Ultra White', ('#e4ebf1', '#9fb3c4'), 'retail', []),
    'monster-energy-ultra-violet': ('ultra-violet', 'monster-ultra', 'Ultra Violet', ('#a77ae6', '#6a3fb8'), 'retail', []),
    'monster-energy-ultra-watermelon': ('ultra-watermelon', 'monster-ultra', 'Ultra Watermelon', ('#ff5a6c', '#d92c45'), 'retail', []),
    'monster-energy-ultra-peachy-keen': ('ultra-peachy-keen', 'monster-ultra', 'Ultra Peachy Keen', ('#ffab8a', '#f07a58'), 'retail', []),
    'monster-ultra-fiesta': ('ultra-fiesta-mango', 'monster-ultra', 'Ultra Fiesta Mango', ('#2fc2bc', '#ff8a2a'), 'retail', []),
    'monster-ultra-strawberry-dreams': ('ultra-strawberry-dreams', 'monster-ultra', 'Ultra Strawberry Dreams', ('#f6b3d6', '#d66aa6'), None, []),
    'monster-energy-dragon-ice-tea-limão': ('dragon-tea-limao', 'dragon-tea', 'Dragon Ice Tea Limão', ('#7fd04a', '#b9853a'), 'retail', []),
    'monster-energy-dragon-ice-tea-pêssego': ('dragon-tea-pessego', 'dragon-tea', 'Dragon Ice Tea Pêssego', ('#ffbf8a', '#c98a3c'), 'render', []),
    'monster-energy-juice-pacific-punch': ('juice-pacific-punch', 'juice-monster', 'Juice Pacific Punch', ('#ff4a4f', '#e9dcc0'), 'retail', []),
    'monster-energy-juice-mango-loco': ('juice-mango-loco', 'juice-monster', 'Juice Mango Loco', ('#45c1f5', '#f5b030'), 'retail', [SEAL]),
    'monster-energy-juice-khaotic': ('juice-khaotic', 'juice-monster', 'Juice Khaotic', ('#ffcc1f', '#3fb6b0'), 'retail', []),
    'monster-energy-juice-pipeline-punch': ('juice-pipeline-punch', 'juice-monster', 'Juice Pipeline Punch', ('#ff6f8e', '#f6a3b8'), 'retail', [SEAL]),
    'monster-energy-juice-rio-punch': ('juice-rio-punch', 'juice-monster', 'Juice Rio Punch', ('#ffd923', '#1fb8b2'), 'retail', []),
}

LINES = [
    {'id': 'monster-energy', 'name': 'Monster Energy', 'color': '#8fe03a',
     'description': 'O original que começou tudo. A linha clássica da Monster Energy oferece uma energia poderosa e intensa que só a Monster Energy tem.',
     'source': INDEX + 'monster-energy/'},
    {'id': 'monster-ultra', 'name': 'Monster Ultra', 'color': '#e4ebf1',
     'description': 'Zero açúcar, muito sabor. Monster Ultra é destemido!',
     'source': INDEX + 'monster-ultra/'},
    {'id': 'dragon-tea', 'name': 'Dragon Tea', 'color': '#e0a63e',
     'description': 'Monster Dragon Iced Tea oferece chá leve e refrescante com ingredientes que aumentam a energia em chás verdes, chás pretos e chás de frutas.',
     'source': INDEX + 'dragon-tea/'},
    {'id': 'juice-monster', 'name': 'Juice Monster', 'color': '#ffb020',
     'description': 'Feito com suco de fruta, grande sabor e a potência da Monster Energy em cada gole.',
     'source': INDEX + 'juice-monster/'},
]

KEYS = {'kcal': 'calories', 'mg': 'caffeine', 'g': 'sugars'}

out = []
for it in raw:
    pid, line, display, (accent, deep), vol, notes = META[it['slug']]
    figs = {}
    for f in it['figures']:
        figs[KEYS[f['unit']]] = {'value': f['value'], 'unit': f['unit'], 'officialLabel': f['label']}
    # The page text dump can carry a retailer button label before the copy.
    desc = re.sub(r'^(AMAZON|CARREFOUR|ZAFFARI|SOUDAKI)\s+', '', it['description']).strip()
    desc = desc.rstrip('"').strip()
    retail_vol = sorted({m for r in it['retailLinks'] for m in re.findall(r'(\d{3})\s*ml', r, re.I)})
    volume = None
    if vol == 'retail' and retail_vol == ['473']:
        volume = {'ml': 473, 'basis': RETAIL}
    elif vol == 'page269':
        volume = {'ml': 269, 'basis': 'Volume informado no nome e na descrição da página oficial.'}
    elif vol == 'render':
        volume = {'ml': 473, 'basis': 'Volume legível na lateral da embalagem exibida na página oficial.'}
    elif vol is not None:
        raise SystemExit(f'volume mismatch for {pid}: {retail_vol}')
    sources = [{'label': 'Página oficial do produto (pt-BR)', 'url': it['url'], 'accessed': ACCESSED},
               {'label': 'Imagem oficial da embalagem', 'url': it['canImage'], 'accessed': ACCESSED}]
    if volume and vol == 'retail':
        sources.append({'label': 'Links de compra listados na página oficial', 'url': it['url'], 'accessed': ACCESSED,
                        'note': ' ; '.join(r for r in it['retailLinks'] if '473' in r)})
    out.append({
        'id': pid, 'line': line, 'displayName': display, 'officialName': it['name'],
        'flavor': it['flavor'], 'description': desc, 'figures': figs, 'volume': volume,
        'ingredients': None, 'packNotes': notes,
        'image': f'products/{pid}.webp', 'colors': {'accent': accent, 'deep': deep},
        'sources': sources,
    })

data = {'accessed': ACCESSED, 'catalogSource': INDEX, 'lines': LINES, 'products': out,
        'note': 'Dados transcritos das páginas oficiais da Monster Energy Brasil. Campos ausentes não foram publicados nas páginas consultadas.'}
(ROOT / 'src/data').mkdir(parents=True, exist_ok=True)
(ROOT / 'src/data/catalog.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(len(out), 'products;', sum(1 for p in out if p['volume']), 'with volume')
