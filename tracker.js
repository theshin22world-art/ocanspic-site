/* 오캔스픽 공용 유입 추적 (2026-11-21)
   1) ?ref= · utm_* 를 7일 동안 이 브라우저에 보관 (localStorage ocan_attr_v1, Last-Touch: 새 ref 가 오면 새 7일. utm 만 오면 기존 ref 는 지우지 않음)
   2) ?ref= 로 들어오면 세션당 한 번 partner-api(log_click) 에 클릭을 남긴다 (화면 그리기를 막지 않음)
   3) buy 링크에 ref · utm 을 이어 붙인다
   4) config.js 의 CLARITY_ID 가 있으면 Microsoft Clarity 를 불러오고 ref_code · utm · page_type · order_id · plan 을 태깅
   window.OCAN_TRACKER.getValidAttr() → { ref, utm_source, ..., landing_page, referrer, saved_at, expires_at } 또는 {} */
(function () {
  'use strict';
  var AK = 'ocan_attr_v1', VK = 'ocan_vid_v1', TTL = 7 * 24 * 60 * 60 * 1000;
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var C = window.OCAN_CONFIG || {};
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function normRef(v) { return String(v || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 24); }
  function pageType() {
    var p = location.pathname.replace(/\.html$/, '').replace(/\/+$/, '');
    var n = p.split('/').pop() || 'home';
    return n === 'index' ? 'home' : n;
  }

  /* 저장된 값 읽기 (만료면 지움). 예전 형식 {p:{...}, ts} 는 ts 로부터 7일로 바꿔 읽는다 */
  function read() {
    var raw = ls(AK); if (!raw) return {};
    var a; try { a = JSON.parse(raw); } catch (e) { ls(AK, null); return {}; }
    if (a && a.p && a.ts && !a.expires_at) {
      var b = { saved_at: a.ts, expires_at: a.ts + TTL };
      if (a.p.ref) b.ref = normRef(a.p.ref);
      UTM.forEach(function (k) { if (a.p[k]) b[k] = String(a.p[k]).slice(0, 160); });
      a = b;
    }
    if (!a || !a.expires_at || Date.now() > a.expires_at) { ls(AK, null); return {}; }
    return a;
  }
  function getValidAttr() { var a = read(); var o = {}; for (var k in a) o[k] = a[k]; return o; }

  /* 이번 주소의 ref · utm 반영 */
  var q = new URLSearchParams(location.search), gotRef = normRef(q.get('ref')), gotUtm = {}, anyUtm = false;
  UTM.forEach(function (k) { var v = q.get(k); if (v) { gotUtm[k] = String(v).slice(0, 160); anyUtm = true; } });
  if (gotRef || anyUtm) {
    var cur = read(), now = Date.now(), next;
    if (gotRef) {
      next = { ref: gotRef, saved_at: now, expires_at: now + TTL, landing_page: location.pathname + location.search, referrer: document.referrer || '' };
      UTM.forEach(function (k) { if (gotUtm[k]) next[k] = gotUtm[k]; });
    } else {
      next = { saved_at: now, expires_at: now + TTL, landing_page: location.pathname + location.search, referrer: document.referrer || '' };
      if (cur.ref) { next.ref = cur.ref; next.expires_at = cur.expires_at; }   /* utm 만 새로: ref 는 남기고 ref 의 7일도 그대로 */
      UTM.forEach(function (k) { if (gotUtm[k]) next[k] = gotUtm[k]; });
    }
    ls(AK, JSON.stringify(next));
  }

  /* 익명 방문자 id */
  function visitorId() {
    var v = ls(VK);
    if (!v) { v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2)); ls(VK, v); }
    return v;
  }

  /* 파트너 링크 클릭 기록: 같은 ref 는 세션당 한 번 */
  function api(body) {
    if (!C.SUPABASE_URL || !C.SUPABASE_ANON_KEY || !window.fetch) return Promise.resolve(null);
    return fetch(C.SUPABASE_URL + '/functions/v1/partner-api', {
      method: 'POST', keepalive: true,
      headers: { 'content-type': 'application/json', apikey: C.SUPABASE_ANON_KEY, authorization: 'Bearer ' + C.SUPABASE_ANON_KEY },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); }).catch(function () { return null; });
  }
  if (gotRef && ss('ocan_clk_' + gotRef) !== '1') {
    ss('ocan_clk_' + gotRef, '1');
    setTimeout(function () {
      api({ action: 'log_click', code: gotRef, visitorId: visitorId(), landingPath: location.pathname + location.search, referrer: document.referrer || '', utm: gotUtm });
    }, 0);
  }

  /* buy · start(2026-11-27 정식 가입 · 결제 화면) 링크에 ref · utm 이어 붙이기 */
  function withAttr(href) {
    var a = read(); if (!a.ref && !UTM.some(function (k) { return a[k]; })) return href;
    var hash = '', i = href.indexOf('#'); if (i >= 0) { hash = href.slice(i); href = href.slice(0, i); }
    var j = href.indexOf('?'), base = j >= 0 ? href.slice(0, j) : href, qs = new URLSearchParams(j >= 0 ? href.slice(j + 1) : '');
    if (a.ref && !qs.has('ref')) qs.set('ref', a.ref);
    UTM.forEach(function (k) { if (a[k] && !qs.has(k)) qs.set(k, a[k]); });
    var s = qs.toString(); return base + (s ? '?' + s : '') + hash;
  }
  function isBuy(a) { var h = a.getAttribute('href') || ''; return /^(\.\/|\/)?(buy|start)(\.html)?(\?|#|$)/.test(h); }
  function patchLinks() { [].forEach.call(document.querySelectorAll('a[href]'), function (a) { if (isBuy(a)) a.setAttribute('href', withAttr(a.getAttribute('href'))); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', patchLinks); else patchLinks();
  document.addEventListener('click', function (e) { var a = e.target && e.target.closest && e.target.closest('a[href]'); if (a && isBuy(a)) a.setAttribute('href', withAttr(a.getAttribute('href'))); }, true);

  /* Microsoft Clarity */
  var CID = String(C.CLARITY_ID || '').trim(), pend = [];
  function tag(k, v) {
    if (!CID || v === undefined || v === null || v === '') return;
    if (typeof window.clarity === 'function') { try { window.clarity('set', k, String(v)); } catch (e) {} } else pend.push([k, String(v)]);
  }
  if (CID && /^[a-z0-9]{6,20}$/i.test(CID)) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CID);
    pend.forEach(function (x) { window.clarity('set', x[0], x[1]); }); pend = [];
    var at = read(), pt = pageType();
    tag('page_type', pt);
    tag('ref_code', at.ref); tag('utm_source', at.utm_source); tag('utm_campaign', at.utm_campaign);
    if (pt === 'pay-success' || pt === 'pay-fail') {
      tag('order_id', q.get('paymentId') || q.get('orderId'));
      tag('plan', ss('ocan_buy_plan'));
      tag('pay_result', pt === 'pay-success' ? 'success' : 'fail');
    }
  } else CID = '';

  window.OCAN_TRACKER = { getValidAttr: getValidAttr, visitorId: visitorId, withAttr: withAttr, tag: tag, api: api, TTL: TTL, normRef: normRef };
})();
