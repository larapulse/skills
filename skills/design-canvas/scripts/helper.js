// Adapted from obra/superpowers (MIT), modified. See THIRD_PARTY_NOTICES.md.
(function() {
  const MIN_RECONNECT_MS = 500;
  const MAX_RECONNECT_MS = 30000;
  const TOMBSTONE_AFTER_MS = 15000; // show the "paused" overlay after this long disconnected

  // Pure: next backoff delay (doubles, capped). Exported for unit tests.
  function nextReconnectDelay(current, max) {
    return Math.min(current * 2, max);
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { nextReconnectDelay, MIN_RECONNECT_MS, MAX_RECONNECT_MS, TOMBSTONE_AFTER_MS };
  }

  // Everything below is browser-only; bail out when loaded in Node (tests).
  if (typeof window === 'undefined') return;

  const DC = window.__DC || { screen: null, latest: true };

  let ws = null;
  let eventQueue = [];
  let reconnectDelay = MIN_RECONNECT_MS;
  let reconnectTimer = null;
  let disconnectedSince = null;
  let everConnected = false;
  let tombstoneShown = false;

  function sessionKey() {
    try {
      return window.sessionStorage && window.sessionStorage.getItem('design-canvas-session-key');
    } catch (e) {}
    return null;
  }

  // ===== Session storage (survives reloads within this tab) =====
  function load(key, fallback) {
    try {
      const v = window.sessionStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { window.sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function drop(key) {
    try { window.sessionStorage.removeItem(key); } catch (e) {}
  }
  const screenKey = (k) => k + ':' + (DC.screen || '-');

  function websocketUrl() {
    const key = sessionKey();
    return 'ws://' + window.location.host + (key ? '/?key=' + encodeURIComponent(key) : '');
  }

  function reloadAfterRecovery() {
    const key = sessionKey();
    if (key) {
      window.location.replace('/?key=' + encodeURIComponent(key));
    } else {
      window.location.reload();
    }
  }

  // Reflect connection state in the frame's status pill (absent on full-doc screens).
  function setStatus(state) {
    const el = document.querySelector('.status');
    if (!el) return;
    const map = {
      connecting:   ['Connecting...',   'var(--text-tertiary)'],
      connected:    ['Connected',     'var(--success)'],
      reconnecting: ['Reconnecting...', 'var(--warning)'],
      disconnected: ['Disconnected',  'var(--error)']
    };
    const [text, color] = map[state] || map.disconnected;
    el.textContent = text;
    el.title = text;
    el.style.setProperty('--status-color', color);
  }

  // Self-styled so it works on framed and full-document screens alike.
  function showTombstone() {
    if (tombstoneShown) return;
    tombstoneShown = true;
    const el = document.createElement('div');
    el.id = 'bs-tombstone';
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;' +
      'align-items:center;justify-content:center;padding:2rem;text-align:center;' +
      'background:rgba(20,20,22,0.92);color:#f5f5f7;font-family:system-ui,sans-serif';
    el.innerHTML = '<div style="max-width:480px">' +
      '<h2 style="margin:0 0 .5rem;font-weight:600">design-canvas paused</h2>' +
      '<p style="margin:0;opacity:.85">This design canvas has stopped. ' +
      'Ask your coding agent to bring it back. This page reconnects automatically.</p></div>';
    if (document.body) document.body.appendChild(el);
  }

  function connect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    setStatus(everConnected ? 'reconnecting' : 'connecting');
    ws = new WebSocket(websocketUrl());

    ws.onopen = () => {
      const recovered = tombstoneShown;
      everConnected = true;
      disconnectedSince = null;
      reconnectDelay = MIN_RECONNECT_MS;
      tombstoneShown = false;
      setStatus('connected');
      eventQueue.forEach(e => ws.send(JSON.stringify(e)));
      eventQueue = [];
      // Recovered from a tombstoned outage (e.g. the server restarted on the same
      // port), reload through the keyed bootstrap when possible so the cookie is
      // refreshed before the visible URL returns to bare /.
      if (recovered) reloadAfterRecovery();
    };

    ws.onmessage = (msg) => {
      let data;
      try { data = JSON.parse(msg.data); } catch (e) { return; }
      if (data.type === 'reload') handleReload(data);
      if (data.type === 'status') showAgentStatus(data.text);
    };

    ws.onclose = () => {
      ws = null;
      if (disconnectedSince === null) disconnectedSince = Date.now();
      if (Date.now() - disconnectedSince >= TOMBSTONE_AFTER_MS) {
        setStatus('disconnected');
        showTombstone();
      } else {
        setStatus('reconnecting');
      }
      reconnectTimer = setTimeout(connect, reconnectDelay);
      reconnectDelay = nextReconnectDelay(reconnectDelay, MAX_RECONNECT_MS);
    };

    // Let onclose own reconnection so we don't schedule it twice.
    ws.onerror = () => { try { ws.close(); } catch (e) {} };
  }

  // Events that don't count toward the "Send to AI (N)" badge.
  const UNCOUNTED = ['submit', 'draw-undo', 'comment-delete', 'edit-undo', 'tweak', 'export', 'revert'];
  let pending = load(screenKey('dc-pending'), 0);
  let tweakCounted = false;

  function sendEvent(event) {
    event.timestamp = Date.now();
    event.screen = DC.screen;
    if (UNCOUNTED.indexOf(event.type) < 0) setPending(pending + 1);
    if (event.type === 'tweak' && !tweakCounted) { tweakCounted = true; setPending(pending + 1); }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    } else {
      eventQueue.push(event);
    }
  }

  function setPending(n) {
    pending = n;
    save(screenKey('dc-pending'), n);
    const el = document.querySelector('.send-btn .count');
    if (el) el.textContent = n > 0 ? String(n) : '';
  }

  // ===== Transcript (left column) =====
  function transcript() { return load('dc-transcript', []); }

  function addTranscript(who, text, extra) {
    if (!text) return;
    const items = transcript();
    const last = items[items.length - 1];
    if (last && last.who === who && last.text === text) return;
    items.push(Object.assign({ who, text, screen: DC.screen }, extra || {}));
    save('dc-transcript', items.slice(-100));
    renderTranscript();
  }

  // When a new screen first loads, the previous screen's question joins the
  // thread just before the answers it got.
  function threadPreviousQuestion() {
    const prev = load('dc-last-question', null);
    if (!prev || prev.screen === DC.screen) return;
    const items = transcript();
    const at = items.findIndex(i => i.screen === prev.screen);
    items.splice(at < 0 ? items.length : at, 0, { who: 'ai', text: prev.text, screen: prev.screen });
    save('dc-transcript', items.slice(-100));
    drop('dc-last-question');
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function renderTranscript() {
    const list = document.querySelector('.dc-transcript');
    if (!list) return;
    list.innerHTML = '';
    const resolved = load('dc-resolved', {});
    transcript().forEach(item => {
      let li;
      if (item.kind === 'comment') {
        const n = item.n;
        if (resolved[n]) {
          li = el('li', 'resolved');
          li.appendChild(el('span', '', 'Comment ' + n + ' resolved: ' + item.text));
        } else {
          li = el('li', 'comment');
          li.appendChild(el('span', 'num', String(n)));
          li.appendChild(document.createTextNode(' ' + item.text));
          if (replies[n]) {
            const r = el('div', 'reply');
            r.appendChild(el('span', 'who', 'AI'));
            r.appendChild(document.createTextNode(replies[n]));
            li.appendChild(r);
          }
        }
        li.addEventListener('click', () => {
          const pin = pins.find(p => p.n === n);
          if (pin) openPin(pin);
        });
      } else {
        li = el('li', item.who);
        if (item.who !== 'meta') li.appendChild(el('span', 'who', item.who === 'ai' ? 'AI' : 'You'));
        li.appendChild(document.createTextNode(item.text));
      }
      list.appendChild(li);
    });
    const scroller = document.querySelector('.sidebar-scroll');
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }

  // ===== Agent status chip =====
  function showAgentStatus(text) {
    const chip = document.querySelector('.agent-chip');
    if (chip) {
      chip.hidden = !text;
      chip.textContent = text || '';
    }
    if (text) addTranscript('ai', text);
  }

  // ===== Reload handling: keep the user's work across same-screen updates =====
  function handleReload(data) {
    if (!DC.latest) { refreshVersions(); return; }
    if (data.screen && data.screen === DC.screen && !data.added) {
      saveRestoreState();
      window.location.reload();
      return;
    }
    window.location.replace('/');
  }

  function saveRestoreState() {
    save(screenKey('dc-restore'), {
      view: bd ? { x: bd.x, y: bd.y, scale: bd.scale } : null,
      pins: pins.map(p => ({ n: p.n, host: hostIndex(p.host), x: p.x, y: p.y, text: p.text })),
      strokes: strokes.map(s => ({ n: s.n, pts: s.pts })),
      tweaks: currentTweaks(),
      tool
    });
  }

  function hostIndex(host) {
    return Array.prototype.indexOf.call(document.querySelectorAll('.artboard, .mockup, #frame-content'), host);
  }

  // Capture-phase router: swallow the click after a board pan, reroute clicks
  // to pin placement in comment mode, and keep edit-mode clicks from selecting.
  // stopPropagation() in the capture phase prevents inline onclick handlers
  // (toggleSelect) from firing.
  let suppressNextClick = false;
  document.addEventListener('click', (e) => {
    if (suppressNextClick) {
      suppressNextClick = false;
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (!e.target.closest || e.target.closest('.dc-popover, .dc-pin')) return;
    const inDesign = e.target.closest('.artboard-body, .mockup-body');
    if (tool === 'comment' && inDesign) {
      e.stopPropagation();
      e.preventDefault();
      placePin(e);
    } else if (tool === 'edit' && inDesign) {
      e.stopPropagation();
    }
  }, true);

  function choiceText(el) {
    const title = el.querySelector(':scope > .artboard-title, :scope h3');
    const src = title ? (title.firstChild && title.firstChild.nodeType === 3 ? title.firstChild : title) : el;
    return src.textContent.trim().replace(/\s+/g, ' ').slice(0, 120);
  }

  // Capture clicks on choice elements
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-choice]');
    if (!target) return;

    sendEvent({
      type: 'click',
      text: choiceText(target),
      choice: target.dataset.choice,
      id: target.id || null
    });

    if (target.dataset.submit !== undefined) setTimeout(window.submitRound, 0);
  });

  // Frame UI: selection tracking
  window.selectedChoice = null;

  window.toggleSelect = function(el) {
    const container = el.closest('.options') || el.closest('.cards') || el.closest('.board-surface');
    const multi = container && container.dataset.multiselect !== undefined;
    if (container && !multi) {
      container.querySelectorAll('.option, .card, .artboard').forEach(o => o.classList.remove('selected'));
    }
    if (multi) {
      el.classList.toggle('selected');
    } else {
      el.classList.add('selected');
    }
    window.selectedChoice = el.dataset.choice;
  };

  window.sendNote = function() {
    const input = document.getElementById('composer-input');
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    sendEvent({ type: 'note', text });
    addTranscript('you', text);
    input.value = '';
    drop('dc-draft');
    window.submitRound();
  };

  window.submitRound = function() {
    const selections = Array.prototype.map.call(
      document.querySelectorAll('.selected[data-choice]'), el => el.dataset.choice);
    sendEvent({ type: 'submit', selections, count: pending });
    const parts = [];
    if (selections.length) parts.push('chose ' + selections.join(', '));
    if (pending) parts.push(pending + ' item' + (pending === 1 ? '' : 's'));
    addTranscript('meta', 'Sent to AI' + (parts.length ? ': ' + parts.join(', ') : ''));
    setPending(0);
    tweakCounted = false;
    const btn = document.querySelector('.send-btn');
    if (btn) {
      btn.classList.add('sent');
      setTimeout(() => btn.classList.remove('sent'), 1200);
    }
    const chip = document.querySelector('.agent-chip');
    if (chip) { chip.hidden = false; chip.textContent = 'Sent. The AI is on it...'; }
  };

  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'composer-input') save('dc-draft', e.target.value);
  });

  function isTyping(t) {
    return t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.isContentEditable);
  }

  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === 'Enter' && mod) {
      e.preventDefault();
      const input = document.getElementById('composer-input');
      if (input && input.value.trim()) window.sendNote(); else window.submitRound();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && e.target && e.target.id === 'composer-input') {
      e.preventDefault();
      window.sendNote();
      return;
    }
    if (isTyping(e.target)) return;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); window.undo(); return; }
    if (mod || e.altKey) return;
    const keys = { v: 'select', c: 'comment', e: 'edit', d: 'draw' };
    const k = e.key.toLowerCase();
    if (keys[k]) window.setTool(keys[k]);
    else if (k === 't') window.toggleTweaks();
    else if (e.key === 'Escape') { closeMenus(); window.setTool('select'); }
  });

  // ===== Tools =====
  let tool = 'select';

  window.setTool = function(name) {
    if (name === 'draw' && !bd) return; // drawing lives on the board only
    if (tool === 'edit' && name !== 'edit') setEditable(false);
    tool = (tool === name && name !== 'select') ? 'select' : name;
    if (tool === 'edit') setEditable(true);
    document.body.classList.toggle('comment-mode', tool === 'comment');
    document.body.classList.toggle('draw-mode', tool === 'draw');
    document.body.classList.toggle('edit-mode', tool === 'edit');
    document.querySelectorAll('.tool[data-tool]').forEach(b => {
      if (b.dataset.tool !== 'tweaks') b.classList.toggle('active', b.dataset.tool === tool);
    });
    if (tool !== 'comment') clearHover();
  };
  // Back-compat with screens that call the old toggles directly.
  window.toggleCommentMode = () => window.setTool('comment');
  window.toggleDrawMode = () => window.setTool('draw');

  // ===== Menus =====
  window.toggleMenu = function(btn) {
    const menu = btn.closest('.menu');
    const open = !menu.classList.contains('open');
    closeMenus();
    menu.classList.toggle('open', open);
  };
  function closeMenus() {
    document.querySelectorAll('.menu.open').forEach(m => m.classList.remove('open'));
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest || !e.target.closest('.menu')) closeMenus();
  });

  // ===== Unified undo (strokes, pins, edits) =====
  const undoStack = [];

  window.undo = function() {
    const a = undoStack.pop();
    if (!a) return;
    if (a.kind === 'stroke') {
      a.stroke.path.remove();
      strokes.splice(strokes.indexOf(a.stroke), 1);
      sendEvent({ type: 'draw-undo', n: a.stroke.n });
    } else if (a.kind === 'pin') {
      deletePin(a.pin);
    } else if (a.kind === 'edit') {
      a.el.textContent = a.before;
      a.el.classList.remove('dc-edited');
      sendEvent({ type: 'edit-undo', n: a.n });
    }
  };
  window.drawUndo = window.undo;

  // ===== Canvas board: pan / zoom =====
  let bd = null; // { board, surface, x, y, scale }

  function applyBoardTransform() {
    bd.surface.style.transform = 'translate(' + bd.x + 'px,' + bd.y + 'px) scale(' + bd.scale + ')';
    const label = bd.board.querySelector('.dc-zoom-label');
    if (label) label.textContent = Math.round(bd.scale * 100) + '%';
  }

  function fitTo(arts) {
    if (!arts.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    arts.forEach(a => {
      minX = Math.min(minX, a.offsetLeft); minY = Math.min(minY, a.offsetTop);
      maxX = Math.max(maxX, a.offsetLeft + a.offsetWidth);
      maxY = Math.max(maxY, a.offsetTop + a.offsetHeight);
    });
    const r = bd.board.getBoundingClientRect(), pad = 48;
    bd.scale = Math.min(1.5, Math.max(0.1,
      Math.min((r.width - pad) / (maxX - minX), (r.height - pad) / (maxY - minY))));
    bd.x = (r.width - (maxX - minX) * bd.scale) / 2 - minX * bd.scale;
    bd.y = (r.height - (maxY - minY) * bd.scale) / 2 - minY * bd.scale;
    applyBoardTransform();
  }

  function fitBoard() {
    fitTo(Array.prototype.slice.call(bd.surface.querySelectorAll('.artboard')));
  }

  function boardZoomAt(cx, cy, factor) {
    const s = Math.min(2.5, Math.max(0.1, bd.scale * factor));
    bd.x = cx - (cx - bd.x) * (s / bd.scale);
    bd.y = cy - (cy - bd.y) * (s / bd.scale);
    bd.scale = s;
    applyBoardTransform();
  }

  window.boardFit = fitBoard;
  window.boardZoom = function(factor) {
    const r = bd.board.getBoundingClientRect();
    boardZoomAt(r.width / 2, r.height / 2, factor);
  };

  const VIEWPORTS = { mobile: 390, tablet: 834, desktop: 1280 };

  function decorateArtboard(a) {
    const vp = a.dataset.viewport;
    if (vp && VIEWPORTS[vp] && !a.style.width) a.style.width = VIEWPORTS[vp] + 'px';
    const title = a.querySelector('.artboard-title');
    if (!title) return;
    if (vp) {
      const tag = document.createElement('span');
      tag.className = 'viewport-tag';
      tag.textContent = vp + ' ' + parseInt(a.style.width, 10) + 'px';
      title.appendChild(tag);
    }
    const spacer = document.createElement('span');
    spacer.className = 'spacer';
    title.appendChild(spacer);

    if (isPlayable(a)) {
      const play = document.createElement('button');
      play.className = 'dc-play';
      play.textContent = '▶ Play';
      play.title = 'Try this design: clicks go to the prototype instead of choosing it';
      play.addEventListener('click', (e) => {
        e.stopPropagation();
        const on = a.classList.toggle('playing');
        play.textContent = on ? '■ Stop' : '▶ Play';
      });
      title.appendChild(play);
    }

    if (a.dataset.choice) {
      const choose = document.createElement('button');
      choose.className = 'dc-choose';
      choose.textContent = 'Choose';
      title.appendChild(choose); // bubbles to the artboard's own toggleSelect
    }

    title.addEventListener('dblclick', (e) => { e.stopPropagation(); fitTo([a]); });

    const body = a.querySelector('.artboard-body');
    if (body) {
      body.addEventListener('click', (e) => {
        if (a.classList.contains('playing') || tool === 'edit') e.stopPropagation();
      });
    }
  }

  const PLAYABLE = '[onclick],[oninput],[onchange],[onsubmit],[onkeydown],[onpointerdown],' +
    '[onmouseenter],[onmouseover],details,input,select,textarea';
  function isPlayable(a) {
    const body = a.querySelector('.artboard-body');
    return a.hasAttribute('data-playable') || !!(body && body.querySelector(PLAYABLE));
  }

  // Wrap into rows so wide exploration rounds (6-10 artboards) stay legible.
  function autoLayout(arts) {
    const free = arts.filter(a => !a.style.left);
    if (!free.length) return;
    const perRow = free.length <= 4 ? free.length : Math.ceil(free.length / Math.ceil(free.length / 5));
    let x = 40, y = 40, rowH = 0;
    free.forEach((a, i) => {
      if (i && i % perRow === 0) { x = 40; y += rowH + 64; rowH = 0; }
      a.style.left = x + 'px'; a.style.top = y + 'px';
      x += a.offsetWidth + 48;
      rowH = Math.max(rowH, a.offsetHeight);
    });
  }

  function initBoard(restore) {
    const board = document.querySelector('.board');
    const surface = board && board.querySelector('.board-surface');
    if (!board || !surface) {
      const drawBtn = document.querySelector('.tool[data-tool="draw"]');
      if (drawBtn) drawBtn.disabled = true;
      return;
    }
    bd = { board, surface, x: 0, y: 0, scale: 1 };

    const arts = Array.prototype.slice.call(surface.querySelectorAll('.artboard'));
    arts.forEach(decorateArtboard);
    autoLayout(arts);
    if (restore && restore.view) {
      Object.assign(bd, restore.view);
      applyBoardTransform();
    } else {
      fitBoard();
    }

    const SVG_NS = 'http://www.w3.org/2000/svg';
    bd.overlay = document.createElementNS(SVG_NS, 'svg');
    bd.overlay.setAttribute('class', 'draw-overlay');
    surface.appendChild(bd.overlay);

    let drag = null, moved = false;
    board.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.board-controls, .board-panel, .dc-popover, .tweaks-card, .version-banner')) return;
      if (tool === 'comment') return;
      if (tool === 'edit' && e.target.closest('[data-dc-editable]')) return;
      if (e.target.closest('.artboard.playing .artboard-body')) return;
      if (tool === 'draw') {
        e.preventDefault();
        const p = surfacePoint(e);
        drawing = { pts: [p], path: document.createElementNS(SVG_NS, 'path') };
        drawing.path.setAttribute('d', 'M' + p[0] + ' ' + p[1]);
        bd.overlay.appendChild(drawing.path);
        return;
      }
      drag = { px: e.clientX, py: e.clientY, x: bd.x, y: bd.y };
      moved = false;
    });
    window.addEventListener('pointermove', (e) => {
      if (drawing) {
        const p = surfacePoint(e), last = drawing.pts[drawing.pts.length - 1];
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 2) return;
        drawing.pts.push(p);
        drawing.path.setAttribute('d', drawing.path.getAttribute('d') + ' L' + p[0] + ' ' + p[1]);
        return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.px, dy = e.clientY - drag.py;
      if (!moved && Math.hypot(dx, dy) < 5) return; // same 5px arm distance as clicks
      moved = true;
      board.classList.add('panning');
      bd.x = drag.x + dx; bd.y = drag.y + dy;
      applyBoardTransform();
    });
    window.addEventListener('pointerup', () => {
      if (drawing) { finishStroke(); suppressNextClick = true; return; }
      if (drag && moved) suppressNextClick = true;
      drag = null;
      board.classList.remove('panning');
    });
    board.addEventListener('wheel', (e) => {
      if (e.target.closest('.tweaks-card')) return;
      e.preventDefault();
      const r = board.getBoundingClientRect();
      boardZoomAt(e.clientX - r.left, e.clientY - r.top, Math.pow(1.0015, -e.deltaY));
    }, { passive: false });

    if (!board.querySelector('.board-controls')) {
      const c = document.createElement('div');
      c.className = 'board-controls';
      c.innerHTML = '<button onclick="boardZoom(0.8)" title="Zoom out">-</button>' +
        '<button class="dc-zoom-label" onclick="boardFit()" title="Fit to screen">100%</button>' +
        '<button onclick="boardZoom(1.25)" title="Zoom in">+</button>' +
        '<button onclick="undo()" title="Undo last stroke, pin or edit (⌘Z)">↩</button>';
      board.appendChild(c);
      applyBoardTransform();
    }
  }

  function surfacePoint(e) {
    const r = bd.board.getBoundingClientRect();
    return [Math.round((e.clientX - r.left - bd.x) / bd.scale),
            Math.round((e.clientY - r.top - bd.y) / bd.scale)];
  }

  // ===== Comment mode: element pins =====
  let hoverEl = null;
  const pins = []; // { n, host, x, y, text, el }

  function clearHover() {
    if (hoverEl) { hoverEl.classList.remove('dc-hover'); hoverEl = null; }
  }

  document.addEventListener('mouseover', (e) => {
    if (tool !== 'comment') return;
    clearHover();
    const t = e.target;
    if (t.closest('.artboard-body, .mockup-body') && !t.closest('.dc-pin, .dc-popover')) {
      hoverEl = t;
      t.classList.add('dc-hover');
    }
  });

  // Human-readable pointer to the clicked element, so the agent knows which
  // part of which variant the comment is about.
  function describeTarget(el) {
    const labeled = el.closest('[data-label]');
    const art = el.closest('[data-choice]');
    let text = (el.textContent || '').trim().replace(/\s+/g, ' ');
    if (text.length > 80) text = text.slice(0, 77) + '...';
    const parts = [];
    let n = el;
    while (n && n.classList && !n.classList.contains('artboard-body') &&
           !n.classList.contains('mockup-body') && parts.length < 6) {
      let i = 1, s = n;
      while ((s = s.previousElementSibling)) if (s.tagName === n.tagName) i++;
      parts.unshift(n.tagName.toLowerCase() + (i > 1 ? ':nth-of-type(' + i + ')' : ''));
      n = n.parentElement;
    }
    return {
      artboard: art ? art.dataset.choice : null,
      label: labeled ? labeled.dataset.label : null,
      path: parts.join(' > ') || el.tagName.toLowerCase(),
      text: text || null
    };
  }

  // Pin numbers run across the whole session so replies can refer to them.
  function nextPinNumber() {
    const n = load('dc-pin-seq', 0) + 1;
    save('dc-pin-seq', n);
    return n;
  }

  function hostScale(host) {
    return (bd && host.closest('.board-surface')) ? bd.scale : 1;
  }

  function makePin(host, n, x, y, text) {
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    const el = document.createElement('div');
    el.className = 'dc-pin';
    el.textContent = n;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    host.appendChild(el);
    const pin = { n, host, x, y, text, el };
    el.addEventListener('click', (e) => { e.stopPropagation(); openPin(pin); });
    pins.push(pin);
    renderComments();
    return pin;
  }

  function closePopovers() {
    document.querySelectorAll('.dc-popover').forEach(p => p.remove());
  }

  function placePin(e) {
    clearHover();
    closePopovers();
    const el = e.target;
    const host = el.closest('.artboard') || el.closest('.mockup') || el.closest('#frame-content');
    if (!host) return;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    const r = host.getBoundingClientRect();
    // Undo the board zoom so the pin lands under the cursor at any scale.
    const scale = hostScale(host);
    const x = (e.clientX - r.left) / scale, y = (e.clientY - r.top) / scale;

    const ghost = document.createElement('div');
    ghost.className = 'dc-pin';
    ghost.textContent = '+';
    ghost.style.left = x + 'px'; ghost.style.top = y + 'px';
    host.appendChild(ghost);

    const pop = popover(host, x, y,
      '<textarea rows="2" placeholder="What about this part?"></textarea>' +
      '<div class="dc-popover-actions"><button class="dc-cancel">Cancel</button>' +
      '<button class="dc-send">Add</button></div>');
    const ta = pop.querySelector('textarea');
    ta.focus();

    const target = describeTarget(el);
    const close = () => { pop.remove(); ghost.remove(); };
    pop.querySelector('.dc-cancel').addEventListener('click', close);
    pop.querySelector('.dc-send').addEventListener('click', () => {
      const text = ta.value.trim();
      close();
      if (!text) return;
      const n = nextPinNumber();
      const pin = makePin(host, n, x, y, text);
      sendEvent({ type: 'comment', n, target, text });
      const log = load('dc-comment-log', {});
      log[n] = { text, screen: DC.screen };
      save('dc-comment-log', log);
      addTranscript('you', (target.label ? target.label + ': ' : '') + text, { kind: 'comment', n });
      undoStack.push({ kind: 'pin', pin });
    });
    ta.addEventListener('keydown', (ev) => {
      ev.stopPropagation(); // keep Enter away from the composer handler
      if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); pop.querySelector('.dc-send').click(); }
      if (ev.key === 'Escape') close();
    });
  }

  function popover(host, x, y, html) {
    const pop = document.createElement('div');
    pop.className = 'dc-popover';
    pop.style.left = (x + 16) + 'px'; pop.style.top = y + 'px';
    pop.innerHTML = html;
    pop.addEventListener('click', (e) => e.stopPropagation());
    host.appendChild(pop);
    return pop;
  }

  function message(who, text, ai) {
    const m = el('div', 'msg');
    const b = el('b', ai ? 'ai' : '', who);
    m.appendChild(b);
    m.appendChild(document.createTextNode(': ' + text));
    return m;
  }

  function openPin(pin) {
    closePopovers();
    pins.forEach(p => p.el.classList.toggle('active', p === pin));
    const pop = popover(pin.host, pin.x, pin.y, '');
    pop.appendChild(message('You', pin.text));
    (load('dc-pin-replies', {})[pin.n] || []).forEach(t => pop.appendChild(message('You', t)));
    if (replies[pin.n]) pop.appendChild(message('AI', replies[pin.n], true));
    const row = el('div', 'dc-reply-row');
    const ta = el('textarea');
    ta.rows = 1;
    ta.placeholder = 'Reply...';
    const resolve = el('button', 'dc-resolve', 'Resolve');
    row.appendChild(ta);
    row.appendChild(resolve);
    pop.appendChild(row);
    const actions = el('div', 'dc-popover-actions');
    const del = el('button', 'dc-delete', 'Delete');
    const close = el('button', 'dc-cancel', 'Close');
    actions.appendChild(del);
    actions.appendChild(close);
    pop.appendChild(actions);

    const done = () => { pop.remove(); pin.el.classList.remove('active'); };
    close.addEventListener('click', done);
    del.addEventListener('click', () => { done(); deletePin(pin); });
    resolve.addEventListener('click', () => {
      const resolved = load('dc-resolved', {});
      resolved[pin.n] = true;
      save('dc-resolved', resolved);
      sendEvent({ type: 'comment-resolve', n: pin.n });
      done();
      renderComments();
    });
    ta.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Escape') done();
      if (ev.key !== 'Enter' || ev.shiftKey) return;
      ev.preventDefault();
      const text = ta.value.trim();
      if (!text) return;
      sendEvent({ type: 'comment-reply', n: pin.n, text });
      const all = load('dc-pin-replies', {});
      (all[pin.n] = all[pin.n] || []).push(text);
      save('dc-pin-replies', all);
      addTranscript('you', 'Re ' + pin.n + ': ' + text);
      openPin(pin);
    });
    ta.focus();
  }

  function deletePin(pin) {
    const i = pins.indexOf(pin);
    if (i < 0) return;
    pins.splice(i, 1);
    pin.el.remove();
    sendEvent({ type: 'comment-delete', n: pin.n });
    renderComments();
  }

  // Agent replies: <ul class="dc-replies"><li data-comment="3">Thinned to 500</li></ul>
  const replies = load('dc-replies', {});
  function readReplies() {
    document.querySelectorAll('.dc-replies [data-comment]').forEach(li => {
      replies[li.dataset.comment] = li.textContent.trim();
    });
    save('dc-replies', replies);
  }

  function renderComments() {
    const resolved = load('dc-resolved', {});
    pins.forEach(p => p.el.classList.toggle('resolved', Boolean(resolved[p.n])));
    renderTranscript();
  }

  // ===== Edit mode: retype text in place =====
  let editSeq = 0;

  function textLeaves() {
    const out = [];
    document.querySelectorAll('.artboard-body *, .mockup-body *').forEach(el => {
      if (/^(SCRIPT|STYLE|SVG|PATH|IMG|INPUT|TEXTAREA|SELECT)$/i.test(el.tagName)) return;
      if (el.closest('.dc-pin, .dc-popover')) return;
      const hasText = Array.prototype.some.call(el.childNodes,
        c => c.nodeType === 3 && c.textContent.trim());
      if (hasText) out.push(el);
    });
    return out;
  }

  function setEditable(on) {
    textLeaves().forEach(el => {
      if (on) {
        el.setAttribute('data-dc-editable', '');
        try { el.contentEditable = 'plaintext-only'; } catch (e) { el.contentEditable = 'true'; }
        if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
      } else {
        el.removeAttribute('data-dc-editable');
        el.removeAttribute('contenteditable');
      }
    });
  }

  let editBefore = null;
  document.addEventListener('focusin', (e) => {
    if (e.target.hasAttribute && e.target.hasAttribute('data-dc-editable')) editBefore = e.target.textContent;
  });
  document.addEventListener('focusout', (e) => {
    const el = e.target;
    if (!el.hasAttribute || !el.hasAttribute('data-dc-editable') || editBefore === null) return;
    const before = editBefore, after = el.textContent;
    editBefore = null;
    if (before === after) return;
    const n = ++editSeq;
    el.classList.add('dc-edited');
    sendEvent({ type: 'edit', n, target: describeTarget(el), before: before.trim(), after: after.trim() });
    addTranscript('you', 'Edited "' + before.trim().slice(0, 40) + '" -> "' + after.trim().slice(0, 40) + '"');
    undoStack.push({ kind: 'edit', n, el, before });
  });
  document.addEventListener('keydown', (e) => {
    const el = e.target;
    if (!el.hasAttribute || !el.hasAttribute('data-dc-editable')) return;
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
    if (e.key === 'Escape') { el.textContent = editBefore || el.textContent; editBefore = el.textContent; el.blur(); }
  }, true);

  // ===== Tweaks: live CSS-variable controls declared by the screen =====
  // <div class="tweaks" data-target="#frame-content">
  //   <label>Spacing <input type="range" data-tweak="--gap" data-unit="px" min="4" max="48" value="16"></label>
  // </div>
  let tweakCard = null, tweakTimer = null;
  const tweakInputs = [];

  function tweakTargets(input) {
    const host = input.closest('.tweaks');
    const sel = (host && host.dataset.target) || '#frame-content';
    return document.querySelectorAll(sel);
  }

  function tweakValue(input) {
    return input.value + (input.dataset.unit || '');
  }

  function applyTweak(input) {
    const v = tweakValue(input);
    tweakTargets(input).forEach(t => t.style.setProperty(input.dataset.tweak, v));
    const out = input.parentElement.querySelector('output');
    if (out) out.textContent = v;
  }

  function currentTweaks() {
    const vars = {};
    tweakInputs.forEach(i => { vars[i.dataset.tweak] = tweakValue(i); });
    return vars;
  }

  function sendTweaks(final) {
    sendEvent({ type: 'tweak', vars: currentTweaks(), final: Boolean(final) });
  }

  function initTweaks(restore) {
    const groups = document.querySelectorAll('#frame-content .tweaks');
    if (!groups.length) return;
    tweakCard = document.createElement('div');
    tweakCard.className = 'tweaks-card';
    tweakCard.innerHTML = '<div class="label">Tweaks</div>';
    groups.forEach(g => tweakCard.appendChild(g));
    const actions = document.createElement('div');
    actions.className = 'tweaks-actions';
    actions.innerHTML = '<button class="chrome-btn dc-reset">Reset</button>' +
      '<button class="chrome-btn send-btn dc-lock">Apply everywhere</button>';
    tweakCard.appendChild(actions);
    (document.querySelector('.board') || document.querySelector('.main')).appendChild(tweakCard);

    tweakCard.querySelectorAll('[data-tweak]').forEach(input => {
      tweakInputs.push(input);
      input.dataset.initial = input.value;
      const label = input.closest('label');
      if (label && input.type === 'range' && !label.querySelector('output')) {
        const out = document.createElement('output');
        label.insertBefore(out, input);
      }
      const saved = restore && restore.tweaks && restore.tweaks[input.dataset.tweak];
      if (saved) input.value = input.type === 'range' ? parseFloat(saved) : saved;
      applyTweak(input);
      input.addEventListener('input', () => {
        applyTweak(input);
        clearTimeout(tweakTimer);
        tweakTimer = setTimeout(() => sendTweaks(false), 400);
      });
    });
    actions.querySelector('.dc-reset').addEventListener('click', () => {
      tweakInputs.forEach(i => { i.value = i.dataset.initial; applyTweak(i); });
      sendTweaks(false);
    });
    actions.querySelector('.dc-lock').addEventListener('click', () => {
      sendTweaks(true);
      const vars = currentTweaks();
      addTranscript('you', 'Apply tweaks: ' + Object.keys(vars).map(k => k + ' ' + vars[k]).join(', '));
      window.submitRound();
    });
    const btn = document.querySelector('.tool[data-tool="tweaks"]');
    if (btn) { btn.disabled = false; btn.classList.add('active'); }
  }

  window.toggleTweaks = function() {
    if (!tweakCard) return;
    tweakCard.hidden = !tweakCard.hidden;
    const btn = document.querySelector('.tool[data-tool="tweaks"]');
    if (btn) btn.classList.toggle('active', !tweakCard.hidden);
  };

  // ===== Draw mode: freehand strokes on the board =====
  let drawing = null;
  const strokes = []; // { n, path, pts }

  function strokeSeq() {
    const n = load('dc-stroke-seq', 0) + 1;
    save('dc-stroke-seq', n);
    return n;
  }

  function addStrokePath(pts) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' '));
    bd.overlay.appendChild(path);
    return path;
  }

  function finishStroke() {
    const pts = drawing.pts, path = drawing.path;
    drawing = null;
    if (pts.length < 3) { path.remove(); return; } // stray tap, not a stroke
    const n = strokeSeq();
    const stroke = { n, path, pts };
    strokes.push(stroke);
    undoStack.push({ kind: 'stroke', stroke });

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, len = 0;
    pts.forEach((p, i) => {
      minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
      maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
      if (i) len += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    });
    const bbox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

    // Rough intent hint so the agent can read the gesture without rendering it.
    const closeGap = Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
    let shape = 'freehand';
    if (closeGap < Math.max(30, len * 0.2) && len > 80) shape = 'enclosure';
    else if (bbox.h < 14 && bbox.w > 40) shape = 'underline';

    // What the stroke covers: intersect its bbox (in client space) with
    // artboards and their data-label regions.
    const r = bd.board.getBoundingClientRect();
    const cb = { left: bbox.x * bd.scale + bd.x + r.left, top: bbox.y * bd.scale + bd.y + r.top,
                 right: (bbox.x + bbox.w) * bd.scale + bd.x + r.left,
                 bottom: (bbox.y + bbox.h) * bd.scale + bd.y + r.top };
    const hits = (el) => {
      const b = el.getBoundingClientRect();
      return b.left < cb.right && b.right > cb.left && b.top < cb.bottom && b.bottom > cb.top;
    };
    let artboard = null;
    const labels = [];
    bd.surface.querySelectorAll('.artboard').forEach(a => {
      if (!hits(a)) return;
      if (!artboard && a.dataset.choice) artboard = a.dataset.choice;
      a.querySelectorAll('[data-label]').forEach(l => {
        if (hits(l) && labels.indexOf(l.dataset.label) < 0) labels.push(l.dataset.label);
      });
    });

    // Downsample to keep events small; coordinates are surface units.
    const step = Math.max(1, Math.floor(pts.length / 60));
    const sampled = pts.filter((_, i) => i % step === 0 || i === pts.length - 1);

    sendEvent({ type: 'draw', n, shape, target: { artboard, labels }, bbox, points: sampled });
  }

  // ===== Version history =====
  function refreshVersions() {
    const list = document.querySelector('.versions .menu-list');
    if (!list || !window.fetch) return;
    fetch('/screens', { credentials: 'same-origin' }).then(r => r.json()).then(screens => {
      list.innerHTML = '';
      screens.slice().reverse().forEach((s, i) => {
        const b = document.createElement('button');
        const v = screens.length - i;
        b.textContent = 'v' + v + ' ' + s.name.replace(/\.html$/, '');
        const hint = document.createElement('span');
        hint.className = 'hint';
        hint.textContent = new Date(s.mtime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
          (i === 0 ? ', latest' : '');
        b.appendChild(hint);
        if (s.name === DC.screen) b.classList.add('current');
        b.addEventListener('click', () => {
          window.location.href = i === 0 ? '/' : '/?screen=' + encodeURIComponent(s.name);
        });
        list.appendChild(b);
      });
      const btn = document.querySelector('.version-btn');
      if (btn) btn.textContent = 'History (' + screens.length + ')';
    }).catch(() => {});
  }

  function initVersionBanner() {
    if (DC.latest || !DC.screen) return;
    const banner = document.createElement('div');
    banner.className = 'version-banner';
    banner.innerHTML = '<span></span><button class="dc-revert">Bring this back</button>' +
      '<button class="dc-latest">Back to latest</button>';
    banner.querySelector('span').textContent = 'Viewing an earlier screen: ' + DC.screen.replace(/\.html$/, '');
    banner.querySelector('.dc-latest').addEventListener('click', () => { window.location.href = '/'; });
    banner.querySelector('.dc-revert').addEventListener('click', () => {
      sendEvent({ type: 'revert', to: DC.screen });
      addTranscript('you', 'Bring back ' + DC.screen.replace(/\.html$/, ''));
      window.submitRound();
    });
    (document.querySelector('.main') || document.body).appendChild(banner);
  }

  // ===== Export =====
  function exportRoot() {
    return document.querySelector('.artboard.selected .artboard-body') ||
      (document.querySelectorAll('.artboard').length === 1 && document.querySelector('.artboard .artboard-body')) ||
      document.querySelector('#frame-content');
  }

  function cleanClone(root) {
    const clone = root.cloneNode(true);
    clone.querySelectorAll('.dc-pin, .dc-popover, .draw-overlay, .tweaks-card, .board-controls, .dc-replies')
      .forEach(n => n.remove());
    clone.querySelectorAll('[contenteditable], [data-dc-editable], .dc-hover, .dc-edited').forEach(n => {
      n.removeAttribute('contenteditable');
      n.removeAttribute('data-dc-editable');
      n.classList.remove('dc-hover', 'dc-edited');
    });
    return clone;
  }

  function designHead() {
    const parts = [];
    document.querySelectorAll('#frame-content link[rel="stylesheet"], #frame-content style').forEach(n => {
      parts.push(n.outerHTML);
    });
    const vars = currentTweaks();
    const keys = Object.keys(vars);
    if (keys.length) parts.push('<style>:root{' + keys.map(k => k + ':' + vars[k]).join(';') + '}</style>');
    return parts.join('\n');
  }

  window.exportHtml = function() {
    closeMenus();
    const root = exportRoot();
    const art = root.closest('.artboard');
    const name = (DC.screen || 'design').replace(/\.html$/, '') + (art && art.dataset.choice ? '-' + art.dataset.choice : '');
    const doc = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + name + '</title>\n' +
      '<style>body{margin:0;font-family:system-ui,sans-serif}</style>\n' + designHead() + '\n</head>\n<body>\n' +
      cleanClone(root).innerHTML + '\n</body>\n</html>\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));
    a.download = name + '.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };

  window.exportPdf = function() {
    closeMenus();
    const holder = document.createElement('div');
    holder.id = 'dc-print-root';
    holder.appendChild(cleanClone(exportRoot()));
    document.body.appendChild(holder);
    document.body.classList.add('dc-printing');
    const done = () => {
      document.body.classList.remove('dc-printing');
      holder.remove();
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  };

  window.exportHandoff = function() {
    closeMenus();
    const art = document.querySelector('.artboard.selected');
    sendEvent({ type: 'export', format: 'handoff', artboard: art ? art.dataset.choice || null : null });
    addTranscript('you', 'Hand off for implementation');
    window.submitRound();
  };

  // Expose API for explicit use
  window.designCanvas = {
    send: sendEvent,
    choice: (value, metadata = {}) => sendEvent({ type: 'choice', choice: value, value, ...metadata }),
    submit: () => window.submitRound()
  };

  // ===== Boot =====
  const restore = load(screenKey('dc-restore'), null);
  drop(screenKey('dc-restore'));

  const panel = document.querySelector('#frame-content .board-panel');
  const slot = document.getElementById('dc-panel-slot');
  if (panel && slot) slot.appendChild(panel);

  // <div class="dc-goal" data-step="3" data-steps="Direction|Layout|..."><h1>Goal</h1><p>Why</p></div>
  function initGoal() {
    const slot = document.querySelector('.dc-goal-slot');
    const fresh = document.querySelector('#frame-content .dc-goal');
    let goal = load('dc-goal', null);
    if (fresh) {
      goal = { html: fresh.innerHTML, step: Number(fresh.dataset.step) || 0, steps: (fresh.dataset.steps || '').split('|').filter(Boolean) };
      fresh.remove();
      if (DC.latest) save('dc-goal', goal);
    }
    if (!slot || !goal) return;
    const box = el('div', 'dc-goal');
    box.innerHTML = goal.html;
    if (goal.steps.length) {
      const prog = el('div', 'dc-progress');
      const text = el('div', 'dc-progress-text');
      const now = goal.steps[goal.step - 1];
      if (now) { const b = el('b', '', 'Now: ' + now); text.appendChild(b); }
      text.appendChild(el('span', '', 'Step ' + goal.step + ' of ' + goal.steps.length));
      const bar = el('div', 'dc-progress-bar');
      goal.steps.forEach((name, i) => {
        const seg = el('span', i + 1 < goal.step ? 'done' : i + 1 === goal.step ? 'now' : '');
        seg.title = name;
        bar.appendChild(seg);
      });
      prog.appendChild(text);
      prog.appendChild(bar);
      box.appendChild(prog);
    }
    slot.appendChild(box);
    const h = box.querySelector('h1');
    if (h) document.title = h.textContent.trim() + ' - design-canvas';
  }

  const seen = load('dc-seen', []);
  if (DC.screen && DC.latest && seen.indexOf(DC.screen) < 0) {
    threadPreviousQuestion();
    seen.push(DC.screen);
    save('dc-seen', seen.slice(-200));
  }
  const question = document.querySelector('#dc-panel-slot h3');
  if (DC.latest && question) {
    save('dc-last-question', { screen: DC.screen, text: question.textContent.trim().replace(/\s+/g, ' ') });
  }
  initGoal();

  const draft = load('dc-draft', '');
  const composer = document.getElementById('composer-input');
  if (draft && composer) composer.value = draft;

  readReplies();
  initBoard(restore);
  initTweaks(restore);
  if (restore) {
    (restore.pins || []).forEach(p => {
      const host = document.querySelectorAll('.artboard, .mockup, #frame-content')[p.host];
      if (host) makePin(host, p.n, p.x, p.y, p.text);
    });
    if (bd) (restore.strokes || []).forEach(s => strokes.push({ n: s.n, pts: s.pts, path: addStrokePath(s.pts) }));
    if (restore.tool && restore.tool !== 'select') window.setTool(restore.tool);
  }
  renderComments();
  renderTranscript();
  setPending(pending);
  initVersionBanner();
  refreshVersions();
  connect();
})();
