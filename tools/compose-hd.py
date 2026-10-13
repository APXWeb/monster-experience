"""Build the HD product textures from the official renders.

Usage: python tools/compose-hd.py <esrgan-4x-dir>
  inputs : tools/data/renders/<slug>.png      (official 250x625 renders)
           <esrgan-4x-dir>/<slug>.png         (Real-ESRGAN x4plus output of the same file)
  output : public/products/hd/<id>.webp       (600 px wide, transparent, for <img>)
           public/products/tex/<id>.jpg       (600 px, margins pre-padded, for the 3D projection)
           public/products/tex/<id>-sm.jpg    (250 px, same, for phones and the closing rack)

Real-ESRGAN sharpens the large marks and artwork but invents letters in small
print. So small-print bands (the legal designation paragraph, the side volume
text and the front-of-pack seal corner) are taken from a plain Lanczos upscale
of the official render instead: softer, but never different from the original.
"""
import sys, os, json
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ESR = sys.argv[1]
OUT = os.path.join(ROOT, 'public', 'products', 'hd')
TEX = os.path.join(ROOT, 'public', 'products', 'tex')
os.makedirs(OUT, exist_ok=True)
os.makedirs(TEX, exist_ok=True)


def padded(img):
    """Opaque copy whose transparent margins repeat the row's edge colour.
    The 3D projection samples to the very silhouette; baking this here keeps all
    pixel work out of the browser's main thread."""
    img = img.convert('RGBA')
    w, h = img.size
    px = img.load()
    out = Image.new('RGB', (w, h))
    op = out.load()
    for y in range(h):
        first = next((x for x in range(w) if px[x, y][3] > 200), None)
        if first is None:
            for x in range(w):
                op[x, y] = (12, 12, 12)
            continue
        last = next(x for x in range(w - 1, -1, -1) if px[x, y][3] > 200)
        for x in range(w):
            r, g, b, _ = px[min(max(x, first), last), y]
            op[x, y] = (r, g, b)
    return out


W = 600

SLUG_TO_ID = {
    'monster-energy-original': 'original-green', 'monster-energy-zero-sugar': 'zero-sugar',
    'monster-energy-absolutely-zero': 'absolutely-zero', 'monster-energy-269ml': 'original-green-269ml',
    'monster-energy-zero-ultra': 'ultra-white', 'monster-energy-ultra-violet': 'ultra-violet',
    'monster-energy-ultra-watermelon': 'ultra-watermelon', 'monster-energy-ultra-peachy-keen': 'ultra-peachy-keen',
    'monster-ultra-fiesta': 'ultra-fiesta-mango', 'monster-ultra-strawberry-dreams': 'ultra-strawberry-dreams',
    'dragon-tea-limao': 'dragon-tea-limao', 'dragon-tea-pessego': 'dragon-tea-pessego',
    'monster-energy-juice-pacific-punch': 'juice-pacific-punch', 'monster-energy-juice-mango-loco': 'juice-mango-loco',
    'monster-energy-juice-khaotic': 'juice-khaotic', 'monster-energy-juice-pipeline-punch': 'juice-pipeline-punch',
    'monster-energy-juice-rio-punch': 'juice-rio-punch',
}

def small_print_mask(w, h):
    """White where the original must be kept (fractions of the render frame)."""
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    d.rectangle([0, int(h * 0.785), w, int(h * 0.965)], fill=255)          # designation paragraph
    d.rectangle([0, int(h * 0.45), int(w * 0.13), int(h * 0.97)], fill=255)  # vertical volume text, left edge
    d.rectangle([int(w * 0.87), int(h * 0.45), w, int(h * 0.97)], fill=255)  # right edge small print
    d.rectangle([int(w * 0.5), int(h * 0.075), w, int(h * 0.215)], fill=255)  # front-of-pack seal corner
    return m.filter(ImageFilter.GaussianBlur(radius=max(2, w // 120)))

log = {}
for slug, pid in SLUG_TO_ID.items():
    src = Image.open(os.path.join(ROOT, 'tools', 'data', 'renders', slug + '.png')).convert('RGBA')
    esr = Image.open(os.path.join(ESR, slug + '.png')).convert('RGBA')
    H = round(src.height * W / src.width)
    plain = src.resize((W, H), Image.LANCZOS)
    sharp = esr.resize((W, H), Image.LANCZOS)
    mask = small_print_mask(W, H)
    out = Image.composite(plain, sharp, mask)
    # Keep the official silhouette exactly: alpha comes from the plain upscale.
    out.putalpha(plain.getchannel('A'))
    path = os.path.join(OUT, pid + '.webp')
    out.save(path, 'WEBP', quality=90, method=6)
    padded(out).save(os.path.join(TEX, pid + '.jpg'), 'JPEG', quality=82, optimize=True, progressive=True)
    padded(src).save(os.path.join(TEX, pid + '-sm.jpg'), 'JPEG', quality=90, optimize=True)
    log[pid] = {'size': [W, H], 'bytes': os.path.getsize(path)}
print(json.dumps(log, indent=1))
