// 사용법: node scripts/build_feeds.mjs
// probe 결과(docs/probe-result.json, docs/probe-pass2.json)에서 응답이 확인된 RSS만 모아
// feeds.json 을 다시 씁니다. 기존 18개 매체의 id 는 그대로 유지해 누적된 기사가 끊기지 않게 합니다.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 이미 배포 중인 매체의 id (articles.json 의 sourceId 와 맞춰야 한다)
const KEEP_ID = {
  'www.aitimes.com': 'aitimes',
  'www.aitimes.kr': 'aitimeskr',
  'www.etnews.com': 'etnews',
  'zdnet.co.kr': 'zdnet',
  'www.bloter.net': 'bloter',
  'www.ddaily.co.kr': 'ddaily',
  'www.irobotnews.com': 'irobot',
  'www.digitaltoday.co.kr': 'digitaltoday',
  'www.techm.kr': 'techm',
  'byline.network': 'byline',
  'www.venturesquare.net': 'venturesquare',
  'platum.kr': 'platum',
  'www.hankyung.com': 'hankyungit',
  'www.inews24.com': 'inews24',
  'news.hada.io': 'geeknews',
  'www.hani.co.kr': 'hanisci',
  'it.chosun.com': 'itchosun',
  'www.boannews.com': 'boannews',
};

// 도메인 맨 앞 라벨이 이런 값이면 식별에 쓸모가 없으므로 다음 라벨을 쓴다
const WEAK = new Set(['www', 'it', 'biz', 'news', 'rss', 'm', 'economist']);

function makeId(home) {
  if (KEEP_ID[new URL(home).hostname]) return KEEP_ID[new URL(home).hostname];
  const labels = new URL(home).hostname.split('.').filter((l) => l !== 'www');
  let pick = labels.find((l) => !WEAK.has(l) && !['co', 'kr', 'com', 'net', 'org', 'io'].includes(l));
  if (!pick) pick = labels[0];
  return pick.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

const outletsRaw = await readFile(path.join(root, 'docs', 'outlets100.txt'), 'utf8');
const typeOf = new Map();
const order = [];
for (const line of outletsRaw.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const [name, home, type = 'general'] = t.split('|').map((s) => s.trim());
  typeOf.set(name, { home, type });
  order.push(name);
}

const p1 = JSON.parse(await readFile(path.join(root, 'docs', 'probe-result.json'), 'utf8'));
const p2 = JSON.parse(await readFile(path.join(root, 'docs', 'probe-pass2.json'), 'utf8'));
const working = [...p1.ok, ...p2.found];

const byName = new Map();
for (const w of working) if (!byName.has(w.name)) byName.set(w.name, w);

const used = new Set();
const feeds = [];
for (const name of order) {
  const w = byName.get(name);
  if (!w) continue;
  const meta = typeOf.get(name);
  let id = makeId(meta.home);
  let n = 2;
  const base = id;
  while (used.has(id)) id = base + n++;
  used.add(id);
  feeds.push({ id, name, url: w.url, type: meta.type, home: meta.home });
}

const missing = order.filter((n) => !byName.has(n));

const out = {
  _comment: 'type ai = AI 전문 매체(필터 없이 전부 수집), general = 일반 IT/경제 매체(AI 키워드 필터 적용). 수집 실패한 피드는 건너뛰고 로그에 남습니다. 주소가 바뀐 매체는 url만 고치면 됩니다. 후보 매체 전체 목록은 docs/outlets100.txt, RSS 미제공 매체는 docs/no-rss.md 를 보세요.',
  feeds,
};
await writeFile(path.join(root, 'feeds.json'), JSON.stringify(out, null, 2).replace(/\n {6}/g, ' ').replace(/\n {4}\}/g, ' }'), 'utf8');

console.log(`feeds.json 작성: ${feeds.length}곳 (ai ${feeds.filter((f) => f.type === 'ai').length}, general ${feeds.filter((f) => f.type === 'general').length})`);
console.log(`RSS 미확보: ${missing.length}곳`);
for (const m of missing) console.log('  - ' + m);
// 기존 18곳이 전부 살아 있는지 확인
const keptIds = new Set(feeds.map((f) => f.id));
const lost = Object.values(KEEP_ID).filter((id) => !keptIds.has(id));
console.log(lost.length ? `경고: 기존 매체 누락 → ${lost.join(', ')}` : '기존 18곳 id 모두 유지됨');
