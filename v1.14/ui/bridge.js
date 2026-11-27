/* ===========================================================
   晶见 CrystaSee V1.0 — 渲染内核 ↔ 桌面外壳通信桥
   iframe 与外壳可能不同源，统一用 postMessage，不依赖同源访问。
   =========================================================== */
(function () {
  'use strict';
  var parentWin = (window.parent !== window) ? window.parent : null;
  if (!parentWin) return;

  function send(type, data) {
    parentWin.postMessage(Object.assign({ source: 'crystasee-viewer', type: type }, data || {}), '*');
  }
  function cv() { return window.__cviz; }

  function snapshot() {
    var v = cv(); if (!v) return null;
    var c = v.config(), s = v.state;
    return {
      structure: c.structure,
      atoms: v.atomCount(),
      elements: c.visibleElements.slice(),
      bondSource: c.bondSource,
      report: v.report(),
      rangeTip: (document.getElementById('range-tip') || {}).textContent || '',
      keys: {
        style: s.style, scheme: s.scheme, material: s.material, bg: s.bg,
        range: s.rangeMode, proj: s.projection, frame: s.frame,
        labels: s.labels, atomLabels: !!s.atomLabels,
        hbond: s.hbond, vdw: s.vdw, ssao: s.ssao, rotate: s.rotate,
        forceComplete: s.forceComplete, headlight: s.light.follow,
        sc: [s.scA, s.scB, s.scC],
        light: { az: s.light.az, el: s.light.el, inten: s.light.inten },
        params: JSON.parse(JSON.stringify(s.params)),
        res: v.selValue('res-row'), shotBg: v.selValue('shot-bg-row')
      },
      features: (v.featureState ? v.featureState() : null)
    };
  }
  function sendState() { var s = snapshot(); if (s) send('state', { state: s }); }

  function clickSel(sel) {
    var el = document.querySelector(sel);
    if (!el) { send('error', { message: '未找到控件：' + sel }); return false; }
    el.click();
    return true;
  }
  function setInput(id, value, evt) {
    var el = document.getElementById(id);
    if (!el) { send('error', { message: '未找到控件：#' + id }); return; }
    if (el.type === 'checkbox') el.checked = !!value;
    else el.value = value;
    el.dispatchEvent(new Event(evt || 'input', { bubbles: true }));
  }

  /* 内置案例的 CIF 原文内联在 viewer.html 的 #embedded-cifs 中，内核 loadSample()
     只在 iframe 内解析，外壳拿不到原文。这里解码后回传，供 ORTEP / PXRD /
     结构信息等依赖 CIF 文本的功能使用（与本地打开 .cif 的路径保持一致）。 */
  // 内置示例均为可再分发数据：NaCl.cif = COD 1000041 (CC0)，
  // COF-5.cif / Cu-BTC.cif = numat/RASPA2 (MIT)，其余为用户自有 Olex2 精修结果。
  var SAMPLE_FILES = {
    NACL: 'NaCl.cif',
    ADBA1: 'ADBA-form-I.cif', ADBA2: 'ADBA-form-II.cif', ADBA3: 'ADBA-form-III.cif',
    R20210904A: 'r20210904a.cif', R20231217B: 'R20231217b.cif',
    COF5: 'COF-5.cif', CUBTC: 'Cu-BTC.cif'
  };
  function embeddedSample(key) {
    var file = SAMPLE_FILES[key], node = document.getElementById('embedded-cifs');
    if (!file || !node) return null;
    try {
      var data = JSON.parse(node.textContent), b64 = data[file];
      if (!b64) return null;
      var bin = atob(b64);
      var text = new TextDecoder('utf-8').decode(
        Uint8Array.from(bin, function (c) { return c.charCodeAt(0); }));
      return { key: key, name: file, text: text };
    } catch (e) { return null; }
  }

  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.source !== 'crystasee-shell') return;
    var v = cv();
    switch (m.type) {
      case 'click':
        if (clickSel(m.selector)) {
          var sm = /\[data-sample="([^"]+)"\]/.exec(m.selector || '');
          if (sm) {
            var sc = embeddedSample(sm[1]);
            if (sc) send('sampleText', sc);
          }
        }
        break;
      case 'slider':
        setInput(m.id, m.value, 'input');
        break;
      case 'check':
        setInput(m.id, m.value, 'change');
        break;
      case 'number':
        setInput(m.id, m.value, 'change');
        break;
      case 'loadText':
        try { window.__loadText(m.name, m.text); }
        catch (err) { send('error', { message: '文件解析失败：' + err.message }); }
        break;
      case 'setView':
        if (v) v.setView(m.axis, !!m.star);
        break;
      case 'feature':
        // 3D 叠加层：ORTEP 热椭球 / (hkl) 晶面切片
        if (v && typeof v.setFeature === 'function') v.setFeature(m.name, m.data || {});
        break;
      case 'hbpar':
        // 外壳相互作用分析面板传来的氢键几何阈值（H···A 距离上限 / D–H···A 夹角下限）
        if (v && typeof v.setHBondParams === 'function') v.setHBondParams(m.ha, m.ang);
        break;
      case 'fit':
        if (v) v.rebuild(true);
        break;
      case 'resize':
        window.dispatchEvent(new Event('resize'));
        break;
      case 'export':
        if (!v) return;
        try {
          var url = v.renderExport(m.w, m.h, !!m.transparent);
          send('exportData', { url: url, w: m.w, h: m.h, transparent: !!m.transparent });
        } catch (err) { send('error', { message: '导出失败：' + err.message }); }
        break;
      case 'state':
        sendState();
        return;
      default:
        return;
    }
    sendState();
    // 案例演示中的示例结构为异步载入（内联 base64 解码 / fetch 兜底），补一次状态回传
    if (m.type === 'click' && /data-sample/.test(m.selector || '')) setTimeout(sendState, 700);
  });

  // 内核就绪通知；__cviz 可能在 bundle 尾部才挂载，做短轮询
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    if (cv()) { clearInterval(timer); send('ready', { state: snapshot() }); }
    else if (tries > 100) clearInterval(timer);
  }, 60);

  // 内核自身也支持拖入文件 / 快捷键，定期回传状态让外壳摘要保持同步
  setInterval(function () { if (cv()) sendState(); }, 1500);

  // 把内核内部错误 / 说明文字转发给外壳状态栏
  var lastErr = '';
  setInterval(function () {
    var el = document.getElementById('err');
    var t = el ? el.textContent.trim() : '';
    if (t && t !== lastErr) { lastErr = t; send('error', { message: t }); }
    if (!t) lastErr = '';
  }, 400);

  window.addEventListener('error', function (ev) {
    send('error', { message: ev.message });
  });
})();
