# RSS 를 확보하지 못한 매체 18곳

`docs/outlets100.txt` 의 후보 100곳 가운데 82곳은 RSS 응답을 확인해 `feeds.json` 에 등록했습니다.
남은 18곳은 아래와 같은 이유로 등록하지 않았습니다. 확인 방법은 `node scripts/probe_feeds.mjs` 와
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
