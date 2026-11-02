// 정리 기사와 브리핑마다 검색엔진이 읽을 수 있는 정적 페이지(public/recap/<id>.html)와 sitemap.xml 을 만듭니다.
// 사용법: node scripts/pages.mjs  (수집과 정리 기사 작성이 끝난 뒤 워크플로에서 실행)
// 메인 화면은 한 페이지 안에서 # 주소로 화면만 바꾸기 때문에 검색엔진이 정리 기사를 따로 색인하지 못합니다.
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { keywordsOf } from './keywords.mjs';

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

// 키워드 모음 페이지(/recap/kw/<키워드>.html, 2026-10-17): 상단 탭 키워드 후보(scripts/keywords.mjs)마다 그 키워드가 제목이나 핵심 요약에 나온 정리 기사를 모읍니다.
// 정리 기사 하나는 짧아도 모음 페이지는 내용이 많고 날마다 늘어 검색어와 잘 맞습니다. 정리 기사가 3건 이상인 키워드만 만듭니다.
const KW_MIN = 3;
const kwFile = (k) => `${k.replace(/\s+/g, '-')}.html`;
// 기자 페이지(/recap/author/<이름>.html, 2026-10-17): 바이라인을 누르면 그 기자의 기사 목록으로 갑니다.
const authorFile = (n) => `${n.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
// 기자 소개(2026-10-20 운영자 승인). 담당 분야는 18:30 글쓰기 작업이 기자를 배정하는 기준과 같습니다.
const AUTHORS = {
  'Haley Yun': { beat: '기업 AI 전략과 제품', bio: '국내외 기업이 AI 를 제품과 사업에 어떻게 들여오는지 다룹니다. 가전, 통신, 플랫폼 기업의 AI 발표와 해외 협력 소식을 주로 씁니다.', beatEn: 'Corporate AI strategy and products', bioEn: 'Covers how Korean and global companies bring AI into their products and businesses, with a focus on consumer electronics, telecom and platform companies.' },
  'Chloe Park': { beat: '생성형 AI 와 AI 인프라', bio: '새 AI 모델과 서비스 출시, 그리고 이를 떠받치는 칩, 서버, 데이터센터 소식을 다룹니다.', beatEn: 'Generative AI and AI infrastructure', bioEn: 'Covers new AI models and services, and the chips, servers and data centers behind them.' },
  'Ethan Chen': { beat: 'AI 정책과 산업 생태계', bio: '정부의 AI 정책과 국책 과제, AI 인재 채용, 산업 현장의 변화를 다룹니다.', beatEn: 'AI policy and the industry ecosystem', bioEn: 'Covers Korean government AI policy and national projects, AI hiring and talent, and how AI is changing industry.' },
  'Ashley Yang': { beat: '국내 AI 기업과 산업 행사', bio: '국내 AI 기업의 협력과 해외 진출, 주요 전시와 개발자 행사를 다룹니다.', beatEn: 'Korean AI companies and industry events', bioEn: 'Covers partnerships and overseas expansion of Korean AI companies, along with major tech exhibitions and developer events.' },
  'Kevin Wong': { beat: 'AI 보안, 로봇, 반도체', bio: 'AI 보안 기술, 로봇과 자율주행, AI 칩과 GPU 확보 경쟁을 다룹니다.', beatEn: 'AI security, robotics and chips', bioEn: 'Covers AI security, robotics and autonomous systems, and the race for AI chips and GPUs.' },
};
const storyKw = new Map(stories.map((s) => [s.id, keywordsOf(s.title, (s.points || []).join(' '))]));
const kwStories = new Map();
for (const s of stories) for (const k of storyKw.get(s.id)) { if (!kwStories.has(k)) kwStories.set(k, []); kwStories.get(k).push(s); }
for (const [k, l] of [...kwStories]) if (l.length < KW_MIN) kwStories.delete(k);


function page(st, others, nav) {
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
    author: st.author ? { '@type': 'Person', name: st.author, url: `${SITE}/recap/author/${authorFile(st.author)}` } : { '@type': 'Organization', name: 'AI 뉴스웨이브', url: SITE },
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
${digestOf.has(st.id) ? '<meta name="robots" content="noindex,follow">\n' : ''}${st.en && st.en.title ? `<link rel="alternate" hreflang="ko" href="${url}">\n<link rel="alternate" hreflang="en" href="${SITE}/en/recap/${st.id}.html">` : ''}
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
    ${digestOf.has(st.id) ? `<p class="meta">이 글은 <a href="${digestFile(digestOf.get(st.id))}">${ymdLabel(digestOf.get(st.id))} AI 정리 모음</a>에도 실려 있습니다.</p>` : ''}
    <p class="meta">${st.author ? `글 <a href="author/${authorFile(st.author)}">${esc(st.author)}</a>` : 'AI 뉴스웨이브'} | ${kstDate(st.published)} | ${st.sources.length}개 매체 보도 종합</p>
    ${st.points && st.points.length ? `<h2>핵심 요약</h2>\n    <ul>${st.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    <h2>본문</h2>
    ${st.body.map(bodyP).join('\n    ')}
    <h2>출처</h2>
    <details class="srcs"${st.sources.length <= 3 ? ' open' : ''}><summary>출처 ${st.sources.length}곳${st.sources.length <= 3 ? '' : ' 펼치기'}</summary><ul>${st.sources.map((x) => `<li><strong>${esc(x.name)}</strong> <a href="${esc(x.link)}" rel="noopener nofollow" target="_blank">${esc(x.title)}</a></li>`).join('')}</ul></details>
    <p class="meta">이 글은 위 매체들의 보도에서 확인된 사실을 AI 뉴스웨이브가 새로 정리한 것입니다. 자세한 내용은 각 언론사 원문을 확인하세요.</p>
  </article>
  ${(storyKw.get(st.id) || []).filter((k) => kwStories.has(k)).length ? `<h2>관련 키워드</h2>
  <p class="topics">${storyKw.get(st.id).filter((k) => kwStories.has(k)).map((k) => `<a href="kw/${encodeURI(kwFile(k))}">${esc(k)} ${kwStories.get(k).length}</a>`).join('')}</p>` : ''}
  ${others.length ? `<h2>같은 주제 정리 기사</h2>
  <ul>${others.map((o) => `<li><a href="${esc(o.id)}.html">${esc(o.title)}</a></li>`).join('')}</ul>` : ''}
  ${nav && (nav.prev || nav.next) ? `<h2>이전 글, 다음 글</h2>
  <ul>${nav.next ? `<li>다음 글: <a href="${esc(nav.next.id)}.html">${esc(nav.next.title)}</a></li>` : ''}${nav.prev ? `<li>이전 글: <a href="${esc(nav.prev.id)}.html">${esc(nav.prev.title)}</a></li>` : ''}</ul>` : ''}
  <p><a href="./">정리 기사 전체 보기</a> | <a href="../">AI 뉴스웨이브에서 최신 AI 뉴스 보기</a></p>
</main>
<footer class="wrap foot"><a href="../">홈</a><a href="./">정리 기사</a><a href="../about.html">소개</a><a href="../privacy.html">개인정보처리방침</a><a href="../contact.html">문의</a><a href="#feedback" data-feedback>의견 보내기</a><a href="/en/" hreflang="en">English</a></footer>
</body>
</html>
`;
}

// 얇은 정리 기사 합치기(2026-10-26): 정리 기사 본문이 중앙값 256자라 구글이 "발견됨, 색인 안 됨"으로 미룹니다.
// 본문 THIN_MAX 자 미만인 자동 정리 기사는 같은 날 글끼리 날짜별 모음 페이지(/recap/d<날짜>.html)로 묶어 색인 대상으로 삼고,
// 개별 페이지는 noindex,follow 로 두며 사이트맵과 피드에서 뺍니다(모음 페이지가 내용을 모두 담고 개별 페이지로 링크합니다).
const THIN_MAX = 500;
const bodyLen = (s) => s.body.join('').replace(/\s/g, '').length;
const ymd = (iso) => { const d = new Date(new Date(iso).getTime() + 9 * 3600000); return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`; };
const ymdLabel = (k) => `${Number(k.slice(4, 6))}월 ${Number(k.slice(6, 8))}일`;
const isThin = (s) => s.type !== 'briefing' && !s.author && bodyLen(s) < THIN_MAX;
const digestGroups = new Map();
for (const s of stories) if (isThin(s)) { const k = ymd(s.published); if (!digestGroups.has(k)) digestGroups.set(k, []); digestGroups.get(k).push(s); }
for (const [k, l] of [...digestGroups]) if (l.length < 2) digestGroups.delete(k);
const digestOf = new Map();
for (const [k, l] of digestGroups) for (const s of l) digestOf.set(s.id, k);
const digestFile = (k) => `d${k}.html`;
const digestKeys = [...digestGroups.keys()].sort().reverse();

// 본문 문단: "최근 흐름:", "용어 풀이:" 같은 라벨은 굵게, 용어 풀이는 박스로 분리 (2026-11-02)
const bodyP = (p) => {
  const m = /^(최근 흐름|용어 풀이|Recent developments|Glossary): ?([\s\S]*)$/.exec(p);
  if (!m) return `<p>${esc(p)}</p>`;
  const gloss = m[1] === '용어 풀이' || m[1] === 'Glossary';
  return `<p${gloss ? ' class="gloss"' : ''}><strong>${esc(m[1])}</strong> ${esc(m[2])}</p>`;
};
const dir = path.join(pub, 'recap');
await mkdir(dir, { recursive: true });
const keep = new Set([...stories.map((s) => `${s.id}.html`), 'index.html', 'feed.xml', ...Object.keys(TOPICS).map(topicFile), ...digestKeys.map(digestFile)]);
for (const f of await readdir(dir)) if (f.endsWith('.html') && !keep.has(f)) await unlink(path.join(dir, f));
const sorted = [...stories].sort((a, b) => new Date(b.published) - new Date(a.published));
// 피드에는 개별 얇은 글 대신 날짜별 모음 페이지를 싣습니다.
const feedItems = [...sorted.filter((s) => !digestOf.has(s.id)), ...digestKeys.map((k) => { const l = digestGroups.get(k); return { id: digestFile(k).replace(/\.html$/, ''), title: `${ymdLabel(k)} AI 정리 모음`, published: l.map((s) => s.published).sort().pop(), category: 'AI 정리 모음', points: l.slice(0, 3).map((s) => s.title), body: [] }; })].sort((a, b) => new Date(b.published) - new Date(a.published));
// 같은 주제 글 연결(2026-10-26): 모든 글이 같은 최신 5건만 가리키면 오래된 글로 들어오는 링크가 없어 구글이 크롤을 미룹니다.
// 공통 키워드(2점씩), 같은 분류(1점), 같은 기자(1점)로 점수를 매겨 관련 글 6건을 붙이고, 시간순 이전 글과 다음 글도 붙여 모든 글이 서로 이어지게 합니다.
for (let i = 0; i < sorted.length; i++) {
  const st = sorted[i];
  const mine = new Set(storyKw.get(st.id) || []);
  const scored = sorted.filter((o) => o.id !== st.id).map((o) => {
    let sc = 0;
    for (const k of storyKw.get(o.id) || []) if (mine.has(k)) sc += 2;
    if (o.category === st.category) sc += 1;
    if (st.author && o.author === st.author) sc += 1;
    return { o, sc };
  }).filter((x) => x.sc > 0).sort((a, b) => b.sc - a.sc || new Date(b.o.published) - new Date(a.o.published));
  const others = scored.slice(0, 4).map((x) => x.o);
  if (others.length < 4) for (const o of sorted) { if (others.length >= 4) break; if (o.id !== st.id && !others.includes(o)) others.push(o); }
  const nav = { next: i > 0 ? sorted[i - 1] : null, prev: i < sorted.length - 1 ? sorted[i + 1] : null };
  await writeFile(path.join(dir, `${st.id}.html`), page(st, others, nav));
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
<footer class="wrap foot"><a href="../">홈</a><a href="./">정리 기사</a><a href="../about.html">소개</a><a href="../privacy.html">개인정보처리방침</a><a href="../contact.html">문의</a><a href="#feedback" data-feedback>의견 보내기</a><a href="/en/" hreflang="en">English</a></footer>
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
const kwSorted = [...kwStories.entries()].sort((x, y) => y[1].length - x[1].length);
const kwNav = (cur) => `<p class="topics">${kwSorted.map(([k, l]) => k === cur ? `<strong>${esc(k)} ${l.length}</strong>` : `<a href="KWBASE${encodeURI(kwFile(k))}">${esc(k)} ${l.length}</a>`).join('')}</p>`;
await writeFile(path.join(dir, 'index.html'), indexHtml.replace('<h2>정리 기사</h2>', `<h2>키워드별 모음</h2>\n  ${kwNav('').replaceAll('KWBASE', 'kw/')}\n  <h2>정리 기사</h2>`));
const kwDir = path.join(dir, 'kw');
await mkdir(kwDir, { recursive: true });
for (const f of await readdir(kwDir)) if (!kwSorted.some(([k]) => kwFile(k) === f)) await unlink(path.join(kwDir, f));
for (const [k, list] of kwSorted) {
  const l = [...list].sort((x, y) => new Date(y.published) - new Date(x.published));
  const first = dayKey(l[l.length - 1].published), last = dayKey(l[0].published);
  const html = listPage({
    title: `${k} AI 뉴스 정리`,
    desc: `${k} 관련 AI 소식을 여러 매체 보도에서 확인된 사실만 모아 정리한 글 ${l.length}건입니다. ${first}부터 ${last}까지.`,
    canon: `kw/${encodeURI(kwFile(k))}`,
    main: `  <h1>${esc(k)} AI 뉴스 정리</h1>
  <p>${esc(k)} 관련 소식을 여러 매체 보도에서 확인된 사실만 모아 새로 쓴 정리 기사 ${l.length}건입니다(${first}부터 ${last}까지). 글마다 근거가 된 언론사 기사를 밝힙니다.</p>
  <ul class="cards">${l.map((x) => `<li><a href="../${esc(x.id)}.html">${esc(x.title)}</a>${x.points && x.points[0] ? `<br><span class="sum">${esc(x.points.join(', '))}</span>` : ''}<br><span class="meta">${x.type === 'briefing' ? 'AI 브리핑 | ' : x.author ? `글 <a href="../author/${authorFile(x.author)}">${esc(x.author)}</a> | ` : ''}${kstDate(x.published)} | ${x.sources.length}개 매체</span></li>`).join('')}</ul>
  <h2>다른 키워드</h2>
  ${kwNav(k).replaceAll('KWBASE', '')}
  <p><a href="../">정리 기사 전체 보기</a></p>`,
  }).replaceAll('href="../icon.svg"', 'href="/icon.svg"').replaceAll('src="../icon.svg"', 'src="/icon.svg"').replace('href="../page.css"', 'href="/page.css"')
    .replace('<a class="brand" href="../">', '<a class="brand" href="/">').replace('<footer class="wrap foot"><a href="../">홈</a><a href="./">정리 기사</a><a href="../about.html">', '<footer class="wrap foot"><a href="/">홈</a><a href="/recap/">정리 기사</a><a href="/about.html">')
    .replace('<a href="../privacy.html">', '<a href="/privacy.html">').replace('<a href="../contact.html">', '<a href="/contact.html">');
  await writeFile(path.join(kwDir, kwFile(k)), html);
}
const authors = [...new Set(stories.filter((x) => x.author).map((x) => x.author))].sort();
const auDir = path.join(dir, 'author');
await mkdir(auDir, { recursive: true });
for (const f of await readdir(auDir)) if (!authors.some((n) => authorFile(n) === f)) await unlink(path.join(auDir, f));
for (const n of authors) {
  const l = sorted.filter((x) => x.author === n);
  const ld = { '@context': 'https://schema.org', '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: n, jobTitle: '기자', ...(AUTHORS[n] ? { description: AUTHORS[n].bio, knowsAbout: AUTHORS[n].beat } : {}), worksFor: { '@type': 'Organization', name: 'AI 뉴스웨이브', url: SITE } } };
  const html = listPage({
    title: `${n} 기자`,
    desc: `AI 뉴스웨이브 ${n} 기자${AUTHORS[n] ? `(${AUTHORS[n].beat})` : ''}의 기사 ${l.length}건 모음입니다.`,
    canon: `author/${authorFile(n)}`,
    main: `  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
  <p class="meta">AI 뉴스웨이브 기자${AUTHORS[n] ? ` | ${esc(AUTHORS[n].beat)}` : ''}</p>
  <h1>${esc(n)}</h1>
  ${AUTHORS[n] ? `<p>${esc(AUTHORS[n].bio)}</p>` : ''}
  <p>${esc(n)} 기자가 담당한 기사 ${l.length}건입니다. 여러 매체 보도에서 확인된 사실을 바탕으로 AI 작성 도구가 쓰고 먼저 발행한 뒤 기자가 검토합니다. 글마다 근거가 된 언론사 기사를 밝힙니다.</p>
  <ul class="cards">${l.map((x) => `<li><a href="../${esc(x.id)}.html">${esc(x.title)}</a>${x.points && x.points.length ? `<br><span class="sum">${esc(x.points.join(', '))}</span>` : ''}<br><span class="meta">${kstDate(x.published)} | ${x.sources.length}개 매체</span></li>`).join('')}</ul>
  <h2>다른 기자</h2>
  <p class="topics">${authors.filter((o) => o !== n).map((o) => `<a href="${authorFile(o)}">${esc(o)}</a>`).join('')}</p>
  <p><a href="../">정리 기사 전체 보기</a></p>`,
  }).replaceAll('href="../icon.svg"', 'href="/icon.svg"').replaceAll('src="../icon.svg"', 'src="/icon.svg"').replace('href="../page.css"', 'href="/page.css"')
    .replace('<a class="brand" href="../">', '<a class="brand" href="/">').replace('<footer class="wrap foot"><a href="../">홈</a><a href="./">정리 기사</a><a href="../about.html">', '<footer class="wrap foot"><a href="/">홈</a><a href="/recap/">정리 기사</a><a href="/about.html">')
    .replace('<a href="../privacy.html">', '<a href="/privacy.html">').replace('<a href="../contact.html">', '<a href="/contact.html">');
  await writeFile(path.join(auDir, authorFile(n)), html);
}

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
<meta name="robots" content="noindex,follow">
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
<footer class="wrap foot"><a href="../">홈</a><a href="../recap/">정리 기사</a><a href="../about.html">소개</a><a href="../privacy.html">개인정보처리방침</a><a href="../contact.html">문의</a><a href="#feedback" data-feedback>의견 보내기</a><a href="/en/" hreflang="en">English</a></footer>
</body>
</html>
`;
}
for (const a of withPoints) await writeFile(path.join(adir, `${a.id}.html`), articlePage(a));
// /a/feed.xml(2026-10-18 바꿈): Search Console 이 매일 읽어 가는 유일한 통로라(10/18 기준 /recap/feed.xml 은 10/14 뒤로 안 읽고 사이트맵은 Couldn't fetch),
// noindex 인 /a/ 기사 페이지 대신 색인될 정리 기사, 브리핑, 기자 기사(/recap/<id>.html) 최신 200건을 싣습니다. 주소는 Search Console 에 제출된 그대로 둡니다.
const acdata = (t) => `<![CDATA[${String(t).replace(/]]>/g, ']]&gt;')}]]>`;
await writeFile(path.join(adir, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>AI 뉴스웨이브: AI 브리핑과 정리 기사</title>
  <link>${SITE}/recap/</link>
  <description>여러 매체 보도를 AI 뉴스웨이브가 사실만 모아 새로 정리한 글과 매일 AI 브리핑</description>
  <language>ko</language>
${feedItems.slice(0, 200).map((st) => `  <item>
    <title>${acdata(st.title)}</title>
    <link>${SITE}/recap/${st.id}.html</link>
    <guid isPermaLink="true">${SITE}/recap/${st.id}.html</guid>
    <pubDate>${new Date(st.published).toUTCString()}</pubDate>
    <description>${acdata((st.points || []).join(' / ') || st.body[0] || '')}</description>
  </item>`).join('\n')}
</channel>
</rss>
`);

// 기자 검토용 초안 미리보기(/draft/<id>.html): public/data/drafts.json 의 글. 검색 노출 금지, 사이트맵과 목록에 넣지 않습니다.
let drafts = [];
try { drafts = JSON.parse(await readFile(path.join(pub, 'data', 'drafts.json'), 'utf8')).drafts || []; } catch { /* 없음 */ }
const ddir = path.join(pub, 'draft');
await mkdir(ddir, { recursive: true });
for (const f of await readdir(ddir)) if (f.endsWith('.html')) await unlink(path.join(ddir, f));
for (const d of drafts) {
  const html = page({ ...d, published: d.published || new Date().toISOString() }, [])
    .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex,nofollow">')
    .replace('<article>', '<p style="padding:8px 12px;border:1px solid #b7791f;color:#b7791f">검토용 초안입니다. 아직 공개되지 않았습니다.</p>\n  <article>');
  await writeFile(path.join(ddir, `${d.id}.html`), html);
}

// 영문판(/en/): 뉴스웨이브가 쓴 글(정리 기사, 기자 기사, 브리핑) 중 영어 번역(st.en = {title, points, body})이 있는 것만 싣습니다.
// 한국 언론사 기사 제목과 요약은 번역하지 않습니다(남의 글 번역은 2차적 저작물). 출처는 매체명과 원문 링크만 둡니다.
const enStories = [...stories].filter((s) => s.en && s.en.title && Array.isArray(s.en.body)).sort((a, b) => new Date(b.published) - new Date(a.published));
const edir = path.join(pub, 'en');
const erdir = path.join(edir, 'recap');
await mkdir(erdir, { recursive: true });
for (const f of await readdir(erdir)) if (f.endsWith('.html') && !enStories.some((s) => `${s.id}.html` === f)) await unlink(path.join(erdir, f));
const enDate = (iso) => new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) + ' KST';
const enHead = (title, desc, canon, alt, extra = '') => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canon}">
<link rel="alternate" hreflang="en" href="${canon}">
${alt ? `<link rel="alternate" hreflang="ko" href="${alt}">` : ''}
<meta property="og:site_name" content="AI NewsWave">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canon}">
<meta property="og:image" content="${SITE}/og.png">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/page.css">
${extra}
<script src="/consent.js"></script>
<meta name="google-adsense-account" content="ca-pub-2376619512263295">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2376619512263295" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA}');</script>
</head>
<body>
<header class="top"><div class="wrap"><a class="brand" href="/en/"><img src="/icon.svg" alt="">AI NewsWave</a> <a class="meta" href="${alt || '/'}" style="float:right;padding:14px 0">한국어</a></div></header>
`;
const enFoot = `<footer class="wrap foot"><a href="/en/">Home</a><a href="/en/about.html">About</a><a href="/">한국어</a></footer>
</body>
</html>
`;
for (const st of enStories) {
  const e = st.en, url = `${SITE}/en/recap/${st.id}.html`;
  const ld = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: e.title, inLanguage: 'en', datePublished: st.published, description: (e.points || []).join('. ').slice(0, 150), mainEntityOfPage: url,
    author: st.author ? { '@type': 'Person', name: st.author, url: `${SITE}/en/author/${authorFile(st.author)}` } : { '@type': 'Organization', name: 'AI NewsWave', url: SITE }, publisher: { '@type': 'Organization', name: 'AI NewsWave', logo: { '@type': 'ImageObject', url: `${SITE}/icon512.png` } } };
  await writeFile(path.join(erdir, `${st.id}.html`), enHead(`${e.title} | AI NewsWave`, (e.points || []).join('. ').slice(0, 150), url, `${SITE}/recap/${st.id}.html`, `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`) + `<main class="wrap">
  <article>
    <p class="meta">${st.type === 'briefing' ? 'AI Briefing' : 'Korea AI News'}</p>
    <h1>${esc(e.title)}</h1>
    <p class="meta">${st.author ? `By <a href="/en/author/${authorFile(st.author)}">${esc(st.author)}</a>` : 'AI NewsWave'} | ${enDate(st.published)} | Based on ${st.sources.length} Korean news reports</p>
    ${e.points && e.points.length ? `<h2>Key points</h2>\n    <ul>${e.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    ${e.body.map(bodyP).join('\n    ')}
    <h2>Sources (in Korean)</h2>
    <ul>${st.sources.map((s) => `<li><a href="${esc(s.link)}" rel="noopener" target="_blank">${esc(s.name)}</a></li>`).join('')}</ul>
    <p class="meta">${st.author ? `Drafted with AI writing tools and published first; ${esc(st.author)} reviews it after publication.` : 'Compiled by AI NewsWave from facts confirmed across the Korean reports above.'} Translated from the <a href="/recap/${esc(st.id)}.html">Korean version</a>.</p>
  </article>
</main>
` + enFoot);
}
// 영문 첫 화면(2026-10-17): 최신 브리핑(핵심 요약 포함), 기자 기사, 정리 기사를 나눠 보여 주고 각 글에 핵심 요약 첫 줄을 붙입니다. 맨 아래에 전체 목록을 날짜별로 둡니다.
const enBrief = enStories.find((s) => s.type === 'briefing');
const enReporter = enStories.filter((s) => s.author).slice(0, 6);
const enRecap = enStories.filter((s) => s.type !== 'briefing' && !s.author).slice(0, 12);
const enDay = (iso) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', year: 'numeric' });
const enItem = (s) => `<li><a href="recap/${esc(s.id)}.html">${esc(s.en.title)}</a>${s.en.points && s.en.points[0] ? `<br><span class="sum">${esc(s.en.points[0])}</span>` : ''}<br><span class="meta">${s.author ? `By <a href="author/${authorFile(s.author)}">${esc(s.author)}</a> | ` : ''}${enDate(s.published)}</span></li>`;
const enAll = (() => { const m = new Map(); for (const s of enStories) { const k = enDay(s.published); if (!m.has(k)) m.set(k, []); m.get(k).push(s); } return [...m.entries()]; })();
await writeFile(path.join(edir, 'index.html'), enHead('AI NewsWave: Korea AI news in English', 'Daily briefings and news recaps on the Korean AI industry, compiled from Korean media reports.', `${SITE}/en/`, `${SITE}/`, '<link rel="alternate" type="application/rss+xml" title="AI NewsWave (English)" href="/en/feed.xml">') + `<main class="wrap">
  <h1>Korea AI news, in English</h1>
  <p>AI NewsWave follows Korean AI and tech media every 30 minutes. Here we publish English versions of our daily briefings and news recaps on Korean AI companies, chips, policy and research. <a href="feed.xml">RSS</a></p>
  ${enBrief ? `<section class="lead"><p class="meta">Latest AI Briefing</p><h2><a href="recap/${esc(enBrief.id)}.html">${esc(enBrief.en.title)}</a></h2>${(enBrief.en.points || []).length ? `<ul>${enBrief.en.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}<p class="meta">${enDate(enBrief.published)} | Based on ${enBrief.sources.length} Korean news reports</p></section>` : ''}
  ${enReporter.length ? `<h2>From our reporters</h2>\n  <ul class="cards">${enReporter.map(enItem).join('')}</ul>` : ''}
  ${enRecap.length ? `<h2>News recaps</h2>\n  <ul class="cards">${enRecap.map(enItem).join('')}</ul>` : ''}
  ${enStories.length ? `<h2>All articles</h2>\n  ${enAll.map(([d, l]) => `<h3>${d}</h3>\n  <ul>${l.map((s) => `<li><a href="recap/${esc(s.id)}.html">${esc(s.en.title)}</a></li>`).join('')}</ul>`).join('\n  ')}` : '<p class="meta">English articles are coming soon.</p>'}
</main>
` + enFoot);
// 영문 RSS(/en/feed.xml): 구글이 영문 글을 찾는 통로. 설명에는 핵심 요약만 넣습니다.
await writeFile(path.join(edir, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>AI NewsWave: Korea AI news in English</title>
  <link>${SITE}/en/</link>
  <description>Daily briefings and news recaps on the Korean AI industry, compiled from Korean media reports.</description>
  <language>en</language>
${enStories.slice(0, 500).map((s) => `  <item>
    <title>${acdata(s.en.title)}</title>
    <link>${SITE}/en/recap/${s.id}.html</link>
    <guid isPermaLink="true">${SITE}/en/recap/${s.id}.html</guid>
    <pubDate>${new Date(s.published).toUTCString()}</pubDate>
    <description>${acdata((s.en.points || []).join(' / '))}</description>
  </item>`).join('\n')}
</channel>
</rss>
`);
await writeFile(path.join(edir, 'about.html'), enHead('About | AI NewsWave', 'About AI NewsWave', `${SITE}/en/about.html`, `${SITE}/about.html`) + `<main class="wrap">
  <h1>About AI NewsWave</h1>
  <p>AI NewsWave is a Korean AI news service. We collect AI-related headlines from Korean media and publish our own recaps that combine facts confirmed across several outlets, with links to every original report.</p>
  <p>Articles with a reporter's byline are drafted with AI writing tools, published first, and reviewed by that reporter after publication. Unsigned recaps and briefings are generated automatically and checked sentence by sentence against their sources every day.</p>
  <p>We do not translate or republish Korean media articles. English pages contain only text we wrote ourselves.</p>
  <p>Contact: appealrequested@gmail.com</p>
</main>
` + enFoot);
const enAuthors = [...new Set(enStories.filter((x) => x.author).map((x) => x.author))].sort();
const eaDir = path.join(edir, 'author');
await mkdir(eaDir, { recursive: true });
for (const f of await readdir(eaDir)) if (!enAuthors.some((n) => authorFile(n) === f)) await unlink(path.join(eaDir, f));
for (const n of enAuthors) {
  const l = enStories.filter((x) => x.author === n);
  const ld = { '@context': 'https://schema.org', '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: n, jobTitle: 'Reporter', ...(AUTHORS[n] ? { description: AUTHORS[n].bioEn, knowsAbout: AUTHORS[n].beatEn } : {}), worksFor: { '@type': 'Organization', name: 'AI NewsWave', url: SITE } } };
  await writeFile(path.join(eaDir, authorFile(n)), enHead(`${n} | AI NewsWave`, `Articles by ${n}, reporter at AI NewsWave${AUTHORS[n] ? ` covering ${AUTHORS[n].beatEn.toLowerCase()}` : ''}.`, `${SITE}/en/author/${authorFile(n)}`, `${SITE}/recap/author/${authorFile(n)}`, `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`) + `<main class="wrap">
  <p class="meta">Reporter, AI NewsWave${AUTHORS[n] ? ` | ${esc(AUTHORS[n].beatEn)}` : ''}</p>
  <h1>${esc(n)}</h1>
  ${AUTHORS[n] ? `<p>${esc(AUTHORS[n].bioEn)}</p>` : ''}
  <p>${l.length} articles by ${esc(n)}. Drafted with AI writing tools from facts confirmed in Korean media reports, published first, and reviewed by the reporter after publication.</p>
  <ul class="cards">${l.map((x) => `<li><a href="/en/recap/${esc(x.id)}.html">${esc(x.en.title)}</a>${x.en.points && x.en.points[0] ? `<br><span class="sum">${esc(x.en.points[0])}</span>` : ''}<br><span class="meta">${enDate(x.published)}</span></li>`).join('')}</ul>
</main>
` + enFoot);
}

// 메인 화면 미리 그리기(2026-10-16): 기사 목록은 app.js 가 나중에 그려서 검색 로봇과 애드센스 심사에는 빈 화면처럼 보입니다.
// 최신 브리핑과 정리 기사를 index.html 원본에 글자로 넣어 두고, 방문자에게도 같은 칸으로 보여 줍니다.
{
  const ipath = path.join(pub, 'index.html');
  const ihtml = await readFile(ipath, 'utf8');
  const brief = sorted.find((s) => s.type === 'briefing');
  const recent = sorted.filter((s) => s.type !== 'briefing').slice(0, 8);
  const item = (s) => `<li data-cat="${esc(s.category)}"><a href="recap/${esc(s.id)}.html"><span class="tag">${esc(s.category)}</span><strong>${esc(s.title)}</strong>${s.points && s.points[0] ? `<span class="rp">${esc(s.points[0])}</span>` : ''}</a></li>`;
  const block = `<!--RECAPS--><section id="recaps" class="recaps" aria-labelledby="recapsTitle">
    <h2 id="recapsTitle">AI 브리핑과 정리 기사 <span>여러 매체 보도를 뉴스웨이브가 새로 정리한 글</span></h2>
    ${brief ? `<a class="rbrief" href="recap/${esc(brief.id)}.html"><b>AI 브리핑</b><strong>${esc(brief.title)}</strong>${(brief.points || []).length ? `<ul>${brief.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}</a>` : ''}
    <ol>${recent.map(item).join('')}</ol>
    <a class="rmore" href="recap/">정리 기사 전체 보기 →</a>
  </section><!--/RECAPS-->`;
  const next = ihtml.replace(/<!--RECAPS-->[\s\S]*?<!--\/RECAPS-->/, block);
  if (next !== ihtml) await writeFile(ipath, next);
}

// 날짜별 정리 모음 페이지(/recap/d<날짜>.html)
for (let i = 0; i < digestKeys.length; i++) {
  const k = digestKeys[i];
  const l = [...digestGroups.get(k)].sort((a, b) => new Date(b.published) - new Date(a.published));
  const cats = Object.keys(TOPICS).filter((c) => l.some((s) => s.category === c));
  const prevK = digestKeys[i + 1], nextK = digestKeys[i - 1];
  const sections = cats.map((c) => `  <h2>${esc(c)}</h2>
  ${l.filter((s) => s.category === c).map((s) => `<article>
    <h3><a href="${esc(s.id)}.html">${esc(s.title)}</a></h3>
    ${s.points && s.points.length ? `<ul>${s.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    ${s.body.map(bodyP).join('\n    ')}
    <p class="meta">출처: ${s.sources.map((x) => `${esc(x.name)}(<a href="${esc(x.link)}" rel="noopener nofollow" target="_blank">${esc(x.title)}</a>)`).join(', ')}</p>
  </article>`).join('\n  ')}`).join('\n');
  await writeFile(path.join(dir, digestFile(k)), listPage({
    title: `${ymdLabel(k)} AI 정리 모음`,
    desc: `${ymdLabel(k)} 여러 매체가 함께 보도한 AI 소식 ${l.length}건을 핵심 요약, 본문, 출처와 함께 모았습니다.`,
    canon: digestFile(k),
    main: `  <h1>${ymdLabel(k)} AI 정리 모음</h1>
  <p>${ymdLabel(k)} 여러 매체가 함께 보도한 AI 소식 ${l.length}건을 AI 뉴스웨이브가 사실만 모아 새로 정리했습니다. 분야는 ${cats.map(esc).join(', ')}이며, 글마다 근거가 된 언론사 기사를 밝힙니다.</p>
${sections}
  <p class="meta">${nextK ? `<a href="${digestFile(nextK)}">다음 모음: ${ymdLabel(nextK)}</a> | ` : ''}${prevK ? `<a href="${digestFile(prevK)}">이전 모음: ${ymdLabel(prevK)}</a> | ` : ''}<a href="./">정리 기사 전체 보기</a></p>`,
  }));
}

const now = new Date().toISOString();
const urls = [
  { loc: `${SITE}/`, lastmod: now, freq: 'hourly', pri: '1.0' },
  { loc: `${SITE}/recap/`, lastmod: now, freq: 'daily', pri: '0.9' },
  ...plainCats.map((c) => ({ loc: `${SITE}/recap/${topicFile(c)}`, lastmod: now, freq: 'daily', pri: '0.6' })),
  ...kwSorted.map(([k]) => ({ loc: `${SITE}/recap/kw/${encodeURI(kwFile(k))}`, lastmod: now, freq: 'daily', pri: '0.7' })),
  ...authors.map((n) => ({ loc: `${SITE}/recap/author/${authorFile(n)}`, lastmod: now, freq: 'daily', pri: '0.6' })),
  ...enAuthors.map((n) => ({ loc: `${SITE}/en/author/${authorFile(n)}`, lastmod: now, freq: 'daily', pri: '0.5' })),
  ...['about', 'privacy', 'contact'].map((p) => ({ loc: `${SITE}/${p}.html`, freq: 'monthly', pri: '0.3' })),
  { loc: `${SITE}/en/`, lastmod: now, freq: 'daily', pri: '0.8' },
  ...enStories.map((s) => ({ loc: `${SITE}/en/recap/${s.id}.html`, lastmod: s.published, freq: 'never', pri: '0.7' })),
  ...digestKeys.map((k) => ({ loc: `${SITE}/recap/${digestFile(k)}`, lastmod: digestGroups.get(k).map((s) => s.published).sort().pop(), freq: 'daily', pri: '0.8' })),
  ...stories.filter((s) => !digestOf.has(s.id)).map((s) => ({ loc: `${SITE}/recap/${s.id}.html`, lastmod: s.published, freq: 'never', pri: s.type === 'briefing' ? '0.8' : '0.7' })),
];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`).join('\n')}
</urlset>
`;
await writeFile(path.join(pub, 'sitemap.xml'), xml);
// Search Console 이 sitemap.xml 을 계속 Couldn't fetch 로 두어 같은 내용을 다른 이름으로도 냅니다(2026-10-16)
await writeFile(path.join(pub, 'sitemap-all.xml'), xml);

// 자체 RSS 피드(/recap/feed.xml): 정리 기사와 브리핑 최신 500건(사이트맵이 Couldn't fetch 라 구글이 이 피드로 새 글을 찾으므로 전체를 담음, 2026-10-17). 본문 대신 핵심 요약을 설명으로 넣고 전문은 사이트로 연결합니다.
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
${feedItems.slice(0, 500).map((st) => `  <item>
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
