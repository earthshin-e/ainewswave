# RSS 를 확보하지 못한 매체 19곳

`docs/outlets100.txt` 의 후보 100곳 가운데 81곳은 RSS 응답을 확인해 `feeds.json` 에 등록했습니다.
남은 19곳은 아래와 같은 이유로 등록하지 않았습니다. 확인 방법은 `node scripts/probe_feeds.mjs` 와
`node scripts/probe_pass2.mjs` 이며, 시도한 주소와 응답은 `docs/probe-result.json`,
`docs/probe-pass2.json` 에 그대로 남아 있습니다.

조사 일자: 2026-10-06

## RSS 를 공개하지 않는 곳 (시도한 주소가 모두 404)

| 매체 | 홈페이지 | 확인 결과 |
| --- | --- | --- |
| 디지털타임스 | https://www.dt.co.kr | 공개 RSS 경로 없음 (404) |
| e4ds 뉴스 | https://www.e4ds.com | 공개 RSS 경로 없음 (404) |
| 서울경제 | https://www.sedaily.com | 과거 `/RSS/S1N1.xml` 폐지, 현재 404 |
| 파이낸셜뉴스 | https://www.fnnews.com | 과거 `/rss/fn_realnews_all.xml` 폐지, 현재 404 |
| 뉴스핌 | https://www.newspim.com | 공개 RSS 경로 없음 (404) |
| 중앙일보 | https://www.joongang.co.kr | `rss.joins.com` 전체 폐지 |
| 문화일보 | https://www.munhwa.com | 공개 RSS 경로 없음 (404) |
| 동아사이언스 | https://www.dongascience.com | 공개 RSS 경로 없음 (404) |
| 사이언스타임즈 | https://www.sciencetimes.co.kr | 사이트 개편으로 워드프레스 피드 폐지 |
| 디센터 | https://decenter.kr | 공개 RSS 경로 없음 (404) |
| 교통신문 | https://www.gyotongn.com | 피드 주소는 응답하나 기사 0건(빈 피드) |

## RSS 주소 대신 HTML 을 돌려주는 곳 (피드 폐지로 추정)

| 매체 | 홈페이지 | 확인 결과 |
| --- | --- | --- |
| 아주경제 | https://www.ajunews.com | 모든 후보 주소가 HTML 응답 |
| 데일리안 | https://www.dailian.co.kr | 모든 후보 주소가 HTML 응답 |
| 뉴스1 | https://www.news1.kr | 모든 후보 주소가 HTML 응답 |
| 메디게이트뉴스 | https://www.medigatenews.com | 모든 후보 주소가 HTML 응답 |
| 프레시안 | https://www.pressian.com | HTML 응답 또는 접속 실패 |

## GitHub Actions 러너에서 접속이 막히는 곳

| 매체 | 홈페이지 | 확인 결과 |
| --- | --- | --- |
| 머니투데이 | https://www.mt.co.kr | 아래 설명 참고 |

머니투데이의 유일한 피드는 `https://rss.mt.co.kr/mt_news.xml` 이고 국내망에서는 200 으로 정상 응답합니다.
그런데 GitHub Actions 러너에서는 이 호스트만 연결 자체가 타임아웃됩니다 (curl exit 28,
Node `UND_ERR_CONNECT_TIMEOUT`). 같은 도메인의 `www.mt.co.kr` 은 200 이므로 `rss.` 호스트만
해외망에서 차단된 것으로 보입니다. 대체 주소도 없습니다 (`news.mt.co.kr` 계열은 410 Gone, `/rss/` 는 403).

CI 에서 영구히 실패하면서 타임아웃과 재시도로 실행 시간만 30초가량 늘리므로 feeds.json 에서 제외했습니다.
국내망에서 돌리는 환경이라면 아래 한 줄을 feeds.json 에 다시 넣으면 그대로 수집됩니다.

    { "id": "mt", "name": "머니투데이", "url": "https://rss.mt.co.kr/mt_news.xml", "type": "general", "home": "https://www.mt.co.kr" },

## 봇 접근을 막는 곳 (403)

| 매체 | 홈페이지 | 확인 결과 |
| --- | --- | --- |
| 한국일보 | https://www.hankookilbo.com | 피드 후보 주소에서 403 |
| 디스이즈게임 | https://www.thisisgame.com | 피드 후보 주소 대부분 403 |

## 나중에 다시 확인하려면

```
node scripts/probe_feeds.mjs   # 100곳 전체를 다시 탐색
node scripts/probe_pass2.mjs   # 1차에서 못 찾은 곳만 재시도
node scripts/build_feeds.mjs   # 확인된 주소로 feeds.json 다시 작성
```

주소를 알게 된 매체는 `scripts/probe_pass2.mjs` 의 `KNOWN` 에 추가하면 다음 탐색에서 바로 잡힙니다.
403 으로 막힌 곳은 해당 언론사에 RSS 또는 콘텐츠 제휴를 문의하는 편이 맞습니다.


## 이후 변경

- 2026-10-06 코인데스크코리아(coindeskkorea.com)는 도메인이 AI 뉴스와 무관한 블로그 글을 내보내 `feeds.json` 에서 뺐습니다. 지금 수집 대상은 80곳입니다.
- 2026-10-10 RSS 약관상 이용 제한 24곳과 약관을 확인하지 못한 9곳, 모두 33곳을 수집에서 뺐습니다(`docs/excluded-feeds.json`). 지금 수집 대상은 47곳입니다.
- 2026-10-10 약관 재확인으로 바이라인네트워크, 더기어, 플래텀을 다시 넣어 지금 수집 대상은 50곳입니다.
- 2026-10-10 ITWorld 도 약관(동의 없는 영리 목적 사용 금지)에 따라 빼서 지금 수집 대상은 49곳입니다.
