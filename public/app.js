(() => {
  'use strict';
  const PAGE = 30;
  const $ = (s) => document.querySelector(s);

  // 저장소 접근이 막힌 환경에서도 화면이 동작하도록 try/catch 로 감쌉니다.
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  };

  const state = {
    all: [], sources: [], updatedAt: null,
    kws: new Set(), keywords: [], picked: new Set(), q: '', saved: false, shown: PAGE,
    bookmarks: store.get('bm', {}),
    stories: [], storyOf: new Map(),
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
      if (state.kws.size && !(a.kw || []).some((k) => state.kws.has(k))) return false;
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
    // 언론사 이미지가 없으면 Unsplash 자료 사진(있을 때)을, 그것도 없으면 주제 색 블록을 씁니다.
    const media = !a.image && a.photo
      ? `<div class="media stock"><img src="${esc(a.photo.url)}" alt="" loading="lazy" onerror="this.parentNode.innerHTML='<div class=&quot;ph&quot; aria-hidden=&quot;true&quot;>${esc(a.category)}</div>'"><span class="credit">자료 사진</span></div>`
      : a.image
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
        <span class="src">${esc(a.source)}</span>${a.newsroom ? '<span class="nr">기업 뉴스룸</span>' : ''}<span>·</span><time datetime="${esc(a.published)}">${ago(a.published)}</time>
        <button class="bm" data-id="${esc(a.id)}" aria-pressed="${on}" aria-label="북마크">${STAR}</button>
      </div>
    </article>`;
  }

  function render() {
    const list = filtered();
    renderHot(list);
    renderBrief();
    const part = list.slice(0, state.shown);
    $('#list').innerHTML = part.length
      ? part.map(card).join('')
      : `<div class="empty">${state.saved ? '저장한 기사가 없습니다.<br>기사 카드의 별을 눌러 북마크해 보세요.' : '조건에 맞는 기사가 없습니다.'}</div>`;
    $('#more').hidden = list.length <= state.shown && state.full;
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
    // 글자가 너무 적은 제목(외국어 제목 등)은 우연히 겹치기 쉬워 비교하지 않습니다.
    if (a.size < 6 || b.size < 6) return 0;
    return n / Math.min(a.size, b.size);
  }
  const gramCache = new Map();
  const gramsOf = (x) => { let g = gramCache.get(x.id); if (!g) { g = grams(x.title); gramCache.set(x.id, g); } return g; };

  // 최근 48시간 기사를 같은 소식끼리 묶고, 보도한 매체 수가 많은 순으로 5개를 뽑습니다.
  function hot(list) {
    const since = Date.now() - 48 * 3600000;
    const recent = list.filter((x) => new Date(x.published).getTime() >= since);
    const used = new Set();
    const groups = [];
    for (const a of recent) {
      if (used.has(a.id)) continue;
      const g = gramsOf(a);
      const members = [a];
      for (const b of recent) {
        if (b === a || used.has(b.id)) continue;
        if (similarity(g, gramsOf(b)) >= 0.45) members.push(b);
      }
      members.forEach((m) => used.add(m.id));
      const outlets = new Set(members.map((m) => m.sourceId)).size;
      if (outlets >= 2) groups.push({ lead: a, outlets, members });
    }
    groups.sort((p, q) => q.outlets - p.outlets || new Date(q.lead.published) - new Date(p.lead.published));
    return groups.slice(0, 5);
  }

  // 오늘의 AI 브리핑: 가장 최근 브리핑 하나를 전광판 위에 한 줄로 걸어 둡니다.
  function renderBrief() {
    const box = $('#brief');
    const b = state.stories.filter((s) => s.type === 'briefing').sort((p, q) => new Date(q.published) - new Date(p.published))[0];
    box.hidden = !b || state.q || state.saved;
    if (b) box.innerHTML = `<a href="#s/${esc(b.id)}"><b>AI 브리핑</b><span>${esc(b.title)}</span><i aria-hidden="true">→</i></a>`;
  }

  function renderHot(list) {
    const box = $('#hot');
    const top = state.q || state.saved ? [] : hot(list);
    box.hidden = !top.length;
    if (!top.length) return;
    box.innerHTML = `<h2>지금 많이 보도되는 소식 <span>최근 48시간, 보도한 매체 수 기준</span></h2><ol>${top.map((t, i) => {
      const st = t.members.map((m) => state.storyOf.get(m.id)).find(Boolean);
      const href = st ? `#s/${st.id}` : `#a/${t.lead.id}`;
      return `<li data-cat="${esc(st ? st.category : t.lead.category)}"><a href="${esc(href)}"><b class="rk">${i + 1}</b><span class="tag">${esc(st ? st.category : t.lead.category)}</span><span class="ht">${esc(st ? st.title : t.lead.title)}</span><span class="hn">매체 ${t.outlets}곳</span></a></li>`;
    }).join('')}</ol>`;
  }

  function related(a) {
    const g = gramsOf(a);
    const same = [];
    const topic = [];
    for (const x of state.all) {
      if (x.id === a.id) continue;
      const s = similarity(g, gramsOf(x));
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
      <div class="meta"><b>${esc(a.source)}</b>${a.newsroom ? '<span class="nr">기업 뉴스룸</span>' : ''}<span>·</span><time datetime="${esc(a.published)}">${fullDate(a.published)}</time>
        <button class="bm" data-id="${esc(a.id)}" aria-pressed="${on}" aria-label="북마크">${STAR}</button></div>
      ${a.image ? `<figure class="hero"><img src="${esc(a.image)}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></figure>`
        : a.photo ? `<figure class="hero"><img src="${esc(a.photo.url)}" alt="" onerror="this.parentNode.remove()"><figcaption>자료 사진: <a href="${esc(a.photo.authorUrl)}" target="_blank" rel="noopener">${esc(a.photo.author)}</a> / <a href="${esc(a.photo.link)}" target="_blank" rel="noopener">${a.photo.source === 'pexels' ? 'Pexels' : 'Unsplash'}</a>. 기사 내용과 직접 관련 없는 참고 이미지입니다.</figcaption></figure>` : ''}
      ${a.points && a.points.length ? `<section class="points"><h2>핵심 요약</h2><ul>${a.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
      ${a.restricted ? '' : `<section class="sum">
        <h2>언론사 요약</h2>
        <p>${a.summary ? esc(a.summary) : '이 기사는 언론사가 요약을 제공하지 않았습니다. 원문에서 내용을 확인해 주세요.'}</p>
        <p class="note">언론사 RSS 가 제공한 요약입니다. 전체 내용은 원문에서 확인하세요.</p>
      </section>`}
      ${a.restricted ? '<p class="note-only">이 매체 기사는 제목만 소개합니다. 내용은 원문에서 확인해 주세요.</p>' : ''}
      <a class="cta" href="${esc(a.link)}" target="_blank" rel="noopener noreferrer" data-out="${esc(a.source)}">${esc(a.source)}에서 원문 보기 ↗</a>
      ${state.storyOf.get(a.id) ? `<a class="story-link" href="#s/${esc(state.storyOf.get(a.id).id)}">${esc(state.storyOf.get(a.id).title)} →</a>` : ''}
      ${same.length ? `<section class="rel"><h2>같은 소식, 다른 매체 <span>${same.length}</span></h2><ul>${same.map(relItem).join('')}</ul></section>` : ''}
      ${topic.length ? `<section class="rel"><h2>${esc(a.category)} 최신 기사</h2><ul>${topic.map(relItem).join('')}</ul></section>` : ''}
    </article>`;
  }

  function renderStory(st) {
    const srcs = st.sources.map((x) => `<li><a href="${esc(x.link)}" target="_blank" rel="noopener noreferrer"><span class="r-src">${esc(x.name)}</span><span class="r-title">${esc(x.title)}</span><span class="ext">↗</span></a></li>`).join('');
    $('#detail').innerHTML = `<article class="read story" data-cat="${esc(st.category)}">
      <button class="back" type="button" id="btnBack">← 목록으로</button>
      <span class="tag">${esc(st.category)}</span>
      <h1>${esc(st.title)}</h1>
      <div class="meta"><b class="byline">뉴스웨이브</b><span>·</span><time datetime="${esc(st.published)}">${fullDate(st.published)}</time><span>·</span><span>${st.sources.length}개 매체 보도 종합</span></div>
      ${st.points && st.points.length ? `<section class="points"><h2>핵심 요약</h2><ul>${st.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
      <div class="story-body">${st.body.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
      <section class="rel src"><h2>출처 <span>${st.sources.length}</span></h2><ul>${srcs}</ul></section>
      <p class="note">이 글은 위 매체들의 보도에서 확인된 사실을 뉴스웨이브가 새로 정리한 것입니다. 자세한 내용은 각 언론사 원문을 확인하세요.</p>
    </article>`;
  }

  let listScroll = 0;
  let fromList = false;
  let routed = false;
  function route() {
    const m = location.hash.match(/^#([as])\/([\w-]+)/);
    const a = m && m[1] === 'a' && (state.all.find((x) => x.id === m[2]) || state.bookmarks[m[2]]);
    const st = m && m[1] === 's' && state.stories.find((x) => x.id === m[2]);
    const reading = !!(a || st);
    if (m && m[1] === 'a' && !a && !state.full) { ensureFull().then(route); return; }
    if (reading && !document.body.classList.contains('reading')) { listScroll = window.scrollY; fromList = routed; }
    routed = true;
    document.body.classList.toggle('reading', reading);
    $('#detail').hidden = !reading;
    if (reading) {
      if (st) renderStory(st); else renderDetail(a);
      // GA4: 상세 화면은 주소의 # 뒤만 바뀌어 페이지 조회로 잡히지 않으므로 기사 조회 이벤트를 따로 보냅니다.
      if (typeof gtag === 'function') {
        const x = st || a;
        gtag('event', st ? 'view_story' : 'view_article', { article_id: x.id, article_title: x.title, source: st ? '뉴스웨이브' : a.source, category: x.category });
      }
      window.scrollTo({ top: 0 }); document.title = (st || a).title + ' | AI 뉴스웨이브';
    }
    else { document.title = 'AI 뉴스웨이브'; window.scrollTo({ top: listScroll }); }
  }
  window.addEventListener('hashchange', route);
  // GA4: 원문 보기 클릭을 매체별로 셉니다.
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-out]');
    if (o && typeof gtag === 'function') gtag('event', 'open_original', { source: o.dataset.out });
  });

  // 탭에는 상위 5개만 두고, 나머지는 "키워드 전체" 시트에서 상위 30개 중 여러 개를 고릅니다.
  const TAB_TOP = 5;
  function renderTabs() {
    queueMicrotask(() => typeof updateTabEdges === 'function' && updateTabEdges());
    const one = state.kws.size === 1 ? [...state.kws][0] : null;
    const top = state.keywords.slice(0, TAB_TOP);
    const extra = state.kws.size && !(one && top.some((t) => t.label === one));
    const tabs = [`<button class="tab" role="tab" data-t="" aria-selected="${!state.kws.size}">전체</button>`]
      .concat(top.map((t, i) => `<button class="tab" role="tab" data-t="${esc(t.label)}" aria-selected="${t.label === one}"><i class="rk">${i + 1}</i>${esc(t.label)}</button>`));
    if (state.keywords.length > TAB_TOP) {
      tabs.push(`<button class="tab more-kw" type="button" id="btnKw" aria-pressed="${!!extra}">${extra ? `키워드 ${state.kws.size}개 선택` : '키워드 전체'} <span aria-hidden="true">＋</span></button>`);
    }
    $('#tabs').innerHTML = tabs.join('');
    // 여러 키워드를 골랐으면 맨 끝의 선택 표시가 보이도록 탭 줄을 끝으로 넘깁니다.
    if (extra) requestAnimationFrame(() => { const t = $('#tabs'); t.scrollLeft = t.scrollWidth; });
  }

  function renderKwSheet() {
    $('#kwList').innerHTML = state.keywords.map((k, i) =>
      `<label class="kw-item"><input type="checkbox" value="${esc(k.label)}" ${state.kws.has(k.label) ? 'checked' : ''}><i class="rk">${i + 1}</i><span>${esc(k.label)}</span></label>`).join('');
  }

  function renderSheet() {
    $('#sheetList').innerHTML = state.sources.map((s) =>
      `<label class="row"><input type="checkbox" value="${esc(s.id)}" ${state.picked.has(s.id) ? 'checked' : ''}>${esc(s.name)}<span class="n">${s.count}</span></label>`).join('');
  }

  function resetPage() { state.shown = PAGE; }

  // 키워드 탭이 넘칠 때 양 끝 흐림과 화살표를 켭니다.
  const tabbar = $('#tabbar');
  const tabsEl = $('#tabs');
  function updateTabEdges() {
    const max = tabsEl.scrollWidth - tabsEl.clientWidth;
    tabbar.classList.toggle('can-l', tabsEl.scrollLeft > 4);
    tabbar.classList.toggle('can-r', tabsEl.scrollLeft < max - 4);
  }
  tabsEl.addEventListener('scroll', updateTabEdges, { passive: true });
  window.addEventListener('resize', updateTabEdges);
  tabbar.addEventListener('click', (e) => {
    const b = e.target.closest('.tscroll'); if (!b) return;
    tabsEl.scrollBy({ left: (b.classList.contains('next') ? 1 : -1) * tabsEl.clientWidth * 0.7 });
  });

  // ---- 이벤트 ----
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('.tab'); if (!b) return;
    if (b.id === 'btnKw') { renderKwSheet(); $('#kwSheet').showModal(); return; }
    if (location.hash) location.hash = '';
    state.kws = new Set(b.dataset.t ? [b.dataset.t] : []); resetPage(); renderTabs(); render(); window.scrollTo({ top: 0 });
    if (state.kws.size) ensureFull();
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
  $('#more').addEventListener('click', () => { state.shown += PAGE; if (state.shown >= filtered().length) ensureFull(); render(); });

  $('#btnSearch').addEventListener('click', () => {
    const w = $('#searchWrap'); w.hidden = !w.hidden;
    $('#btnSearch').setAttribute('aria-expanded', String(!w.hidden));
    if (!w.hidden) $('#q').focus(); else { state.q = ''; $('#q').value = ''; resetPage(); render(); }
  });
  $('#searchWrap').addEventListener('submit', (e) => { e.preventDefault(); $('#q').blur(); });
  let timer;
  $('#q').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = e.target.value.trim(); resetPage(); render(); if (state.q) ensureFull(); }, 150);
  });

  const kwSheet = $('#kwSheet');
  $('#kwClose').addEventListener('click', () => kwSheet.close());
  kwSheet.addEventListener('click', (e) => { if (e.target === kwSheet) kwSheet.close(); });
  kwSheet.addEventListener('close', () => { if (location.hash) location.hash = ''; renderTabs(); });
  $('#kwReset').addEventListener('click', () => { state.kws.clear(); renderKwSheet(); resetPage(); render(); });
  $('#kwList').addEventListener('change', (e) => {
    const c = e.target; if (c.type !== 'checkbox') return;
    c.checked ? state.kws.add(c.value) : state.kws.delete(c.value);
    resetPage(); render(); ensureFull();
  });

  const sheet = $('#sheet');
  $('#btnSource').addEventListener('click', () => { renderSheet(); sheet.showModal(); });
  $('#sheetClose').addEventListener('click', () => sheet.close());
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });
  $('#sheetReset').addEventListener('click', () => { state.picked.clear(); renderSheet(); resetPage(); render(); });
  $('#sheetList').addEventListener('change', (e) => {
    const c = e.target; if (c.type !== 'checkbox') return;
    c.checked ? state.picked.add(c.value) : state.picked.delete(c.value);
    resetPage(); render(); ensureFull();
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
    state.full = !data.partial;
    state.keywords = data.keywords || [];
    for (const k of state.kws) if (!state.keywords.some((x) => x.label === k)) state.kws.delete(k);
    renderTabs();
    const kwNote = $('#kwNote');
    if (kwNote) {
      const days = data.keywordSince ? Math.min(data.keywordDays || 30, Math.max(1, Math.round((Date.now() - new Date(data.keywordSince)) / 86400000) + 1)) : 0;
      kwNote.hidden = !state.keywords.length;
      kwNote.textContent = `상단 탭은 최근 ${days}일 AI 기사에서 많이 언급된 키워드 순위입니다`;
    }
    queueMicrotask(route);
    state.sources = data.sources || [];
    state.updatedAt = data.updatedAt;
    if (state.all.some((a) => a.sample)) {
      const n = $('#notice');
      n.hidden = false;
      n.textContent = '지금 보이는 기사는 화면 확인용 샘플입니다. 자동 수집이 한 번 실행되면 실제 기사로 바뀝니다.';
    }
    render();
  }

  function applyStories(d) {
    state.stories = (d && d.stories) || [];
    state.storyOf = new Map();
    for (const st of state.stories) if (st.type !== 'briefing') for (const x of st.sources) if (!state.storyOf.has(x.id)) state.storyOf.set(x.id, st);
    renderBrief();
    if (state.all.length) render();
    route();
  }
  // 첫 화면은 최근 48시간 기사만 받고, 전체가 필요할 때(검색, 키워드, 매체 선택, 더 보기, 오래된 기사 주소) 전체 파일을 받습니다.
  let loadFull = null;
  let fullPromise = null;
  function ensureFull() {
    if (state.full || !loadFull) return Promise.resolve();
    if (!fullPromise) fullPromise = loadFull().then((d) => apply(d)).catch(() => { fullPromise = null; });
    return fullPromise;
  }
  window.__ensureFull = ensureFull;

  if (!window.__DATA__) fetch('data/stories.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then(applyStories).catch(() => {});

  renderTabs();
  $('#list').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
  if (window.__DATA__) apply(window.__DATA__);
  else {
    // 배포 직후처럼 일시적으로 실패하는 경우가 있어 2초 간격으로 두 번 더 시도합니다.
    const load = (n, file = 'data/articles-recent.json') => fetch(file, { cache: 'no-cache' })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch((e) => { if (n > 0) return new Promise((ok) => setTimeout(ok, 2000)).then(() => load(n - 1, n === 1 ? 'data/articles.json' : file)); throw e; });
    loadFull = () => load(1, 'data/articles.json');
    load(2)
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
      fetch(state.full ? 'data/articles.json' : 'data/articles-recent.json', { cache: 'no-cache' }).then((r) => r.json()).then(apply).catch(() => {});
    }
  });
})();
