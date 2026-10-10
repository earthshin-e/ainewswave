// 정리 기사와 브리핑마다 검색엔진이 읽을 수 있는 정적 페이지(public/recap/<id>.html)와 sitemap.xml 을 만듭니다.
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

// 주제별 정리 기사 모음 페이지 주소(/recap/topic-<slug>.html)
const TOPICS = { '생성형AI': 'genai', '반도체': 'chip', '로봇': 'robot', '정책': 'policy', '기업': 'company', '연구': 'research', '보안/윤리': 'security', '일반': 'general' };
const topicFile = (c) => `topic-${TOPICS[c] || 'general'}.html`;

function page(st, others) {
  const url = `${SITE}/recap/${st.id}.html`;
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
    image: `${SITE}/og.png`,
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
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta property="article:published_time" content="${esc(st.published)}">
<link rel="icon" href="../icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../page.css">
<link rel="alternate" type="application/rss+xml" title="AI 뉴스웨이브 정리 기사" href="/recap/feed.xml">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<script src="/consent.js"></script>
<script src="/feedback.js" defer></script>
<meta name="google-adsense-account" content="ca-pub-2376619512263295">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2376619512263295" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA}');</script>
</head>
<body>
<header class="top"><div class="wrap"><a class="brand" href="../"><img src="../icon.svg" alt="">AI 뉴스웨이브</a></div></header>
<main class="wrap">
  <article>
    <p class="meta">${st.type === 'briefing' ? 'AI 브리핑' : `<a href="${topicFile(st.category)}">${esc(st.category)}</a>`}</p>
    <h1>${esc(st.title)}</h1>
    <p class="meta">AI 뉴스웨이브 | ${kstDate(st.published)} | ${st.sources.length}개 매체 보도 종합</p>
    ${st.points && st.points.length ? `<h2>핵심 요약</h2>\n    <ul>${st.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    <h2>본문</h2>
    ${st.body.map((p) => `<p>${esc(p)}</p>`).join('\n    ')}
    <h2>출처</h2>
    <ul>${st.sources.map((x) => `<li>${esc(x.name)}: <a href="${esc(x.link)}" rel="noopener nofollow" target="_blank">${esc(x.title)}</a></li>`).join('')}</ul>
    <p class="meta">이 글은 위 매체들의 보도에서 확인된 사실을 AI 뉴스웨이브가 새로 정리한 것입니다. 자세한 내용은 각 언론사 원문을 확인하세요.</p>
  </article>
  ${others.length ? `<h2>다른 정리 기사</h2>
  <ul>${others.map((o) => `<li><a href="${esc(o.id)}.html">${esc(o.title)}</a></li>`).join('')}</ul>` : ''}
  <p><a href="./">정리 기사 전체 보기</a> | <a href="../">AI 뉴스웨이브에서 최신 AI 뉴스 보기</a></p>
</main>
<footer class="wrap foot"><a href="../">홈</a><a href="./">정리 기사</a><a href="../about.html">소개</a><a href="../privacy.html">개인정보처리방침</a><a href="../contact.html">문의</a><a href="#feedback" data-feedback>의견 보내기</a></footer>
</body>
</html>
`;
}

const dir = path.join(pub, 'recap');
await mkdir(dir, { recursive: true });
const keep = new Set([...stories.map((s) => `${s.id}.html`), 'index.html', 'feed.xml', ...Object.keys(TOPICS).map(topicFile)]);
for (const f of await readdir(dir)) if (f.endsWith('.html') && !keep.has(f)) await unlink(path.join(dir, f));
const sorted = [...stories].sort((a, b) => new Date(b.published) - new Date(a.published));
for (const st of sorted) {
  const others = sorted.filter((o) => o.id !== st.id).slice(0, 5);
  await writeFile(path.join(dir, `${st.id}.html`), page(st, others));
}

// 정리 기사 모음 페이지 (/recap/): 브리핑과 정리 기사를 날짜별로 모아 보여 줍니다.
const dayKey = (iso) => { const d = new Date(new Date(iso).getTime() + 9 * 3600000); return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`; };
const group = (list) => {
  const m = new Map();
  for (const x of list) { const k = dayKey(x.published); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
  return [...m.entries()];
};
const briefs = sorted.filter((x) => x.type === 'briefing');
const plain = sorted.filter((x) => x.type !== 'briefing');
const listPage = ({ title, desc, canon, main }) => `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | AI 뉴스웨이브</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/recap/${canon}">
<link rel="icon" href="../icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../page.css">
<link rel="alternate" type="application/rss+xml" title="AI 뉴스웨이브 정리 기사" href="/recap/feed.xml">
<script src="/consent.js"></script>
<script src="/feedback.js" defer></script>
<meta name="google-adsense-account" content="ca-pub-2376619512263295">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2376619512263295" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA}');</script>
</head>
<body>
<header class="top"><div class="wrap"><a class="brand" href="../"><img src="../icon.svg" alt="">AI 뉴스웨이브</a></div></header>
<main class="wrap">
${main}
</main>
<footer class="wrap foot"><a href="../">홈</a><a href="./">정리 기사</a><a href="../about.html">소개</a><a href="../privacy.html">개인정보처리방침</a><a href="../contact.html">문의</a><a href="#feedback" data-feedback>의견 보내기</a></footer>
</body>
</html>
`;
const plainCats = Object.keys(TOPICS).filter((c) => plain.some((x) => x.category === c));
const topicNav = (cur) => `<p class="topics">${[['', '전체', plain.length], ...plainCats.map((c) => [topicFile(c), c, plain.filter((x) => x.category === c).length])]
  .map(([href, label, n]) => label === cur ? `<strong>${esc(label)} ${n}</strong>` : `<a href="${href || './'}">${esc(label)} ${n}</a>`).join('')}</p>`;
const dayList = (list) => group(list).map(([day, l]) => `<h3>${day}</h3>
  <ul>${l.map((x) => `<li><a href="${esc(x.id)}.html">${esc(x.title)}</a> <span class="meta">${x.sources.length}개 매체</span></li>`).join('')}</ul>`).join('\n  ');
const indexHtml = listPage({
  title: 'AI 브리핑과 정리 기사',
  desc: 'AI 뉴스웨이브가 여러 매체의 보도를 종합해 새로 쓴 정리 기사와 매일 AI 브리핑 모음입니다.',
  canon: '',
  main: `  <h1>AI 브리핑과 정리 기사</h1>
  <p>여러 매체가 함께 보도한 AI 소식을 AI 뉴스웨이브가 사실만 모아 새로 정리한 글입니다. 각 글 아래에 근거가 된 기사 출처를 밝힙니다.</p>
  <p class="meta"><a href="feed.xml">RSS 로 구독하기</a></p>
  <h2>매일 AI 브리핑</h2>
  ${briefs.length ? `<ul>${briefs.map((b) => `<li><a href="${esc(b.id)}.html">${esc(b.title)}</a></li>`).join('')}</ul>` : '<p class="meta">아직 브리핑이 없습니다.</p>'}
  <h2>정리 기사</h2>
  ${topicNav('전체')}
  ${dayList(plain)}`,
});
for (const c of Object.keys(TOPICS)) {
  const list = plain.filter((x) => x.category === c);
  await writeFile(path.join(dir, topicFile(c)), listPage({
    title: `${c} 정리 기사`,
    desc: `AI 뉴스웨이브가 여러 매체 보도를 종합해 정리한 ${c} 분야 AI 소식 모음입니다.`,
    canon: topicFile(c),
    main: `  <h1>${esc(c)} 정리 기사</h1>
  <p>여러 매체가 함께 보도한 ${esc(c)} 분야 AI 소식을 사실만 모아 새로 정리한 글입니다. <a href="./">전체 정리 기사</a></p>
  ${topicNav(c)}
  ${list.length ? dayList(list) : '<p class="meta">아직 이 주제의 정리 기사가 없습니다.</p>'}`,
  }));
}
await writeFile(path.join(dir, 'index.html'), indexHtml);

// 예전 주소(/s/)로 들어온 방문자와 검색엔진을 새 주소(/recap/)로 보냅니다.
const old = path.join(pub, 's');
await mkdir(old, { recursive: true });
for (const f of await readdir(old)) await unlink(path.join(old, f));
const redirect = (to) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>AI 뉴스웨이브</title><link rel="canonical" href="${to}"><meta http-equiv="refresh" content="0; url=${to}"><meta name="robots" content="noindex"></head><body><a href="${to}">${to}</a></body></html>\n`;
await writeFile(path.join(old, 'index.html'), redirect(`${SITE}/recap/`));
for (const st of stories) await writeFile(path.join(old, `${st.id}.html`), redirect(`${SITE}/recap/${st.id}.html`));

// 기사별 검색용 페이지(/a/<id>.html): 뉴스웨이브가 쓴 핵심 요약이 있는 기사만 만듭니다.
// 언론사 요약 전문 대신 우리 핵심 요약을 중심에 두고, 원문 링크와 같은 소식 다른 매체, 관련 정리 기사를 붙입니다.
let artData = { articles: [] };
try { artData = JSON.parse(await readFile(path.join(pub, 'data', 'articles.json'), 'utf8')); } catch { /* 수집 전 */ }
const withPoints = (artData.articles || []).filter((a) => !a.restricted && Array.isArray(a.points) && a.points.length);
const adir = path.join(pub, 'a');
await mkdir(adir, { recursive: true });
const akeep = new Set(withPoints.map((a) => `${a.id}.html`));
for (const f of await readdir(adir)) if (f.endsWith('.html') && !akeep.has(f)) await unlink(path.join(adir, f));
const bigrams = (t) => { const s = String(t).replace(/\[[^\]]*\]/g, '').replace(/[^가-힣a-zA-Z0-9]/g, '').toLowerCase(); const r = new Set(); for (let i = 0; i < s.length - 1; i++) r.add(s.slice(i, i + 2)); return r; };
const grams = new Map((artData.articles || []).map((a) => [a.id, bigrams(a.title)]));
const sim = (x, y) => { if (x.size < 6 || y.size < 6) return 0; let n = 0; for (const g of x) if (y.has(g)) n++; return n / Math.min(x.size, y.size); };
const storyOf = new Map(); for (const st of stories) for (const s of st.sources || []) if (!storyOf.has(s.id)) storyOf.set(s.id, st);
const pointIds = new Set(withPoints.map((a) => a.id));
function articlePage(a) {
  const url = `${SITE}/a/${a.id}.html`;
  const desc = a.points.join('. ').slice(0, 150);
  const g = grams.get(a.id);
  const same = (artData.articles || []).filter((b) => b.id !== a.id && !b.restricted && b.sourceId !== a.sourceId && sim(g, grams.get(b.id)) >= 0.45).slice(0, 6);
  const st = storyOf.get(a.id);
  const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, datePublished: a.published, description: desc, mainEntityOfPage: url, isBasedOn: a.link,
    author: { '@type': 'Organization', name: 'AI 뉴스웨이브', url: SITE }, publisher: { '@type': 'Organization', name: 'AI 뉴스웨이브', logo: { '@type': 'ImageObject', url: `${SITE}/icon512.png` } } };
  const link = (b) => pointIds.has(b.id) ? `/a/${esc(b.id)}.html` : esc(b.link);
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(a.title)} | AI 뉴스웨이브</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="AI 뉴스웨이브">
<meta property="og:title" content="${esc(a.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og.png">
<link rel="icon" href="../icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../page.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<script src="/consent.js"></script>
<script src="/feedback.js" defer></script>
<meta name="google-adsense-account" content="ca-pub-2376619512263295">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2376619512263295" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA}');</script>
</head>
<body>
<header class="top"><div class="wrap"><a class="brand" href="../"><img src="../icon.svg" alt="">AI 뉴스웨이브</a></div></header>
<main class="wrap">
  <article>
    <p class="meta">${esc(a.category || '')}</p>
    <h1>${esc(a.title)}</h1>
    <p class="meta">${esc(a.source)}${a.newsroom ? ' (기업 뉴스룸)' : ''} | ${kstDate(a.published)}</p>
    <h2>핵심 요약</h2>
    <ul>${a.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    <p class="meta">핵심 요약은 AI 뉴스웨이브가 기사 제목과 언론사 요약을 바탕으로 정리했습니다. 자세한 내용은 원문에서 확인하세요.</p>
    <p class="btns"><a class="btn primary" href="${esc(a.link)}" rel="noopener" target="_blank">${esc(a.source)}에서 원문 보기</a><a class="btn" href="../#a/${esc(a.id)}">AI 뉴스웨이브에서 보기</a></p>
  </article>
  ${st ? `<h2>뉴스웨이브 정리 기사</h2>\n  <ul><li><a href="../recap/${esc(st.id)}.html">${esc(st.title)}</a></li></ul>` : ''}
  ${same.length ? `<h2>같은 소식, 다른 매체</h2>\n  <ul>${same.map((b) => `<li><a href="${link(b)}">${esc(b.title)}</a> <span class="meta">${esc(b.source)}</span></li>`).join('')}</ul>` : ''}
</main>
<footer class="wrap foot"><a href="../">홈</a><a href="../recap/">정리 기사</a><a href="../about.html">소개</a><a href="../privacy.html">개인정보처리방침</a><a href="../contact.html">문의</a><a href="#feedback" data-feedback>의견 보내기</a></footer>
</body>
</html>
`;
}
for (const a of withPoints) await writeFile(path.join(adir, `${a.id}.html`), articlePage(a));
// 기사 페이지 RSS(/a/feed.xml): 최신 100건. Search Console 에 사이트맵 대신 제출해 새 페이지를 빨리 알립니다.
const afeedItems = [...withPoints].sort((x, y) => new Date(y.published) - new Date(x.published)).slice(0, 100);
const acdata = (t) => `<![CDATA[${String(t).replace(/]]>/g, ']]&gt;')}]]>`;
await writeFile(path.join(adir, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>AI 뉴스웨이브: 기사 핵심 요약</title>
  <link>${SITE}/</link>
  <description>국내 AI 기사마다 AI 뉴스웨이브가 정리한 3줄 핵심 요약</description>
  <language>ko</language>
${afeedItems.map((a) => `  <item>
    <title>${acdata(a.title)}</title>
    <link>${SITE}/a/${a.id}.html</link>
    <guid isPermaLink="true">${SITE}/a/${a.id}.html</guid>
    <pubDate>${new Date(a.published).toUTCString()}</pubDate>
    <description>${acdata(a.points.join(' / '))}</description>
  </item>`).join('\n')}
</channel>
</rss>
`);

const now = new Date().toISOString();
const urls = [
  { loc: `${SITE}/`, lastmod: now, freq: 'hourly', pri: '1.0' },
  { loc: `${SITE}/recap/`, lastmod: now, freq: 'daily', pri: '0.9' },
  ...plainCats.map((c) => ({ loc: `${SITE}/recap/${topicFile(c)}`, lastmod: now, freq: 'daily', pri: '0.6' })),
  ...['about', 'privacy', 'contact'].map((p) => ({ loc: `${SITE}/${p}.html`, freq: 'monthly', pri: '0.3' })),
  ...withPoints.map((a) => ({ loc: `${SITE}/a/${a.id}.html`, lastmod: a.published, freq: 'weekly', pri: '0.5' })),
  ...stories.map((s) => ({ loc: `${SITE}/recap/${s.id}.html`, lastmod: s.published, freq: 'never', pri: s.type === 'briefing' ? '0.8' : '0.7' })),
];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`).join('\n')}
</urlset>
`;
await writeFile(path.join(pub, 'sitemap.xml'), xml);

// 자체 RSS 피드(/recap/feed.xml): 정리 기사와 브리핑 최신 50건. 본문 대신 핵심 요약을 설명으로 넣고 전문은 사이트로 연결합니다.
const rfc822 = (iso) => new Date(iso).toUTCString();
const cdata = (t) => `<![CDATA[${String(t).replace(/]]>/g, ']]&gt;')}]]>`;
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>AI 뉴스웨이브: AI 브리핑과 정리 기사</title>
  <link>${SITE}/recap/</link>
  <atom:link href="${SITE}/recap/feed.xml" rel="self" type="application/rss+xml"/>
  <description>여러 매체가 함께 보도한 AI 소식을 사실만 모아 새로 정리한 글과 매일 AI 브리핑</description>
  <language>ko</language>
  <lastBuildDate>${rfc822(now)}</lastBuildDate>
${sorted.slice(0, 50).map((st) => `  <item>
    <title>${cdata(st.title)}</title>
    <link>${SITE}/recap/${st.id}.html</link>
    <guid isPermaLink="true">${SITE}/recap/${st.id}.html</guid>
    <pubDate>${rfc822(st.published)}</pubDate>
    <category>${cdata(st.type === 'briefing' ? 'AI 브리핑' : st.category)}</category>
    <description>${cdata((st.points || []).join(' / ') || st.body[0] || '')}</description>
  </item>`).join('\n')}
</channel>
</rss>
`;
await writeFile(path.join(dir, 'feed.xml'), feed);
console.log(`기사 페이지 ${withPoints.length}건, 정적 페이지 ${stories.length}건, sitemap.xml ${urls.length}개 주소`);
