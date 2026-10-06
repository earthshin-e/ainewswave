// 사용법: node scripts/collect.mjs
// feeds.json 의 RSS 를 읽어 AI 관련 기사만 추려 public/data/articles.json 에 저장합니다.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseFeed, isAiRelated, classify, makeId } from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public', 'data', 'articles.json');
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

// 이전 결과 유지 (샘플 데이터는 버림)
const byId = new Map();
for (const a of prev.articles || []) {
  if (a.sample) continue;
  if (new Date(a.published).getTime() >= cutoff) byId.set(a.id, a);
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
    if (f.type !== 'ai' && !isAiRelated(it.title, it.summary)) continue;
    const id = makeId(it.link);
    const old = byId.get(id);
    byId.set(id, {
      id,
      title: it.title,
      link: it.link,
      source: f.name,
      sourceId: f.id,
      published: old?.published ?? it.published,
      summary: it.summary,
      image: it.image || old?.image || '',
      category: classify(it.title, it.summary),
    });
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

await mkdir(path.dirname(OUT), { recursive: true });
const json = JSON.stringify({ updatedAt: now.toISOString(), sources, status, articles });
await writeFile(OUT, json, 'utf8');

const failed = status.filter((s) => !s.ok);
if (failed.length) {
  console.log(`\n실패 ${failed.length}곳 (주소 확인 필요):`);
  for (const f of failed) console.log(`  - ${f.name}: ${f.error}`);
}
const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`\n저장 완료: 기사 ${articles.length}건, 매체 ${sources.length}곳 (피드 성공 ${okCount}/${feeds.length})`);
console.log(`수집 소요 ${secs}초, 동시 요청 ${CONCURRENCY}개, articles.json ${(json.length / 1024).toFixed(0)}KB`);
