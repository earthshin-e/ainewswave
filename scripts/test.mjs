// 사용법: node scripts/test.mjs  (네트워크 없이 파서와 분류기를 검사합니다)
import assert from 'node:assert/strict';
import { parseFeed, isAiRelated, classify, normalizeUrl } from './lib.mjs';

const now = new Date('2026-10-06T03:00:00Z');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
<channel><title>테스트</title>
<item>
  <title><![CDATA[삼성전자, HBM4 양산 &amp; AI 반도체 투자 확대]]></title>
  <link>https://example.com/news/1?utm_source=rss&amp;id=1</link>
  <description><![CDATA[<p>엔비디아 GPU 수요가 늘며 <b>HBM</b> 공급이 부족하다.</p><img src="http://img.example.com/a.jpg">]]></description>
  <pubDate>Tue, 06 Oct 2026 10:30:00 +0900</pubDate>
</item>
<item>
  <title>봄맞이 벚꽃 축제 개막</title>
  <link>https://example.com/news/2</link>
  <description>전국 곳곳에서 꽃놀이 인파</description>
  <dc:date>2026-10-06 11:00:00</dc:date>
</item>
<item>
  <title>정부, AI 기본법 시행령 초안 공개</title>
  <link>https://example.com/news/3/</link>
  <description>&lt;p&gt;규제 &amp;amp; 진흥 방안&lt;/p&gt;</description>
  <media:content url="//cdn.example.com/p.png" medium="image"/>
  <pubDate>Wed, 01 Jan 2031 00:00:00 GMT</pubDate>
</item>
</channel></rss>`;

const items = parseFeed(rss, now);
assert.equal(items.length, 3);
assert.equal(items[0].title, '삼성전자, HBM4 양산 & AI 반도체 투자 확대');
assert.equal(items[0].link, 'https://example.com/news/1?id=1', 'utm 파라미터 제거');
assert.equal(items[0].image, 'https://img.example.com/a.jpg', 'http 이미지는 https 로 승격');
assert.ok(!/<|&lt;/.test(items[0].summary), '요약에서 태그 제거');
assert.equal(items[1].published, '2026-10-06T02:00:00.000Z', '시간대 없는 날짜는 KST 로 해석');
assert.equal(items[2].link, 'https://example.com/news/3', '끝 슬래시 제거');
assert.equal(items[2].published, now.toISOString(), '미래 날짜는 현재로 보정');
assert.equal(items[2].image, 'https://cdn.example.com/p.png');
assert.equal(items[2].summary, '규제 & 진흥 방안');

const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Claude 새 모델 출시</title>
<link rel="alternate" href="https://blog.example.com/p/1"/><updated>2026-10-05T12:00:00Z</updated><summary>요약</summary></entry></feed>`;
const a = parseFeed(atom, now);
assert.equal(a.length, 1);
assert.equal(a[0].link, 'https://blog.example.com/p/1');

// 필터
assert.equal(isAiRelated('벚꽃 축제 개막', '꽃놀이 인파'), false);
assert.equal(isAiRelated('AI 기본법 공개', ''), true);
assert.equal(isAiRelated('MAIN 서비스 개편', ''), false, '단어 일부로 들어간 AI 는 제외');
assert.equal(isAiRelated('게임 업계 소식', '엔비디아와 생성형 기술을 활용'), true, '요약에 키워드 2종');
assert.equal(isAiRelated('신제품 발표', '제미나이 연동'), false, '요약에 키워드 1종만 있으면 제외');

// 분류
assert.equal(classify('HBM4 양산 돌입', ''), '반도체');
assert.equal(classify('휴머노이드 로봇 시범 도입', ''), '로봇');
assert.equal(classify('AI 기본법 시행령 공개', ''), '정책');
assert.equal(classify('딥페이크 악용 급증', ''), '보안/윤리');
assert.equal(classify('오픈AI, 새 GPT 모델 공개', ''), '생성형AI');
assert.equal(classify('오늘의 날씨', ''), '일반');

assert.equal(normalizeUrl('https://a.com/x/?fbclid=1#top'), 'https://a.com/x');
console.log('모든 테스트 통과');
