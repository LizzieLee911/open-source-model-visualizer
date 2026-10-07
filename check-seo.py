"""Run after node build.cjs: python check-seo.py (standard library only)."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parent / 'dist'
origin = 'https://open-model-atlas.molanlin0818.chatgpt.site'
ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9', 'x': 'http://www.w3.org/1999/xhtml'}

class Head(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.links, self.meta = [], []
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        if tag == 'link': self.links.append(dict(attrs))
        if tag == 'meta': self.meta.append(dict(attrs))

entries = ET.parse(root / 'sitemap.xml').findall('s:url', ns)
urls = [e.findtext('s:loc', namespaces=ns) for e in entries]
expected = {origin + '/' + p.relative_to(root).as_posix() for p in root.rglob('*.html')}
assert len(urls) == len(set(urls)) == 18
assert set(urls) == expected, 'Sitemap must cover every canonical page, without duplicates'
clusters = {}
for entry, url in zip(entries, urls):
    parsed = urlsplit(url)
    assert parsed.scheme == 'https' and not parsed.query and not parsed.fragment
    html = (root / parsed.path.lstrip('/')).read_text(encoding='utf8')
    head = Head(html)
    assert [x['href'] for x in head.links if x.get('rel') == 'canonical'] == [url]
    alternates = {x.get('hreflang'): x.get('href') for x in entry.findall('x:link', ns)}
    assert len(entry.findall('x:link', ns)) == 3
    assert set(alternates) == {'en', 'zh-Hans', 'x-default'}
    assert alternates['x-default'] == alternates['en']
    assert url in alternates.values() and set(alternates.values()) <= set(urls)
    assert all(x.get('rel') == 'alternate' for x in entry.findall('x:link', ns))
    assert alternates == {x['hreflang']: x['href'] for x in head.links if x.get('rel') == 'alternate'}
    assert all('noindex' not in x.get('content', '').lower() for x in head.meta if x.get('name', '').lower() in ('robots', 'googlebot'))
    assert any(x.get('name') == 'description' and x.get('content') for x in head.meta)
    clusters[url] = alternates
for group in clusters.values():
    assert all(clusters[url] == group for url in group.values()), 'Missing reciprocal language link'
assert 'Sitemap: ' + origin + '/sitemap.xml' in (root / 'robots.txt').read_text()
print('PASS: XML, all 18 canonical URLs, complete reciprocal language groups, matching HTML metadata, robots discovery, no noindex.')
