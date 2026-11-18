"""Assemble the public Data Flow page from render.mts output.

  python3 scripts/flow-site/build.py <render-output.json> <path/to/index.html>
"""
import json, re, html, os, sys
HERE=os.path.dirname(os.path.abspath(__file__))
R=os.path.abspath(os.path.join(HERE, "..", ".."))
out=json.load(open(sys.argv[1]))
g=open(R+'/app/globals.css').read()
s=g.index('/*\n * Data-flow diagrams (mfd-*).'); e=g.index("/*\n * MerchFlow Charts' report dashboard")
css=g[s:e].rstrip()
tone={10:'manual',1:'review',0:'outputs'}
tabs=[];panels=[]
for i,v in enumerate(json.loads(out['views'])):
    sel=i==0
    count=''
    if v.get('count') is not None:
        c=v['count']; count=f'<span class="mfd-count mfd-s-{tone[c]}" aria-label="{c} manual steps">{c}</span>'
    tabs.append(f'        <button type="button" role="tab" class="mfd-tab" id="mfd-tab-{v["id"]}" data-view="{v["id"]}" aria-controls="mfd-panel-{v["id"]}" aria-selected="{"true" if sel else "false"}" tabindex="{0 if sel else -1}">{html.escape(v["tab"])}{count}</button>')
    body=out['panel:'+v['id']]
    panels.append(f'      <div role="tabpanel" class="mfd-panel" id="mfd-panel-{v["id"]}" aria-labelledby="mfd-tab-{v["id"]}" tabindex="0"{"" if sel else " hidden"}>{body}</div>')
t=open(os.path.join(HERE,'template.html')).read()
rep={'{{CSS}}':css,'{{TILES}}':out['tiles'],'{{LEGEND}}':out['legend'],'{{TABS}}':'\n'.join(tabs),'{{PANELS}}':'\n'.join(panels),'{{AI}}':html.escape(out['ai'])}
for k,v in rep.items(): t=t.replace(k,v)
t=re.sub(r' data-tour="[^"]*"','',t)
# the static page has no dark theme
t=re.sub(r'\[data-theme="dark"\] \{.*?\n\}\n','',t,flags=re.S)
assert '{{' not in t
open(sys.argv[2],'w').write(t)
print(len(t))
