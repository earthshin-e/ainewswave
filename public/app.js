(() => {
  'use strict';
  const TOPICS = ['전체', '생성형AI', '반도체', '로봇', '정책', '기업', '연구', '보안/윤리', '일반'];
  const PAGE = 30;
  const $ = (s) => document.querySelector(s);

  // 저장소 접근이 막힌 환경에서도 화면이 동작하도록 try/catch 로 감쌉니다.
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  };

  const state = {
    all: [], sources: [], updatedAt: null,
    topic: '전체', picked: new Set(), q: '', saved: false, shown: PAGE,
    bookmarks: store.get('bm', {}),
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function ago(iso) {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const m = Math.floor(diff / 60000);
    if (m < 1) return '방금 전';
    if (m < 60) return m + '분 전';
    const h = Math.floor(m / 60);
    if (h < 24) return h + '시간 전';
    const d = Math.floor(h / 24);
    if (d < 7) return d + '일 전';
    const dt = new Date(iso);
    return (dt.getMonth() + 1) + '월 ' + dt.getDate() + '일';
  }

  function filtered() {
    let base = state.saved
      ? Object.values(state.bookmarks).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
      : state.all;
    const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    return base.filter((a) => {
      if (state.topic !== '전체' && a.category !== state.topic) return false;
      if (state.picked.size && !state.picked.has(a.sourceId)) return false;
      if (terms.length) {
        const hay = (a.title + ' ' + (a.summary || '') + ' ' + a.source).toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }

  const STAR = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z"/></svg>';

  // 이미지가 없으면 넓은 화면에서는 주제 색상 블록을, 좁은 화면에서는 아무것도 보여주지 않습니다.
  function card(a, i) {
    const on = !!state.bookmarks[a.id];
    const feature = i === 0 && !state.q && !state.saved;
    const media = a.image
      ? `<div class="media"><img src="${esc(a.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.innerHTML='<div class=&quot;ph&quot; aria-hidden=&quot;true&quot;>${esc(a.category)}</div>'"></div>`
      : `<div class="media"><div class="ph" aria-hidden="true">${esc(a.category)}</div></div>`;
    return `<article class="card${feature ? ' feature' : ''}" data-cat="${esc(a.category)}">
      <a class="body" href="#a/${esc(a.id)}">
        ${media}
        <div class="txt">
          <span class="tag">${esc(a.category)}</span>
          <h2>${esc(a.title)}</h2>
          ${a.summary ? `<p>${esc(a.summary)}</p>` : ''}
        </div>
      </a>
      <div class="cfoot">
        <span class="src">${esc(a.source)}</span><span>·</span><time datetime="${esc(a.published)}">${ago(a.published)}</time>
        <button class="bm" data-id="${esc(a.id)}" aria-pressed="${on}" aria-label="북마크">${STAR}</button>
      </div>
    </article>`;
  }

  function render() {
    const list = filtered();
    const part = list.slice(0, state.shown);
    $('#count').textContent = list.length ? `기사 ${list.length}건` : '';
    $('#list').innerHTML = part.length
      ? part.map(card).join('')
      : `<div class="empty">${state.saved ? '저장한 기사가 없습니다.<br>기사 카드의 별을 눌러 북마크해 보세요.' : '조건에 맞는 기사가 없습니다.'}</div>`;
    $('#more').hidden = list.length <= state.shown;
    $('#savedCount').textContent = Object.keys(state.bookmarks).length;
    $('#btnSaved').setAttribute('aria-pressed', String(state.saved));
    const n = state.picked.size;
    $('#btnSource').textContent = n ? `매체 ${n}곳 선택` : '전체 매체';
    $('#btnSource').classList.toggle('on', n > 0);
  }

  // ---- 기사 상세 ----
  // 제목을 두 글자 단위로 쪼개 겹치는 비율로 같은 사건을 다룬 다른 매체 기사를 찾습니다.
  const grams = (t) => {
    const s = t.replace(/\[[^\]]*\]|[^0-9A-Za-z가-힣]/g, '').toLowerCase();
    const g = new Set();
    for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2));
    return g;
  };
  function similarity(a, b) {
    let n = 0;
    for (const x of a) if (b.has(x)) n++;
    return n / (Math.min(a.size, b.size) || 1);
  }
  function related(a) {
    const g = grams(a.title);
    const same = [];
    const topic = [];
    for (const x of state.all) {
      if (x.id === a.id) continue;
      const s = similarity(g, grams(x.title));
      if (s >= 0.45) same.push([s, x]);
      else if (x.category === a.category && topic.length < 6) topic.push(x);
    }
    same.sort((p, q) => q[0] - p[0]);
    return { same: same.slice(0, 8).map((p) => p[1]), topic };
  }
  function fullDate(iso) {
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  const relItem = (x) => `<li><a href="#a/${esc(x.id)}"><span class="r-src">${esc(x.source)}</span><span class="r-title">${esc(x.title)}</span><time>${ago(x.published)}</time></a></li>`;

  function renderDetail(a) {
    const on = !!state.bookmarks[a.id];
    const { same, topic } = related(a);
    $('#detail').innerHTML = `<article class="read" data-cat="${esc(a.category)}">
      <button class="back" type="button" id="btnBack">← 목록으로</button>
      <span class="tag">${esc(a.category)}</span>
      <h1>${esc(a.title)}</h1>
      <div class="meta"><b>${esc(a.source)}</b><span>·</span><time datetime="${esc(a.published)}">${fullDate(a.published)}</time>
        <button class="bm" data-id="${esc(a.id)}" aria-pressed="${on}" aria-label="북마크">${STAR}</button></div>
      ${a.image ? `<figure class="hero"><img src="${esc(a.image)}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></figure>` : ''}
      <section class="sum">
        <h2>요약</h2>
        <p>${a.summary ? esc(a.summary) : '이 기사는 언론사가 요약을 제공하지 않았습니다. 원문에서 내용을 확인해 주세요.'}</p>
        <p class="note">언론사 RSS 가 제공한 요약입니다. 전체 내용은 원문에서 확인하세요.</p>
      </section>
      <a class="cta" href="${esc(a.link)}" target="_blank" rel="noopener noreferrer">${esc(a.source)}에서 원문 보기 ↗</a>
      ${same.length ? `<section class="rel"><h2>같은 소식, 다른 매체 <span>${same.length}</span></h2><ul>${same.map(relItem).join('')}</ul></section>` : ''}
      ${topic.length ? `<section class="rel"><h2>${esc(a.category)} 최신 기사</h2><ul>${topic.map(relItem).join('')}</ul></section>` : ''}
    </article>`;
  }

  let listScroll = 0;
  let fromList = false;
  let routed = false;
  function route() {
    const m = location.hash.match(/^#a\/([\w-]+)/);
    const a = m && (state.all.find((x) => x.id === m[1]) || state.bookmarks[m[1]]);
    const reading = !!a;
    if (reading && !document.body.classList.contains('reading')) { listScroll = window.scrollY; fromList = routed; }
    routed = true;
    document.body.classList.toggle('reading', reading);
    $('#detail').hidden = !reading;
    if (reading) { renderDetail(a); window.scrollTo({ top: 0 }); document.title = a.title + ' | AI 뉴스웨이브'; }
    else { document.title = 'AI 뉴스웨이브'; window.scrollTo({ top: listScroll }); }
  }
  window.addEventListener('hashchange', route);

  function renderTabs() {
    $('#tabs').innerHTML = TOPICS.map((t) =>
      `<button class="tab" role="tab" data-t="${esc(t)}" aria-selected="${t === state.topic}">${esc(t)}</button>`).join('');
  }

  function renderSheet() {
    $('#sheetList').innerHTML = state.sources.map((s) =>
      `<label class="row"><input type="checkbox" value="${esc(s.id)}" ${state.picked.has(s.id) ? 'checked' : ''}>${esc(s.name)}<span class="n">${s.count}</span></label>`).join('');
  }

  function resetPage() { state.shown = PAGE; }

  // ---- 이벤트 ----
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('.tab'); if (!b) return;
    if (location.hash) location.hash = '';
    state.topic = b.dataset.t; resetPage(); renderTabs(); render(); window.scrollTo({ top: 0 });
  });
  function toggleBookmark(e) {
    const b = e.target.closest('.bm'); if (!b) return;
    const id = b.dataset.id;
    if (state.bookmarks[id]) delete state.bookmarks[id];
    else {
      const a = state.all.find((x) => x.id === id);
      if (a) state.bookmarks[id] = { ...a, savedAt: Date.now() };
    }
    store.set('bm', state.bookmarks);
    if (state.saved) render();
    else { b.setAttribute('aria-pressed', String(!!state.bookmarks[id])); $('#savedCount').textContent = Object.keys(state.bookmarks).length; }
  }
  $('#list').addEventListener('click', toggleBookmark);
  $('#detail').addEventListener('click', (e) => {
    if (e.target.closest('#btnBack')) {
      // 목록에서 들어왔으면 뒤로 가기, 링크로 바로 들어왔으면 목록으로 이동
      if (fromList) history.back(); else location.hash = '';
      return;
    }
    toggleBookmark(e);
  });

  $('#btnSaved').addEventListener('click', () => { state.saved = !state.saved; resetPage(); render(); window.scrollTo({ top: 0 }); });
  $('#more').addEventListener('click', () => { state.shown += PAGE; render(); });

  $('#btnSearch').addEventListener('click', () => {
    const w = $('#searchWrap'); w.hidden = !w.hidden;
    $('#btnSearch').setAttribute('aria-expanded', String(!w.hidden));
    if (!w.hidden) $('#q').focus(); else { state.q = ''; $('#q').value = ''; resetPage(); render(); }
  });
  $('#searchWrap').addEventListener('submit', (e) => { e.preventDefault(); $('#q').blur(); });
  let timer;
  $('#q').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = e.target.value.trim(); resetPage(); render(); }, 150);
  });

  const sheet = $('#sheet');
  $('#btnSource').addEventListener('click', () => { renderSheet(); sheet.showModal(); });
  $('#sheetClose').addEventListener('click', () => sheet.close());
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });
  $('#sheetReset').addEventListener('click', () => { state.picked.clear(); renderSheet(); resetPage(); render(); });
  $('#sheetList').addEventListener('change', (e) => {
    const c = e.target; if (c.type !== 'checkbox') return;
    c.checked ? state.picked.add(c.value) : state.picked.delete(c.value);
    resetPage(); render();
  });

  // 다크 모드: 기본은 기기 설정을 따르고, 버튼으로 직접 바꾸면 기억합니다.
  const root = document.documentElement;
  const savedTheme = store.get('theme', null);
  if (savedTheme) root.dataset.theme = savedTheme;
  $('#btnTheme').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    root.dataset.theme = next; store.set('theme', next);
  });

  // ---- 데이터 로드 ----
  function apply(data) {
    state.all = data.articles || [];
    queueMicrotask(route);
    state.sources = data.sources || [];
    state.updatedAt = data.updatedAt;
    $('#updated').textContent = data.updatedAt ? ago(data.updatedAt) + ' 업데이트' : '';
    if (state.all.some((a) => a.sample)) {
      const n = $('#notice');
      n.hidden = false;
      n.textContent = '지금 보이는 기사는 화면 확인용 샘플입니다. 자동 수집이 한 번 실행되면 실제 기사로 바뀝니다.';
    }
    render();
  }

  renderTabs();
  $('#list').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
  if (window.__DATA__) apply(window.__DATA__);
  else {
    fetch('data/articles.json', { cache: 'no-cache' })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(apply)
      .catch(() => { $('#list').innerHTML = '<div class="empty">기사를 불러오지 못했습니다.<br>잠시 후 다시 시도해 주세요.</div>'; });
  }

  // 홈 화면 추가(PWA)를 위한 서비스 워커
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.__DATA__) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  // 앱을 다시 열었을 때 오래된 화면이면 새로 불러오기
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.updatedAt && !window.__DATA__ && Date.now() - new Date(state.updatedAt) > 20 * 60000) {
      fetch('data/articles.json', { cache: 'no-cache' }).then((r) => r.json()).then(apply).catch(() => {});
    }
  });
})();
