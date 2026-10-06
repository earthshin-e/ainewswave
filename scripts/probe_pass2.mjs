// 사용법: node scripts/probe_pass2.mjs
// 1차(probe_feeds.mjs)에서 RSS 를 못 찾은 매체만 다시 시도합니다.
// rss.* 서브도메인, 대문자 RSS 경로, feedburner, 매체별 알려진 주소를 추가로 확인합니다.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseFeed } from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'AIInsideBot/1.0 (RSS reader; links back to original publishers)';
const CONCURRENCY = 8;

// 매체별로 알려진 RSS 주소 (호스트가 본 도메인과 다른 곳들)
const KNOWN = {
  'www.etnews.com': ['https://rss.etnews.com/Section901.xml', 'https://rss.etnews.com/Section902.xml'],
  'www.inews24.com': ['https://rss.inews24.com/rss/news_all.xml'],
  'www.mt.co.kr': ['https://rss.mt.co.kr/mt_news.xml', 'https://rss.mt.co.kr/mt_it.xml'],
  'www.sedaily.com': ['https://www.sedaily.com/RSS/S1N1.xml', 'https://www.sedaily.com/RSS/S1N14.xml'],
  'www.fnnews.com': ['https://www.fnnews.com/rss/fn_realnews_all.xml', 'https://www.fnnews.com/rss/r_industry.xml'],
  'www.dt.co.kr': ['https://www.dt.co.kr/rss/rss_all.xml', 'http://rss.dt.co.kr/dt.xml'],
  'biz.chosun.com': ['https://biz.chosun.com/arc/outboundfeeds/rss/?outputType=xml'],
  'www.ajunews.com': ['https://www.ajunews.com/rss/all', 'https://www.ajunews.com/rss/total'],
  'www.newspim.com': ['https://www.newspim.com/rss/all', 'http://rss.newspim.com/newspim_all.xml'],
  'www.newsis.com': ['https://newsis.com/RSS/economy.xml', 'https://newsis.com/RSS/it.xml', 'https://newsis.com/RSS/total.xml'],
  'www.news1.kr': ['https://rss.news1.kr/rss/all.xml', 'https://www.news1.kr/rss/all'],
  'www.joongang.co.kr': ['https://rss.joins.com/joins_it_list.xml', 'https://rss.joins.com/joins_homenews_list.xml'],
  'www.khan.co.kr': ['https://www.khan.co.kr/rss/rssdata/total_news.xml', 'https://www.khan.co.kr/rss/rssdata/it_news.xml'],
  'www.hankookilbo.com': ['https://www.hankookilbo.com/feed/rss/all', 'https://www.hankookilbo.com/rss/all'],
  'www.kmib.co.kr': ['http://rss.kmib.co.kr/data/kmibRssAll.xml', 'https://www.kmib.co.kr/rss/data/kmibRssAll.xml'],
  'www.munhwa.com': ['http://www.munhwa.com/rss/total.xml', 'https://www.munhwa.com/rss/economy.xml'],
  'www.nocutnews.co.kr': ['https://rss.nocutnews.co.kr/nocutnews.xml', 'https://www.nocutnews.co.kr/RSS/nocutnews.xml'],
  'www.ohmynews.com': ['http://rss.ohmynews.com/rss/ohmynews.xml', 'https://rss.ohmynews.com/rss/total.xml'],
  'www.pressian.com': ['https://www.pressian.com/pages/feeds/rss', 'https://www.pressian.com/rss/all'],
  'www.dongascience.com': ['https://www.dongascience.com/rss/rss.xml', 'https://www.dongascience.com/news/rss'],
  'www.sciencetimes.co.kr': ['https://www.sciencetimes.co.kr/?feed=rss2', 'https://www.sciencetimes.co.kr/feed'],
  'www.medicaltimes.com': ['https://www.medicaltimes.com/Rss/RssAll.xml', 'https://www.medicaltimes.com/rss/rss.xml'],
  'www.medigatenews.com': ['https://www.medigatenews.com/rss/allArticle', 'https://www.medigatenews.com/rss/news.xml'],
  'www.biospectator.com': ['https://www.biospectator.com/rss/allArticle.xml', 'https://www.biospectator.com/news/rss'],
  'decenter.kr': ['https://decenter.kr/RSS/S1N1.xml', 'https://www.decenter.kr/RSS/S1N1.xml'],
  'www.gamemeca.com': ['https://www.gamemeca.com/rss/news.xml', 'https://www.gamemeca.com/rss.php'],
  'www.thisisgame.com': ['https://www.thisisgame.com/rss/news.xml', 'https://www.thisisgame.com/webzine/rss/news'],
  'www.inven.co.kr': ['https://feeds.feedburner.com/inven_news', 'https://www.inven.co.kr/webzine/wznews.php?mode=rss'],
  'www.thebell.co.kr': ['https://www.thebell.co.kr/free/content/RSS.asp', 'https://www.thebell.co.kr/rss/allArticle.xml'],
  'www.dailian.co.kr': ['https://www.dailian.co.kr/rss/allArticle', 'https://www.dailian.co.kr/rss/total.xml'],
  'economychosun.com': ['https://economychosun.com/rss/allArticle.xml', 'https://economychosun.com/feed'],
  'www.unipress.co.kr': ['https://www.unipress.co.kr/rss/allArticle.xml'],
  'www.ekn.kr': ['https://www.ekn.kr/rss/allArticle.xml', 'https://www.ekn.kr/rss/S1N1.xml'],
  'www.gyotongn.com': ['https://www.gyotongn.com/rss/allArticle.xml'],
  'www.tech42.co.kr': ['https://www.tech42.co.kr/rss/allArticle.xml', 'https://tech42.co.kr/feed'],
  'kbench.com': ['https://kbench.com/rss', 'https://kbench.com/?q=rss.xml'],
  'www.thegear.co.kr': ['https://www.thegear.co.kr/rss/allArticle.xml', 'https://thegear.net/feed'],
  'www.e4ds.com': ['https://www.e4ds.com/rss/rss_news.asp', 'https://www.e4ds.com/rss.asp'],
};

// 호스트와 무관하게 추가로 시도할 경로
const EXTRA_PATHS = [
  '/RSS/S1N1.xml', '/rss/S1N1.xml', '/rss/total.xml', '/rss/news_all.xml', '/rss/allNews.xml',
  '/rss/rss.xml', '/rss/all', '/rss/total', '/feed?type=rss', '/?feed=rss2',
  '/arc/outboundfeeds/rss/?outputType=xml', '/rss/allArticle', '/news/rss.xml', '/rss/rss2.xml',
];

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(15000), redirect: 'follow',
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const buf = new Uint8Array(await res.arrayBuffer());
  let cs = /charset=([\w-]+)/i.exec(res.headers.get('content-type') || '')?.[1];
  if (!cs) cs = /encoding\s*=\s*["']([\w-]+)["']/i.exec(new TextDecoder('latin1').decode(buf.slice(0, 400)))?.[1];
  try { return new TextDecoder((cs || 'utf-8').toLowerCase()).decode(buf); }
  catch { return new TextDecoder('utf-8').decode(buf); }
}

async function tryFeed(url) {
  const text = await fetchText(url);
  if (!/<(rss|feed|rdf:RDF)[\s>]/i.test(text.slice(0, 2000))) throw new Error('XML 피드 아님');
  const items = parseFeed(text, new Date());
  if (!items.length) throw new Error('기사 0건');
  if (!items.some((it) => it.link && it.title)) throw new Error('제목/링크 없음');
  return items.length;
}

const { bad } = JSON.parse(await readFile(path.join(root, 'docs', 'probe-result.json'), 'utf8'));
console.log(`2차 탐색: ${bad.length}곳\n`);

const found = [];
const still = [];
const queue = [...bad];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const o = queue.shift();
    const host = new URL(o.home).hostname;
    const bare = host.replace(/^www\./, '');
    const base = o.home.replace(/\/$/, '');
    const cands = [
      ...(KNOWN[host] || []),
      ...EXTRA_PATHS.map((p) => base + p),
      ...['/rss/allArticle.xml', '/rss.xml', '/rss', '/feed'].map((p) => `https://rss.${bare}${p}`),
      `https://feeds.feedburner.com/${bare.split('.')[0]}`,
    ];
    let hit = null;
    const tried = [];
    for (const url of cands) {
      try { const n = await tryFeed(url); hit = { url, items: n }; break; }
      catch (e) { tried.push(`${url} → ${e.message}`); }
    }
    if (hit) { found.push({ ...o, ...hit }); console.log(`OK   ${o.name.padEnd(14)} ${hit.items}건  ${hit.url}`); }
    else { still.push({ ...o, tried }); console.log(`NONE ${o.name}`); }
  }
}));

await writeFile(path.join(root, 'docs', 'probe-pass2.json'), JSON.stringify({ found, still }, null, 2), 'utf8');
console.log(`\n2차 성공 ${found.length}곳 / 여전히 실패 ${still.length}곳`);
for (const s of still) console.log(`  - ${s.name} (${s.home})`);
