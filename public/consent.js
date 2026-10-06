// 쿠키 동의: Google 동의 모드(Consent Mode v2) 기본값을 정하고, 아직 선택하지 않은 방문자에게 하단 안내를 보여 줍니다.
// 모든 페이지에서 gtag 설정보다 먼저 불러와야 합니다. 선택은 이 브라우저의 localStorage 'consent' 에 저장합니다.
// 유럽경제지역, 영국, 스위스 방문자는 동의 전까지 통계와 광고 쿠키를 쓰지 않습니다(denied). 그 밖의 지역은 허용이 기본이고 거부할 수 있습니다.
(function () {
  'use strict';
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  var EEA = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH'];
  var DENIED = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };
  var GRANTED = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' };

  gtag('consent', 'default', Object.assign({ region: EEA, wait_for_update: 500 }, DENIED));
  gtag('consent', 'default', GRANTED);

  var saved = null;
  try { saved = localStorage.getItem('consent'); } catch (e) { /* 저장소가 막힌 환경 */ }
  if (saved === 'all') gtag('consent', 'update', GRANTED);
  if (saved === 'essential') gtag('consent', 'update', DENIED);
  if (saved) return;

  function choose(v) {
    try { localStorage.setItem('consent', v); } catch (e) { /* ignore */ }
    gtag('consent', 'update', v === 'all' ? GRANTED : DENIED);
    var bar = document.getElementById('consentBar');
    if (bar) bar.remove();
  }

  function show() {
    var bar = document.createElement('div');
    bar.id = 'consentBar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', '쿠키 사용 안내');
    bar.innerHTML =
      '<p>방문 통계와 광고를 위해 쿠키를 씁니다. 기사 읽기에는 영향이 없어요. <a href="/privacy.html">자세히</a></p>' +
      '<div><button type="button" data-v="essential">필수만</button><button type="button" data-v="all" class="ok">모두 허용</button></div>';
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (b) choose(b.getAttribute('data-v'));
    });
    var css = document.createElement('style');
    css.textContent =
      '#consentBar{position:fixed;left:0;right:0;bottom:0;z-index:50;display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;justify-content:center;' +
      'padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:#1a1a1a;color:#fff;font:13px/1.5 Inter,Pretendard,"Apple SD Gothic Neo",system-ui,sans-serif;box-shadow:0 -1px 0 rgba(255,255,255,.12)}' +
      '#consentBar p{margin:0;color:#e8e8e8}#consentBar a{color:#9ec2ff}#consentBar div{display:flex;gap:6px}' +
      '#consentBar button{height:34px;padding:0 14px;border:1px solid #636363;background:transparent;color:#fff;font:inherit;cursor:pointer}' +
      '#consentBar button.ok{background:#296ef9;border-color:#296ef9;font-weight:600}';
    document.head.appendChild(css);
    document.body.appendChild(bar);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show);
  else show();
})();
