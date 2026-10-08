const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=__dirname,dist=path.join(root,'dist'),src=path.join(root,'src'),tr=path.join(src,'translations');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const dict={...JSON.parse(fs.readFileSync(path.join(tr,'ui.json'),'utf8'))};
for(const f of fs.readdirSync(tr).filter(f=>f.endsWith('-strings.json'))){const zh=JSON.parse(fs.readFileSync(path.join(tr,f),'utf8')),en=JSON.parse(fs.readFileSync(path.join(tr,f.replace('-strings','-en')),'utf8'));assert.equal(zh.length,en.length,f+' translation count');zh.forEach((s,i)=>{assert(!/[\u3400-\u9fff]/.test(en[i]),f+' untranslated entry');if(dict[s])assert.equal(dict[s],en[i],s);dict[s]=en[i]})}
// Translate complete authored strings before UI fragments, retaining all numerical data and equations.
const pairs=Object.entries(dict).sort((a,b)=>b[0].length-a[0].length);
const translate=html=>{for(const [a,b] of pairs)html=html.split(esc(a)).join(esc(b));return html};
fs.mkdirSync(path.join(dist,'models'),{recursive:true});
execFileSync(process.execPath,[path.join(src,'render.cjs')],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(root,'build-home.cjs')],{stdio:'inherit'});
const pages=['index.html',...fs.readdirSync(path.join(dist,'models')).filter(f=>f.endsWith('.html')).map(f=>'models/'+f)];
const origin='https://open-model-atlas.molanlin0818.chatgpt.site';
const variants=page=>[['en',`${origin}/${page}`],['zh-Hans',`${origin}/zh/${page}`],['x-default',`${origin}/${page}`]];
for(const page of pages){const original=fs.readFileSync(path.join(dist,page),'utf8');for(const lang of ['en','zh']){const isEn=lang==='en',rel=(isEn?'':'zh/')+page;let html=isEn?translate(original):original;html=html.replace('<html lang="zh-CN">',`<html lang="${isEn?'en':'zh-CN'}">`);
if(isEn){const leftovers=html.match(/[\u3400-\u9fff][^<>\n]{0,100}/g);assert(!leftovers,JSON.stringify({page,leftovers}));}
const alternate=page==='index.html'?(isEn?'zh/index.html':'../index.html'):(isEn?'../zh/'+page:'../../'+page);
const nav=`<label class="language-picker"><span>Language</span><select class="language-switch" aria-label="Language" onchange="location.href=this.value"><option value="${isEn?'':alternate}"${isEn?' selected':''} lang="en">English</option><option value="${isEn?alternate:''}"${isEn?'':' selected'} lang="zh-CN">中文</option></select></label>`;
html=html.replace('</style>',`.language-picker{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;font-size:14px;color:#43536f}.language-switch{min-height:40px;padding:7px 10px;border:1px solid #dce2ed;border-radius:8px;color:#43536f;background:white;font:inherit;cursor:pointer}.language-switch:focus-visible{outline:3px solid #5675e5;outline-offset:3px}header .tools{flex-wrap:wrap}.brand{font-size:14px}@media(max-width:760px){header{gap:12px;flex-wrap:wrap;height:auto;padding-top:16px;padding-bottom:16px}.tools{gap:6px}}</style>`);
html=page==='index.html'?html.replace('</header>',nav+'</header>'):html.replace('<div class="tools">','<div class="tools">'+nav);
html=html.replace('</head>',`<link rel="canonical" href="${origin}/${rel}">${variants(page).map(([lang,url])=>`<link rel="alternate" hreflang="${lang}" href="${esc(url)}">`).join('')}</head>`);
fs.mkdirSync(path.dirname(path.join(dist,rel)),{recursive:true});fs.writeFileSync(path.join(dist,rel),html);}}
// One canonical URL per language; alternate sets include self and reciprocal links.
// Omit lastmod until a reliable per-page modification history is maintained.
// Google ignores priority/changefreq; do not fabricate freshness or ranking signals.
fs.writeFileSync(path.join(dist,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'+pages.flatMap(page=>variants(page).slice(0,2).map(([,url])=>`  <url>\n    <loc>${esc(url)}</loc>\n${variants(page).map(([lang,href])=>`    <xhtml:link rel="alternate" hreflang="${lang}" href="${esc(href)}" />`).join('\n')}\n  </url>`)).join('\n')+'\n</urlset>\n');
fs.writeFileSync(path.join(dist,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: '+origin+'/sitemap.xml\n');
console.log('Built 18 static English/Chinese pages; default English.');
