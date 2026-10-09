// 의견 보내기: 사이트 안 입력창에서 쓴 의견을 FormSubmit(https://formsubmit.co)으로 보내 운영자 메일로 받습니다.
// 모든 페이지에서 불러오며, data-feedback 속성이 있는 링크나 버튼, 또는 주소의 #feedback 으로 창을 엽니다.
// 처음 한 번은 FormSubmit 이 운영자 메일로 확인 링크를 보내고, 그 링크를 눌러야 이후 의견이 전달됩니다.
(function () {
  'use strict';
  var ENDPOINT = 'https://formsubmit.co/ajax/appealrequested@gmail.com';
  var TYPES = ['독자', '언론사', '제휴 희망 기업', '광고 문의', '기타'];

  var css = document.createElement('style');
  css.textContent =
    '#fbDlg{border:0;padding:0;width:min(520px,calc(100% - 24px));max-height:90vh;background:var(--surface,#fff);color:var(--ink,#1a1a1a)}' +
    '#fbDlg::backdrop{background:rgba(0,0,0,.45)}' +
    '#fbDlg form{display:grid;gap:12px;padding:20px}' +
    '#fbDlg h2{margin:0;font-size:18px}#fbDlg p.fbnote{margin:0;font-size:13px;color:var(--ink3,#636363)}' +
    '#fbDlg label{display:grid;gap:6px;font-size:13px;font-weight:600}' +
    '#fbDlg select,#fbDlg textarea,#fbDlg input[type=email]{font:inherit;font-size:15px;font-weight:400;padding:10px;border:1px solid var(--line-strong,#c2c2c2);background:var(--bg,#f7f7f7);color:inherit;border-radius:0}' +
    '#fbDlg textarea{min-height:120px;resize:vertical}' +
    '#fbDlg .fbbtns{display:flex;gap:8px;justify-content:flex-end}' +
    '#fbDlg button{height:42px;padding:0 18px;font:inherit;font-size:15px;border:1px solid var(--line-strong,#c2c2c2);background:transparent;color:inherit;cursor:pointer}' +
    '#fbDlg button.ok{background:var(--accent,#0071e3);border-color:var(--accent,#0071e3);color:#fff;font-weight:600}' +
    '#fbDlg .fbmsg{font-size:14px;margin:0}#fbDlg .hp{position:absolute;left:-9999px}';
  document.head.appendChild(css);

  var dlg;
  function build() {
    dlg = document.createElement('dialog');
    dlg.id = 'fbDlg';
    dlg.setAttribute('aria-label', '의견 보내기');
    dlg.innerHTML =
      '<form novalidate>' +
      '<h2>의견 보내기</h2>' +
      '<p class="fbnote">바라는 점, 오류 제보, 제휴 문의 모두 환영합니다.</p>' +
      '<label>보내는 분<select name="유형" required><option value="">선택해 주세요</option>' +
      TYPES.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></label>' +
      '<label>내용<textarea name="내용" required maxlength="3000" placeholder="자유롭게 적어 주세요"></textarea></label>' +
      '<label>답장받을 이메일 (선택)<input type="email" name="email" autocomplete="email" placeholder="답장이 필요하면 적어 주세요"></label>' +
      '<input class="hp" type="text" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<p class="fbnote">이메일은 답장에만 씁니다. <a href="/privacy.html">개인정보처리방침</a></p>' +
      '<p class="fbmsg" role="status" hidden></p>' +
      '<div class="fbbtns"><button type="button" data-close>닫기</button><button type="submit" class="ok">보내기</button></div>' +
      '</form>';
    document.body.appendChild(dlg);
    var form = dlg.querySelector('form');
    var msg = dlg.querySelector('.fbmsg');
    dlg.querySelector('[data-close]').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var type = form.elements['유형'].value;
      var body = form.elements['내용'].value.trim();
      if (!type || !body) { msg.hidden = false; msg.textContent = '보내는 분과 내용을 적어 주세요.'; return; }
      if (form.elements._honey.value) return;
      var btn = form.querySelector('button.ok');
      btn.disabled = true; btn.textContent = '보내는 중';
      var data = { '유형': type, '내용': body, email: form.elements.email.value.trim(), '페이지': location.href, _subject: '[AI 뉴스웨이브 의견] ' + type, _template: 'table', _captcha: 'false' };
      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok || String(j.success) === 'false') throw new Error(j.message || r.status); }); })
        .then(function () {
          msg.hidden = false; msg.textContent = '보내 주셔서 감사합니다. 꼭 읽어 볼게요.';
          form.reset();
          if (typeof window.gtag === 'function') window.gtag('event', 'send_feedback', { feedback_type: type });
        })
        .catch(function () { msg.hidden = false; msg.textContent = '보내지 못했어요. 잠시 뒤 다시 시도해 주세요.'; })
        .then(function () { btn.disabled = false; btn.textContent = '보내기'; });
    });
  }
  function open() {
    if (!dlg) build();
    dlg.querySelector('.fbmsg').hidden = true;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-feedback]');
    if (t) { e.preventDefault(); open(); }
  });
  function fromHash() { if (location.hash === '#feedback') { open(); history.replaceState(null, '', location.pathname + location.search); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fromHash); else fromHash();
  window.addEventListener('hashchange', fromHash);
})();
