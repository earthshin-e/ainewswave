// 운영 상태 점검: 문제가 있으면 한 줄씩 출력합니다. 워크플로가 출력이 있으면 GitHub 이슈를 엽니다(메일 알림).
// 사용법: node scripts/health.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async (f) => { try { return JSON.parse(await readFile(path.join(root, f), 'utf8')); } catch { return null; } };
const problems = [];
const now = Date.now();
const kstHour = new Date(now + 9 * 3600000).getUTCHours();

const art = await read('public/data/articles.json');
if (!art) problems.push('articles.json 을 읽지 못했습니다.');
else {
  const failed = (art.status || []).filter((s) => !s.ok);
  const total = (art.status || []).length;
  if (total && failed.length / total > 0.3) problems.push(`피드 ${total}곳 중 ${failed.length}곳 수집 실패: ${failed.slice(0, 10).map((f) => f.name).join(', ')}`);
  const newest = Math.max(...(art.articles || []).map((a) => new Date(a.published).getTime()), 0);
  if (now - newest > 12 * 3600000) problems.push(`가장 최근 기사가 ${Math.round((now - newest) / 3600000)}시간 전입니다. 수집이 멈췄을 수 있습니다.`);
}

// 매일 18:30(한국 시간) 예약 작업이 쓰는 정리 기사가 끊기지 않았는지 봅니다. 저녁 9시 이후에만 확인합니다.
const st = await read('public/data/stories.json');
const autos = (st?.stories || []).filter((s) => s.auto);
if (autos.length && kstHour >= 21) {
  const last = Math.max(...autos.map((s) => new Date(s.published).getTime()));
  const briefToday = (st.stories || []).some((s) => s.id === `b${new Date(now + 9 * 3600000).toISOString().slice(0, 10).replace(/-/g, '')}`);
  if (!briefToday && now - last > 30 * 3600000) problems.push('오늘 AI 브리핑이 없고 최근 30시간 동안 새 정리 기사도 없습니다. 예약 작업(https://claude.ai/code/routines/trig_015PWzXq9y6NnXmAjTWuGsXH)을 확인하세요.');
}

for (const p of problems) console.log(`- ${p}`);
