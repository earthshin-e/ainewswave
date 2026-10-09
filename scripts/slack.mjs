// Slack 운영 로그: 배포 때마다 새 정리 기사와 브리핑, 하루 요약, 점검 경고를 Slack 채널로 보냅니다.
// 사용법: SLACK_WEBHOOK_URL=... node scripts/slack.mjs [--warn "경고 문구"] [--text "그대로 보낼 문구"]
// SLACK_WEBHOOK_URL(Incoming Webhook)이 없으면 아무것도 하지 않습니다. 보낼 내용이 없으면 보내지 않습니다.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hook = process.env.SLACK_WEBHOOK_URL;
if (!hook) process.exit(0);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async (f) => { try { return JSON.parse(await readFile(path.join(root, f), 'utf8')); } catch { return null; } };
const SITE = 'https://ainewswave.com';
const args = process.argv.slice(2);
const argOf = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

// 모든 메시지 맨 앞에 한국 시간 날짜와 시각을 한 번 적습니다(예: 10/10 09:00).
const stamp = () => {
  const d = new Date(Date.now() + 9 * 3600000);
  const p2 = (n) => String(n).padStart(2, '0');
  return `${p2(d.getUTCMonth() + 1)}/${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
};

async function post(body) {
  const text = `*${stamp()}*\n${body}`;
  const res = await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, unfurl_links: false }) });
  if (!res.ok) console.warn(`Slack 전송 실패 HTTP ${res.status}`);
}

const lines = [];
if (argOf('--text')) lines.push(argOf('--text'));
if (argOf('--warn')) lines.push(`:warning: *운영 점검 경고*\n${argOf('--warn')}`);

// --warn, --text 로 부른 경우(점검 경고 등)에는 그 문구만 보냅니다.
const only = argOf('--warn') || argOf('--text');

// 1. 새로 올라간 정리 기사와 브리핑 (직전 배포본과 비교)
const now = await read('public/data/stories.json');
const prev = await read('public/data/stories.prev.json');
if (!only && now && prev) {
  const before = new Set((prev.stories || []).map((s) => s.id));
  const added = (now.stories || []).filter((s) => !before.has(s.id));
  // 글마다 메시지 한 건: 글 제목에 사이트 글 주소를 하이퍼링크로 겁니다.
  for (const st of added) {
    const tag = st.type === 'briefing' ? ':sunrise: AI 브리핑' : `:newspaper: 정리 기사 | ${st.category}`;
    await post(`${tag}\n*<${SITE}/recap/${st.id}.html|${st.title}>*\n${st.sources.length}개 매체 보도 종합`);
  }
  if (added.length) console.log(`Slack: 새 글 ${added.length}건 전송`);
}

// 2. 하루 요약: 한국 시간 오전 9시대 첫 수집에서 한 번
const kst = new Date(Date.now() + 9 * 3600000);
if (!only && kst.getUTCHours() === 9 && kst.getUTCMinutes() < 30) {
  const art = await read('public/data/articles.json');
  if (art) {
    const day = 24 * 3600000;
    const a = art.articles || [];
    const last24 = a.filter((x) => Date.now() - new Date(x.published) < day);
    const noImg = a.filter((x) => !x.image && !x.photo).length;
    const failed = (art.status || []).filter((s) => !s.ok).map((s) => s.name);
    const stories = (now?.stories || []).filter((s) => Date.now() - new Date(s.published) < day);
    lines.push(`:bar_chart: *하루 요약 (${kst.toISOString().slice(0, 10)})*\n` +
      `• 최근 24시간 수집 기사 ${last24.length}건 (보관 ${a.length}건)\n` +
      `• 최근 24시간 정리 기사와 브리핑 ${stories.length}건 (전체 ${(now?.stories || []).length}건)\n` +
      `• 키워드 상위 5: ${(art.keywords || []).slice(0, 5).map((k) => k.label).join(', ')}\n` +
      `• 이미지 없는 기사 ${noImg}건\n` +
      `• 수집 실패 매체 ${failed.length}곳${failed.length ? `: ${failed.slice(0, 8).join(', ')}` : ''}\n` +
      `<${SITE}|사이트 열기> | <${SITE}/recap/|정리 기사>`);
  }
}

if (lines.length) await post(lines.join('\n\n'));
console.log(`Slack: ${lines.length ? `${lines.length}개 항목 전송` : '보낼 내용 없음'}`);
