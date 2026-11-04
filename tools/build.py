#!/usr/bin/env python3
"""Baut index.html: Tracker-Template (1:1) + Arena-Schicht (Firebase)."""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
tpl = (root / 'src/tracker-template.html').read_text(encoding='utf-8')
arena_js = (root / 'src/arena.js').read_text(encoding='utf-8')
arena_css = (root / 'src/arena.css').read_text(encoding='utf-8')

# 1) Teile des Templates
m = re.search(r'^(.*?<style>)(.*?)(</style></head><body>)(.*?)<script>(.*)</script></body></html>\s*$', tpl, re.S)
assert m, 'Template-Struktur nicht erkannt'
head, css, mid, markup, js = m.groups()

# 2) Tracker-Skript anpassen
def sub1(pat, rep, s, count=1, flags=0):
    s2, n = re.subn(pat, rep, s, flags=flags)
    assert n >= 1 and (count is None or n == count), (pat, n)
    return s2

# lokale Schlüssel pro Nutzer trennen
js = sub1(r"localStorage\.(getItem|setItem)\('puzzle-tracker", r"localStorage.\1(window.__LK+'puzzle-tracker", js, count=None)
# Cloud: echtes Firestore statt Artifact-Speicher
js = sub1(r"const c=window\.claude;if\(!c\|\|!c\.use\)\{status\(\);return\}\n\s*const \[d,u\]=await Promise\.all\(\[c\.use\('db'\),c\.use\('user'\)\]\);\n\s*const uid=u&&await u\.id\(\);\n\s*if\(!d\|\|!uid\)\{status\(\);return\}",
         "const d=window.__FS,uid=window.__UID;if(!d||!uid){status();return}", js)
js = sub1(r"db=d;col=db\.collection\('data/users/'\+uid\);", "db=d;col=db.collection('users/'+uid+'/data');", js)
# Veröffentlichungs-Hook bei jedem lokalen Speichern
js = sub1(r"lastLocal=new Date\(\);return true\}", "lastLocal=new Date();window.__pubHook&&window.__pubHook();return true}", js)
# Downloads ohne Artifact-API
js = sub1(r"const dn=await claude\.use\('downloads'\);if\(!dn\)throw 0;await dn\.save\(\{filename:([^,]+),data:t\}\);",
          r"dlFile(\1,t);", js, count=2)
js = "function dlFile(name,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:name.endsWith('.csv')?'text/csv':'application/json'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}\n" + js
assert '</script' not in js.lower()

# 3) Kopf
head = head.replace('<title>Puzzle-Tracker</title>', '<title>Puzzle Arena</title>')
head = head.replace('<meta charset="utf-8">', '<meta charset="utf-8"><meta name="robots" content="noindex">')
sdk = ''.join(f'<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-{n}-compat.js"></script>' for n in ('app', 'auth', 'firestore'))

# 4) Zusammenbauen
out = (head + css + '\n' + arena_css + mid + sdk +
  '\n<div id="paScreen"></div>\n<div id="paApp" hidden><div id="paBar"></div>\n<div id="trackerView">\n' + markup +
  '\n</div>\n<div id="paView" style="display:none"></div></div>\n' +
  '<script type="text/plain" id="trackerSrc">' + js + '</script>\n' +
  '<script>' + arena_js + '</script></body></html>\n')
(root / 'index.html').write_text(out, encoding='utf-8')
print('index.html', len(out) // 1024, 'KB')
