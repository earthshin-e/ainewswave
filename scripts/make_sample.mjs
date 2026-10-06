// 화면 확인용 샘플 데이터 생성: node scripts/make_sample.mjs
// 실제 기사가 아니며 sample:true 표시가 붙습니다. collect.mjs 가 처음 실행되면 모두 사라집니다.
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { makeId } from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = [
  ['aitimes', 'AI타임스', 'https://www.aitimes.com'],
  ['etnews', '전자신문', 'https://www.etnews.com'],
  ['zdnet', '지디넷코리아', 'https://zdnet.co.kr'],
  ['bloter', '블로터', 'https://www.bloter.net'],
  ['irobot', '로봇신문', 'https://www.irobotnews.com'],
  ['byline', '바이라인네트워크', 'https://byline.network'],
  ['dongascience', '동아사이언스', 'https://www.dongascience.com'],
  ['boannews', '보안뉴스', 'https://www.boannews.com'],
];
const T = [
  ['생성형AI', '생성형 AI 서비스 이용자가 빠르게 늘고 있다는 조사 결과', '업무와 학습에 AI 도구를 쓰는 비중이 높아졌다는 내용을 담은 샘플 문장입니다.'],
  ['생성형AI', '거대언어모델 새 버전 공개, 추론 성능과 가격이 함께 개선', '모델 성능 비교와 가격 정책 변화를 요약한 샘플 문장입니다.'],
  ['반도체', 'AI 반도체 수요 확대로 HBM 공급 경쟁 가속', '데이터센터 투자와 메모리 공급망 동향을 다룬 샘플 문장입니다.'],
  ['반도체', '국산 NPU 스타트업, 양산 일정과 고객사 확보 현황 공개', '국내 AI 반도체 기업의 사업 계획을 정리한 샘플 문장입니다.'],
  ['로봇', '휴머노이드 로봇 현장 시범 도입, 물류 센터에서 첫 성과', '제조와 물류 현장에 로봇을 적용한 사례를 소개하는 샘플 문장입니다.'],
  ['로봇', '자율주행 서비스 지역 확대, 안전 기준 논의 본격화', '도심 자율주행 시범 지구 확대 소식을 담은 샘플 문장입니다.'],
  ['정책', 'AI 기본법 시행령 초안 공개, 업계 의견 수렴 시작', '규제와 진흥 방안의 핵심 쟁점을 정리한 샘플 문장입니다.'],
  ['정책', '정부, 공공 부문 AI 도입 가이드라인 개정안 발표', '공공기관의 생성형 AI 활용 기준을 소개하는 샘플 문장입니다.'],
  ['기업', '국내 AI 스타트업 시리즈 B 투자 유치, 기업용 에이전트 확장', '투자 규모와 향후 계획을 소개하는 샘플 문장입니다.'],
  ['기업', '대기업, 사내 업무용 AI 에이전트 전사 도입', '업무 자동화 적용 범위와 기대 효과를 다룬 샘플 문장입니다.'],
  ['연구', '국내 연구팀, 경량 언어모델 학습 효율 높이는 알고리즘 제안', '연구 방법과 실험 결과를 요약한 샘플 문장입니다.'],
  ['연구', 'AI 신약 후보물질 탐색 시간 단축, 대학 공동 연구 성과', '바이오 분야 AI 활용 연구를 소개하는 샘플 문장입니다.'],
  ['보안/윤리', '딥페이크 악용 사례 증가, 탐지 기술과 제도 보완 필요', '피해 현황과 대응 방안을 정리한 샘플 문장입니다.'],
  ['보안/윤리', 'AI 학습 데이터 저작권 논쟁, 가이드라인 마련 움직임', '창작자와 개발사의 입장 차이를 다룬 샘플 문장입니다.'],
  ['일반', '올해 AI 업계 키워드 정리, 에이전트와 온디바이스 AI', '한 해의 흐름을 짚어 보는 샘플 문장입니다.'],
];
const now = Date.now();
const articles = [];
for (let i = 0; i < 42; i++) {
  const [cat, title, summary] = T[i % T.length];
  const [sid, sname, home] = S[(i * 3 + (i >> 2)) % S.length];
  const link = `${home}/#sample${i}`;
  articles.push({
    id: makeId(link), title: `[샘플] ${title}`, link: home, source: sname, sourceId: sid,
    published: new Date(now - (i * 47 + 8) * 60000).toISOString(), summary, image: '', category: cat, sample: true,
  });
}
const counts = {};
for (const a of articles) counts[a.sourceId] = (counts[a.sourceId] || 0) + 1;
const sources = S.filter((s) => counts[s[0]]).map((s) => ({ id: s[0], name: s[1], home: s[2], count: counts[s[0]] }));
const out = path.join(root, 'public', 'data', 'articles.json');
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, JSON.stringify({ updatedAt: new Date().toISOString(), sources, status: [], articles }), 'utf8');
console.log('샘플 기사', articles.length, '건 생성');
