---
name: ainewswave-weekly-revenue
description: 매주 일요일 애드센스 수익이나 심사 상태를 확인해 ainewswave 대시보드 목표와 월별 수익을 갱신하고 수익화 최적화 체크리스트를 점검
---

ainewswave(https://ainewswave.com) 주간 수익 기록 작업입니다. 매주 일요일에 한 번 돕니다. 한국어로 기록하고, 가운뎃점(·)은 쓰지 않으며 범위는 하이픈(10-13)으로 씁니다. 프로젝트 이름은 영문 ainewswave 로 씁니다.

준비
1. ToolSearch 로 ArtifactData 와 Claude in Chrome 도구(mcp__claude-in-chrome__tabs_context_mcp, navigate, computer, get_page_text, find, tabs_close_mcp)를 한 번에 불러옵니다.
2. 크롬 확장이 연결되지 않으면 애드센스 단계는 건너뛰고, 대시보드 로그에 "크롬 연결 안 됨, 수익 확인 못 함"을 남깁니다.

1단계: 애드센스 확인 (보기만 함, 어떤 버튼도 누르지 않음)
1. 크롬에서 https://adsense.google.com/adsense/u/0/pub-2376619512263295/sites/list 를 열어 ainewswave.com 의 Approval status 를 읽습니다(Getting ready, Ready, Needs attention 등).
2. Ready(승인)라면 https://adsense.google.com/adsense/u/0/pub-2376619512263295/home 에서 이번 달 예상 수익(원)을 읽습니다. 승인 전이면 수익은 0원입니다.
3. Needs attention 이나 반려면 사유 문구를 그대로 적어 둡니다. 직접 고치거나 재요청하지는 않습니다.
4. 연 탭은 끝나면 닫습니다.

2단계: 대시보드 갱신 (ArtifactData, url: https://claude.ai/artifact/GAzH12BwLPuTNVkbXyWpHr)
1. goal 컬렉션 main 문서를 get 으로 읽고 version 을 기억합니다.
2. update 로 다음만 고칩니다(if_version 필수): current = 이번 달 애드센스 수익(원, 숫자), current_label = 애드센스 상태 한 줄(예: "애드센스 심사 중 (Getting ready, 10/25 확인)" 또는 "애드센스 10월 예상 수익 1,234원"), monthly = 기존 배열에서 이번 달 항목 {m: "10월", amt: 숫자}를 넣거나 고친 배열, sources 의 "애드센스" 항목 now = 같은 숫자, updated = "MM/DD HH:MM".
3. checklist 컬렉션 s00 문서("수익화 최적화")를 읽고, 각 항목을 지금 상태와 대조합니다. 근거(애드센스 상태, 저장소 WORKLOG.md 의 기록, 대시보드 로그)로 끝난 것이 확인된 항목만 done: true 로 바꾸고, 막힌 항목은 문장 끝에 "(MM/DD 막힘: 이유)"를 짧게 덧붙입니다. "(직접)" 항목은 근거가 있을 때만 done 으로 바꿉니다. 항목을 지우거나 새로 만들지 않습니다. 고친 것이 있을 때만 if_version 을 붙여 set 합니다.
4. log 컬렉션에 doc_id "lYYYYMMDDw" 로 {at: "YYYY-MM-DD HH:MM", text: "주간 수익 기록: 애드센스 상태, 이번 달 수익 N원, 체크리스트 완료 K개 변경"}을 set 합니다.
5. routine_days 컬렉션의 오늘 날짜 문서(doc_id "YYYY-MM-DD")가 있으면 update 로 items.a06 = {done: true, at: "HH:MM", by: "Claude", note: 한 줄 결과}를 넣고, 없으면 {date, items: {a06: ...}} 로 set 합니다.

3단계: 저장소 기록
1. 맥의 저장소 /Users/hazelyu/Library/CloudStorage/Dropbox/수익화프로젝트/ainewswave 에서 git pull 후 WORKLOG.md 의 "## 기록 (최신이 위)" 바로 아래에 "- YYYY-MM-DD: 주간 수익 기록(애드센스 상태, 이번 달 N원, 체크리스트 변경 K개)." 한 줄을 넣고 커밋, 푸시합니다. 커밋 메시지 끝에는 그 세션 안내에 나온 Co-Authored-By 줄을 붙입니다. git 명령이 멈추거나 오류가 나면(드롭박스 동기화로 .git 이 깨진 적이 있음) 커밋하지 말고 보고합니다.

하지 않는 것: 메일, 슬랙 발송, 애드센스 설정 변경, 재검토 요청, 결제 정보 입력, 대시보드 페이지 재게시.
마지막에 애드센스 상태, 이번 달 수익, 체크리스트 변경 내용을 두세 줄로 보고합니다.