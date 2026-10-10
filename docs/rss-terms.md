# 수집 매체 81곳 RSS 이용 조건 조사

조사일: 2026-10-06. 각 매체의 RSS 안내 페이지, 이용약관, 저작권 정책을 curl과 WebFetch로 직접 읽어 확인했다. 근거 문구는 원문 일부를 짧게 옮긴 것이다. 페이지가 자바스크립트로만 그려지거나 접속이 막힌 곳은 "확인 못함"으로 두었다. 법률 자문이 아니므로 최종 판단 전에 전문가 검토를 권한다.

## 1. 요약

| 분류 | 뜻 | 매체 수 |
|---|---|---|
| A | 상업적 이용 금지 또는 사전 허락 필요 (RSS 전용 문구 7곳, 약관/저작권 일반 문구 17곳) | 24 |
| B | 개인/비상업 용도만 명시 (상업 금지 문구 없이) | 0 |
| C | 출처 표시와 링크만 요구 | 0 |
| D | RSS 이용 제한 안내 없음 (일반적인 "무단 전재 금지" 저작권 문구만 있음) | 47 |
| E | 확인 못함 | 10 |

B로 분류된 매체는 없다. "개인 비상업 용도만 허용"이라고 쓴 매체는 모두 "상업적 활용 금지"를 함께 적어 A로 넣었다.

참고: 뉴스 사이트 공용 CMS(엔디소프트, 주소 `/rss/allArticle.xml`)를 쓰는 32곳은 같은 RSS 안내문(`/rssIndex.html`)을 쓴다. 이 안내문은 제한이 없을 뿐 아니라, B 사이트 운영자가 A 사이트의 "제목, 링크, 주요 내용"을 RSS로 모아 자기 사이트에 올리는 예를 들고 있다. 다만 같은 CMS의 저작권보호정책(`/com/copyright.html`)에는 "회사의 승낙 없이 복제, 출판, 전송, 배포, 판매... 금지"라는 일반 문구가 있다.

## 2. 매체별 표

### A. 상업적 이용 금지 또는 사전 허락 필요

| 매체 | 분류 | 근거 문구(짧게) | 확인한 주소 | KPF 신탁 |
|---|---|---|---|---|
| 연합뉴스 | A (RSS) | "비상업적 블로그와 개인적인 용도로만 ... RSS 피드를 사용" 허용, 사전 서면 허가 없이 상업적 이용 금지 | https://www.yna.co.kr/rss/index | 모름 (자체 콘텐츠사업부) |
| 아시아경제 | A (RSS) | "RSS 서비스는 비상업적 사용만 허용", 상업적 활용 금지 | https://www.asiae.co.kr/rss/ | 모름 |
| 노컷뉴스 | A (RSS) | "RSS 서비스를 활용한 상업적 활용은 금지합니다" | https://www.nocutnews.co.kr/rss/ | 모름 |
| 동아일보 | A (RSS) | "개인 이용자의 비상업적 사용에만 허용", 다수 대상 상업적 활용 금지 | https://rss.donga.com/ | 모름 |
| 비즈워치 | A (RSS) | "상업적인 용도로 사용하실 수 없습니다", 필요 시 메일 문의 | https://news.bizwatch.co.kr/help/rss | 모름 |
| 경향신문 | A (RSS) | 홈페이지로 다수와 공유하거나 영리 시 "사전에 저작권자의 허락" 필요 | https://www.khan.co.kr/help/help_rss.html | 디지털뉴스 이용규칙(KPF와 디지털뉴스협회 공동) 따름 |
| 한겨레 | A | 비영리라도 자동화 도구로 수집, 활용 시 "사전 동의를 반드시" | https://member.hani.co.kr/help/rules/mypage_help_memberTerms.hani | 예, 저작권 안내에서 KPF 뉴스토어 안내 |
| 헤럴드경제 | A | 기사는 "비영리적인 사용만으로 제한", 기타는 사전 서면 허가 | https://members.heraldcorp.com/html/custom/copyright.php | KPF 단가표 참조 언급 |
| 서울신문 | A | 상업적 목적 웹사이트에 디지털뉴스 복제 게시 금지(디지털뉴스협회 기준) | https://www.seoul.co.kr/members/newsCopyright.php | 디지털뉴스협회 회원사 |
| 이데일리 | A | "비영리 목적이라도 사전 서면 허가 없이" 사용 불가 | https://www.edaily.co.kr/info/E04_04.html | 모름 |
| 이코노미스트 | A | 게재 자료를 "상업적으로 이용할 수 없습니다" | https://economist.co.kr/event/view/policyRenew | 모름 |
| 한국경제 | A | 사전 서면 허가 없이 봇, 크롤러로 데이터 추출 금지(약관 제19조) | https://id.hankyung.com/user/selectAuthAgree.do | 모름 |
| 매일경제 | A | 정보를 "회사의 동의 없이 상업적으로 이용" 시 제재 | https://www.mk.co.kr/mypage/policy | 모름 |
| 이코노미조선 | A | 사전 승낙 없이 복제, 유통 또는 상업적 이용 금지 | https://economychosun.com/etc/terms.html | 모름 |
| 전자신문 | A | 습득 정보를 "상업적 목적으로 이용" 금지 | https://info.etnews.com/sub_3_4.html | 모름 |
| 지디넷코리아 | A | 습득 정보를 "상업적 목적으로 이용" 금지 | https://zdnet.co.kr/member/teamservice.php | 모름 |
| 아웃스탠딩 | A | 제3자 서비스에 데이터 이용 시 "사전 서면 승인" | https://outstanding.kr/terms | 모름 |
| 산업일보 | A | "사전 서면 허가 없이 산업일보 뉴스를 활용할 수 없습니다" | https://www.kidd.co.kr/company/copyright.html | 모름 |
| 블록미디어 | A | "비영리 목적이라 하더라도 사전 서면 허가 없이" 사용 불가 | https://www.blockmedia.co.kr/copyright | 모름 |
| 바이오스펙테이터 | A | 명시적 동의 없는 게시 등 "영리적 목적으로 활용" 금지, 크롤링 금지 | https://www.biospectator.com/company/copyright_guide | 모름 |
| 게임메카 | A | 게재 자료를 "상업적으로 사용할 수 없습니다" | https://www.gamemeca.com/company.php?rts=cscenter01 | 모름 |
| 세계일보 | A (RSS) | 디지털뉴스이용규칙: RSS는 "개인적으로 구독 이용하는 데 그쳐야", 상업적 웹사이트 게시 금지 | https://company.segye.com/service/digitalNewsRules | 디지털뉴스이용규칙(디지털뉴스협회 기준) 따름 |
| 스타트업레시피 | A | 정보를 "사전 승낙 없이 복제 또는 유통시키거나 상업적으로 이용" 금지 | https://startuprecipe.co.kr/terms | 모름 |
| 토큰포스트 | A | "회사의 동의 없이 영리를 목적으로" 서비스 사용 금지 | https://www.tokenpost.kr/policy/terms | 모름 |

### D. RSS 이용 제한 안내 없음

엔디소프트 CMS 32곳: RSS 안내(`/rssIndex.html`)에 제한 없음, 저작권보호정책(`/com/copyright.html`)에 일반적인 무단 배포 금지 문구. KPF 신탁 언급 없음.

| 매체 | 분류 | 근거 문구(짧게) | 확인한 주소 | KPF 신탁 |
|---|---|---|---|---|
| AI타임스 | D | 승낙 없이 복제, 전송, 배포 금지(일반) | https://www.aitimes.com/com/copyright.html | 언급 없음 |
| 인공지능신문 | D | 위와 같음, RSS 안내 제한 없음 | https://www.aitimes.kr/rssIndex.html | 언급 없음 |
| 로봇신문 | D | 위와 같음 | https://www.irobotnews.com/rssIndex.html | 언급 없음 |
| 테크M | D | 위와 같음 | https://www.techm.kr/rssIndex.html | 언급 없음 |
| 디지털투데이 | D | 위와 같음 | https://www.digitaltoday.co.kr/rssIndex.html | 언급 없음 |
| 데이터넷 | D | RSS 안내 제한 없음 | https://www.datanet.co.kr/rssIndex.html | 언급 없음 |
| 컴퓨터월드 | D | 위와 같음 | https://www.comworld.co.kr/rssIndex.html | 언급 없음 |
| 블로터 | D | 위와 같음 | https://www.bloter.net/rssIndex.html | 언급 없음 |
| IT조선 | D | 위와 같음 (조선일보 계열 푸터 "무단 전재 및 재배포 금지") | https://it.chosun.com/rssIndex.html | 언급 없음 |
| 테크월드뉴스 | D | 위와 같음 | https://www.epnc.co.kr/rssIndex.html | 언급 없음 |
| 디일렉 | D | 위와 같음 | https://www.thelec.kr/rssIndex.html | 언급 없음 |
| 보안뉴스 | D | 위와 같음 | https://www.boannews.com/rssIndex.html | 언급 없음 |
| 스타트업투데이 | D | 위와 같음 | https://www.startuptoday.kr/rssIndex.html | 언급 없음 |
| 시사저널e | D | 위와 같음 | https://www.sisajournal-e.com/rssIndex.html | 언급 없음 |
| EBN | D | 위와 같음 | https://www.ebn.co.kr/rssIndex.html | 언급 없음 |
| 더스쿠프 | D | 위와 같음 | https://www.thescoop.co.kr/rssIndex.html | 언급 없음 |
| 미디어오늘 | D | 위와 같음 | https://www.mediatoday.co.kr/rssIndex.html | 언급 없음 |
| 시사IN | D | 위와 같음 | https://www.sisain.co.kr/rssIndex.html | 언급 없음 |
| 한국NGO신문 | D | 위와 같음 | https://www.ngonews.kr/rssIndex.html | 언급 없음 |
| 헬로디디 | D | 위와 같음 | https://www.hellodd.com/rssIndex.html | 언급 없음 |
| 교수신문 | D | 위와 같음 | https://www.kyosu.net/rssIndex.html | 언급 없음 |
| 베리타스알파 | D | 푸터 "무단전재, 재배포 및 이용(AI학습 포함) 금지" | https://www.veritas-a.com/rssIndex.html | 언급 없음 |
| 인더스트리뉴스 | D | 위와 같음 | https://www.industrynews.co.kr/rssIndex.html | 언급 없음 |
| 전기신문 | D | 위와 같음 | https://www.electimes.com/rssIndex.html | 언급 없음 |
| 이포커스 | D | 위와 같음 | https://www.e-focus.co.kr/rssIndex.html | 언급 없음 |
| 가스신문 | D | 위와 같음 | https://www.gasnews.com/rssIndex.html | 언급 없음 |
| 철강금속신문 | D | 약관에 사전 승인 없는 "대여, 배포, 판매" 금지(일반) | https://www.snmnews.com/com/service.html | 언급 없음 |
| 물류신문 | D | 위와 같음 | https://www.klnews.co.kr/rssIndex.html | 언급 없음 |
| 청년의사 | D | 위와 같음 | https://www.docdocdoc.co.kr/rssIndex.html | 언급 없음 |
| 히트뉴스 | D | 위와 같음 | https://www.hitnews.co.kr/rssIndex.html | 언급 없음 |
| 의학신문 | D | 위와 같음 | https://www.bosa.co.kr/rssIndex.html | 언급 없음 |
| 게임톡 | D | 위와 같음 | https://www.gametoc.co.kr/rssIndex.html | 언급 없음 |
| 국민일보 | D | RSS 목록에 이용 조건 없음 | https://www.kmib.co.kr/rss/index.asp | 언급 없음 |
| 디지털데일리 | D | 사전허가 없이 변조, 복사, 배포 금지(일반), RSS 조건 없음 | https://www.ddaily.co.kr/member | 언급 없음 |
| 데일리팜 | D | 푸터 "무단 전재 및 재배포 금지"만 | https://www.dailypharm.com/ | 언급 없음 |
| ITWorld | A | 약관에 동의 없는 영리 목적 서비스 사용 금지(2026-10-10 재분류, 수집 제외) | https://www.itworld.co.kr/terms-of-use/ | 언급 없음 |
| GeekNews | D | "원문 링크를 존중"하는 운영 방향만 | https://news.hada.io/about | 해당 없음 |
| 테크42 | D | 약관에 사전 승낙 없는 "영리행위" 금지, 저작물 무단 이용 금지(엔디소프트형 일반 약관), RSS 조건 없음 | https://www.tech42.co.kr/terms/ | 언급 없음 |
| 아이뉴스24 | D | 푸터 "Copyright(c) inews24.com. All Rights Reserved."만, RSS 조건 못 찾음 | https://www.inews24.com/ | 언급 없음 |
| 베타뉴스 | D | RSS 피드와 푸터에 "All Rights Reserved" 저작권 고지만 | https://www.betanews.net/rss | 언급 없음 |
| 벤처스퀘어 | D | "All rights reserved" 저작권 고지만 | https://www.venturesquare.net/terms | 언급 없음 |
| 조선비즈 | D | 푸터 "게시된 정보는 무단 복제, 배포할 수 없습니다" | https://biz.chosun.com/ | 언급 없음 |
| 뉴시스 | D | RSS 안내에 제한 없음, 푸터 "무단 전재, 복사, 배포를 금합니다" | https://www.newsis.com/RSS/ | 언급 없음 (콘텐츠 판매 메뉴 있음) |
| 대학지성 | D | 엔디소프트 CMS, RSS 안내 제한 없음, 저작권보호정책 일반 문구 | https://www.unipress.co.kr/com/copyright.html | 언급 없음 |
| 헬로티 | D | 푸터 "copyright(c) HelloT all right reserved"만 | https://www.hellot.net/ | 언급 없음 |
| 에너지경제 | D | 푸터 "Copyright © 2020 에너지경제신문. All rights reserved."만 | https://www.ekn.kr/web/ | 언급 없음 |
| 인벤 | D | 푸터 "무단 전재, 복사, 배포 등을 금합니다" | https://www.inven.co.kr/doc/service.php | 언급 없음 |

### E. 확인 못함

2026-10-10 3차 확인(크롬): 바이라인네트워크(푸터에 이용 제한 문구 없음), 더기어(엔디소프트 RSS 안내문, 일반 무단 전재 금지 문구), 플래텀(제휴사용 약관뿐, 일반 저작권 표기)은 D. 오마이뉴스는 RSS 안내에 개인적 이용 한정, 허락 없는 배포나 재RSS 서비스 금지(https://www.ohmynews.com/NWS_Web/Help/srv/h_help_rss.aspx), 더벨은 약관에 계약 없는 자동화 수집 금지와 AI 영리 활용 계약 필요(https://www.thebell.co.kr/company/ServiceInfo.asp?lcode=23), 메디컬타임즈는 약관에 서비스 자료 상업적 이용 금지(https://www.medicaltimes.com/Main/Company/service.html), CIO Korea 는 약관에 동의 없는 영리 목적 서비스 사용 금지(https://www.cio.com/kr/terms-of-use/)로 A. 프라임경제(약관 페이지에 본문 없음), 케이벤치(약관, RSS 안내 링크 없음)는 여전히 E 라 제외 유지. 참고: ITWorld 약관에도 CIO Korea 와 같은 영리 목적 사용 금지 문구가 있다.

CIO Korea, 바이라인네트워크, 케이벤치, 더기어, 플래텀, 더벨, 프라임경제, 오마이뉴스, 메디컬타임즈, 코인데스크코리아 (10곳).

2차 조사(2026-10-06)에서 시도한 것: 홈 푸터, `/rss`, `/rss.html`, `/rssIndex.html`, `/com/rss.html`, `/help/rss`, `/terms`, `/policy`, `/copyright`, `/com/copyright.html`, `/member/agreement`를 curl로 읽고, 푸터의 약관 링크를 따라가고, WebFetch와 웹 검색을 했다.

- CIO Korea: Foundry 공용 약관 페이지가 자바스크립트로만 그려져 본문을 못 읽음 (ITWorld와 같은 회사).
- 바이라인네트워크, 플래텀: CloudFront 오류로 접속 차단.
- 더기어: 접속 실패.
- 더벨, 메디컬타임즈: 홈이 거의 빈 페이지(자바스크립트 렌더링).
- 프라임경제: 이용약관 링크(`/home/company.html?p_body_type=terms`)에 본문 없음, RSS 안내 주소는 빈 응답.
- 케이벤치: RSS 안내 페이지 본문 없음, 푸터에 저작권 문구 없음.
- 오마이뉴스: RSS 안내 주소가 "잘못된 요청"을 돌려줌, 검색으로도 RSS 조건 못 찾음.
- 코인데스크코리아: 현재 도메인에 매체와 무관한 글(생활 정보 블로그)이 올라와 있어 매체가 운영하는 사이트인지 의심스럽다. 피드 자체를 점검할 필요가 있다.

## 3. 권고

1. **애드센스 전에 빼거나 허락을 받아야 할 곳 (RSS 전용 문구로 상업 이용을 금지)**: 연합뉴스, 아시아경제, 노컷뉴스, 동아일보, 비즈워치, 경향신문, 세계일보. 광고가 붙으면 상업적 이용으로 볼 여지가 크므로 피드에서 제외하거나 각 사 콘텐츠사업 담당과 서면 협의를 권한다. 연합뉴스와 비즈워치는 문의처를 안내하고 있다.
2. **위험이 높은 곳 (약관이나 저작권 정책이 영리 또는 비영리 이용까지 사전 허락을 요구)**: 한겨레, 헤럴드경제, 이데일리, 블록미디어, 바이오스펙테이터, 서울신문, 산업일보. 함께 빼거나 허락을 받는 쪽이 안전하다. 한국경제와 바이오스펙테이터는 크롤링을 명시적으로 금지하므로, 기사 페이지에서 og:image를 긁어오는 동작은 특히 중단해야 한다.
3. **회원 약관 수준의 상업 이용 금지 (매일경제, 이코노미스트, 이코노미조선, 전자신문, 지디넷코리아, 아웃스탠딩, 게임메카, 스타트업레시피, 토큰포스트)**: 회원 서비스 약관이라 비회원 RSS 이용에 그대로 적용되는지는 불분명하다. 다만 상업 이용 금지 의사가 분명하므로 보수적으로 보면 제외 또는 문의 대상이다.
4. **D 그룹 (47곳)**: RSS 이용 제한은 없지만 일반 저작권 문구가 있다. 제목, 짧은 요약, 원문 링크 위주의 노출은 관행상 위험이 낮은 편이나, 썸네일 이미지 핫링크는 사진 저작권 문제가 따로 생길 수 있다. 썸네일은 끄거나 매체 허락을 받는 쪽을 고려한다.
5. **E 그룹 (10곳)**: 직접 문의하거나 사이트 푸터를 브라우저로 다시 확인한 뒤 결정한다.
6. **KPF 신탁**: 한겨레(뉴스토어 안내), 경향신문과 서울신문(디지털뉴스협회와 KPF 이용규칙), 헤럴드경제(KPF 단가표 참조)는 KPF 경로로 이용 허락을 받을 수 있다. KPF 뉴스저작권 신탁 계약으로 여러 매체를 한 번에 처리할 수 있는지 KPF에 문의할 가치가 있다.
7. **정리 기사**: 여러 매체의 사실을 종합해 새로 쓰고 출처 링크를 다는 방식은 사실 자체가 저작물이 아니므로 위험이 낮다. 문장을 그대로 옮기거나 사진을 가져오지 않도록 유지한다.
8. 공통: 모든 노출에 매체명과 원문 링크를 분명히 표시하고, 매체가 요청하면 즉시 빼는 절차(연락처와 제외 요청 안내)를 사이트에 둔다.

## 4. 라이선스 문의처

이번 조사 중 페이지에서 직접 본 연락처만 적었다. 저작권이나 콘텐츠 이용 전담 창구가 아닌 일반 대표 연락처도 섞여 있다.

| 매체 | 연락처 | 본 곳 |
|---|---|---|
| 세계일보 | 사업제휴 페이지 | https://company.segye.com/alliance/partner |
| 뉴시스 | 콘텐츠 판매, 저작권 규약, 광고와 제휴 문의 (홈 푸터 팝업), 대표 문의 02-721-7400 | https://www.newsis.com/ |
| 대학지성 | 저작권 담당자 editor@unipress.co.kr | https://www.unipress.co.kr/com/copyright.html |
| 테크42 | tech42@tech42.co.kr, 02-6952-9201 | https://www.tech42.co.kr/ |
| 벤처스퀘어 | editor@venturesquare.net | https://www.venturesquare.net/terms |
| 베타뉴스 | leejik@betanews.net (RSS 피드의 관리자 주소) | https://www.betanews.net/rss |
| 헬로티 | help@hellot.net | https://www.hellot.net/ |
| 인벤 | help@inven.co.kr | https://www.inven.co.kr/doc/service.php |
| 토큰포스트 | 대표 문의 02-6674-1012, 1:1 문의 | https://www.tokenpost.kr/policy/terms |
| 에너지경제 | 대표전화 02-850-0114 | https://www.ekn.kr/web/ |
| 연합뉴스, 비즈워치 | RSS 안내 페이지에 문의처 안내 있음 (1차 조사) | 위 A 표 주소 |
| 한겨레, 경향신문, 서울신문, 헤럴드경제 | 한국언론진흥재단(KPF) 뉴스저작권 신탁 경로 | 위 A 표 주소 |

