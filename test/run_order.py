import json, pathlib
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parent.parent; fake=(root/'test/fake-firebase.js').read_text(); errs=[]
def run(b,email,nick,seed):
    ctx=b.new_context(); pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    ctx.route('**/*',lambda r: r.fulfill(body='window.__SEED='+json.dumps(seed)+';\n'+fake,content_type='text/javascript') if 'firebase-app-compat' in r.request.url else (r.fulfill(body='',content_type='text/javascript') if 'gstatic.com/firebasejs' in r.request.url else r.continue_()))
    pg.goto('file://'+str(root/'index.html')); pg.wait_for_selector('#paAuthForm')
    pg.click('[data-m=register]'); pg.fill('#paNick',nick); pg.fill('#paEmail',email); pg.fill('#paPw','secret1'); pg.fill('#paCode','ABC12345'); pg.click('.paBtn')
    pg.wait_for_selector('#paApp:not([hidden])'); pg.wait_for_timeout(1200)
    o=pg.evaluate("[...document.querySelectorAll('#form .row')].map(r=>r.dataset.g)")
    link=pg.evaluate("document.querySelector('#form [data-g=szw] .paLink')?.href")
    ga=pg.evaluate("GA.map(g=>g.id)")
    return o,ga,link
with sync_playwright() as p:
    b=p.chromium.launch()
    seed={'groups/main':{'code':'ABC12345','adminUid':'u_momo.haskamp'},'members/u_momo.haskamp':{'nick':'Momo','code':'ABC12345','joined':1}}
    o1,ga,l1=run(b,'momo.haskamp@gmail.com','Momo',seed)  # admin-Fall: Gruppe anlegen
    print('momo gleich Standard:',o1==ga, '| szw dabei:','szw' in o1,'| link:',l1)
    o2,ga2,l2=run(b,'lea@x.de','Lea',seed); o3,_,_=run(b,'lea@x.de','Lea',seed)
    print('lea gemischt:',o2!=ga2, '| Position Fermi:',o2.index('fermi')+1,'| stabil:',o2==o3,'| gleiche Spiele:',sorted(o2)==sorted(ga2))
    print(errs); b.close()
