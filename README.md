# AI 뉴스웨이브

국내 언론사 RSS에서 AI 관련 기사만 골라 모아 보여 주는 모바일웹입니다.
서버 없이 GitHub Pages 한 곳에서 돌아가며, 30분마다 47곳의 매체에서 기사를 새로 수집합니다.

주소: https://ainewswave.com/

## 구성

public 폴더: 실제로 배포되는 모바일웹 (HTML, CSS, JS, 홈화면 추가용 manifest와 service worker, 아이콘)
scripts/collect.mjs: RSS를 읽어 AI 기사만 추려 public/data/articles.json 에 저장
scripts/lib.mjs: RSS/Atom 파서, AI 키워드 필터, 주제 분류
scripts/test.mjs: 네트워크 없이 파서와 분류기를 검사 (node scripts/test.mjs)
scripts/make_sample.mjs: 화면 확인용 샘플 데이터 생성
feeds.json: 실제로 수집하는 매체 목록 (RSS 응답이 확인되고 이용 제한이 없는 47곳)
scripts/probe_feeds.mjs: 매체의 RSS 주소를 자동으로 찾아 응답을 검증
scripts/probe_pass2.mjs: 1차 탐색에서 못 찾은 매체를 다른 패턴으로 재시도
scripts/build_feeds.mjs: 검증된 주소만 모아 feeds.json 을 다시 작성
docs/outlets100.txt: 후보 매체 100곳 (이름|홈페이지|분류)
docs/no-rss.md: RSS 를 확보하지 못한 19곳과 그 이유
.github/workflows/collect.yml: 30분마다 수집 후 자동 배포

## 배포 방법 (처음 한 번)

1. GitHub에 새 저장소를 만들고 이 폴더의 내용을 올립니다.
2. 저장소의 Settings, Pages 에서 Source 를 GitHub Actions 로 바꿉니다.
3. Actions 탭에서 "collect and deploy" 를 Run workflow 로 한 번 실행합니다.
4. 몇 분 뒤 https://계정명.github.io/저장소명/ 주소로 접속됩니다. 이후는 30분마다 자동 갱신됩니다.

내 컴퓨터에서 먼저 확인하려면 다음을 실행합니다.

    node scripts/test.mjs
    node scripts/collect.mjs
    cd public && python3 -m http.server 8000

## 수집 방식

AI 전문 매체(feeds.json 에서 type 이 ai)는 모든 기사를 가져옵니다.
일반 IT, 경제 매체(type 이 general)는 제목에 AI 키워드가 있거나, 요약에 서로 다른 AI 키워드가 둘 이상 있는 기사만 가져옵니다.
기사는 반도체, 로봇, 정책, 보안/윤리, 생성형AI, 연구, 기업, 일반 중 하나로 자동 분류됩니다. 규칙은 scripts/lib.mjs 의 RULES 에서 고칠 수 있습니다.
같은 제목의 중복 기사는 하나만 남기고, 14일이 지난 기사는 지웁니다.
피드 하나가 실패해도 나머지는 계속 수집하며, 실패 내역은 Actions 로그와 articles.json 의 status 에 남습니다.

## 매체 추가, 수정

주소를 이미 아는 매체는 feeds.json 에 한 줄을 추가하면 됩니다. RSS 주소가 바뀐 매체는 url 만 고치면 됩니다.
Actions 로그에서 FAIL 로 표시된 매체는 주소 확인이 필요한 곳입니다.

주소를 모를 때는 docs/outlets100.txt 에 "이름|홈페이지|분류" 한 줄을 넣고 아래를 실행하면
흔히 쓰이는 RSS 경로와 홈페이지의 rel=alternate 선언을 훑어 주소를 찾아 줍니다.

    node scripts/probe_feeds.mjs   # 후보 전체를 탐색하고 응답을 검증
    node scripts/probe_pass2.mjs   # 1차에서 못 찾은 곳만 다른 패턴으로 재시도
    node scripts/build_feeds.mjs   # 검증된 주소만 모아 feeds.json 작성

실제로 기사가 1건 이상 파싱되는 주소만 통과시키므로, 통과한 피드는 바로 수집에 쓸 수 있습니다.

## 수집 성능

매체 47곳을 동시 12개씩 나누어 읽고, 피드 하나당 15초에서 끊습니다. 404 가 아닌 실패는 한 번 더 시도합니다.
전체 수집은 10초 안쪽에 끝나므로 30분 주기로 충분합니다. 주기는 .github/workflows/collect.yml 의 cron 한 줄로 바꿉니다.
동시 요청 수, 타임아웃, 보관 기간은 scripts/collect.mjs 위쪽의 CONCURRENCY, TIMEOUT_MS, MAX_AGE_DAYS, MAX_ITEMS 에서 고칩니다.

## 공개 서비스로 운영할 때 알아둘 점

화면에는 제목, 짧은 요약, 썸네일만 보여 주고 누르면 언론사 원문으로 이동합니다. 본문은 가져오지 않습니다.
공개 서비스로 운영한다면 각 언론사의 RSS 이용 약관을 한 번 확인하고, 약관상 상업적 이용이 제한된 매체는 feeds.json 에서 빼 주세요.
광고 등 수익화를 붙일 계획이라면 특히 확인이 필요합니다.
서비스 이름은 public/index.html 과 public/manifest.webmanifest 에서 "AI 뉴스웨이브" 를 찾아 바꾸면 됩니다.
