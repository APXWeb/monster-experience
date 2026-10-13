"""Contact sheet: python scripts/sheet.py <dir> <out> <cols> [width]"""
import sys, glob, os
from PIL import Image, ImageDraw
d, out, cols = sys.argv[1], sys.argv[2], int(sys.argv[3])
W = int(sys.argv[4]) if len(sys.argv) > 4 else 720
fs = sorted(glob.glob(os.path.join(d, '*.jpg')))
ims = []
for f in fs:
    im = Image.open(f).convert('RGB'); s = W / im.width; im = im.resize((W, int(im.height * s)), Image.LANCZOS)
    ImageDraw.Draw(im).text((8, 8), os.path.basename(f), fill=(255, 0, 255))
    ims.append(im)
h = max(i.height for i in ims); rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (W * cols, h * rows), (30, 0, 30))
for i, im in enumerate(ims): S.paste(im, ((i % cols) * W, (i // cols) * h))
S.save(out, quality=85)
