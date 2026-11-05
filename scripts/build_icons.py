import re, sys, json, pathlib
src = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2])
icons = {}
for f in sorted(src.glob('*.svg')):
    t = f.read_text(encoding='utf8')
    inner = re.search(r'<svg[^>]*>(.*)</svg>', t, re.S).group(1).strip()
    inner = re.sub(r'\s+', ' ', inner)
    icons[f.stem] = inner
body = ',\n'.join(f'  {json.dumps(k)}: {json.dumps(v)}' for k, v in icons.items())
out.write_text(
"// Generated from assets/icons/bootstrap/*.svg (Bootstrap Icons, MIT). Do not edit by hand.\n"
"// Rebuild: python3 scripts/build_icons.py assets/icons/bootstrap js/icons.js\n"
f"export const ICONS = {{\n{body}\n}};\n", encoding='utf8')
print(len(icons), 'icons')
