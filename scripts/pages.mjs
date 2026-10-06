// 정리 기사와 브리핑마다 검색엔진이 읽을 수 있는 정적 페이지(public/s/<id>.html)와 sitemap.xml 을 만듭니다.
// 사용법: node scripts/pages.mjs  (수집과 정리 기사 작성이 끝난 뒤 워크플로에서 실행)
// 메인 화면은 한 페이지 안에서 # 주소로 화면만 바꾸기 때문에 검색엔진이 정리 기사를 따로 색인하지 못합니다.
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const SITE = 'https://ainewswave.com';
const GA = 'G-TPL7MTLPRB';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const { stories = [] } = JSON.parse(await readFile(path.join(pub, 'data', 'stories.json'), 'utf8'));
const kstDate = (iso) => {
  const d = new Date(new Date(iso).getTime() + 9 * 3600000);
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

function page(st) {
  const url = `${SITE}/s/${st.id}.html`;
  const desc = (st.points && st.points.length ? st.points.join('. ') : st.body[0] || '').slice(0, 150);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: st.title,
    datePublished: st.published,
    dateModified: st.published,
    description: desc,
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'AI 뉴스웨이브', url: SITE },
    publisher: { '@type': 'Organization', name: 'AI 뉴스웨이브', logo: { '@type': 'ImageObject', url: `${SITE}/icon512.png` } },
  };
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(st.title)} | AI 뉴스웨이브</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="AI 뉴스웨이브">
<meta property="og:title" content="${esc(st.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/icon512.png">
<meta property="article:published_time" content="${esc(st.published)}">
<link rel="icon" href="../icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../page.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA}');</script>
</head>
<body>
<header class="top"><div class="wrap"><a class="brand" href="../"><img src="../icon.svg" alt="">AI 뉴스웨이브</a></div></header>
<main class="wrap">
  <article>
    <p class="meta">${esc(st.type === 'briefing' ? 'AI 브리핑' : st.category)}</p>
    <h1>${esc(st.title)}</h1>
    <p class="meta">AI 뉴스웨이브 | ${kstDate(st.published)} | ${st.sources.length}개 매체 보도 종합</p>
    ${st.points && st.points.length ? `<h2>핵심 요약</h2>\n    <ul>${st.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    <h2>본문</h2>
    ${st.body.map((p) => `<p>${esc(p)}</p>`).join('\n    ')}
    <h2>출처</h2>
    <ul>${st.sources.map((x) => `<li>${esc(x.name)}: <a href="${esc(x.link)}" rel="noopener nofollow" target="_blank">${esc(x.title)}</a></li>`).join('')}</ul>
    <p class="meta">이 글은 위 매체들의 보도에서 확인된 사실을 AI 뉴스웨이브가 새로 정리한 것입니다. 자세한 내용은 각 언론사 원문을 확인하세요.</p>
  </article>
  <p><a href="../#s/${esc(st.id)}">AI 뉴스웨이브에서 최신 AI 뉴스 더 보기</a></p>
</main>
<footer class="wrap foot"><a href="../">홈</a><a href="../about.html">소개</a><a href="../privacy.html">개인정보처리방침</a><a href="../contact.html">문의</a></footer>
</body>
</html>
`;
}

const dir = path.join(pub, 's');
await mkdir(dir, { recursive: true });
const keep = new Set(stories.map((s) => `${s.id}.html`));
for (const f of await readdir(dir)) if (f.endsWith('.html') && !keep.has(f)) await unlink(path.join(dir, f));
for (const st of stories) await writeFile(path.join(dir, `${st.id}.html`), page(st));

const now = new Date().toISOString();
const urls = [
  { loc: `${SITE}/`, lastmod: now, freq: 'hourly', pri: '1.0' },
  ...['about', 'privacy', 'contact'].map((p) => ({ loc: `${SITE}/${p}.html`, freq: 'monthly', pri: '0.3' })),
  ...stories.map((s) => ({ loc: `${SITE}/s/${s.id}.html`, lastmod: s.published, freq: 'never', pri: s.type === 'briefing' ? '0.8' : '0.7' })),
];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`).join('\n')}
</urlset>
`;
await writeFile(path.join(pub, 'sitemap.xml'), xml);
console.log(`정적 페이지 ${stories.length}건, sitemap.xml ${urls.length}개 주소`);
