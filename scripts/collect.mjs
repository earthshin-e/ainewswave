// 사용법: node scripts/collect.mjs
// feeds.json 의 RSS 를 읽어 AI 관련 기사만 추려 public/data/articles.json 에 저장합니다.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseFeed, isAiRelated, isKoreanTitle, classify, makeId } from './lib.mjs';
import { keywordsOf } from './keywords.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public', 'data', 'articles.json');
const KW_OUT = path.join(root, 'public', 'data', 'keywords.json');
const KW_DAYS = 30; // 상단 탭 키워드 순위를 계산하는 기간
const KW_TOP = 30;
const MAX_AGE_DAYS = 14;
const MAX_ITEMS = 3000;
// 매체 80곳 이상을 한꺼번에 때리면 실패율이 올라가므로 동시 요청 수를 묶어 둔다
const CONCURRENCY = 12;
const TIMEOUT_MS = 15000;
const RETRIES = 1; // 일시적인 네트워크 오류는 한 번 더 시도
const UA = 'AIInsideBot/1.0 (RSS reader; links back to original publishers)';

async function fetchOnce(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const buf = new Uint8Array(await res.arrayBuffer());
  let charset = /charset=([\w-]+)/i.exec(res.headers.get('content-type') || '')?.[1];
  if (!charset) {
    const head = new TextDecoder('latin1').decode(buf.slice(0, 300));
    charset = /encoding\s*=\s*["']([\w-]+)["']/i.exec(head)?.[1];
  }
  try { return new TextDecoder((charset || 'utf-8').toLowerCase()).decode(buf); }
  catch { return new TextDecoder('utf-8').decode(buf); }
}

async function fetchText(url) {
  let last;
  for (let i = 0; i <= RETRIES; i++) {
    try { return await fetchOnce(url); }
    catch (e) {
      last = e;
      // 404 처럼 주소가 틀린 경우는 다시 시도해도 같다
      if (/HTTP 4\d\d/.test(String(e.message))) break;
      if (i < RETRIES) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw last;
}

/** 작업 목록을 동시 limit 개까지만 돌린다 (결과 순서는 입력 순서와 같다) */
async function pooled(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try { out[i] = { status: 'fulfilled', value: await worker(items[i]) }; }
      catch (reason) { out[i] = { status: 'rejected', reason }; }
    }
  }));
  return out;
}

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
}

const { feeds } = await readJson(path.join(root, 'feeds.json'), { feeds: [] });
const prev = await readJson(OUT, { articles: [] });
const now = new Date();
const cutoff = now.getTime() - MAX_AGE_DAYS * 86400000;

const typeOf = new Map(feeds.map((f) => [f.id, f.type]));
// 이용약관상 상업적 이용이 막힌 매체(feeds.json 의 restricted). 제목과 원문 링크만 남기고 요약과 이미지는 저장하지 않습니다(docs/rss-terms.md).
const restricted = new Set(feeds.filter((f) => f.restricted).map((f) => f.id));
const strip = (a) => (restricted.has(a.sourceId) ? { ...a, summary: '', image: '', restricted: true, points: undefined, imgTried: true } : a);
const keep = (type, it) => isKoreanTitle(it.title) && (type === 'ai' || isAiRelated(it.title, it.summary));

// 이전 결과 유지 (샘플 데이터는 버림). 필터와 분류 규칙을 바꾸면 보관분에도 바로 반영되도록 다시 적용한다.
const byId = new Map();
for (const a of prev.articles || []) {
  if (a.sample) continue;
  if (new Date(a.published).getTime() < cutoff) continue;
  if (!typeOf.has(a.sourceId)) continue; // feeds.json 에서 뺀 매체의 기사는 보관분에서도 지웁니다
  if (!keep(typeOf.get(a.sourceId), a)) continue;
  byId.set(a.id, strip({ ...a, category: classify(a.title, a.summary), kw: keywordsOf(a.title, a.summary) }));
}

const status = [];
const startedAt = Date.now();
const results = await pooled(feeds, CONCURRENCY, async (f) => {
  const xml = await fetchText(f.url);
  const items = parseFeed(xml, now);
  if (!items.length) throw new Error('기사 0건 (피드 형식 확인 필요)');
  let kept = 0;
  for (const it of items) {
    if (new Date(it.published).getTime() < cutoff) continue;
    if (!keep(f.type, it)) continue;
    const id = makeId(it.link);
    const old = byId.get(id);
    byId.set(id, strip({
      id,
      title: it.title,
      link: it.link,
      source: f.name,
      sourceId: f.id,
      published: old?.published ?? it.published,
      summary: it.summary,
      image: it.image || old?.image || '',
      ...(old?.imgTried ? { imgTried: true } : {}),
      ...(old?.points ? { points: old.points } : {}),
      ...(old?.photo ? { photo: old.photo } : {}),
      category: classify(it.title, it.summary),
      kw: keywordsOf(it.title, it.summary),
    }));
    kept++;
  }
  return { id: f.id, name: f.name, fetched: items.length, kept };
});

results.forEach((r, i) => {
  const f = feeds[i];
  if (r.status === 'fulfilled') {
    status.push({ ...r.value, ok: true });
    console.log(`OK    ${f.name}: ${r.value.kept}/${r.value.fetched}`);
  } else {
    status.push({ id: f.id, name: f.name, ok: false, error: String(r.reason?.message || r.reason) });
    console.warn(`FAIL  ${f.name}: ${r.reason?.message || r.reason}`);
  }
});

// 같은 제목(공백 제거)의 중복 기사는 가장 먼저 나온 것만 유지
const seenTitle = new Set();
let articles = [...byId.values()]
  .sort((a, b) => new Date(b.published) - new Date(a.published))
  .filter((a) => {
    const k = a.title.replace(/\s+/g, '').toLowerCase();
    if (seenTitle.has(k)) return false;
    seenTitle.add(k);
    return true;
  })
  .slice(0, MAX_ITEMS);

// 이미지 보강: RSS 에 썸네일이 없는 기사는 원문 페이지의 공유용 대표 이미지(og:image, twitter:image) 주소를 찾아 붙입니다.
// 본문은 읽지 않고 <head> 의 메타 태그만 봅니다. 한 번 시도한 기사는 imgTried 로 표시해 다시 받지 않습니다.
const OG_MAX = 400; // 한 번 수집에서 새로 찾아보는 최대 기사 수
const OG_TIMEOUT = 8000;
async function ogImage(link) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), OG_TIMEOUT);
  try {
    const res = await fetch(link, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html' } });
    if (!res.ok || !res.body) return '';
    // 메타 태그는 문서 앞부분에 있으므로 최대 200KB 까지만 읽고 끊습니다.
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    while (size < 200000) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); size += value.length;
      if (Buffer.concat(chunks).toString('latin1').includes('</head>')) break;
    }
    reader.cancel().catch(() => {});
    const head = Buffer.concat(chunks).toString('utf8');
    const m = head.match(/<meta[^>]+(?:property|name)=["'](?:og:image|og:image:url|twitter:image)["'][^>]*>/i);
    const c = m && m[0].match(/content=["']([^"']+)["']/i);
    if (!c) return '';
    let u = c[1].trim().replace(/&amp;/g, '&');
    if (u.startsWith('//')) u = 'https:' + u;
    else if (u.startsWith('/')) u = new URL(u, link).href;
    if (u.startsWith('http://')) u = 'https://' + u.slice(7);
    return /^https:\/\//.test(u) ? u : '';
  } catch { return ''; } finally { clearTimeout(t); }
}
const needImg = articles.filter((a) => !a.image && !a.imgTried).slice(0, OG_MAX);
let ogFound = 0;
await pooled(needImg, CONCURRENCY, async (a) => {
  const u = await ogImage(a.link);
  a.imgTried = true;
  if (u) { a.image = u; ogFound++; }
});

// Unsplash 자료 사진: 그래도 이미지가 없는 기사에 주제에 맞는 무료 사진을 붙입니다(UNSPLASH_ACCESS_KEY 가 있을 때만).
// 한 번 쓴 사진은 photos-used.json 에 기록해 다른 기사에 다시 쓰지 않습니다. 실제 현장 사진이 아니므로 화면에 "자료 사진"과 작가를 표시합니다.
// Unsplash 규칙: 이미지는 Unsplash 주소에서 그대로 불러오고, 사용할 때 download_location 을 호출하며, 작가와 Unsplash 를 링크로 밝힙니다.
const PHOTO_OUT = path.join(root, 'public', 'data', 'photos-used.json');
const PHOTO_MAX = 15; // 한 번 수집에서 붙이는 최대 수. 무료 등급은 시간당 50회 요청이고 30분마다 돌기 때문에 검색과 사용 알림을 합쳐 한도 안에 들도록 15건으로 둡니다
const usedPhotos = new Set((await readJson(PHOTO_OUT, { used: [] })).used || []);
for (const a of articles) if (a.photo) usedPhotos.add(a.photo.id);
const QUERY = {
  '생성형AI': 'artificial intelligence', '반도체': 'semiconductor chip', '로봇': 'robot', '정책': 'parliament',
  '기업': 'modern office', '연구': 'science laboratory', '보안/윤리': 'cyber security', '일반': 'artificial intelligence',
};
const KW_QUERY = {
  '데이터센터': 'data center', 'GPU': 'gpu', 'HBM': 'memory chip', '엔비디아': 'graphics card', '휴머노이드': 'humanoid robot',
  '피지컬AI': 'robot arm', '자율주행': 'self driving car', '금융': 'finance', '투자': 'stock market', '의료AI': 'medical technology',
  '교육': 'classroom technology', '국방': 'military technology', '전력': 'power grid', '클라우드': 'server room', '스마트폰': 'smartphone',
  '양자': 'quantum computer', '게임': 'video game', '모빌리티': 'electric car', 'AI 에이전트': 'artificial intelligence', '보안': 'cyber security',
  '투자 유치': 'startup team', '증시': 'stock market chart', 'AI 인재': 'students coding', 'AI 정책': 'parliament', '해킹': 'hacker',
  'AMD': 'computer processor', '로봇': 'industrial robot', '반도체': 'semiconductor wafer', '생성형AI': 'chatbot', 'GPU': 'graphics card',
};
let photoAdded = 0;
const UKEY = process.env.UNSPLASH_ACCESS_KEY;
if (UKEY) {
  const pools = new Map(); // 검색어별 결과를 이번 실행에서 재사용해 요청 수를 줄입니다
  const search = async (q, page) => {
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=30&page=${page}&orientation=landscape&content_filter=high`, { headers: { authorization: `Client-ID ${UKEY}`, 'accept-version': 'v1' } });
    if (!res.ok) throw new Error(`Unsplash HTTP ${res.status}`);
    return (await res.json()).results || [];
  };
  const pick = async (q) => {
    let pool = pools.get(q);
    if (!pool) { pool = { page: 0, items: [] }; pools.set(q, pool); }
    for (let tries = 0; tries < 3; tries++) {
      const p = pool.items.find((x) => !usedPhotos.has(x.id) && !x.premium && !x.plus); // 유료(Unsplash+) 사진 제외
      if (p) return p;
      pool.page++;
      const more = await search(q, pool.page);
      if (!more.length) return null;
      pool.items.push(...more);
    }
    return null;
  };
  const targets = articles.filter((a) => !a.image && !a.photo).slice(0, PHOTO_MAX);
  try {
    for (const a of targets) {
      const kw = (a.kw || []).find((k) => KW_QUERY[k]);
      const q = kw ? KW_QUERY[kw] : (QUERY[a.category] || 'technology');
      const p = await pick(q);
      if (!p) continue;
      usedPhotos.add(p.id);
      const ref = '?utm_source=ainewswave&utm_medium=referral';
      a.photo = { id: p.id, url: `${p.urls.raw}&w=800&q=70&fm=jpg&fit=crop&ar=16:9`, author: p.user.name, authorUrl: p.user.links.html + ref, link: p.links.html + ref };
      photoAdded++;
      fetch(`${p.links.download_location}&client_id=${UKEY}`).catch(() => {}); // 사용 알림(Unsplash 규칙)
    }
  } catch (e) {
    console.warn(`Unsplash 자료 사진 중단: ${e.message}`);
  }
}

const counts = {};
for (const a of articles) counts[a.sourceId] = (counts[a.sourceId] || 0) + 1;
const sources = feeds
  .filter((f) => counts[f.id])
  .map((f) => ({ id: f.id, name: f.name, home: f.home, count: counts[f.id] }))
  .sort((a, b) => b.count - a.count);

const okCount = status.filter((s) => s.ok).length;
if (okCount === 0 && (prev.articles || []).some((a) => !a.sample)) {
  console.error('모든 피드가 실패했습니다. 기존 데이터를 그대로 유지합니다.');
  process.exit(1);
}

// 키워드 순위: 날짜(KST)별로 키워드가 언급된 기사 수를 남겨 두고 최근 30일을 합산합니다.
// 기사는 14일만 보관하므로, 보관 중인 날짜는 매번 다시 세고 그보다 오래된 날짜는 이전 기록을 그대로 씁니다.
const kwPrev = await readJson(KW_OUT, { days: {} });
const dayOf = (iso) => new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 10);
const fresh = {};
for (const a of articles) {
  const d = (fresh[dayOf(a.published)] ??= {});
  for (const k of a.kw) d[k] = (d[k] || 0) + 1;
}
const kwFrom = dayOf(new Date(now.getTime() - KW_DAYS * 86400000).toISOString());
const oldestKept = dayOf(new Date(cutoff).toISOString());
const days = {};
for (const [d, c] of Object.entries(kwPrev.days || {})) if (d >= kwFrom && d < oldestKept) days[d] = c;
for (const [d, c] of Object.entries(fresh)) if (d >= kwFrom) days[d] = c;
const total = {};
for (const c of Object.values(days)) for (const [k, n] of Object.entries(c)) total[k] = (total[k] || 0) + n;
const keywords = Object.entries(total).sort((a, b) => b[1] - a[1]).slice(0, KW_TOP).map(([label, count]) => ({ label, count }));
const kwSince = Object.keys(days).sort()[0] || null;

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(PHOTO_OUT, JSON.stringify({ updatedAt: now.toISOString(), used: [...usedPhotos] }), 'utf8');
await writeFile(KW_OUT, JSON.stringify({ updatedAt: now.toISOString(), days }), 'utf8');
const json = JSON.stringify({ updatedAt: now.toISOString(), keywords, keywordDays: KW_DAYS, keywordSince: kwSince, sources, status, articles });
await writeFile(OUT, json, 'utf8');
// 첫 화면용 가벼운 파일: 최근 48시간 기사(최대 400건)만 담습니다. 검색, 키워드, 매체 선택, 더 보기에서 전체 파일을 이어 받습니다.
const recentFrom = now.getTime() - 48 * 3600000;
const recent = articles.filter((a) => new Date(a.published).getTime() >= recentFrom).slice(0, 400);
const recentJson = JSON.stringify({ updatedAt: now.toISOString(), keywords, keywordDays: KW_DAYS, keywordSince: kwSince, sources, partial: true, total: articles.length, articles: recent });
await writeFile(path.join(path.dirname(OUT), 'articles-recent.json'), recentJson, 'utf8');
console.log(`첫 화면용 articles-recent.json: ${recent.length}건, ${(recentJson.length / 1024).toFixed(0)}KB`);

const failed = status.filter((s) => !s.ok);
if (failed.length) {
  console.log(`\n실패 ${failed.length}곳 (주소 확인 필요):`);
  for (const f of failed) console.log(`  - ${f.name}: ${f.error}`);
}
const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`\nUnsplash 자료 사진: ${UKEY ? `${photoAdded}건 추가, 사용한 사진 ${usedPhotos.size}장` : '키 없음, 건너뜀'}`);
console.log(`\n대표 이미지 보강: ${needImg.length}건 시도, ${ogFound}건 찾음, 이미지 없는 기사 ${articles.filter((a) => !a.image).length}건`);
console.log(`\n키워드 상위 ${KW_TOP}: ${keywords.map((k) => `${k.label} ${k.count}`).join(', ')}`);
console.log(`\n저장 완료: 기사 ${articles.length}건, 매체 ${sources.length}곳 (피드 성공 ${okCount}/${feeds.length})`);
console.log(`수집 소요 ${secs}초, 동시 요청 ${CONCURRENCY}개, articles.json ${(json.length / 1024).toFixed(0)}KB`);
