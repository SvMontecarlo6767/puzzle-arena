import json, pathlib
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parent.parent; fake=(root/'test/fake-firebase.js').read_text(); errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(); pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('dialog',lambda d:d.accept())
    ctx.route('**/*',lambda r: r.fulfill(body='window.__SEED='+json.dumps({'groups/main':{'code':'ABC12345','adminUid':'u_x'},'members/u_x':{'nick':'X','code':'ABC12345','joined':1}})+';\n'+fake,content_type='text/javascript') if 'firebase-app-compat' in r.request.url else (r.fulfill(body='',content_type='text/javascript') if 'gstatic.com/firebasejs' in r.request.url else r.continue_()))
    pg.goto('file://'+str(root/'index.html')); pg.wait_for_selector('#paAuthForm')
    pg.click('[data-m=register]'); pg.fill('#paNick','T1'); pg.fill('#paEmail','a@b.de'); pg.fill('#paPw','secret1'); pg.fill('#paCode','ABC12345'); pg.click('.paBtn')
    pg.wait_for_selector('#paApp:not([hidden])'); pg.wait_for_timeout(1000)
    pg.evaluate("()=>{cur=iso(new Date());set('fermi','4');setNote('x')}"); pg.wait_for_timeout(3500)
    q="Object.keys(window.__STORE.docs).filter(k=>k.startsWith('pub/u_a')||(k.startsWith('users/u_a/data/')&&!k.includes('__')))"
    print('before:',pg.evaluate(q))
    pg.click('#paDayClear'); pg.wait_for_timeout(4000)
    print('after:',pg.evaluate(q),'| D today:',pg.evaluate("JSON.stringify(D[iso(new Date())])"),errs); b.close()
