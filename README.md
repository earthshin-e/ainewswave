# AI 인사이드

국내 언론사 RSS에서 AI 관련 기사만 골라 모아 보여 주는 모바일웹입니다.
서버 없이 GitHub Pages 한 곳에서 돌아가며, 30분마다 자동으로 기사를 새로 수집합니다.

## 구성

public 폴더: 실제로 배포되는 모바일웹 (HTML, CSS, JS, 홈화면 추가용 manifest와 service worker, 아이콘)
scripts/collect.mjs: RSS를 읽어 AI 기사만 추려 public/data/articles.json 에 저장
scripts/lib.mjs: RSS/Atom 파서, AI 키워드 필터, 주제 분류
scripts/test.mjs: 네트워크 없이 파서와 분류기를 검사 (node scripts/test.mjs)
scripts/make_sample.mjs: 화면 확인용 샘플 데이터 생성
feeds.json: 수집할 매체 목록
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

feeds.json 에 한 줄을 추가하면 됩니다. RSS 주소가 바뀐 매체는 url 만 고치면 됩니다.
Actions 로그에서 FAIL 로 표시된 매체는 주소 확인이 필요한 곳입니다. 처음 실행하면 몇 곳은 주소 수정이 필요할 수 있습니다.

## 공개 서비스로 운영할 때 알아둘 점

화면에는 제목, 짧은 요약, 썸네일만 보여 주고 누르면 언론사 원문으로 이동합니다. 본문은 가져오지 않습니다.
공개 서비스로 운영한다면 각 언론사의 RSS 이용 약관을 한 번 확인하고, 약관상 상업적 이용이 제한된 매체는 feeds.json 에서 빼 주세요.
광고 등 수익화를 붙일 계획이라면 특히 확인이 필요합니다.
서비스 이름은 public/index.html 과 public/manifest.webmanifest 에서 "AI 인사이드" 를 찾아 바꾸면 됩니다.
