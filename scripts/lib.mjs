// RSS/Atom 파싱, AI 키워드 필터, 주제 분류. 외부 패키지 없이 Node 20+ 에서 동작합니다.
import { createHash } from 'node:crypto';

export const TOPICS = ['생성형AI', '반도체', '로봇', '정책', '기업', '연구', '보안/윤리', '일반'];

const AI_LATIN_CS = /(?<![A-Za-z])(AI|A\.I\.|AGI|LLM|sLLM|GPU|NPU|HBM)(?![A-Za-z])/;
const AI_LATIN_CI = /(?<![A-Za-z])(ChatGPT|GPT|OpenAI|Anthropic|Claude|Gemini|Copilot|Llama|Sora|DeepSeek|Nvidia|Perplexity)(?![A-Za-z])/i;
const AI_KO = /인공지능|생성형|챗GPT|챗지피티|오픈AI|딥러닝|머신러닝|거대언어모델|대규모언어모델|언어모델|엔비디아|제미나이|클로드|딥시크|에이전트|파운데이션 ?모델|온디바이스|휴머노이드|로보틱스|딥페이크|하이퍼클로바|피지컬 ?AI/;

const g = (re) => new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
const ALL = [g(AI_LATIN_CS), g(AI_LATIN_CI), g(AI_KO)];

/** 서로 다른 AI 키워드가 몇 종류 나오는지 센다 */
export function aiHits(text) {
  const found = new Set();
  for (const re of ALL) for (const m of text.matchAll(re)) found.add(m[0].toLowerCase());
  return found.size;
}

/** general 매체용: 제목에 AI 키워드가 있거나, 요약에 둘 이상 종류의 키워드가 있으면 통과 */
export function isAiRelated(title, summary) {
  if (aiHits(title) > 0) return true;
  return aiHits(summary) >= 2;
}

const RULES = [
  ['반도체', /반도체|HBM|GPU|NPU|엔비디아|Nvidia|파운드리|데이터센터|메모리|SK하이닉스|TSMC|칩|AI ?인프라/i],
  ['로봇', /로봇|휴머노이드|자율주행|드론|로보틱스|피지컬 ?AI/],
  ['정책', /정부|과기정통부|과학기술정보통신부|규제|법안|기본법|정책|국회|위원회|국가AI|공공|지원사업|EU|백악관|청와대/],
  ['보안/윤리', /보안|해킹|딥페이크|개인정보|사이버|악용|저작권|윤리|편향|사기|피싱/],
  ['생성형AI', /생성형|챗GPT|ChatGPT|GPT|오픈AI|OpenAI|클로드|Claude|제미나이|Gemini|LLM|언어모델|에이전트|딥시크|DeepSeek|라마|Llama|코파일럿|Copilot|하이퍼클로바|Sora|이미지 ?생성|AI 모델|Anthropic/i],
  ['연구', /연구|논문|카이스트|KAIST|서울대|대학|학회|벤치마크|알고리즘|개발했다|연구팀/],
  ['기업', /투자|인수|스타트업|매출|실적|출시|협약|MOU|제휴|계약|상장|IPO|유니콘|공개했다|선보|도입/],
];

export function classify(title, summary) {
  let best = '일반';
  let bestScore = 0;
  for (const [name, re] of RULES) {
    let s = 0;
    if (re.test(title)) s += 2;
    if (re.test(summary)) s += 1;
    if (s > bestScore) { best = name; bestScore = s; }
  }
  return best;
}

// ---------- 텍스트 유틸 ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', hellip: '…', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’' };
export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return String.fromCodePoint(code); } catch { return m; }
    }
    return ENT[e.toLowerCase()] ?? m;
  });
}
const unCdata = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
export function toText(s) {
  if (!s) return '';
  let t = decodeEntities(unCdata(s));
  t = t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
  t = decodeEntities(t).replace(/\s+/g, ' ').trim();
  return t;
}
export function clip(s, n) {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
}

function firstTag(block, names) {
  for (const n of names) {
    const m = new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, 'i').exec(block);
    if (m && m[1].trim()) return m[1];
  }
  return '';
}
function attr(tagSrc, name) {
  const m = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i').exec(tagSrc);
  return m ? decodeEntities(m[1]) : '';
}

export function normalizeUrl(u) {
  try {
    const x = new URL(u.trim());
    x.hash = '';
    for (const k of [...x.searchParams.keys()]) if (/^(utm_|fbclid|gclid|ref$|from$)/i.test(k)) x.searchParams.delete(k);
    let s = x.toString();
    if (s.endsWith('/') && x.pathname !== '/') s = s.slice(0, -1);
    return s;
  } catch { return ''; }
}
export const makeId = (url) => createHash('sha1').update(url).digest('hex').slice(0, 12);

function parseDate(raw, now) {
  let s = (raw || '').trim();
  if (!s) return now;
  // 시간대 표기가 없는 한국 매체 날짜는 KST 로 해석
  if (/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d(:\d\d)?$/.test(s)) s = s.replace(' ', 'T') + '+09:00';
  const d = new Date(s);
  if (isNaN(d)) return now;
  return d > now ? now : d;
}

function pickImage(block, rawDesc, base) {
  let src = '';
  const mc = /<media:(?:content|thumbnail)\b[^>]*>/i.exec(block);
  if (mc) src = attr(mc[0], 'url');
  if (!src) {
    const enc = /<enclosure\b[^>]*>/i.exec(block);
    if (enc && /image/i.test(attr(enc[0], 'type') || 'image')) src = attr(enc[0], 'url');
  }
  if (!src) {
    const img = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i.exec(decodeEntities(unCdata(rawDesc || '')));
    if (img) src = img[1];
  }
  if (!src) return '';
  try {
    const u = new URL(decodeEntities(src), base);
    if (!/^https?:$/.test(u.protocol)) return '';
    u.protocol = 'https:';
    return u.toString();
  } catch { return ''; }
}

/** RSS 2.0 / RDF / Atom 문자열을 [{title, link, published, summary, image}] 로 변환 */
export function parseFeed(xml, now = new Date()) {
  const items = [];
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  for (const b of blocks) {
    const title = toText(firstTag(b, ['title']));
    let link = toText(firstTag(b, ['link']));
    if (!link) {
      const links = b.match(/<link\b[^>]*>/gi) || [];
      const alt = links.find((l) => !/rel\s*=\s*["'](?!alternate)/i.test(l)) || links[0];
      if (alt) link = attr(alt, 'href');
    }
    if (!link) link = toText(firstTag(b, ['guid', 'id']));
    link = normalizeUrl(link);
    if (!title || !link || !/^https?:/.test(link)) continue;
    const rawDesc = firstTag(b, ['description', 'summary', 'content:encoded', 'content']);
    const summary = clip(toText(rawDesc || firstTag(b, ['content:encoded'])), 160);
    const date = parseDate(toText(firstTag(b, ['pubDate', 'dc:date', 'published', 'updated'])), now);
    const image = pickImage(b, firstTag(b, ['content:encoded']) || rawDesc, link);
    items.push({ title: clip(title, 140), link, published: date.toISOString(), summary, image });
  }
  return items;
}
