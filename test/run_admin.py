import json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
fake=(root/'test/fake-firebase.js').read_text(); errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(); pg=ctx.new_page()
    pg.on('pageerror',lambda e: errors.append(str(e)))
    ctx.route('**/*',lambda r: r.fulfill(body=fake,content_type='text/javascript') if 'firebase-app-compat' in r.request.url else (r.fulfill(body='',content_type='text/javascript') if 'gstatic.com/firebasejs' in r.request.url else r.continue_()))
    pg.goto('file://'+str(root/'index.html')); pg.wait_for_selector('#paAuthForm')
    pg.click('[data-m=register]'); pg.fill('#paNick','Momo'); pg.fill('#paEmail','Momo.Haskamp@gmail.com'); pg.fill('#paPw','secret1'); pg.fill('#paCode','X')
    pg.click('.paBtn'); pg.wait_for_selector('#paJoinForm'); print(pg.inner_text('.paAuth')[:120])
    pg.click('.paBtn'); pg.wait_for_selector('#paApp:not([hidden])'); pg.wait_for_timeout(800)
    pg.click('[data-tab=group]'); pg.wait_for_timeout(500)
    print('code:', pg.inner_text('#paCode'), '| admin:', pg.evaluate('window.Arena.groupAdmin'))
    print(errors); b.close()
