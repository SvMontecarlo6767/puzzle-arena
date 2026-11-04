import json, pathlib
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parent.parent; fake=(root/'test/fake-firebase.js').read_text(); errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(); pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    ctx.route('**/*',lambda r: r.fulfill(body=fake,content_type='text/javascript') if 'firebase-app-compat' in r.request.url else (r.fulfill(body='',content_type='text/javascript') if 'gstatic.com/firebasejs' in r.request.url else r.continue_()))
    pg.goto('file://'+str(root/'index.html')); pg.wait_for_selector('#paAuthForm')
    pg.click('[data-m=register]'); pg.fill('#paNick','Momo'); pg.fill('#paEmail','momo.haskamp@gmail.com'); pg.fill('#paPw','secret1'); pg.fill('#paCode','X')
    pg.click('.paBtn'); pg.wait_for_selector('#paJoinForm'); pg.click('.paBtn'); pg.wait_for_selector('#paApp:not([hidden])'); pg.wait_for_timeout(1000)
    print('links in form:', pg.evaluate("[...document.querySelectorAll('#form .paLink')].length"), pg.evaluate("document.querySelector('#form [data-g=ner] .paLink')?.href"))
    pg.click('[data-tab=group]'); pg.wait_for_timeout(300)
    pg.fill('[data-linkid=fermi]','fermi.example.com'); pg.fill('[data-linkid=ner]',''); pg.click('[data-savelinks]'); pg.wait_for_timeout(500)
    print(pg.inner_text('#paLinkMsg'))
    pg.click('[data-tab=me]'); pg.wait_for_timeout(300)
    print('fermi:', pg.evaluate("document.querySelector('#form [data-g=fermi] .paLink')?.href"), '| ner:', pg.evaluate("document.querySelector('#form [data-g=ner] .paLink')?.href"))
    print(errs); b.close()
