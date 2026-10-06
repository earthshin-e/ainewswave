// 뉴스웨이브 정리 기사와 오늘의 AI 브리핑을 Claude API 로 자동 작성합니다.
// 사용법: ANTHROPIC_API_KEY=... node scripts/write.mjs  (키가 없으면 아무것도 하지 않고 끝냅니다)
//
// - 정리 기사: 최근 48시간 기사 중 서로 다른 매체 MIN_OUTLETS 곳 이상이 함께 보도한 소식을 묶어,
//   각 매체 RSS 의 제목과 요약에 나온 사실만으로 새 글을 씁니다. 한 번 실행에 최대 MAX_PER_RUN 건.
// - 오늘의 AI 브리핑: 한국 시간 BRIEFING_HOUR 시 이후 첫 실행에서 그날 주요 소식을 묶어 하루 한 건 씁니다.
// 외부 패키지 없이 fetch 로 Messages API 를 직접 부릅니다(저장소 원칙: 외부 패키지 없음).
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTICLES = path.join(root, 'public', 'data', 'articles.json');
const STORIES = path.join(root, 'public', 'data', 'stories.json');
const PREV_STORIES = path.join(root, 'public', 'data', 'stories.prev.json'); // Actions 가 직전 배포본을 여기로 받습니다

const MODEL = 'claude-opus-5-5';
const MIN_OUTLETS = 2;
const MAX_PER_RUN = 6;
const BRIEFING_HOUR = 18; // KST
const KEEP_DAYS = 60; // 정리 기사 보관 기간
const CATEGORIES = ['생성형AI', '반도체', '로봇', '정책', '기업', '연구', '보안/윤리', '일반'];

const key = process.env.ANTHROPIC_API_KEY;
const readJson = async (f, d) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return d; } };

// 저장소의 stories.json(손으로 쓴 글)과 직전 배포본(자동으로 쓴 글)을 합칩니다.
const local = await readJson(STORIES, { stories: [] });
const prev = await readJson(PREV_STORIES, { stories: [] });
const byId = new Map();
for (const s of [...(prev.stories || []), ...(local.stories || [])]) byId.set(s.id, s);
const keepFrom = Date.now() - KEEP_DAYS * 86400000;
let stories = [...byId.values()].filter((s) => new Date(s.published).getTime() >= keepFrom);
const save = () => writeFile(STORIES, JSON.stringify({ note: local.note, stories: stories.sort((a, b) => new Date(b.published) - new Date(a.published)) }, null, 2) + '\n');

if (!key) {
  await save();
  console.log('ANTHROPIC_API_KEY 가 없어 자동 작성을 건너뜁니다. (기존 정리 기사만 합쳐서 저장)');
  process.exit(0);
}

const { articles = [] } = await readJson(ARTICLES, {});

// ---------- 같은 소식 묶기 (public/app.js 의 전광판과 같은 규칙) ----------
const grams = (t) => {
  const s = t.replace(/\[[^\]]*\]|[^0-9A-Za-z가-힣]/g, '').toLowerCase();
  const g = new Set();
  for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2));
  return g;
};
const similarity = (a, b) => {
  if (a.size < 6 || b.size < 6) return 0;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / Math.min(a.size, b.size);
};
const since = Date.now() - 48 * 3600000;
const recent = articles.filter((a) => new Date(a.published).getTime() >= since);
const G = new Map(recent.map((a) => [a.id, grams(a.title)]));
const used = new Set();
const groups = [];
for (const a of recent) {
  if (used.has(a.id)) continue;
  const members = [a];
  for (const b of recent) if (b !== a && !used.has(b.id) && similarity(G.get(a.id), G.get(b.id)) >= 0.45) members.push(b);
  members.forEach((m) => used.add(m.id));
  const outlets = new Set(members.map((m) => m.sourceId)).size;
  if (outlets >= MIN_OUTLETS) groups.push({ members, outlets });
}
groups.sort((p, q) => q.outlets - p.outlets);

// ---------- Claude API ----------
async function ask(system, user, schema) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      // 안전 분류기가 거절하면 서버가 다른 모델로 다시 시도합니다.
      'anthropic-beta': 'server-side-fallback-2026-07-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${data?.error?.message || ''}`);
  if (data.stop_reason === 'refusal') throw new Error('refusal');
  if (data.stop_reason === 'max_tokens') throw new Error('max_tokens');
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(text);
}

const RULES = `당신은 AI 산업 뉴스 사이트 "AI 뉴스웨이브"의 편집자입니다.
- 주어진 여러 매체의 기사 제목과 요약에 나온 사실만 씁니다. 자료에 없는 수치, 인용, 배경, 전망은 지어내지 않습니다.
- 어느 한 매체의 문장이나 구성을 따라 쓰지 말고, 사실을 모아 새 문장으로 씁니다. 직접 인용은 짧게 한 번까지만 씁니다.
- 매체마다 수치나 표현이 다르면 둘 다 적고 차이를 밝힙니다.
- 한국어 기사체(~했다)로 씁니다. 줄표(—, –)와 가운뎃점(·)은 쓰지 않습니다.
- 제목은 50자 안쪽, 핵심 요약은 3개이고 각 40자 안쪽의 명사형 문장입니다.`;

const material = (members) => members.map((m, i) =>
  `[${i + 1}] 매체: ${m.source}\n제목: ${m.title}\n요약: ${m.summary || '(요약 없음)'}\n발행: ${m.published}`).join('\n\n');

const STORY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'category', 'points', 'body'],
  properties: {
    title: { type: 'string' },
    category: { type: 'string', enum: CATEGORIES },
    points: { type: 'array', items: { type: 'string' } },
    body: { type: 'array', items: { type: 'string' } },
  },
};

const covered = new Set(stories.flatMap((s) => (s.sources || []).map((x) => x.id)));
const kst = (d = new Date()) => new Date(d.getTime() + 9 * 3600000);
const ymd = (d) => kst(d).toISOString().slice(0, 10).replace(/-/g, '');
let made = 0;

for (const g of groups) {
  if (made >= MAX_PER_RUN) break;
  if (g.members.some((m) => covered.has(m.id))) continue;
  const lead = g.members[0];
  try {
    const out = await ask(RULES,
      `아래 ${g.outlets}개 매체의 보도를 종합해 정리 기사를 써 주세요. 본문은 2~4문단입니다.\n\n${material(g.members)}`,
      STORY_SCHEMA);
    if (!out.title || !Array.isArray(out.body) || !out.body.length) throw new Error('빈 응답');
    stories.push({
      id: `s${ymd(new Date())}-${lead.id}`,
      title: out.title.trim(),
      category: CATEGORIES.includes(out.category) ? out.category : lead.category,
      published: g.members.map((m) => m.published).sort().at(-1),
      points: (out.points || []).slice(0, 3),
      body: out.body,
      sources: g.members.map((m) => ({ id: m.id, name: m.source, title: m.title, link: m.link })),
      auto: true,
    });
    g.members.forEach((m) => covered.add(m.id));
    made++;
    console.log(`정리 기사: ${out.title} (${g.outlets}곳)`);
  } catch (e) {
    console.warn(`정리 기사 실패 (${lead.title}): ${e.message}`);
  }
}

// ---------- 오늘의 AI 브리핑 ----------
const now = kst();
const today = now.toISOString().slice(0, 10);
const briefId = `b${today.replace(/-/g, '')}`;
if (now.getUTCHours() >= BRIEFING_HOUR && !stories.some((s) => s.id === briefId)) {
  const dayStart = new Date(`${today}T00:00:00+09:00`).getTime();
  const todays = groups.filter((g) => g.members.some((m) => new Date(m.published).getTime() >= dayStart)).slice(0, 10);
  if (todays.length >= 3) {
    const BRIEF_SCHEMA = {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'points', 'body'],
      properties: { title: { type: 'string' }, points: { type: 'array', items: { type: 'string' } }, body: { type: 'array', items: { type: 'string' } } },
    };
    try {
      const out = await ask(RULES,
        `오늘(${today}) AI 업계 주요 소식 ${todays.length}건입니다. "오늘의 AI 브리핑"을 써 주세요.\n` +
        `제목은 "${today.slice(5).replace('-', '월 ')}일 AI 브리핑: " 뒤에 오늘의 핵심을 붙입니다. 핵심 요약 3개는 오늘 가장 중요한 흐름입니다.\n` +
        `본문은 소식마다 한 문단(2~3문장)으로, 중요한 순서대로 씁니다.\n\n` +
        todays.map((g, i) => `## 소식 ${i + 1} (${g.outlets}개 매체)\n${material(g.members.slice(0, 4))}`).join('\n\n'),
        BRIEF_SCHEMA);
      stories.push({
        id: briefId,
        type: 'briefing',
        title: out.title.trim(),
        category: '일반',
        published: new Date().toISOString(),
        points: (out.points || []).slice(0, 3),
        body: out.body,
        sources: todays.flatMap((g) => g.members.slice(0, 4)).map((m) => ({ id: m.id, name: m.source, title: m.title, link: m.link })),
        auto: true,
      });
      console.log(`브리핑: ${out.title}`);
    } catch (e) {
      console.warn(`브리핑 실패: ${e.message}`);
    }
  }
}

await save();
console.log(`정리 기사 새로 ${made}건, 전체 ${stories.length}건`);
