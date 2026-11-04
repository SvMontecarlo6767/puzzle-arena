import json, sys, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
fake = (root/'test/fake-firebase.js').read_text()
def days(n, base):
    out={}
    import datetime
    t=datetime.date.today()
    for i in range(n):
        d=(t-datetime.timedelta(days=i)).isoformat()
        out[d]={'fermi':{'s':str(base+i%5),'w':1},'glo':{'s':str(3+i%4),'w':1},'zoo':{'s':str(2+i%3),'w':1},'trav':{'w':0} if i%7==0 else {'s':'4','w':1}}
    return out
def month_docs(uid, ds):
    m={}
    for d,v in ds.items(): m.setdefault(d[:7],{})[d]=v
    return {f'pub/{uid}/months/{k}':{'days':v,'t':1} for k,v in m.items()}
seed={'groups/main':{'code':'ABC12345','adminUid':'u_momo','created':1},
 'members/u_momo':{'nick':'Momo','code':'ABC12345','joined':1},
 'members/u_lea':{'nick':'Lea','code':'ABC12345','joined':2}}
seed.update(month_docs('u_momo',days(40,10))); seed.update(month_docs('u_lea',days(25,12)))
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844}); pg=ctx.new_page()
    pg.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
    pg.on('pageerror',lambda e: errors.append('PAGEERR '+str(e)))
    def route(r):
        u=r.request.url
        if 'firebase-app-compat' in u: r.fulfill(body='window.__SEED='+json.dumps(seed)+';\n'+fake,content_type='text/javascript')
        elif 'gstatic.com/firebasejs' in u: r.fulfill(body='',content_type='text/javascript')
        else: r.continue_()
    ctx.route('**/*',route)
    pg.goto('file://'+str(root/'index.html'))
    pg.wait_for_selector('#paAuthForm')
    pg.screenshot(path='/tmp/s_auth.png')
    # falscher Code
    pg.click('[data-m=register]'); pg.fill('#paNick','Tester'); pg.fill('#paEmail','tester@x.de'); pg.fill('#paPw','secret1'); pg.fill('#paCode','WRONG')
    pg.click('.paBtn'); pg.wait_for_selector('#paJoinMsg')
    print('wrong code ->', pg.inner_text('#paJoinMsg'))
    pg.fill('#paCode','abc12345'); pg.click('.paBtn')
    pg.wait_for_selector('#paApp:not([hidden])'); pg.wait_for_timeout(1500)
    print('tracker booted:', pg.evaluate("typeof G!=='undefined' && G.length"))
    # Einträge + Notiz setzen
    pg.evaluate("""()=>{const t=iso(new Date());cur=t;set('fermi','4');set('glo','2');setNote('GEHEIM');setSolution('glo','Frankreich');}""")
    pg.wait_for_timeout(3500)
    store=pg.evaluate("Object.fromEntries(Object.entries(window.__STORE.docs).filter(([k])=>k.startsWith('pub/u_tester')||k.startsWith('users/u_tester')))")
    pub=[k for k in store if k.startswith('pub/')]; print('pub docs', pub)
    s=json.dumps(store[pub[0]]); print('pub contains GEHEIM?', 'GEHEIM' in s, '| Frankreich?', 'Frankreich' in s, '| fermi?', '"fermi"' in s)
    priv=[k for k in store if k.startswith('users/')]; print('private docs', len(priv), 'note stored privately:', 'GEHEIM' in json.dumps([store[k] for k in priv]))
    pg.screenshot(path='/tmp/s_me.png')
    for tab,name in [('board','board'),('rank','rank'),('duel','duel'),('feed','feed'),('group','group')]:
        pg.click(f'[data-tab={tab}]'); pg.wait_for_timeout(500)
        if tab=='rank':
            pg.click('[data-react="1"]'); pg.wait_for_timeout(300)
            pg.click('[data-thread]'); pg.wait_for_timeout(200)
            pg.fill('[data-cin]','Starker Wert!'); pg.press('[data-cin]','Enter'); pg.wait_for_timeout(500)
        if tab=='board':
            pg.click('[data-prof="u_momo"]'); pg.wait_for_timeout(400)
        pg.screenshot(path=f'/tmp/s_{name}.png',full_page=True)
        ov=pg.evaluate("document.documentElement.scrollWidth>document.documentElement.clientWidth+1")
        print(tab,'overflow',ov)
    feed=[k for k in pg.evaluate("Object.keys(window.__STORE.docs)") if k.startswith('feed/')]; print('feed docs',len(feed))
    print('board text:', pg.evaluate("(()=>{A=window.Arena;return Object.keys(A.members).join(',')})()"))
    print('ERRORS:', errors)
    b.close()
