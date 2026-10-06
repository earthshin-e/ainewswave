// 사용법: node scripts/probe_feeds.mjs [--out feeds.json]
// docs/outlets100.txt 의 매체마다 RSS 주소를 찾아 실제로 응답하고 파싱되는지 확인합니다.
// 1) 흔히 쓰이는 RSS 경로를 차례로 시도 2) 안 되면 홈페이지의 rel=alternate 링크를 자동 탐색
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseFeed } from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'AIInsideBot/1.0 (RSS reader; links back to original publishers)';
const TIMEOUT = 15000;
const CONCURRENCY = 10;

// 국내 언론사 CMS 가 흔히 쓰는 RSS 경로 (앞쪽이 적중률이 높음)
const PATTERNS = [
  '/rss/allArticle.xml', '/rss/clickTop.xml', '/rss.xml', '/rss', '/feed', '/feed/',
  '/rss/news.xml', '/rss/all.xml', '/rss/S1N1.xml', '/xml/rss.xml', '/rssfeed',
  '/rss/rssList.xml', '/news/rss', '/rss/allArticle.html', '/atom.xml', '/index.xml',
];

async function fetchRaw(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*' },
    signal: AbortSignal.timeout(TIMEOUT),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const buf = new Uint8Array(await res.arrayBuffer());
  let charset = /charset=([\w-]+)/i.exec(res.headers.get('content-type') || '')?.[1];
  if (!charset) {
    const head = new TextDecoder('latin1').decode(buf.slice(0, 400));
    charset = /encoding\s*=\s*["']([\w-]+)["']/i.exec(head)?.[1];
  }
  let text;
  try { text = new TextDecoder((charset || 'utf-8').toLowerCase()).decode(buf); }
  catch { text = new TextDecoder('utf-8').decode(buf); }
  return { text, finalUrl: res.url };
}

/** RSS 로 쓸 수 있는 주소인지: XML 피드 모양이고 기사가 1건 이상 파싱되어야 통과 */
async function tryFeed(url) {
  const { text } = await fetchRaw(url);
  if (!/<(rss|feed|rdf:RDF)[\s>]/i.test(text.slice(0, 2000))) throw new Error('XML 피드 아님');
  const items = parseFeed(text, new Date());
  if (!items.length) throw new Error('기사 0건');
  if (!items.some((it) => it.link && it.title)) throw new Error('제목/링크 없음');
  return items.length;
}

/** 홈페이지 HTML 에서 rel=alternate 로 선언된 RSS 주소를 뽑는다 */
async function discover(home) {
  const { text, finalUrl } = await fetchRaw(home);
  const out = [];
  const re = /<link\b[^>]*>/gi;
  for (const m of text.matchAll(re)) {
    const tag = m[0];
    if (!/rel\s*=\s*["']?alternate/i.test(tag)) continue;
    if (!/type\s*=\s*["']?application\/(rss|atom)\+xml/i.test(tag)) continue;
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (href) out.push(new URL(href, finalUrl).href);
  }
  // 본문 안에 그대로 노출된 rss 주소도 후보로
  for (const m of text.matchAll(/https?:\/\/[^\s"'<>]*(?:rss|feed)[^\s"'<>]*\.(?:xml|rss)/gi)) {
    out.push(m[0]);
  }
  return [...new Set(out)].slice(0, 8);
}

function slug(home) {
  const h = new URL(home).hostname.replace(/^www\./, '');
  return h.split('.')[0].replace(/[^a-z0-9]/gi, '').toLowerCase();
}

async function probe(outlet) {
  const tried = [];
  const base = outlet.home.replace(/\/$/, '');
  const candidates = PATTERNS.map((p) => base + p);
  for (const url of candidates) {
    try {
      const n = await tryFeed(url);
      return { ...outlet, url, items: n, how: 'pattern', tried };
    } catch (e) { tried.push(`${url} → ${e.message}`); }
  }
  let found = [];
  try { found = await discover(base); }
  catch (e) { tried.push(`홈페이지 탐색 실패 → ${e.message}`); }
  for (const url of found) {
    if (candidates.includes(url)) continue;
    try {
      const n = await tryFeed(url);
      return { ...outlet, url, items: n, how: 'autodiscover', tried };
    } catch (e) { tried.push(`${url} → ${e.message}`); }
  }
  return { ...outlet, url: null, tried };
}

// ---------- 실행 ----------
const raw = await readFile(path.join(root, 'docs', 'outlets100.txt'), 'utf8');
const outlets = raw.split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => {
    const [name, home, type = 'general'] = l.split('|').map((s) => s.trim());
    return { name, home, type, id: slug(home) };
  });

// id 충돌 방지
const used = new Set();
for (const o of outlets) {
  let id = o.id || 'feed';
  let i = 2;
  while (used.has(id)) id = o.id + i++;
  used.add(id);
  o.id = id;
}

console.log(`매체 ${outlets.length}곳 탐색 시작 (동시 ${CONCURRENCY}개)\n`);
const results = [];
let done = 0;
const queue = [...outlets];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const o = queue.shift();
    const r = await probe(o);
    results.push(r);
    done++;
    const tag = r.url ? `OK   ${r.items}건  ${r.url}` : 'NONE RSS 못 찾음';
    console.log(`[${String(done).padStart(3)}/${outlets.length}] ${r.name.padEnd(14)} ${tag}`);
  }
}));

results.sort((a, b) => outlets.indexOf(outlets.find((o) => o.id === a.id)) - outlets.indexOf(outlets.find((o) => o.id === b.id)));
const ok = results.filter((r) => r.url);
const bad = results.filter((r) => !r.url);

await writeFile(path.join(root, 'docs', 'probe-result.json'), JSON.stringify({ probedAt: new Date().toISOString(), ok, bad }, null, 2), 'utf8');
console.log(`\n성공 ${ok.length}곳 / 실패 ${bad.length}곳`);
console.log('실패 목록:');
for (const b of bad) console.log(`  - ${b.name} (${b.home})`);
console.log('\n상세: docs/probe-result.json');
