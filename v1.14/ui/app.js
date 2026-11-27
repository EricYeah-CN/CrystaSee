/* ===========================================================
   晶见 CrystaSee V1.0 — 桌面外壳逻辑
   顶部菜单栏 + 可吸附参数面板 + 右侧可视化 + 模态工具窗
   =========================================================== */
(function () {
  'use strict';
  var viewer = document.getElementById('viewer');
  var lastState = null, lastExport = null;

  function post(msg) {
    if (!viewer || !viewer.contentWindow) return;
    viewer.contentWindow.postMessage(Object.assign({ source: 'crystasee-shell' }, msg), '*');
  }
  function toast(msg, isErr) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'show' + (isErr ? ' err' : '');
    clearTimeout(window.__csToast);
    window.__csToast = setTimeout(function () { t.className = ''; }, 2600);
  }
  function api() {
    return (window.pywebview && window.pywebview.api) ? window.pywebview.api : null;
  }

  /* ---------- 选项命令映射（与渲染内核控件一一对应） ---------- */
  var CMD = {
    struct: function (v) { return { type: 'click', selector: '#struct-row [data-struct="' + v + '"]' }; },
    // 案例结构位于内核面板的 #sample-row（内置结构 nacl/quartz/diamond 才在 #struct-row）
    sample: function (v) { return { type: 'click', selector: '#sample-row [data-sample="' + v + '"]' }; },
    proj:   function (v) { return { type: 'click', selector: '#proj-row [data-proj="' + v + '"]' }; },
    view:   function (v) { return { type: 'click', selector: '#view-row .sel-opt[data-value="' + v + '"]' }; },
    style:  function (v) { return { type: 'click', selector: '#style-row [data-style="' + v + '"]' }; },
    range:  function (v) { return { type: 'click', selector: '#range-row [data-range="' + v + '"]' }; },
    frame:  function (v) { return { type: 'click', selector: '#frame-row [data-frame="' + v + '"]' }; },
    bg:     function (v) { return { type: 'click', selector: '#bg-row [data-bg="' + v + '"]' }; },
    mat:    function (v) { return { type: 'click', selector: '#mat-row [data-mat="' + v + '"]' }; },
    scheme: function (v) { return { type: 'click', selector: '#scheme-row [data-scheme="' + v + '"]' }; },
    res:    function (v) { return { type: 'click', selector: '#res-row .sel-opt[data-value="' + v + '"]' }; },
    shotBg: function (v) { return { type: 'click', selector: '#shot-bg-row .sel-opt[data-value="' + v + '"]' }; },
  };
  // 8 个内置示例：NaCl（COD/CC0）+ 5 个用户自有有机分子晶体 + COF-5 / Cu-BTC（RASPA2/MIT）
  var SAMPLE_KEYS = ['NACL', 'ADBA1', 'ADBA2', 'ADBA3', 'R20210904A', 'R20231217B', 'COF5', 'CUBTC'];
  var SHORT = {
    struct: { nacl: 'NaCl 盐', quartz: 'α-石英', diamond: '金刚石', NACL: 'NaCl (halite, COD)', ADBA1: 'ADBA Form I', ADBA2: 'ADBA Form II', ADBA3: 'ADBA Form III', R20210904A: 'r20210904a', R20231217B: 'R20231217b', COF5: 'COF-5 (COF)', CUBTC: 'Cu-BTC (MOF)' },
    view: { a: 'a', b: 'b', c: 'c', 'a*': 'a*', 'b*': 'b*', 'c*': 'c*' },
    proj: { persp: '透视（近大远小）', ortho: '正交（无景深）' },
    style: { line: 'Line 线状', stick: 'Stick 棍状', ballstick: 'Ball & Stick 球棍',
      cpk: 'CPK 球堆积', wire: 'Wireframe 线框' },
    range: { interior: '仅晶胞内部（含边界）', complete: '补全截断分子', asu: '仅不对称单元', packing: '堆积模式' },
    frame: { none: '不显示', line: '线状', rod: '棒状' },
    bg: { deep: '深空渐变', void: '纯黑', graphite: '石墨灰', ocean: '深海蓝', purple: '暗紫',
      midnight: '子夜', paper: '纯白（出版风）', custom: '自定义颜色' },
    mat: { gloss: '瓷器光泽', matte: '哑光出版', metal: '金属', plastic: '塑料' },
    scheme: { cpk: 'CPK 标准', contrast: '高对比', family: '元素分族', okabe: '色盲友好' },
    res: { '1600x950': '1600 × 950', '1920x1080': '1920 × 1080', '2560x1440': '2560 × 1440',
      '3840x2160': '3840 × 2160', '2400x2400': '2400 × 2400', custom: '自定义尺寸' },
    shotBg: { opaque: '保留当前背景', transparent: '透明背景' },
  };
  var KEY_TO_CMD = { style: 'style', scheme: 'scheme', material: 'mat', bg: 'bg',
    range: 'range', proj: 'proj', frame: 'frame', res: 'res', shotBg: 'shotBg' };

  function syncSelect(cmd, value) {
    document.querySelectorAll('.cs-select[data-cmd="' + cmd + '"]').forEach(function (box) {
      var opts = box.querySelectorAll('.cs-opt');
      opts.forEach(function (o) { o.classList.toggle('selected', o.dataset.value === value); });
      var label = (SHORT[cmd] || {})[value];
      if (!label) {
        var hit = box.querySelector('.cs-opt[data-value="' + value + '"]');
        label = hit ? hit.textContent.trim() : value;
      }
      var v = box.querySelector('.cs-val');
      if (v) v.textContent = label;
    });
  }
  function selectValue(cmd) {
    var box = document.querySelector('.cs-select[data-cmd="' + cmd + '"] .cs-opt.selected');
    return box ? box.dataset.value : '';
  }

  /* ---------- 统一命令分发（面板选择框 与 顶栏菜单 共用） ---------- */
  function dispatch(cmd, value, opt) {
    closeAllMenus();
    if (CMD[cmd]) {
      var targetCmd = (cmd === 'struct' && SAMPLE_KEYS.indexOf(value) >= 0) ? 'sample' : cmd;
      // 切换结构时清掉上一份 CIF 原文；案例载入后由 sampleText 重新填回
      if (targetCmd === 'struct' || targetCmd === 'sample') { lastCifText = ''; lastCifName = ''; lastLoadedFileName = ''; }
      syncSelect(cmd, value);
      post(CMD[targetCmd](value));
    }
    if (cmd === 'style') showStyleParams(value);
    if (cmd === 'bg' && value === 'paper') toast('已切换纯白背景（出版风）');
  }

  /* ---------- 选择框交互 ---------- */
  document.querySelectorAll('.cs-select').forEach(function (box) {
    box.querySelector('.cs-head').addEventListener('click', function () {
      var wasOpen = box.classList.contains('open');
      document.querySelectorAll('.cs-select.open').forEach(function (b) { b.classList.remove('open'); });
      if (!wasOpen) box.classList.add('open');
    });
    box.querySelectorAll('.cs-opt').forEach(function (opt) {
      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        var cmd = box.dataset.cmd, v = opt.dataset.value;
        var targetCmd = (cmd === 'struct' && SAMPLE_KEYS.indexOf(v) >= 0) ? 'sample' : cmd;
        syncSelect(cmd, v);
        box.classList.remove('open');
        post(CMD[targetCmd](v));
        if (cmd === 'style') showStyleParams(v);
        if (cmd === 'bg' && v === 'paper') toast('已切换纯白背景（出版风）');
        if (targetCmd === 'sample') toast('正在载入 ' + (SHORT.struct[v] || v) + '…');
        if (cmd === 'res') document.getElementById('customSizeRow').style.display = (v === 'custom') ? 'flex' : 'none';
      });
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.cs-select')) {
      document.querySelectorAll('.cs-select.open').forEach(function (b) { b.classList.remove('open'); });
    }
  });

  /* ---------- 可视化窗口顶部固定视角工具条 ---------- */
  var viewBar = document.getElementById('viewBar');
  if (viewBar) {
    viewBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.vb-btn');
      if (!btn) return;
      if (btn.dataset.view) { dispatch('view', btn.dataset.view); }
      else if (btn.dataset.proj) { dispatch('proj', btn.dataset.proj); }
      else if (btn.id === 'vb-fit') { post({ type: 'fit' }); toast('视角已复位'); }
      else if (btn.id === 'vb-rotate') {
        var box = document.querySelector('input[data-check="chk-rotate"]');
        if (box) { box.checked = !box.checked; post({ type: 'check', id: 'chk-rotate', value: box.checked }); }
      }
    });
  }

  /* ---------- 滑条 / 勾选 / 数字 ---------- */
  function fmt(slider) {
    var dec = +(slider.dataset.dec || 2), unit = slider.dataset.unit || '';
    return (+slider.value).toFixed(dec) + unit;
  }
  document.querySelectorAll('input[data-slider]').forEach(function (s) {
    s.addEventListener('input', function () {
      var out = s.parentElement.querySelector('output');
      if (out) out.textContent = fmt(s);
      post({ type: 'slider', id: s.dataset.slider, value: s.value });
    });
  });
  document.querySelectorAll('input[data-check]').forEach(function (c) {
    c.addEventListener('change', function () { post({ type: 'check', id: c.dataset.check, value: c.checked }); });
  });
  // 相互作用：氢键 / 范德华 切换时同步顶部菜单「显示 ▸ 相互作用」勾选指示，并给出颜色提示
  function bindIntIndicator(checkId, indId, onMsg, offMsg) {
    var box = document.querySelector('input[data-check="' + checkId + '"]');
    var ind = document.getElementById(indId);
    if (box) box.addEventListener('change', function () {
      if (ind) ind.textContent = box.checked ? '✓' : '';
      toast(box.checked ? onMsg : offMsg);
    });
  }
  bindIntIndicator('chk-hbond', 'mi-hbond-state', '已显示氢键（青绿色虚线）', '已隐藏氢键');
  bindIntIndicator('chk-vdw', 'mi-vdw-state', '已显示范德华相互作用（橙色虚线）', '已隐藏范德华相互作用');
  document.querySelectorAll('input[data-number]').forEach(function (n) {
    n.addEventListener('change', function () { post({ type: 'number', id: n.dataset.number, value: n.value }); });
  });
  var PARAM_IDS = {
    'p-line-w': ['line', 'w'], 'p-stick-r': ['stick', 'r'],
    'p-bs-ball': ['ballstick', 'ball'], 'p-bs-bond': ['ballstick', 'bond'],
    'p-cpk-s': ['cpk', 's'],
    'p-wire-l': ['wire', 'l'], 'p-wire-a': ['wire', 'a'],
  };
  function showStyleParams(style) {
    document.querySelectorAll('[data-style-group]').forEach(function (el) {
      el.style.display = (el.dataset.styleGroup === style) ? '' : 'none';
    });
  }

  /* ---------- 状态回传 ---------- */
  // 用户从本地载入的结构文件名（含扩展名）；仅用于左上角结构浮标。
  // 切换内置结构 / 案例时清空，让浮标回到结构名称。
  var lastLoadedFileName = '';
  function applyState(s) {
    if (!s) return;
    lastState = s;
    var name = s.structure || '未知结构';
    // 统一空值保护：精简 UI 中部分状态元素可能不存在（历史遗留的 #mb-structure 已移除，
    // 结构名由右上浮标 #vf-structure 显示），避免任一处 null.textContent 抛错而中断后续
    // 快捷键/滑条/参数面板的同步。
    var setTxt = function (id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; };
    // 结构名先走整串翻译，避免词级兜底把「NaCl 盐」逐字切成 "NaCl salt"
    var nameTr = (typeof window.t === 'function') ? window.t(name) : name;
    setTxt('status-left', '就绪 · 当前结构：' + nameTr + ' · ' + s.atoms + ' 原子');
    // 左上角只显示结构名称 / 载入的 .cif 文件名，不附显原子数等其它内容
    setTxt('vf-structure', lastLoadedFileName || name);
    setTxt('pp-range-tip', s.rangeTip || '');

    var k = s.keys || {};
    Object.keys(KEY_TO_CMD).forEach(function (key) {
      if (k[key] !== undefined && k[key] !== null) syncSelect(KEY_TO_CMD[key], k[key]);
    });
    if (k.style) showStyleParams(k.style);
    if (k.proj === 'persp' || k.proj === 'ortho') syncSelect('proj', k.proj);

    document.querySelectorAll('input[data-slider]').forEach(function (sl) {
      var id = sl.dataset.slider, v = null;
      if (PARAM_IDS[id]) {
        var p = (k.params || {})[PARAM_IDS[id][0]];
        if (p) v = p[PARAM_IDS[id][1]];
      } else if (id === 'pl-az') v = (k.light || {}).az;
      else if (id === 'pl-el') v = (k.light || {}).el;
      else if (id === 'pl-in') v = Math.round(((k.light || {}).inten || 1) * 100);
      if (v !== null && v !== undefined && document.activeElement !== sl) {
        sl.value = v;
        var out = sl.parentElement.querySelector('output');
        if (out) out.textContent = fmt(sl);
      }
    });
    var checks = {
      'force-complete': k.forceComplete, 'chk-labels': k.labels,
      'chk-atom-labels': k.atomLabels, 'chk-hbond': k.hbond, 'chk-vdw': k.vdw,
      'chk-ssao': k.ssao, 'chk-rotate': k.rotate, 'pl-follow': k.headlight,
    };
    Object.keys(checks).forEach(function (id) {
      var el = document.querySelector('input[data-check="' + id + '"]');
      if (el && checks[id] !== undefined && document.activeElement !== el) el.checked = !!checks[id];
    });
    var alAcc = document.getElementById('mi-atomlabels-state');
    if (alAcc) alAcc.textContent = k.atomLabels ? '✓' : '';
    var hbAcc = document.getElementById('mi-hbond-state');
    if (hbAcc) hbAcc.textContent = k.hbond ? '✓' : '';
    var vdwAcc = document.getElementById('mi-vdw-state');
    if (vdwAcc) vdwAcc.textContent = k.vdw ? '✓' : '';
    ['sc-a', 'sc-b', 'sc-c'].forEach(function (id, i) {
      var el = document.querySelector('input[data-number="' + id + '"]');
      if (el && k.sc && document.activeElement !== el) el.value = k.sc[i];
    });
    if (k.res) syncSelect('res', k.res);
    if (k.shotBg) syncSelect('shotBg', k.shotBg);

    // 同步可视化窗口顶部固定视角工具条的激活态
    var vv = (k.view || '').toString();
    document.querySelectorAll('#viewBar [data-view]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === vv);
    });
    var pp = (k.proj || '').toString();
    document.querySelectorAll('#viewBar [data-proj]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.proj === pp);
    });
    var rotEl = document.getElementById('vb-rotate');
    if (rotEl) rotEl.classList.toggle('active', !!k.rotate);
  }

  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.source !== 'crystasee-viewer') return;
    if (m.type === 'ready' || m.type === 'state') { applyState(m.state); return; }
    // 内置案例：内核回传内联 CIF 原文，使外壳侧的 ORTEP / 结构信息等功能可用
    if (m.type === 'sampleText') {
      lastCifText = m.text || ''; lastCifName = m.name || '';
      lastLoadedFileName = '';
      csSyncORTEP3D();
      toast('已载入案例：' + (SHORT.struct[m.key] || m.name || m.key));
      return;
    }
    if (m.type === 'error') { toast(m.message || '渲染内核提示', true); return; }
    if (m.type === 'exportData') {
      lastExport = m;
      openExportPreview(m);
      return;
    }
  });

  /* ---------- 文件载入 ---------- */
  var lastCifText = '';        // 最近一次载入的结构文本（供 ORTEP / 结构信息解析）
  var lastCifName = '';
  function loadText(name, text) {
    lastCifText = (text || ''); lastCifName = (name || '');
    lastLoadedFileName = (name || '');
    post({ type: 'loadText', name: name, text: text });
    csSyncORTEP3D();   // 结构变更后刷新三维热椭球数据（叠加层在 rebuild 末尾自动重建）
    toast('已载入结构：' + name);
  }
  function readFile(file) {
    var r = new FileReader();
    r.onload = function () { loadText(file.name, r.result); };
    r.onerror = function () { toast('文件读取失败', true); };
    r.readAsText(file);
  }
  async function openStructure() {
    var a = api();
    if (a && a.open_structure) {
      try {
        var r = await a.open_structure();
        if (!r) return;
        if (r.error) { toast(r.error, true); return; }
        if (r.text) loadText(r.name, r.text);
        pushRecent({ type:'file', name:r.name, path:r.path });
      } catch (err) { toast('打开失败：' + err.message, true); }
    } else {
      document.getElementById('hidden-file').click();
    }
  }
  document.getElementById('hidden-file').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (f) readFile(f);
    e.target.value = '';
  });
  document.addEventListener('dragover', function (e) { e.preventDefault(); });
  document.addEventListener('drop', function (e) {
    e.preventDefault();
    var f = e.dataTransfer && e.dataTransfer.files[0];
    if (f) readFile(f);
  });

  /* ---------- 图片导出 ---------- */
  function exportDims() {
    var v = selectValue('res');
    if (v === 'custom') {
      var clamp = function (n, d) { return Math.min(8192, Math.max(256, Math.round(+n) || d)); };
      return [clamp(document.getElementById('exp-w').value, 3000),
              clamp(document.getElementById('exp-h').value, 2000)];
    }
    var p = v.split('x').map(Number);
    return [p[0] || 1920, p[1] || 1080];
  }
  function generatePreview() {
    var d = exportDims();
    var tr = selectValue('shotBg') === 'transparent';
    toast('正在生成 ' + d[0] + ' × ' + d[1] + ' 导出图…');
    post({ type: 'export', w: d[0], h: d[1], transparent: tr });
  }
  async function savePng() {
    if (!lastExport) return;
    var name = 'CrystaSee_' + (lastState ? String(lastState.structure).replace(/[^\w\u4e00-\u9fa5]+/g, '_') : 'structure') +
      '_' + lastExport.w + 'x' + lastExport.h + (lastExport.transparent ? '_transparent' : '') + '.png';
    var a = api();
    if (a && a.save_png) {
      try {
        var r = await a.save_png(lastExport.url, name);
        if (r && r.ok) { toast('已保存：' + r.path); closeModal(); }
        else toast(r && r.error ? r.error : '已取消保存');
      } catch (err) { toast('保存失败：' + err.message, true); }
    } else {
      var link = document.createElement('a');
      link.href = lastExport.url; link.download = name; link.click();
      toast('已触发下载：' + name); closeModal();
    }
  }
  function openExportPreview(m) {
    var info = m.w + ' × ' + m.h + ' · ' + (m.transparent ? '透明背景（Alpha）' : '保留当前背景');
    var html =
      '<p style="margin-bottom:10px">' + info + '。确认无误后点击「保存 PNG…」选择本机路径；透明背景会写入 Alpha 通道。</p>' +
      '<div style="background:repeating-conic-gradient(#eef2f8 0% 25%,#fff 0% 50%) 50%/22px 22px;border:1px solid #e2eaf7;border-radius:10px;padding:10px;text-align:center">' +
        '<img id="exp-img" src="' + m.url + '" style="max-width:100%;max-height:54vh;object-fit:contain">' +
      '</div>' +
      '<div style="margin-top:14px;display:flex;gap:10px;justify-content:flex-end">' +
        '<button class="pp-btn" id="exp-close2">关闭</button>' +
        '<button class="pp-btn primary" id="exp-save">保存 PNG…</button>' +
      '</div>';
    openModal('图片导出预览', html);
    document.getElementById('exp-save').onclick = savePng;
    document.getElementById('exp-close2').onclick = closeModal;
  }

  /* ---------- 顶栏菜单 ---------- */
  function closeAllMenus() {
    document.querySelectorAll('.menu-item.open').forEach(function (m) { m.classList.remove('open'); });
    document.getElementById('ppDockMenu').classList.remove('open');
  }
  document.querySelectorAll('.menu-item').forEach(function (item) {
    item.querySelector('.mi-label').addEventListener('click', function (e) {
      e.stopPropagation();
      var was = item.classList.contains('open');
      closeAllMenus();
      if (!was) item.classList.add('open');
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.menu-bar')) closeAllMenus();
  });
  function openExternal(url) {
    var a = api();
    if (a && a.open_url) {
      try { var r = a.open_url(url); if (r && r.error) toast(r.error, true); else toast('已在浏览器打开外部链接'); return; }
      catch (err) { toast('打开链接失败：' + err.message, true); return; }
    }
    try { window.open(url, '_blank'); toast('已在浏览器打开外部链接'); } catch (e) { toast('无法打开链接（非桌面版）', true); }
  }
  document.querySelectorAll('.mi').forEach(function (mi) {
    if (mi.dataset.link) {
      mi.addEventListener('click', function () { openExternal(mi.dataset.link); closeAllMenus(); });
    }
    if (mi.dataset.cmd) {
      mi.addEventListener('click', function () {
        var cmd = mi.dataset.cmd, val = mi.dataset.value;
        if (cmd === 'open') { openStructure(); return; }
        if (cmd === 'save' || cmd === 'saveas') { generatePreview(); return; }
        if (cmd === 'recent') { openRecentModal(); return; }
        if (cmd === 'exit') { var a = api(); if (a) a.win_close(); return; }
        if (cmd === 'fit') { post({ type: 'fit' }); toast('视角已复位'); return; }
        if (cmd === 'proj-persp') { dispatch('proj', 'persp'); return; }
        if (cmd === 'proj-ortho') { dispatch('proj', 'ortho'); return; }
        if (cmd === 'publish') { post({ type: 'click', selector: '#btn-publish' }); toast('出版风：纸白 + 瓷器'); return; }
        if (cmd === 'showcase') { post({ type: 'click', selector: '#btn-showcase' }); toast('已回到酷炫默认'); return; }
        if (cmd === 'panel-toggle') { togglePanel(); return; }
        if (cmd === 'version') { openVersionModal(); return; }
        if (cmd === 'struct-info') { openStructInfo(); return; }
        if (cmd === 'interaction-analysis') { openInteractionAnalysis(); return; }
        if (cmd === 'freevol') { openFreeVol(); return; }
        if (cmd === 'pxrd-sim') { openToolModal('pxrd'); return; }
        if (cmd === 'pxrd-multi') { openPXRDMulti(); return; }
        if (cmd === 'neutron') { openToolModal('pxrd', { neutron: true }); return; }
        if (cmd === 'pxrd-convert') { openPXRDConvert(); return; }
        if (cmd === 'ortep') { openORTEP(); return; }
        if (cmd === 'mol-stack') { openStackModal('mol'); return; }
        if (cmd === 'xtal-stack') { openStackModal('xtal'); return; }
        if (cmd === 'bfdh') { openBFDH(); return; }
        if (cmd === 'ae') { openAE(); return; }
        if (cmd === 'cleavage') { openCleavage(); return; }
        if (cmd === 'polyhedron') { openPolyhedron(); return; }
        if (cmd === 'struct' || cmd === 'sample') {
          lastCifText = ''; lastCifName = ''; lastLoadedFileName = '';
          dispatch(cmd, val);
          if (cmd === 'sample' || (cmd === 'struct' && SAMPLE_KEYS.indexOf(val) >= 0)) { toast('正在载入 ' + (SHORT.struct[val] || val) + '…'); pushRecent({ type:'sample', key:val, name:(SHORT.struct[val] || val) }); }
          return;
        }
        dispatch(cmd, val);
      });
    }
    if (mi.dataset.toggle) {
      mi.addEventListener('click', function () {
        var id = mi.dataset.toggle;
        var el = document.querySelector('input[data-check="' + id + '"]');
        if (el) { el.checked = !el.checked; el.dispatchEvent(new Event('change', { bubbles: true })); }
        closeAllMenus();
      });
    }
    if (mi.dataset.modal) { mi.addEventListener('click', function () { openModal(mi.dataset.modal); closeAllMenus(); }); }
    if (mi.dataset.tool) { mi.addEventListener('click', function () { openToolModal(mi.dataset.tool); closeAllMenus(); }); }
  });
  // 顶部「问题反馈」：无下拉，点击直接弹出反馈弹窗
  var miFeedback = document.getElementById('mi-feedback');
  if (miFeedback) {
    miFeedback.querySelector('.mi-label').addEventListener('click', function (e) {
      e.stopPropagation();
      closeAllMenus();
      openFeedbackModal();
    });
  }

  /* ---------- 可吸附参数面板 ---------- */
  var panel = document.getElementById('paramPanel');
  var workspace = document.getElementById('workspace');
  var grip = document.getElementById('ppGrip');
  var dockState = 'left';

  function applyDock(state) {
    dockState = state;
    ['dock-left', 'dock-right', 'dock-bottom', 'dock-float'].forEach(function (c) {
      panel.classList.remove(c);
    });
    panel.classList.add('dock-' + state);
    workspace.classList.toggle('ws-bottom', state === 'bottom');
    if (state === 'left' || state === 'right') { panel.style.width = panel.style.width || '312px'; panel.style.height = ''; }
    if (state === 'bottom') { panel.style.height = panel.style.height || '252px'; panel.style.width = ''; }
    // 非浮动停靠：清除浮动模式写入的内联 left/top，否则相对定位的面板会被 inline 偏移卡在悬浮位置
    if (state !== 'float') { panel.style.left = ''; panel.style.top = ''; }
    if (state === 'float') {
      if (!panel.style.left) { panel.style.left = '28px'; panel.style.top = '24px'; }
    }
    setTimeout(function () { post({ type: 'resize' }); }, 60);
  }
  function togglePanel() {
    var hidden = workspace.classList.toggle('panel-hidden');
    closeAllMenus();
    toast(hidden ? '已收起参数面板' : '已显示参数面板');
  }
  document.getElementById('panelRecall').addEventListener('click', function () {
    workspace.classList.remove('panel-hidden');
  });
  document.getElementById('ppCollapse').addEventListener('click', togglePanel);
  var ppDockMenu = document.getElementById('ppDockMenu');
  document.getElementById('ppDockBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    ppDockMenu.classList.toggle('open');
  });
  ppDockMenu.querySelectorAll('.dm').forEach(function (dm) {
    dm.addEventListener('click', function () {
      applyDock(dm.dataset.dock);
      ppDockMenu.classList.remove('open');
    });
  });

  // —— 拖拽停靠 / 浮动移动 ——
  var dragging = null; // {mode:'dock'|'float', startX, startY, baseLeft, baseTop}
  grip.addEventListener('pointerdown', function (e) {
    // 只有点击手柄的「拖拽区」（手柄本身 / 圆点 / 标题文字）才启动拖拽；
    // 手柄内部的按钮、停靠菜单项等交互元素一律放行，否则 pointerdown 的 preventDefault
    // 会吞掉它们的 click 事件（例如停靠菜单 .dm 项就在 grip 内部）。
    if (!e.target.closest('.grip-dots, b, .pp-grip')) return;
    if (e.target.closest('button, .pp-dock-menu, .dm, .cs-select')) return;
    e.preventDefault();
    // 指针捕获：即使松手落在右侧 iframe（3D 视图）上方，pointerup 也能回到 grip/父窗口，
    // 否则事件被交付给 iframe 子文档、不会冒泡到 window，导致拖拽卡死、停靠不提交。
    try { grip.setPointerCapture(e.pointerId); } catch (err) {}
    if (dockState === 'float') {
      var r = panel.getBoundingClientRect(), wr = workspace.getBoundingClientRect();
      dragging = { mode: 'float', startX: e.clientX, startY: e.clientY,
        baseLeft: r.left - wr.left, baseTop: r.top - wr.top };
      workspace.classList.add('dragging');
    } else {
      dragging = { mode: 'dock' };
      workspace.classList.add('dragging');
    }
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragUp);
    window.addEventListener('pointercancel', onDragUp);
  });
  function onDragMove(e) {
    if (!dragging) return;
    var rect = workspace.getBoundingClientRect();
    if (dragging.mode === 'float') {
      var nx = dragging.baseLeft + (e.clientX - dragging.startX);
      var ny = dragging.baseTop + (e.clientY - dragging.startY);
      nx = Math.max(6, Math.min(rect.width - panel.offsetWidth - 6, nx));
      ny = Math.max(6, Math.min(rect.height - panel.offsetHeight - 6, ny));
      panel.style.left = nx + 'px'; panel.style.top = ny + 'px';
    }
    // 两种模式都实时高亮停靠区
    var x = e.clientX - rect.left, y = e.clientY - rect.top;
    var zone = 'float';
    if (x < rect.width * 0.30) zone = 'left';
    else if (x > rect.width * 0.70) zone = 'right';
    else if (y > rect.height * 0.62) zone = 'bottom';
    document.querySelectorAll('.dz').forEach(function (dz) {
      dz.classList.toggle('active', dz.dataset.dock === zone);
    });
    dragging.zone = zone;
  }
  function onDragUp() {
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragUp);
    window.removeEventListener('pointercancel', onDragUp);
    if (!dragging) return;
    workspace.classList.remove('dragging');
    document.querySelectorAll('.dz').forEach(function (dz) { dz.classList.remove('active'); });
    if (dragging.zone && dragging.zone !== dockState) {
      applyDock(dragging.zone);
    } else if (dragging.mode === 'float' && (!dragging.zone || dragging.zone === 'float')) {
      // 浮动态松手落在浮动区：保持悬浮，确保 left/top 已写入
      if (!panel.style.left) { panel.style.left = '28px'; panel.style.top = '24px'; }
    }
    dragging = null;
  }

  // —— 面板尺寸调整 ——
  var resizeEl = document.getElementById('ppResize');
  var resizing = null;
  resizeEl.addEventListener('pointerdown', function (e) {
    e.preventDefault(); e.stopPropagation();
    try { resizeEl.setPointerCapture(e.pointerId); } catch (err) {}
    var r = panel.getBoundingClientRect();
    resizing = { mode: dockState, startX: e.clientX, startY: e.clientY,
      baseW: r.width, baseH: r.height };
    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', onResizeUp);
    window.addEventListener('pointercancel', onResizeUp);
  });
  function onResizeMove(e) {
    if (!resizing) return;
    if (resizing.mode === 'left' || resizing.mode === 'right') {
      var w = resizing.baseW + (e.clientX - resizing.startX) * (resizing.mode === 'right' ? -1 : 1);
      panel.style.width = Math.max(240, Math.min(470, w)) + 'px';
    } else if (resizing.mode === 'bottom') {
      var h = resizing.baseH - (e.clientY - resizing.startY);
      panel.style.height = Math.max(150, Math.min(440, h)) + 'px';
    }
    post({ type: 'resize' });
  }
  function onResizeUp() {
    window.removeEventListener('pointermove', onResizeMove);
    window.removeEventListener('pointerup', onResizeUp);
    resizing = null;
  }

  /* ---------- 模态工具窗 / 帮助 / 关于 ---------- */
  var modalMask = document.getElementById('modalMask');
  function openModal(which, htmlOverride) {
    var title, html;
    if (htmlOverride !== undefined) {
      modalMask.querySelector('#modalBody').innerHTML = htmlOverride;
      modalMask.querySelector('#modalTitle').textContent = which;
      modalMask.classList.add('open');
      return;
    }
    if (which === 'help') {
      title = '使用说明';
      html = '<div class="help-grid">' +
        '<div class="help-item"><b>鼠标操作</b><span>左键拖动旋转 · 滚轮缩放 · 右键平移；固定视角 a / b / c / a* / b* / c* 一键切换。</span></div>' +
        '<div class="help-item"><b>结构文件</b><span>支持 .cif / .mol / .mol2 / .xyz / .pdb。CIF 可用空间群对称操作展开晶胞；PDB 保留 CRYST1 晶胞信息但按分子显示。</span></div>' +
        '<div class="help-item"><b>显示范围</b><span>仅晶胞内部（含边界原子）、补全截断分子（只补部分在内的分子）、仅不对称单元；a/b/c 可独立设置超胞 1–5。</span></div>' +
        '<div class="help-item"><b>快捷键</b><span>1–6 切换模型 · O 切换投影 · P 出版风 · S 酷炫默认 · R 复位视角 · 空格 自动旋转 · H 收起面板 · 拖动参数面板标题可重新停靠。</span></div>' +
        '<div class="help-item"><b>投影方式</b><span>透视为默认（近大远小，有景深）；正交远近等大、无景深，适合测量与出版插图。</span></div>' +
        '<div class="help-item"><b>参数面板</b><span>左侧面板可拖到右侧、下方或浮动窗口；拖动边缘可调整宽高；「停靠▾」可快速切换位置。</span></div>' +
        '</div>';
    } else if (which === 'about') {
      title = '关于晶见';
      html = '<div class="about-card"><img src="../resources/logo-mark-256.png" alt="晶见 LOGO">' +
        '<div class="about-text"><h2>CrystaSee<span>晶见</span></h2>' +
        '<p class="about-sub">晶体结构可视化与分析工作台<br>Crystal Structure Visualization & Analysis Workbench</p>' +
        '<div class="about-lines">' +
        '<div><b>版本规则</b><span>V1.0 起，后续版本统一为两位数字（V1.1 / V1.2 … V2.0）</span></div>' +
        '<div><b>知识产权</b><span>完全自主实现，不内置任何商业晶体学数据库或专有算法；仅提供跳转至公开在线服务（CCDC 沉积号 / CheckCif / COD）的外部链接，由用户浏览器独立访问；仅解析开放的 CIF / COD 等公开格式，可学术与商用</span></div>' +
        '<div><b>运行方式</b><span>纯本地桌面应用，零联网请求；结构文件与导出图片均保存在本机</span></div>' +
        '<div><b>V1.0 范围</b><span>三维结构可视化、晶胞 / 超胞、材质与光照、固定 / 正交视角、高清与透明 PNG 导出</span></div>' +
        '<div><b>V1.1 新增</b><span>分子堆积与相互作用分析：基于当前晶胞 / 超胞自动识别氢键（D–H···A）与范德华接触，反演晶胞参数并输出几何清单</span></div>' +
        '<div><b>V1.2 新增</b><span>PXRD 粉末衍射模拟：基于结构自动反演晶胞、去重唯一位点、Cromer–Mann 结构因子与 Bragg 方程合成图谱，可调辐射 / Kα 双线 / 峰宽 / 偏振，输出峰表与谱图</span></div>' +
        '<div><b>V1.3 新增</b><span>PXRD 实验谱对比：导入 .xy/.xye/.csv/.txt 文本实验谱，与模拟谱叠加并绘制差谱；按容差 Δ2θ 将模拟峰就近匹配实验峰，输出峰匹配表与一致性指标 Rp / Rwp，辅助物相鉴定</span></div>' +
        '<div><b>V1.4 改进</b><span>PXRD 界面白底重设计：整体改为白底深色文字（解决原浅色字不可读问题），模拟与实验谱对比拆分为两张独立卡片（蓝色 Simulation / 橙色 Experimental 区分），谱图白底配蓝(模拟)/橙(实验)曲线与差谱条，峰表与匹配表清晰可读</span></div>' +
        '<div><b>V1.5 改进</b><span>关于页移除冗余右侧品牌图；结构信息浮标由左下角移至左上角，避免遮挡结构；左键旋转去除惯性（松手即停），定位更精准顺手</span></div>' +
        '<div><b>V1.6 改进</b><span>结构库整合：删除"案例结构"独立下拉，将其全部示例结构并入"内置结构"并改名为"案例演示"（单一入口包含全部内置与示例结构）；氯化钠标签统一为"NaCl 盐"；全面实测并稳定所有风格 / 光照参数滑块的联动链路（外壳→通信桥→渲染内核实时重建），确保球/键半径、线宽、多面体不透明度、方位角与强度等滑块即时生效</span></div>' +
        '<div><b>V1.6 修正</b><span>修复窗口拖拽：关闭 pywebview 整窗任意位置拖拽（easy_drag），改由标题栏品牌区与空白间隔区（.pywebview-drag-region）作为唯一窗口拖动手柄；解决此前拖动滑块 / 参数面板时整个软件窗口被拖动、且悬浮面板拖动与停靠受干扰的问题</span></div>' +
        '<div><b>V1.7 修正</b><span>修正「仅不对称单元」识别：此前该模式直接显示 CIF 原始 _atom_site 列表，对 Z′=½ 等结构（空间群 P-1、Z=1，分子位于反演中心）会显示完整分子而非半个。现改为对位点表做空间群对称轨道去重（复用内核对称操作函数），得到晶体学真不对称单元——半分子结构可正确退回一半原子；普通 Z′≥1 结构不受影响</span></div>' +
        '<div><b>V1.8 新增</b><span>新增「堆积模式」：一键进入晶体堆积视图——自动按超胞复制（默认 2×2×2，可用「超胞」滑块调 1–5）并开启晶胞框；以中央晶胞分子为基准高亮（鲜艳元素色），周围晶胞分子自动灰化，直观呈现分子/晶胞如何堆叠；网络晶体则按晶胞区分中央与邻居。配套修复「仅不对称单元」的识别问题已随 V1.7 落地</span></div>' +
        '<div><b>V1.9 新增</b><span>顶部菜单栏整体重构：文件（打开 / 最近文件 / 保存 / 另存为）/ 显示（新增「相互作用」分组：氢键显示 · 范德华接触显示）/ ORTEP（各向异性位移椭球）/ 计算（结构信息 · 相互作用分析 · 单分子与晶体结构堆叠 · 自由体积占比 · 晶面与晶习 BFDH / AE / 晶面解理）/ PXRD（模拟 · 多谱对比 · 中子衍射模拟 · 格式转换）/ 外部链接（CCDC 沉积号 · CheckCif · COD）/ 帮助（操作手册 · 关于 · 版本 · 许可）；统一外部链接跳转与最近文件列表。<br>说明：ORTEP 热椭球与 (hkl) 晶面切片已升级为渲染内核独立叠加层的三维实时绘制（默认关闭，不改变已定版球棍渲染观感）；范德华接触的三维实时渲染仍待后续内核版本。</span></div>' +
        '<div><b>V1.10 新增</b><span>分子堆叠 / 晶体堆叠集成 SNAP（snapRMSD）算法：基于分子图 1-WL 不变量、回溯图同构与自同构群枚举，自动寻找对称等价原子的最优置换，取单一全局 Kabsch 最小 RMSD，彻底解决「两个基本一致的构象 RMSD 却虚高」的问题；堆叠结果视图改为白底多分子叠加、每分子独立配色并附色块图例。</span></div>' +
        '<div><b>V1.11 新增</b><span>界面语言改为顶栏下拉选择框：按钮显示当前语言全称（简体中文 / English）并带展开箭头，点击展开二选一菜单，当前项高亮，选择后即时切换并记忆；「计算 ▸ 配位多面体」新增独立 3D 叠加层（面颜色 / 透明度、边线颜色 / 半径、顶点与中心原子、中心—配体键等可调），多面体从「渲染风格」中移除，底层球棍与配体球 / 键完整保留。</span></div>' +
        '<div><b>V1.12 新增</b><span>修复英文界面下「问题反馈」输入框提示仍显示中文；问题截图由单张改为可选 0–5 张，支持逐张移除与一键清空；完成第三方代码许可证、著作权与专利合规审查，补齐开源组件归属声明与数据来源记录。</span></div>' +
        '<div><b>V1.13 新增</b><span>界面字体统一为 HarmonyOS Sans SC：标题与软件名使用 Black 字重，详细内容使用 Regular 字重；按许可协议在「使用许可」中显著声明字体归属，并以未经修改的原始 TTF 随包分发、附协议全文。</span></div>' +
        '<div><b>V1.14 新增</b><span>ORTEP 椭球展示从「显示」菜单移至「计算」菜单；新增「原子 / 键着色」——可用取色器逐对象自定义颜色，也可一键应用至所有同元素原子与对应键半段，并恢复元素默认配色；右侧选择工具新增「化学键」模式，可点选单根化学键并查看成键元素与键长。</span></div>' +
        '<div><b>字体</b><span>界面使用 HarmonyOS Sans SC（Black / Regular 两个字重），© 2021 Huawei Device Co., Ltd.，依 HarmonyOS Sans Fonts License Agreement 随软件捆绑分发；协议全文见随包 fonts/LICENSE.txt，完整登记见 THIRD_PARTY_NOTICES.md 附录 D。</span></div>' +
        '<div><b>技术构成</b><span>原生窗口外壳（Python + Edge WebView2）+ 已定版三维渲染内核（WebGL / three.js）</span></div>' +
        '</div></div></div>';
    } else if (which === 'manual') {
      title = '用户操作手册';
      html = CS_MANUAL_HTML;
    } else if (which === 'license') {
      title = '使用许可';
      html = CS_LICENSE_HTML;
    } else { return; }
    modalMask.querySelector('#modalTitle').textContent = title;
    modalMask.querySelector('#modalBody').innerHTML = html;
    modalMask.classList.add('open');
  }
  function openVersionModal() {
    var info = (api() && api().get_info) ? api().get_info() : { name: 'CrystaSee晶见', version: 'V1.14',
      build: '2026-11-17', versionRule: '两位数字版本号（V1.0 / V1.1 … V2.0）' };
    var html = '<div class="about-card"><img src="../resources/logo-mark-256.png" alt="LOGO">' +
      '<div class="about-text"><h2>' + info.name + ' <span>' + info.version + '</span></h2>' +
      '<p class="about-sub">晶体结构可视化与分析工作台</p>' +
      '<div class="about-lines">' +
      '<div><b>构建日期</b><span>' + info.build + '</span></div>' +
      '<div><b>版本规则</b><span>' + info.versionRule + '</span></div>' +
      '<div><b>运行状态</b><span>' + (info.offline ? '纯本地运行 · 无外部网络' : '—') + '</span></div>' +
      '<div><b>知识产权</b><span>完全自主实现，可学术与商用</span></div>' +
      '</div>' +
      '<div class="about-lines" style="margin-top:14px"><div style="flex-direction:column;align-items:flex-start"><b>本版更新</b><span style="margin-top:4px">① ORTEP 椭球展示从「显示 ▸ ORTEP」调整到「计算 ▸ ORTEP」，与其分析类功能归口一致。<br>② 新增「原子 / 键着色」：点选原子或化学键后可逐对象自定义颜色；「应用至所有同元素」让 C、O 等全部原子与对应键半段同步改色，也可恢复该元素默认配色。<br>③ 右侧选择工具新增「化学键」模式：点选单根化学键即整体高亮，显示成键元素与键长；其余功能与 V1.13 一致。</span></div></div>' +
      '</div></div>';
    openModal('版本信息', html);
  }
  // 问题反馈弹窗：可选 0–5 张截图 + 必填文字描述 + 提交（唤起邮件草稿）
  var FEEDBACK_EMAIL = 'yeyang_96@163.com';  // 反馈联系邮箱
  var FB_MAX_SHOTS = 5;
  function fbL(zh, en) {
    try { return (window.csGetLang && window.csGetLang() === 'en') ? en : zh; }
    catch (e) { return zh; }
  }
  function fbEsc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function openFeedbackModal() {
    var html =
      '<div class="fb-wrap">' +
      '<div class="fb-note"><b>提交说明：</b>提交后将唤起您系统默认的邮件客户端，并自动预填以下反馈内容（软件版本、当前结构等环境信息将一并附上）。若您选择了问题截图（最多 5 张），请在弹出的邮件中手动将这些图片添加为附件后再发送。我们收到后会尽快处理，感谢您的反馈！</div>' +
      '<div class="fb-field">' +
      '<div class="fb-label">问题截图（可选，最多 5 张）</div>' +
      '<div class="fb-shot">' +
      '<label class="fb-shot-btn" for="fb-shot-input">选择图片…</label>' +
      '<input type="file" id="fb-shot-input" accept="image/*" multiple style="display:none">' +
      '<span class="fb-shot-count" id="fb-shot-count" data-cs-no-i18n></span>' +
      '<button type="button" class="fb-shot-remove" id="fb-shot-remove" style="display:none">清空全部</button>' +
      '<div class="fb-shot-msg" id="fb-shot-msg" data-cs-no-i18n></div>' +
      '</div>' +
      '<div class="fb-shot-preview" id="fb-shot-preview"></div>' +
      '</div>' +
      '<div class="fb-field">' +
      '<div class="fb-label">问题文字描述 <span class="fb-req">*</span> <span class="fb-count" id="fb-count">0 字</span></div>' +
      '<textarea id="fb-desc" class="fb-textarea" placeholder="请尽量详细描述问题：复现步骤、期望行为、实际表现，以及出错时正在查看的结构或进行的操作等。"></textarea>' +
      '<div class="fb-err" id="fb-err"></div>' +
      '</div>' +
      '<div class="fb-actions">' +
      '<button class="pp-btn" id="fb-cancel">取消</button>' +
      '<button class="pp-btn primary" id="fb-submit">提交反馈</button>' +
      '</div></div>';
    openModal('问题反馈', html);

    var input = document.getElementById('fb-shot-input');
    var preview = document.getElementById('fb-shot-preview');
    var removeBtn = document.getElementById('fb-shot-remove');
    var countEl = document.getElementById('fb-shot-count');
    var msgEl = document.getElementById('fb-shot-msg');
    var desc = document.getElementById('fb-desc');
    var count = document.getElementById('fb-count');
    var err = document.getElementById('fb-err');
    var submit = document.getElementById('fb-submit');
    var cancel = document.getElementById('fb-cancel');
    var shotItems = [];              // { name, key, data } —— 最多 FB_MAX_SHOTS 张
    var lastMsgZh = '', lastMsgEn = '';

    function fileKey(f) { return f.name + '|' + f.size + '|' + (f.lastModified || 0); }
    function readAsDataURL(f) {
      return new Promise(function (resolve) {
        var r = new FileReader();
        r.onload = function (e) { resolve(e.target.result); };
        r.onerror = function () { resolve(null); };
        r.readAsDataURL(f);
      });
    }
    function setShotMsg(zh, en) {
      lastMsgZh = zh || ''; lastMsgEn = en || '';
      if (msgEl) msgEl.textContent = fbL(lastMsgZh, lastMsgEn);
    }
    function refreshPreview() {
      if (countEl) countEl.textContent = fbL(
        '已选 ' + shotItems.length + '/' + FB_MAX_SHOTS + ' 张',
        shotItems.length + '/' + FB_MAX_SHOTS + ' selected');
      if (removeBtn) removeBtn.style.display = shotItems.length ? '' : 'none';
      if (!preview) return;
      var out = '';
      for (var i = 0; i < shotItems.length; i++) {
        out += '<div class="fb-shot-item">' +
          '<img src="' + shotItems[i].data + '" alt="">' +
          '<button type="button" class="fb-shot-x" data-idx="' + i + '" title="' +
            fbEsc(fbL('移除这张截图', 'Remove this screenshot')) + '">×</button>' +
          '<div class="fb-shot-name" title="' + fbEsc(shotItems[i].name) + '">' +
            fbEsc(shotItems[i].name) + '</div>' +
          '</div>';
      }
      preview.innerHTML = out;
    }
    if (input) input.addEventListener('change', function () {
      var files = input.files ? Array.prototype.slice.call(input.files) : [];
      input.value = '';            // 允许多次选到同一文件，也保证下次 change 仍触发
      if (!files.length) return;
      var room = FB_MAX_SHOTS - shotItems.length;
      var seen = {}, picked = [], nonImage = 0, duplicate = 0, overflow = 0, j, f, k;
      for (var s = 0; s < shotItems.length; s++) seen[shotItems[s].key] = 1;
      for (j = 0; j < files.length; j++) {
        f = files[j]; k = fileKey(f);
        if (!/^image\//.test(f.type || '')) { nonImage++; continue; }
        if (seen[k]) { duplicate++; continue; }
        if (picked.length >= room) { overflow++; continue; }
        seen[k] = 1;
        picked.push({ f: f, key: k });
      }
      Promise.all(picked.map(function (p) { return readAsDataURL(p.f); })).then(function (datas) {
        for (var q = 0; q < picked.length; q++) {
          if (datas[q]) shotItems.push({ name: picked[q].f.name, key: picked[q].key, data: datas[q] });
        }
        var zh = [], en = [];
        if (overflow) {
          zh.push('最多 5 张，多余 ' + overflow + ' 张已忽略');
          en.push('Up to 5 images; ' + overflow + ' extra image(s) ignored');
        }
        if (nonImage) {
          zh.push('已忽略 ' + nonImage + ' 个非图片文件');
          en.push(nonImage + ' non-image file(s) ignored');
        }
        if (duplicate) {
          zh.push('已跳过 ' + duplicate + ' 张重复图片');
          en.push(duplicate + ' duplicate image(s) skipped');
        }
        setShotMsg(zh.join(' · '), en.join(' · '));
        refreshPreview();
      });
    });
    if (preview) preview.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('.fb-shot-x') : null;
      if (!b) return;
      var idx = Number(b.getAttribute('data-idx'));
      if (isFinite(idx) && idx >= 0 && idx < shotItems.length) {
        shotItems.splice(idx, 1); setShotMsg('', ''); refreshPreview();
      }
    });
    if (removeBtn) removeBtn.addEventListener('click', function () {
      shotItems.length = 0; setShotMsg('', ''); refreshPreview();
    });
    if (desc) desc.addEventListener('input', function () {
      if (count) count.textContent = desc.value.length + ' 字';
    });
    // 动态文案（计数 / 提示）不走字典，由 fbL 独占；语言切换时重刷一次
    function onLangChanged() {
      if (!document.getElementById('fb-shot-preview')) {
        window.removeEventListener('csLangChanged', onLangChanged);
        return;
      }
      setShotMsg(lastMsgZh, lastMsgEn);
      refreshPreview();
    }
    window.addEventListener('csLangChanged', onLangChanged);
    refreshPreview();

    function doSubmit() {
      var text = desc ? desc.value.trim() : '';
      if (!text) { if (err) err.textContent = '请填写问题文字描述（必填）。'; if (desc) desc.focus(); return; }
      if (err) err.textContent = '';
      var info = (api() && api().get_info) ? api().get_info()
        : { name: 'CrystaSee晶见', version: 'V1.14', build: '—' };
      var curStruct = (document.getElementById('vf-structure')
        ? document.getElementById('vf-structure').textContent : '—');
      var n = shotItems.length, lines = [];
      if (fbL('zh', 'en') === 'en') {
        lines.push('[Software] ' + info.name + ' ' + info.version + ' (build: ' + info.build + ')');
        lines.push('[Current structure] ' + curStruct);
        lines.push('[Problem description]');
        lines.push(text);
        if (n) {
          lines.push('');
          lines.push('(Please manually attach the ' + n + ' screenshot' + (n === 1 ? '' : 's') +
            ' you selected in the app to this email before sending.)');
        }
      } else {
        lines.push('【软件】' + info.name + ' ' + info.version + '（构建：' + info.build + '）');
        lines.push('【当前结构】' + curStruct);
        lines.push('【问题描述】');
        lines.push(text);
        if (n) {
          lines.push('');
          lines.push('（已选择 ' + n + ' 张问题截图，请在此邮件中手动添加为附件后发送。）');
        }
      }
      var subject = encodeURIComponent(fbL('【晶见问题反馈】', '[CrystaSee feedback] ') + text.slice(0, 24));
      var body = encodeURIComponent(lines.join('\n'));
      var mailto = 'mailto:' + FEEDBACK_EMAIL + '?subject=' + subject + '&body=' + body;
      var a = api();
      if (a && a.open_url) {
        try {
          var r2 = a.open_url(mailto);
          if (r2 && r2.error) toast(r2.error, true);
          else toast(fbL('已唤起邮件客户端，请将所选截图作为附件添加后发送',
            'Mail client opened — please attach the selected screenshots before sending'));
        } catch (e2) { toast('唤起邮件失败：' + e2.message, true); }
      } else {
        try { window.open(mailto); toast('已唤起邮件客户端'); }
        catch (e3) { toast('无法唤起邮件客户端', true); }
      }
      closeModal();
    }
    if (submit) submit.addEventListener('click', doSubmit);
    if (cancel) cancel.addEventListener('click', closeModal);
  }
  var TOOL_META = {
    packing: { title: '分子堆积与相互作用分析', ico: '⬡', subtitle: '分析晶体中的分子堆积模式与分子间相互作用（氢键、卤键、π–π、CH···π、范德华接触等）',
      plan: ['读取已展开的晶胞 / 超胞，按对称等价与最短接触距离识别分子内与分子间键', '计算分子对之间的距离、角度与几何参数，输出接触图谱与统计', '在三维视图中高亮标记相互作用，支持阈值筛选与导出报告'] },
    habit: { title: '晶习模拟', ico: '◆', subtitle: '基于生长形貌理论（如 BFDH）预测晶体的理想外形，对比不同环境下生长得到的晶习',
      plan: ['解析晶面间距与对称等价的晶面族', '按选定模型计算各晶面相对生长速率并生成生长形', '交互调整主导晶面、可视化习最终外形'] },
    pxrd: { title: 'PXRD 模拟', ico: '∿', subtitle: '根据晶体结构计算粉末 X 射线衍射图谱（峰位、相对强度、全谱），用于物相鉴定与峰归属',
      plan: ['从结构计算晶面间距 d 与结构因子 F', '按 Debye–Scherrer / 峰形函数合成衍射图谱', '叠加 Kα 双线、展宽与背景，输出可对比的模拟谱'] },
  };
  /* ===== 相互作用分析（Phase 1 收尾：氢键 / 接触清单） ===== */
  /* 以下元素基础数据表全部由 _build/data/element_data.json 经
     _build/sync_element_data.js 生成，内核与外壳共用同一份数值，禁止手工编辑。 */
  var CS_FALLBACK = {
  cov:1.2,vdw:1.8,color:'#cfcfcf',neutron:0,f:0
};
  var CS_NEUTRON_LAMBDA = 1.5403;
  var CS_COV = {
  H:0.31,D:0.31,He:0.28,Li:1.28,Be:0.96,B:0.84,C:0.76,N:0.71,O:0.66,F:0.57,Ne:0.58,Na:1.66,
  Mg:1.41,Al:1.21,Si:1.11,P:1.07,S:1.05,Cl:1.02,Ar:1.06,K:2.03,Ca:1.76,Sc:1.7,Ti:1.6,V:1.53,
  Cr:1.39,Mn:1.39,Fe:1.32,Co:1.26,Ni:1.24,Cu:1.32,Zn:1.22,Ga:1.22,Ge:1.2,As:1.19,Se:1.2,Br:1.2,
  Kr:1.16,Rb:2.2,Sr:1.95,Y:1.9,Zr:1.75,Nb:1.64,Mo:1.54,Tc:1.47,Ru:1.46,Rh:1.42,Pd:1.39,Ag:1.45,
  Cd:1.44,In:1.42,Sn:1.39,Sb:1.39,Te:1.38,I:1.39,Xe:1.4,Cs:2.44,Ba:2.15,La:2.07,Ce:2.04,Pr:2.03,
  Nd:2.01,Pm:1.99,Sm:1.98,Eu:1.98,Gd:1.96,Tb:1.94,Dy:1.92,Ho:1.92,Er:1.89,Tm:1.9,Yb:1.87,Lu:1.87,
  Hf:1.75,Ta:1.7,W:1.62,Re:1.51,Os:1.44,Ir:1.41,Pt:1.36,Au:1.36,Hg:1.32,Tl:1.45,Pb:1.46,Bi:1.48,
  Po:1.4,At:1.5,Rn:1.5,Fr:2.6,Ra:2.21,Ac:2.15,Th:2.06,Pa:2,U:1.96,Np:1.9,Pu:1.87
};
  // 范德华半径（Pauling 1939 / Bondi 1964,1966 体系）——全软件唯一数据源，
  // 必须与渲染内核 index.src.html 的 VDW 逐项一致；校验脚本 _build/verify_vdw_consistency.js。
  // 表外元素统一回退 1.8 Å（与内核 vdwR 相同），不再用 C 的半径兜底。
  var CS_VDW = {
  H:1.2,He:1.4,Li:1.81,Be:1.53,B:1.92,C:1.7,N:1.55,O:1.52,F:1.47,Ne:1.54,
  Na:2.27,Mg:1.73,Al:1.84,Si:2.1,P:1.8,S:1.8,Cl:1.75,Ar:1.88,K:2.75,Ca:2.31,
  Sc:2.11,Ti:2.11,V:2.11,Cr:2.05,Mn:2.05,Fe:2.04,Co:2,Ni:1.63,Cu:1.4,Zn:1.39,
  Ga:1.87,Ge:2.11,As:1.85,Se:1.9,Br:1.85,Kr:2.02,Rb:3.03,Sr:2.49,Y:2.32,Zr:2.23,
  Nb:2.36,Mo:2.45,Tc:2.44,Ru:2.46,Rh:2.44,Pd:1.63,Ag:1.72,Cd:1.58,In:1.93,Sn:2.17,
  Sb:2.06,Te:2.06,I:1.98,Xe:2.16,Cs:3.43,Ba:2.68,La:2.43,Ce:2.42,Hf:2.23,Ta:2.22,
  W:2.1,Re:2.16,Os:2.16,Ir:2.13,Pt:1.75,Au:1.66,Hg:1.55,Tl:1.96,Pb:2.02,Bi:2.07,
  Po:1.97,At:2.02,Rn:2.2,Fr:3.48,Ra:2.83,Th:2.37,U:1.86
};
  function csVdwR(el) { return (CS_VDW[el] !== undefined) ? CS_VDW[el] : CS_FALLBACK.vdw; }
  var CS_ACC = {
  N:1,O:1,F:1,Cl:1,S:1,P:1,Br:1,I:1
};
  var CS_DONOR = {
  O:1,N:1,F:1
};
  // 氢键几何阈值（可由相互作用分析面板覆盖；默认标准值）
  var CS_HBOND_HA_MAX = 2.6;   // H···A 距离上限 (Å)
  var CS_HBOND_ANG_MIN = 120;  // D–H···A 夹角下限 (°)
  function csRadius(el, t) { return (t[el] !== undefined) ? t[el] : CS_FALLBACK.cov; }
  function csDist(a, b) { var dx=a[0]-b[0], dy=a[1]-b[1], dz=a[2]-b[2]; return Math.sqrt(dx*dx+dy*dy+dz*dz); }
  function csVlen(v) { return Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]); }
  function csAngle(u, v) { var d=csVlen(u)*csVlen(v); if (d<1e-9) return -1; var c=(u[0]*v[0]+u[1]*v[1]+u[2]*v[2])/d; c=Math.max(-1,Math.min(1,c)); return Math.acos(c)*180/Math.PI; }
  function csAngleAtH(D, H, A) { return csAngle([D[0]-H[0],D[1]-H[1],D[2]-H[2]], [A[0]-H[0],A[1]-H[1],A[2]-H[2]]); }
  function csSolve3(A, b) {
    function det3(M) { return M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1]) - M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0]) + M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]); }
    var det=det3(A); if (Math.abs(det)<1e-12) return null;
    var d0=[[b[0],A[0][1],A[0][2]],[b[1],A[1][1],A[1][2]],[b[2],A[2][1],A[2][2]]];
    var d1=[[A[0][0],b[0],A[0][2]],[A[1][0],b[1],A[1][2]],[A[2][0],b[2],A[2][2]]];
    var d2=[[A[0][0],A[0][1],b[0]],[A[1][0],A[1][1],b[1]],[A[2][0],A[2][1],b[2]]];
    return [det3(d0)/det, det3(d1)/det, det3(d2)/det];
  }
  // 由 分数坐标->笛卡尔坐标 的最小二乘线性拟合反演晶胞度量（对旋转不变，长度/角度精确）
  function csFitCell(atoms) {
    var n=atoms.length; if (n<4) return null;
    var mF=[0,0,0], mC=[0,0,0], k;
    for (var i=0;i<n;i++) { for (k=0;k<3;k++) { mF[k]+=atoms[i].frac[k]; mC[k]+=atoms[i].cart[k]; } }
    for (k=0;k<3;k++) { mF[k]/=n; mC[k]/=n; }
    var N=[[0,0,0],[0,0,0],[0,0,0]], rhs=[[0,0,0],[0,0,0],[0,0,0]];
    for (var i2=0;i2<n;i2++) {
      var a=atoms[i2];
      var f=[a.frac[0]-mF[0],a.frac[1]-mF[1],a.frac[2]-mF[2]];
      var c=[a.cart[0]-mC[0],a.cart[1]-mC[1],a.cart[2]-mC[2]];
      for (var p=0;p<3;p++) {
        for (var q=0;q<3;q++) N[p][q]+=f[p]*f[q];
        for (var ax=0;ax<3;ax++) rhs[ax][p]+=f[p]*c[ax];
      }
    }
    var Mrows=[];
    for (var ax2=0;ax2<3;ax2++) { var sol=csSolve3(N,[rhs[ax2][0],rhs[ax2][1],rhs[ax2][2]]); if (!sol) return null; Mrows.push(sol); }
    var av=[Mrows[0][0],Mrows[1][0],Mrows[2][0]], bv=[Mrows[0][1],Mrows[1][1],Mrows[2][1]], cv=[Mrows[0][2],Mrows[1][2],Mrows[2][2]];
    return { a:csVlen(av), b:csVlen(bv), c:csVlen(cv), al:csAngle(bv,cv), be:csAngle(av,cv), ga:csAngle(av,bv), vectors:{a:av,b:bv,c:cv} };
  }
  // 最小像约定：在 +/-1 晶胞内寻找两原子间最短距离（用于周期邻近相互作用）
  function csMinImage(p, q, cell) {
    if (!cell || !cell.vectors) return { dist:csDist(p,q), q:q.slice() };
    var A=cell.vectors.a, B=cell.vectors.b, C=cell.vectors.c, best=csDist(p,q), bq=q.slice();
    for (var ix=-1;ix<=1;ix++) for (var iy=-1;iy<=1;iy++) for (var iz=-1;iz<=1;iz++) {
      if (ix===0 && iy===0 && iz===0) continue;
      var sh=[ix*A[0]+iy*B[0]+iz*C[0], ix*A[1]+iy*B[1]+iz*C[1], ix*A[2]+iy*B[2]+iz*C[2]];
      var qq=[q[0]+sh[0],q[1]+sh[1],q[2]+sh[2]], d=csDist(p,qq);
      if (d<best) { best=d; bq=qq; }
    }
    return { dist:best, q:bq };
  }
  function csGetKernelData() {
    var vw = document.getElementById('viewer'); if (!vw) return null;
    var cv = vw.contentWindow && vw.contentWindow.__cviz; if (!cv) return null;
    var atoms = [];
    cv.group.children.forEach(function (c) {
      if (c.userData && c.userData.el && c.userData.frac && c.position) {
        var pos = c.position;
        atoms.push({ el: c.userData.el, frac: (c.userData.frac||[0,0,0]).slice(0,3),
                     cart: [pos.x, pos.y, pos.z], label: c.userData.label || '' });
      }
    });
    var cfg = (cv.config ? cv.config() : {}) || {};
    var sc = (cfg.supercell && cfg.supercell.length === 3) ? cfg.supercell
           : [cv.state.scA, cv.state.scB, cv.state.scC];
    var cell = csFitCell(atoms);
    return { atoms: atoms, cell: cell, sg: null, sc: sc, structure: (cfg.structure || '当前结构') };
  }
  // 读取渲染内核「分子」拾取工具当前已选中的分子 id 列表（内核 iframe 的 __cvPick.state._mols）
  function csGetKernelPickMols() {
    try {
      var vw = document.getElementById('viewer');
      var pk = vw && vw.contentWindow && vw.contentWindow.__cvPick;
      if (!pk || !pk.state) return [];
      return (pk.state._mols || []).slice();
    } catch (e) { return []; }
  }
  function csAnalyze(kd) {
    var A = kd.atoms, n = A.length; if (!n) return { empty: true };
    var cell = kd.cell;
    var adj = []; for (var i=0;i<n;i++) adj.push([]);
    var hbonds = [], contacts = [], hbPairs = {};
    for (var i=0;i<n;i++) for (var j=i+1;j<n;j++) {
      // 用最小像距离判键：晶体中跨周期边界的共价键（直接距离很大）也能正确识别
      var d = csMinImage(A[i].cart, A[j].cart, cell).dist;
      var covI = csRadius(A[i].el, CS_COV), covJ = csRadius(A[j].el, CS_COV);
      if (d>0.35 && d < covI+covJ+0.45) { adj[i].push(j); adj[j].push(i); }
    }
    // 分子归属（键连通分量），用于「仅分子间」接触判定
    var compParent = []; for (var ci=0;ci<n;ci++) compParent[ci]=ci;
    function compFind(x){ while(compParent[x]!==x){ compParent[x]=compParent[compParent[x]]; x=compParent[x]; } return x; }
    for (var ei=0;ei<n;ei++) for (var ej=0;ej<adj[ei].length;ej++){ var r=compFind(ei), s=compFind(adj[ei][ej]); if(r!==s) compParent[s]=r; }
    var compOf = []; for (var co=0;co<n;co++) compOf[co]=compFind(co);
    // —— 氢键（与 3D 窗口同一判定）：供体 D=与 H 成键的最近 O/N/F；H···A < 上限；D–H···A ≥ 下限 ——
    for (var h=0; h<n; h++) {
      if (A[h].el !== 'H') continue;
      var D=-1, dbest=1e9;
      for (var k=0;k<n;k++){
        if (k===h || !CS_DONOR[A[k].el]) continue;
        var ddk = csMinImage(A[h].cart, A[k].cart, cell).dist;
        if (ddk < csRadius(A[k].el,CS_COV)+csRadius('H',CS_COV)+0.35 && ddk<dbest) { dbest=ddk; D=k; }
      }
      if (D<0) continue;
      for (var a=0; a<n; a++) {
        if (a===h || a===D) continue;
        if (!CS_ACC[A[a].el]) continue;
        var mi = csMinImage(A[h].cart, A[a].cart, cell);
        if (mi.dist < 0.9) continue;                              // 卫生下限
        if (mi.dist >= CS_HBOND_HA_MAX) continue;                 // 标准(1)：H···A 距离 < 上限 (默认 2.6 Å)
        var dDA = csMinImage(A[D].cart, A[a].cart, cell).dist;
        var ang = csAngleAtH(A[D].cart, A[h].cart, mi.q);         // D–H···A 角（H 处）
        if (ang < CS_HBOND_ANG_MIN - 1e-6) continue;              // 标准(2)：≥ 下限 (默认 120°，含边界容差)
        hbonds.push({ D:A[D].el+'#'+D, H:'H#'+h, A:A[a].el+'#'+a,
          dHA:mi.dist, dDA:dDA, ang:ang, xi:h, xj:a });
        hbPairs[Math.min(h,a)+'-'+Math.max(h,a)] = 1;
      }
    }
    // —— 范德华 / H…接触：仅「分子间」（不同键连通分量）；非共价键、非氢键 ——
    for (var i2=0; i2<n; i2++) for (var j2=i2+1; j2<n; j2++) {
      if (adj[i2].indexOf(j2) >= 0) continue;
      if (hbPairs[i2+'-'+j2]) continue;
      if (compOf[i2] === compOf[j2]) continue;                    // 仅分子间
      var mi2 = csMinImage(A[i2].cart, A[j2].cart, cell);
      var d2 = mi2.dist;
      if (d2>0.35 && d2 < csVdwR(A[i2].el)+csVdwR(A[j2].el)+0.30)
        contacts.push({ a:A[i2].el+'#'+(i2), b:A[j2].el+'#'+(j2), dist:d2, type:(A[i2].el==='H'||A[j2].el==='H')?'H…接触':'范德华接触' });
    }
    hbonds.sort(function (p,q){return p.dHA-q.dHA;});
    contacts.sort(function (p,q){return p.dist-q.dist;});
    var totalContacts = contacts.length;
    if (contacts.length > 80) contacts = contacts.slice(0,80);
    return { empty:false, hbonds:hbonds, contacts:contacts, totalContacts:totalContacts, cell:kd.cell, sg:kd.sg, sc:kd.sc, structure:kd.structure, nAtoms:n };
  }
  function csFmt(x, d) { var f=Math.pow(10,d); return Math.round(x*f)/f; }
  // 原子引用显示：统一采用 CIF _atom_site_label 晶体学标签（开放标准），
  // 不再向用户暴露软件内部实例序号 (#n)；无标签时只显示元素符号。
  // 注意：计算层 csAnalyze 的 "El#n" 字符串必须保持不变——
  //       堆叠分析靠 /#(\d+)/ 反解原子索引，装饰只做在渲染层。
  function csDecorateRef(kd, ref){
    var s = '' + ref, m = s.match(/^([^#]*)#(\d+)$/);
    if (!m) return s;
    var idx = parseInt(m[2], 10), a = kd && kd.atoms && kd.atoms[idx];
    if (!a || !a.label) return m[1];
    return String(a.label).replace(/[<>&"']/g, '');
  }
  /* 数据覆盖提示：表外元素不静默回退，科研使用时必须显式告知 */
  function csDataCoverageNote(kd) {
    if (!kd || !kd.atoms || !kd.atoms.length) return '';
    var miss = {};
    kd.atoms.forEach(function (a) {
      var el = a.el;
      if (!el || el === 'X' || el === 'D') return;  // D 为氢同位素，沿用 H 的数据
      if (CS_VDW[el] === undefined || CS_COV[el] === undefined ||
          !window.CS_SF || !window.CS_SF.Z[el]) miss[el] = 1;
    });
    var els = Object.keys(miss);
    if (!els.length) return '';
    return '<p class="ia-note">注意：以下元素缺少文献基础数据，已按统一回退值处理，相关结果仅供参考：'+
      els.join('、')+'</p>';
  }
  function csInteractionReportHtml(kd) {
    if (!kd) return '<p class="tool-soon">渲染内核尚未就绪，请稍候再试。</p>';
    var an = csAnalyze(kd);
    if (an.empty) return '<p>当前结构未读取到原子数据。</p>';
    var cellHtml = an.cell ? '<div class="ia-cell">晶胞 a='+csFmt(an.cell.a,3)+' b='+csFmt(an.cell.b,3)+' c='+csFmt(an.cell.c,3)+
      ' Å · α='+csFmt(an.cell.al,1)+' β='+csFmt(an.cell.be,1)+' γ='+csFmt(an.cell.ga,1)+'°（由坐标反演）</div>'
      : '<div class="ia-cell">晶胞参数：内核未导出（已尝试由坐标反演但数据不足）</div>';
    var scHtml = '<div class="ia-cell">超胞：'+an.sc[0]+'×'+an.sc[1]+'×'+an.sc[2]+' · 原子数 '+an.nAtoms+'</div>';
    var hbHtml = an.hbonds.length ?
      '<div class="ia-list"><div class="ia-row ia-head"><span>供体 D</span><span>氢 H</span><span>受体 A</span><span>D···A (Å)</span><span>H···A (Å)</span><span>∠D-H···A</span></div>' +
      an.hbonds.map(function (h,idx) {
        return '<div class="ia-row'+(idx%2?' ia-alt':'')+'"><span>'+csDecorateRef(kd,h.D)+'</span><span>'+csDecorateRef(kd,h.H)+'</span><span>'+csDecorateRef(kd,h.A)+'</span><span>'+csFmt(h.dDA,2)+'</span><span>'+csFmt(h.dHA,2)+'</span><span>'+(h.ang>=0?csFmt(h.ang,0)+'°':'—')+'</span></div>';
      }).join('') + '</div>' :
      '<p class="ia-none">未检测到氢键（结构中无满足几何阈值的 D–H···A）。</p>';
    var ctHtml = an.contacts.length ?
      '<div class="ia-list"><div class="ia-row ia-head"><span>原子 A</span><span>原子 B</span><span>距离 (Å)</span><span>类型</span></div>' +
      an.contacts.map(function (c,idx) {
        return '<div class="ia-row'+(idx%2?' ia-alt':'')+'"><span>'+csDecorateRef(kd,c.a)+'</span><span>'+csDecorateRef(kd,c.b)+'</span><span>'+csFmt(c.dist,2)+'</span><span>'+c.type+'</span></div>';
      }).join('') + '</div>' +
      (an.totalContacts>an.contacts.length ? '<p class="ia-note">仅显示最短的 '+an.contacts.length+' 条，共识别 '+an.totalContacts+' 条。</p>' : '')
      :
      '<p class="ia-none">未检测到显著范德华接触（阈值内）。</p>';
    var note = '<p class="ia-note">基于当前显示的晶胞 / 超胞原子，采用最小像约定（±1 晶胞）识别周期邻近相互作用：以共价半径距离判据判键，按标准氢键几何阈值（H···A &lt; '+CS_HBOND_HA_MAX+' Å，D–H···A ≥ '+CS_HBOND_ANG_MIN+'°；可在上方修改）与范德华接触（Σr<sub>vdW</sub> + 0.30 Å）识别。原子标签采用 CIF _atom_site_label 标签（开放标准字段）：对称等价原子以 A/B… 字母与 * 后缀区分（如 C1 与 C1A*），不同晶胞的纯平移副本沿用同一标签，保证化学环境相同的原子标签一致。如需包含更多周期邻近分子，可增大超胞后重新分析。</p>';
    return '<div class="ia-summary"><b>'+(an.structure||'当前结构')+'</b></div>'+cellHtml+scHtml+
      '<div class="ia-stat">氢键 <b>'+an.hbonds.length+'</b> 条 · 范德华接触 <b>'+an.totalContacts+'</b> 条（按距离排序）</div>'+
      '<h3>氢键 D–H···A</h3>'+hbHtml+'<h3>范德华接触（最短）</h3>'+ctHtml+csDataCoverageNote(kd)+note;
  }
  function csRenderInteractionModal(kd) {
    if (!kd) return { title:'分子堆积与相互作用分析', html:'<p class="tool-soon">渲染内核尚未就绪，请稍候再试。</p>' };
    var report = csInteractionReportHtml(kd);
    var controls = '<div class="ia-controls"><span class="ia-ctl-label">氢键几何定义（默认标准值）</span>' +
      'H···A 距离上限 <input type="number" id="hb-ha-max" class="ia-num" min="1.5" max="4.0" step="0.1" value="'+CS_HBOND_HA_MAX+'"> Å' +
      ' &nbsp;·&nbsp; D–H···A 夹角下限 <input type="number" id="hb-ang-min" class="ia-num" min="60" max="180" step="1" value="'+CS_HBOND_ANG_MIN+'"> °' +
      '<span class="ia-ctl-hint">修改后立即应用于相互作用分析清单与三维可视化窗口</span></div>';
    return { title:'分子堆积与相互作用分析', html: controls + '<div id="ia-report">' + report + '</div>' };
  }

  /* ===== 分子堆叠 分析引擎（纯外壳计算） ===== */
  function csDet3(M){ return M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1]) - M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0]) + M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]); }
  function csCentroid(P){ var c=[0,0,0]; for(var i=0;i<P.length;i++) for(var k=0;k<3;k++) c[k]+=P[i][k]; var n=Math.max(1,P.length); for(var k=0;k<3;k++) c[k]/=n; return c; }
  function csMolFormula(els){ var f={}; els.forEach(function(e){ f[e]=(f[e]||0)+1; });
    var order=['C','H','N','O','S','P','F','Cl','Br','I','Na','K','Ca','Mg','Zn','Fe','B','Si','Al','Ti','Mn','Ni','Cu'];
    var s=''; order.forEach(function(e){ if(f[e]) s+=e+(f[e]>1?f[e]:''); });
    Object.keys(f).forEach(function(e){ if(order.indexOf(e)<0) s+=e+(f[e]>1?f[e]:''); }); return s; }

  // 由共价半径（最小像）判定化学键，并做并查集分子分组
  function csBondsOf(atoms, cell){
    var n=atoms.length, adj=[]; for(var i=0;i<n;i++) adj.push([]);
    var pairs=[];
    for(var i=0;i<n;i++) for(var j=i+1;j<n;j++){
      var d=csMinImage(atoms[i].cart, atoms[j].cart, cell).dist;
      var covI=csRadius(atoms[i].el,CS_COV), covJ=csRadius(atoms[j].el,CS_COV);
      if(d>0.35 && d<covI+covJ+0.45){ adj[i].push(j); adj[j].push(i); pairs.push([i,j]); }
    }
    return {adj:adj, pairs:pairs};
  }
  function csGetMolecules(kd){
    var atoms = kd.atoms; if (!atoms.length) return { mols:[], molOf:[], adj:[] };
    var b = csBondsOf(atoms, kd.cell);
    var parent = []; for (var i=0;i<atoms.length;i++) parent.push(i);
    function find(x){ while(parent[x]!==x){ parent[x]=parent[parent[x]]; x=parent[x]; } return x; }
    function uni(x,y){ var rx=find(x), ry=find(y); if(rx!==ry) parent[rx]=ry; }
    b.pairs.forEach(function(p){ uni(p[0],p[1]); });
    var groups={}; for (var i=0;i<atoms.length;i++){ var r=find(i); if(!groups[r]) groups[r]=[]; groups[r].push(i); }
    var mols=[]; Object.keys(groups).forEach(function(k){
      var idxs = groups[k].slice().sort(function(a,b){ if(atoms[a].el!==atoms[b].el) return atoms[a].el<atoms[b].el?-1:1;
        for(var c=0;c<3;c++){ var d=atoms[a].cart[c]-atoms[b].cart[c]; if(Math.abs(d)>1e-7) return d<0?-1:1; } return 0; });
      var cen=csCentroid(idxs.map(function(i){return atoms[i].cart;}));
      mols.push({ idxs:idxs, atoms:idxs.map(function(i){ return {el:atoms[i].el, cart:atoms[i].cart.slice()}; }),
        centroid:cen, formula:csMolFormula(idxs.map(function(i){return atoms[i].el;})) });
    });
    mols.sort(function(a,b){ return b.idxs.length-a.idxs.length; });
    var molOf=[]; for(var i=0;i<atoms.length;i++) molOf.push(-1);
    mols.forEach(function(m,mi){ m.idxs.forEach(function(i){ molOf[i]=mi; }); });
    return { mols:mols, molOf:molOf, adj:b.adj, atoms:atoms, cell:kd.cell };
  }
  // Kabsch 最优叠合 + RMSD（P、Q 为等长对应点集）
  function csKabsch(P, Q){
    var n=P.length; if(!n) return null;
    var cp=csCentroid(P), cq=csCentroid(Q);
    var Pc=[], Qc=[]; for(var i=0;i<n;i++){ Pc.push([P[i][0]-cp[0],P[i][1]-cp[1],P[i][2]-cp[2]]); Qc.push([Q[i][0]-cq[0],Q[i][1]-cq[1],Q[i][2]-cq[2]]); }
    var H=[[0,0,0],[0,0,0],[0,0,0]]; for(var i=0;i<n;i++) for(var a=0;a<3;a++) for(var b=0;b<3;b++) H[a][b]+=Pc[i][a]*Qc[i][b];
    // SVD：U = H Hᵀ 的单位特征向量；再由 V_i = (Hᵀ·u_i)/σ_i 配对，避免简并本征值下 U/V 错配
    var eU=csJacobi3(csSymMul(H,csTp(H))), U=eU.vec, V=[];
    for(var k=0;k<3;k++){ var htu=csSymMul(csTp(H),[[U[k][0]],[U[k][1]],[U[k][2]]]); var hv=[htu[0][0],htu[1][0],htu[2][0]];
      var hl=Math.sqrt(hv[0]*hv[0]+hv[1]*hv[1]+hv[2]*hv[2]); V.push(hl>1e-12?[hv[0]/hl,hv[1]/hl,hv[2]/hl]:[0,0,0]); }
    if(csDet3(U)*csDet3(V)<0){ for(var k2=0;k2<3;k2++) V[2][k2]=-V[2][k2]; }
    // 最优旋转 R = Vᵀ·U（标准 Kabsch：H=UΣVᵀ ⇒ R=V Uᵀ ；此处 U/V 以「行=奇异向量」存储，故取 Vᵀ·U）
    var R=csSymMul(csTp(V),U);
    var S=eU.val.map(function(v){ return Math.sqrt(Math.max(0,v)); });
    var ssq=0; for(var i=0;i<n;i++){ var rp=csRotV(Pc[i],R); var d0=rp[0]-Qc[i][0],d1=rp[1]-Qc[i][1],d2=rp[2]-Qc[i][2]; ssq+=d0*d0+d1*d1+d2*d2; }
    var ang=Math.acos(Math.max(-1,Math.min(1,(R[0][0]+R[1][1]+R[2][2]-1)/2)))*180/Math.PI;
    return { R:R, cp:cp, cq:cq, rmsd:Math.sqrt(ssq/n), S:S, angle:ang, n:n };
  }
  // 匈牙利算法（Kuhn–Munkres，O(n³)）：返回行 i → 列指派的方阵最小代价匹配
  // 支持非方阵（行/列数不等）：将较小维以「大有限值」填充为方阵（不能用 Infinity——
  // 否则当行数<列数产生全 Infinity 的虚拟行时，增广阶段找不到可分配列而崩溃）。
  function csHungarian(cost){
    if(!cost || !cost.length) return [];
    var n=cost.length, m=(cost[0]?cost[0].length:0), dim=Math.max(n,m), INF=1e12, PAD=1e11, a=[];
    for(var i=0;i<dim;i++){ a.push([]); for(var j=0;j<dim;j++) a[i].push((i<n&&j<m&&cost[i]&&j<cost[i].length)?cost[i][j]:PAD); }
    var u=new Array(dim+1).fill(0), v=new Array(dim+1).fill(0), p=new Array(dim+1).fill(0), way=new Array(dim+1).fill(0);
    for(var i=1;i<=dim;i++){ p[0]=i; var j0=0; var minv=new Array(dim+1).fill(INF), used=new Array(dim+1).fill(false);
      do { used[j0]=true; var i0=p[j0], delta=INF, j1=-1;
        for(var j=1;j<=dim;j++) if(!used[j]){ var cur=a[i0-1][j-1]-u[i0]-v[j]; if(cur<minv[j]){minv[j]=cur; way[j]=j0;} if(minv[j]<delta){delta=minv[j]; j1=j;} }
        for(var j=0;j<=dim;j++){ if(used[j]){ u[p[j]]+=delta; v[j]-=delta; } else minv[j]-=delta; }
        j0=j1;
      } while(p[j0]!==0);
      do { var j2=way[j0]; p[j0]=p[j2]; j0=j2; } while(j0);
    }
    var ans=new Array(n).fill(-1); for(var j=1;j<=dim;j++){ if(p[j]>0) ans[p[j]-1]=j-1; }
    return ans;
  }
  // 原子匹配（旧版：按元素分组 + 匈牙利最优指派，不感知分子对称）。
  // 仅作为非同构 / 原子数不等（例如异构体对比）时的回退路径。
  function csMatchAndAlignLegacy(molA, molB){
    function byEl(m){ var g={}; m.forEach(function(a,i){ (g[a.el]=g[a.el]||[]).push(i); }); return g; }
    var gA=byEl(molA), gB=byEl(molB), PA=[], PB=[], MA=[], MB=[];
    Object.keys(gA).forEach(function(el){
      var ia=gA[el], ib=(gB[el]||[]); if(!ib.length) return;
      var n=ia.length, m=ib.length, j;
      if(n===m){
        var cost=[]; for(var i=0;i<n;i++){ cost.push([]); for(j=0;j<m;j++) cost[i].push(csDist(molA[ia[i]].cart, molB[ib[j]].cart)); }
        var asg=csHungarian(cost);
        for(var i=0;i<n;i++){ j=asg[i]; if(j>=0&&j<m){ PA.push(molA[ia[i]].cart); PB.push(molB[ib[j]].cart); MA.push(ia[i]); MB.push(ib[j]); } }
      } else {
        var used=new Array(m).fill(false);
        for(var i=0;i<n;i++){ var best=-1,bd=1e18; for(j=0;j<m;j++){ if(used[j])continue; var d=csDist(molA[ia[i]].cart,molB[ib[j]].cart); if(d<bd){bd=d;best=j;} }
          if(best>=0){used[best]=true; PA.push(molA[ia[i]].cart); PB.push(molB[ib[best]].cart); MA.push(ia[i]); MB.push(ib[best]);} }
      }
    });
    var ka=csKabsch(PA, PB); if(ka){ ka.pa=PA; ka.pb=PB; ka.match=MA.map(function(_,k){ return [MA[k],MB[k]]; }); }
    return ka;
  }
  // 原子匹配：优先用 SNAP（snapRMSD，ChemRxiv 10.26434/chemrxiv.15007012）做
  // 「对称性感知」最优叠合。两分子原子数相等且图同构时，枚举对称允许的指派并取
  // 全局 Kabsch RMSD 最小者——彻底解决「构象一致却因对称等价编号互换而被错配成
  // 大病 RMSD」的根病；否则（原子数不等 / 非同构，例如异构体对比）回退旧版匈牙利。
  function csMatchAndAlign(molA, molB){
    var snap = (typeof window !== 'undefined' && window.csSnapRMSD) ? window.csSnapRMSD
             : (typeof csSnapRMSD !== 'undefined' ? csSnapRMSD : null);
    if (snap && molA.length === molB.length && molA.length){
      var aA = molA.map(function(a){ return { el:a.el, cart:a.cart }; });
      var aB = molB.map(function(a){ return { el:a.el, cart:a.cart }; });
      var res = snap(aA, aB);
      if (res && res.isomorphic){
        return { R:res.R, cp:res.cp, cq:res.cq, rmsd:res.rmsd, angle:res.angle, n:res.n,
                 pa:res.pa, pb:res.pb, match:res.match };
      }
    }
    return csMatchAndAlignLegacy(molA, molB);
  }
  // 由晶胞向量构建 3×3×3 超胞邻域（供堆叠分析取邻居）
  function csBuildSupercell(mols, cell){
    if(!cell||!cell.vectors) return mols.map(function(m,i){ return {atoms:m.atoms, centroid:m.centroid, formula:m.formula, base:i, img:[0,0,0]}; });
    var A=cell.vectors.a,B=cell.vectors.b,C=cell.vectors.c, all=[];
    mols.forEach(function(m,base){ for(var nx=-1;nx<=1;nx++) for(var ny=-1;ny<=1;ny++) for(var nz=-1;nz<=1;nz++){
      var sh=[nx*A[0]+ny*B[0]+nz*C[0], nx*A[1]+ny*B[1]+nz*C[1], nx*A[2]+ny*B[2]+nz*C[2]];
      all.push({ atoms:m.atoms.map(function(a){ return {el:a.el, cart:[a.cart[0]+sh[0],a.cart[1]+sh[1],a.cart[2]+sh[2]]}; }),
        centroid:[m.centroid[0]+sh[0],m.centroid[1]+sh[1],m.centroid[2]+sh[2]], formula:m.formula, base:base, img:[nx,ny,nz] });
    }});
    return all;
  }
  // 两分子叠合二维投影（参考描边 + 目标半透明填充）
  function csDrawStack(canvas, ref, tgt, ka){
    if(!canvas||!canvas.getContext) return;
    var ctx=canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
    var view={yaw:0.7,pitch:0.4};
    var P=ref.atoms.map(function(a){return a.cart;}), cR=csCentroid(P);
    var Q=tgt.atoms.map(function(a){return a.cart;}), cT=csCentroid(Q);
    var Qa=Q.map(function(q){ var c=[q[0]-cT[0],q[1]-cT[1],q[2]-cT[2]]; var r=csRotV(c,ka.R); return [r[0]+cR[0],r[1]+cR[1],r[2]+cR[2]]; });
    function proj(p){ var v=[p[0]-cR[0],p[1]-cR[1],p[2]-cR[2]]; var r=csRotV(v,csRotMat(view)); return [r[0],r[1]]; }
    var xs=[],ys=[]; P.concat(Qa).forEach(function(p){ var q=proj(p); xs.push(q[0]); ys.push(q[1]); });
    var minx=Math.min.apply(null,xs),maxx=Math.max.apply(null,xs),miny=Math.min.apply(null,ys),maxy=Math.max.apply(null,ys);
    var sc=Math.min((canvas.width-40)/(maxx-minx||1),(canvas.height-40)/(maxy-miny||1)), ox=canvas.width/2, oy=canvas.height/2;
    function xy(p){ var q=proj(p); return [ox+q[0]*sc, oy-q[1]*sc]; }
    Qa.forEach(function(p){ var a=xy(p); ctx.beginPath(); ctx.arc(a[0],a[1],5,0,7); ctx.fillStyle='rgba(34,68,204,0.45)'; ctx.fill(); });
    P.forEach(function(p){ var a=xy(p); ctx.beginPath(); ctx.arc(a[0],a[1],5,0,7); ctx.lineWidth=2; ctx.strokeStyle='#222'; ctx.stroke(); });
    ctx.fillStyle='#444'; ctx.font='12px "HarmonyOS Sans SC", sans-serif'; ctx.fillText('● 参考分子（描边）   ◍ 目标分子（蓝，已叠合）', 8, 16);
  }

  // ===== 堆叠分析：独立结构解析 + 嵌入式 3D 预览/结果渲染 =====
  // 元素 CPK 配色（用于预览与原子着色）
  var CS_ELEM_COLOR = {
  H:'#e8e8e8',C:'#3a3a3a',N:'#3a6bff',O:'#ff3b3b',F:'#7ee060',Cl:'#27d12a',
  Br:'#b23b3b',I:'#8e2bd6',S:'#ffd11a',P:'#ff8a2a',B:'#ffc9c9',Si:'#e8c79a',
  Na:'#b06bff',Mg:'#9bff3a',Ca:'#4dff3a',Fe:'#e07645',Zn:'#8a8dc8',Cu:'#cf8a45',
  default:'#cfcfcf'
};
  // 颜色明暗调节（用于 3D 深度着色）
  function csShade(hex, f){ var h=String(hex||'').replace('#',''); if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    function pc(v){ v=Math.round(Math.min(255,Math.max(0,v*f))); return ('0'+v.toString(16)).slice(-2); }
    var r=parseInt(h.substr(0,2),16), g=parseInt(h.substr(2,2),16), b=parseInt(h.substr(4,2),16);
    if(isNaN(r)||isNaN(g)||isNaN(b)) return hex;
    return '#'+pc(r)+pc(g)+pc(b);
  }
  // 由晶胞参数构造笛卡尔基矢（a,b,c 与夹角 alpha,beta,gamma）
  function csBuildCellVectors(a,b,c,al,be,ga){
    var d=Math.PI/180, ca=Math.cos(al*d), cb=Math.cos(be*d), cg=Math.cos(ga*d), sg=Math.sin(ga*d);
    if(Math.abs(sg)<1e-6) sg=(ga>90?-1e-6:1e-6);
    var va=[a,0,0], vb=[b*cg, b*sg, 0];
    var cx=c*cb, cy=c*(ca-cb*cg)/sg, cz=Math.sqrt(Math.max(0, c*c - cx*cx - cy*cy));
    return { a:va, b:vb, c:[cx,cy,cz] };
  }
  // 解析结构文件为 kd 对象（与 csGetMolecules 兼容）：支持 .cif / .mmcif / .xyz
  function csParseStructure(name, text){
    text=String(text||''); var low=String(name||'').toLowerCase();
    if(low.endsWith('.xyz')) return csParseXYZ(name, text);
    if(low.endsWith('.cif')||low.endsWith('.mmcif')) return csParseCIF(name, text);
    if(/^\s*data_/i.test(text)||/_atom_site/.test(text)) return csParseCIF(name, text);
    return { ok:false, error:'不支持的文件格式（仅支持 .cif / .mmcif / .xyz）' };
  }
  function csParseXYZ(name, text){
    var lines=text.split(/\r?\n/), n=parseInt((lines[0]||'').trim(),10); if(!n||isNaN(n)) return { ok:false, error:'XYZ 文件格式无法识别（首行应为原子数）' };
    var atoms=[]; for(var i=2;i<lines.length && atoms.length<n;i++){ var t=lines[i].trim(); if(!t) continue;
      var p=t.split(/\s+/); if(p.length<4) continue;
      var em=String(p[0]||'C').replace(/[^A-Za-z]/g,'').match(/^[A-Za-z]+/);
      atoms.push({ el:em?em[0]:'C', cart:[parseFloat(p[1]),parseFloat(p[2]),parseFloat(p[3])], frac:[0,0,0], label:String(p[0]||'C') }); }
    if(!atoms.length) return { ok:false, error:'XYZ 未解析到原子' };
    return { ok:true, atoms:atoms, cell:null, structure:name };
  }
  function csNumTok(s){ s=String(s||'').trim(); var m=s.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/); return m?parseFloat(m[0]):NaN; }
  function csParseCIF(name, text){
    function block(re){ var m=text.match(re); return m?m[1]:null; }
    var a=csNumTok(block(/_cell_length_a\s+([^\s;#]+)/i)), b=csNumTok(block(/_cell_length_b\s+([^\s;#]+)/i)), c=csNumTok(block(/_cell_length_c\s+([^\s;#]+)/i));
    var al=csNumTok(block(/_cell_angle_alpha\s+([^\s;#]+)/i)), be=csNumTok(block(/_cell_angle_beta\s+([^\s;#]+)/i)), ga=csNumTok(block(/_cell_angle_gamma\s+([^\s;#]+)/i));
    var cell=null;
    if(a>0&&b>0&&c>0&&!isNaN(al)&&!isNaN(be)&&!isNaN(ga)){
      var v=csBuildCellVectors(a,b,c,al,be,ga);
      cell={ a:a, b:b, c:c, al:al, be:be, ga:ga, vectors:v };
    }
    // 定位含 _atom_site 的 loop_ 块
    var loopIdx=-1, re=/loop_/g, m;
    while((m=re.exec(text))){ var pos=m.index, nb=text.indexOf('\n', pos), rest=text.slice(nb);
      var blk='', rl=rest.split(/\r?\n/);
      for(var ri=0; ri<rl.length; ri++){ var l=rl[ri]; if(/^\s*_\S+/.test(l)) blk+=l+'\n'; else if(/^\s*loop_/.test(l)) break; else if(l.trim()===''&&blk.trim()) break; else if(l.trim()&&!/^\s*_/.test(l)) break; }
      if(/_\s*atom_site/.test(blk)){ loopIdx=pos; break; }
    }
    var atoms=[];
    if(loopIdx>=0){
      var seg=text.slice(loopIdx);
      var linesAfter=seg.split(/\r?\n/);
      var headers=[], started=false, dataLines=[];
      for(var k=0; k<linesAfter.length; k++){ var ln=linesAfter[k];
        if(/^\s*loop_/.test(ln)){ started=true; continue; }
        if(started && /^\s*_\S+/.test(ln)){ headers.push(ln.trim()); continue; }
        if(started && /^\s*#/.test(ln)) continue;
        if(started && ln.trim()===''){ if(dataLines.length) break; else continue; }
        if(started) dataLines.push(ln);
      }
      function colIdx(names){ for(var q=0;q<names.length;q++){ for(var h=0;h<headers.length;h++){ if(headers[h].indexOf(names[q])===0) return h; } } return -1; }
      var iLab=colIdx(['_atom_site_label']), iSym=colIdx(['_atom_site_type_symbol']),
          iFx=colIdx(['_atom_site_fract_x','_atom_site_Cartn_x']), iFy=colIdx(['_atom_site_fract_y','_atom_site_Cartn_y']), iFz=colIdx(['_atom_site_fract_z','_atom_site_Cartn_z']);
      var isFract=headers.some(function(h){ return /_atom_site_fract_/.test(h); });
      var fields=[];
      function flushRow(){ if(iLab<0 && iSym<0) return;
        var lab=fields[iLab]||'', sym=fields[iSym]||'', fx=fields[iFx], fy=fields[iFy], fz=fields[iFz];
        if(fx===undefined||fy===undefined||fz===undefined) return;
        var em=(sym||lab).replace(/[^A-Za-z]/g,'').match(/^[A-Za-z]+/); var el=em?em[0]:'C';
        var fa=[parseFloat(fx),parseFloat(fy),parseFloat(fz)]; if(isNaN(fa[0])||isNaN(fa[1])||isNaN(fa[2])) return;
        var cart;
        if(cell && isFract){ cart=[fa[0]*cell.vectors.a[0]+fa[1]*cell.vectors.b[0]+fa[2]*cell.vectors.c[0],
                                  fa[0]*cell.vectors.a[1]+fa[1]*cell.vectors.b[1]+fa[2]*cell.vectors.c[1],
                                  fa[0]*cell.vectors.a[2]+fa[1]*cell.vectors.b[2]+fa[2]*cell.vectors.c[2]]; }
        else { cart=fa; }
        atoms.push({ el:el, frac:isFract?fa:[0,0,0], cart:cart, label:lab||el });
      }
      for(var di=0; di<dataLines.length; di++){ var tk=dataLines[di].trim().split(/\s+/);
        for(var tk2=0; tk2<tk.length; tk2++){ fields.push(tk[tk2]); if(fields.length===headers.length){ flushRow(); fields=[]; } }
      }
      if(fields.length===headers.length) flushRow();
    }
    if(!atoms.length) return { ok:false, error:'CIF 未解析到原子位点（缺少 _atom_site loop 或坐标）' };
    return { ok:true, atoms:atoms, cell:cell, structure:name };
  }
  // 群组内直接距离成键（用于堆叠结果/预览的键绘制，坐标已同帧）
  function csBondsDirect(atoms){
    var pairs=[]; for(var i=0;i<atoms.length;i++) for(var j=i+1;j<atoms.length;j++){
      var d=csDist(atoms[i].cart, atoms[j].cart);
      if(d>0.35 && d < csRadius(atoms[i].el,CS_COV)+csRadius(atoms[j].el,CS_COV)+0.45) pairs.push([i,j]);
    } return pairs;
  }
  // 嵌入式 3D 场景控制器：可旋转/缩放、按深度排序、支持按文件分组着色（纯 Canvas 真实三维投影）
  function csScene3D(canvas, opts){
    opts=opts||{};
    var light = opts.bg==='light';
    var BG = light ? '#ffffff' : '#0e1726';
    var NOATOM = light ? '#9aa7b5' : '#5b6b7f';
    var BOND = light ? 'rgba(78,90,106,0.6)' : 'rgba(170,185,205,0.45)';
    var view={yaw:0.6,pitch:0.35,zoom:1}, groups=[];
    function draw(){
      var ctx=canvas.getContext('2d'); if(!ctx) return; var W=canvas.width, H=canvas.height;
      ctx.fillStyle=BG; ctx.fillRect(0,0,W,H);
      if(!groups.length || !groups.some(function(g){return g.atoms.length;})){ ctx.fillStyle=NOATOM; ctx.font='13px "HarmonyOS Sans SC", sans-serif'; ctx.fillText('（无原子）',12,20); return; }
      var R=csRotMat(view), all=[], minx=1e9,maxx=-1e9,miny=1e9,maxy=-1e9,minz=1e9,maxz=-1e9;
      groups.forEach(function(g){ g.atoms.forEach(function(a){ var r=csRotV(a.cart, R);
        var col=g.color||CS_ELEM_COLOR[a.el]||CS_ELEM_COLOR.default;
        all.push({x:r[0],y:r[1],z:r[2],col:col});
        if(r[0]<minx)minx=r[0]; if(r[0]>maxx)maxx=r[0]; if(r[1]<miny)miny=r[1]; if(r[1]>maxy)maxy=r[1]; if(r[2]<minz)minz=r[2]; if(r[2]>maxz)maxz=r[2]; }); });
      var cx=(minx+maxx)/2, cy=(miny+maxy)/2, cz=(minz+maxz)/2;
      var span=Math.max(maxx-minx,maxy-miny,maxz-minz)||1;
      var scale=Math.min(W,H)*0.40/span*view.zoom;
      function proj(p){ return [W/2+(p[0]-cx)*scale, H/2-(p[1]-cy)*scale]; }
      groups.forEach(function(g){ if(!g.bonds) return; ctx.strokeStyle=BOND; ctx.lineWidth=Math.max(1,scale*0.05);
        g.bonds.forEach(function(bd){ var a0=proj(g.atoms[bd[0]].cart), a1=proj(g.atoms[bd[1]].cart);
          ctx.beginPath(); ctx.moveTo(a0[0],a0[1]); ctx.lineTo(a1[0],a1[1]); ctx.stroke(); }); });
      all.sort(function(p,q){ return p.z-q.z; });
      var baseR=Math.max(2.2, scale*0.16);
      all.forEach(function(p){ var s=proj([p.x,p.y,p.z]);
        var sh=Math.max(0.4, Math.min(1, 0.55+(p.z-minz)/(span||1)*0.55));
        var rr=baseR*(1+(p.z-cz)/(span||1)*0.12);
        var g2=ctx.createRadialGradient(s[0]-rr*0.35,s[1]-rr*0.35,rr*0.2,s[0],s[1],rr);
        g2.addColorStop(0, csShade(p.col, Math.min(1,sh+0.32))); g2.addColorStop(1, csShade(p.col, sh*0.65));
        ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(s[0],s[1],rr,0,6.2832); ctx.fill(); });
    }
    var drag=false,lx=0,ly=0;
    canvas.addEventListener('mousedown',function(e){drag=true;lx=e.clientX;ly=e.clientY;});
    window.addEventListener('mouseup',function(){drag=false;});
    canvas.addEventListener('mousemove',function(e){ if(!drag)return; view.yaw+=(e.clientX-lx)*0.01; view.pitch=Math.max(-1.5,Math.min(1.5,view.pitch+(e.clientY-ly)*0.01)); lx=e.clientX;ly=e.clientY; draw(); });
    canvas.addEventListener('wheel',function(e){ e.preventDefault(); view.zoom*=(e.deltaY<0?1.12:0.89); view.zoom=Math.max(0.3,Math.min(6,view.zoom)); draw(); },{passive:false});
    return { setGroups:function(g){ groups=g; draw(); }, redraw:draw, view:view, reset:function(){view.yaw=0.6;view.pitch=0.35;view.zoom=1;draw();} };
  }
  /* ===== PXRD 模拟（Phase 2） =====
     方法：Bragg 方程 + 结构因子（Cromer–Mann 散射因子，见 xray_sf.js）。
     去重：将显示的晶胞/超胞原子卷绕到 [0,1) 并按 元素+分数坐标 去重，得到单一惯用晶胞的唯一位点；
           在此集合上直接求和结构因子 —— 系统消光（如面心 F、体心 I）由原子求和自动体现，无需显式空间群。
     多重性：按晶系劳埃类（点群全对称）几何计数（由生成元生成群取轨道大小），不含精确空间群逐峰多重性。 */
  var PXRD_PRESETS = {
  Cu:{label:'Cu Kα（1.54184 Å）',lambda:1.54184,alpha1:1.54056,alpha2:1.54439,alpha2ratio:0.5},
  Mo:{label:'Mo Kα（0.71073 Å）',lambda:0.71073,alpha1:0.7093,alpha2:0.71359,alpha2ratio:0.5},
  Ag:{label:'Ag Kα（0.56087 Å）',lambda:0.56087,alpha1:0.55941,alpha2:0.5638,alpha2ratio:0.5},
  Cr:{label:'Cr Kα（2.29100 Å）',lambda:2.291,alpha1:2.2897,alpha2:2.29361,alpha2ratio:0.5},
  Fe:{label:'Fe Kα（1.93735 Å）',lambda:1.93735,alpha1:1.93604,alpha2:1.93998,alpha2ratio:0.5},
  Co:{label:'Co Kα（1.79026 Å）',lambda:1.79026,alpha1:1.78897,alpha2:1.79283,alpha2ratio:0.5}
};
  /* CIF 辐射信息：读取 _diffrn_radiation_* / 旧式 _cell_measurement_wavelength。
     注意：这些字段记录的是「测定该结构时所用的辐射」，并非物相固有属性；
     模拟粉末谱时默认采用它以便与原始实验条件一致，无记录时回退 Cu Kα。 */
  function csCifToken(s) {
    s = String(s || '').trim();
    if (!s || s.charAt(0) === '#') return '';
    if (s.charAt(0) === "'" || s.charAt(0) === '"') {
      var q = s.charAt(0), e = s.indexOf(q, 1);
      return e > 0 ? s.slice(1, e).trim() : s.slice(1).trim();
    }
    var t = s.split(/\s+/)[0];
    return (t === '?' || t === '.') ? '' : t;
  }
  function csCifRadiation(text) {
    var out = { lambda: 0, type: '', probe: '', origin: 'none', label: '' };
    if (!text || typeof text !== 'string') return out;
    var lines = text.split(/\r?\n/);
    function val(tag) {
      for (var i = 0; i < lines.length; i++) {
        var raw = lines[i].trim();
        if (raw.split(/\s+/)[0].toLowerCase() !== tag) continue;
        var v = csCifToken(raw.slice(tag.length));
        if (v) return v;
        // loop_ 形式：标签独占一行，数值在随后的数据行里
        for (var j = i + 1; j < lines.length && j <= i + 8; j++) {
          var d = lines[j].trim();
          if (!d || d.charAt(0) === '#' || d.charAt(0) === '_' || /^loop_/i.test(d)) continue;
          v = csCifToken(d);
          if (v) return v;
        }
      }
      return '';
    }
    var lamStr = val('_diffrn_radiation_wavelength') || val('_diffrn_radiation_wavelength_wt') ||
                 val('_cell_measurement_wavelength');
    var lam = parseFloat(lamStr);   // e.s.d. 形式 1.5418(2) 取 1.5418
    if (isFinite(lam) && lam > 0.2 && lam < 6) { out.lambda = lam; out.origin = 'cif'; }
    var ty = val('_diffrn_radiation_type');
    out.type = ty.replace(/\\a/gi, 'α').replace(/\\b/gi, 'β').replace(/\\g/gi, 'γ')
                 .replace(/^([A-Z][a-z]?)K/, '$1 K').replace(/\s+/g, ' ').trim();
    var pr = (val('_diffrn_radiation_probe') || '').toLowerCase();
    out.probe = pr.indexOf('neutron') >= 0 ? 'neutron' : pr.indexOf('electron') >= 0 ? 'electron' : (pr ? 'x-ray' : '');
    out.label = (out.type || (out.probe === 'neutron' ? '中子' : out.probe === 'electron' ? '电子' : 'X 射线')) +
                (out.lambda ? ' · ' + out.lambda.toFixed(5) + ' Å' : '');
    return out;
  }
  function csDedupUnitCell(atoms) {
    var seen = {}, out = [];
    for (var i = 0; i < atoms.length; i++) {
      var a = atoms[i]; if (!a.frac) continue;
      var f = [a.frac[0] - Math.floor(a.frac[0]), a.frac[1] - Math.floor(a.frac[1]), a.frac[2] - Math.floor(a.frac[2])];
      var key = a.el + '|' + Math.round(f[0]*1000) + '|' + Math.round(f[1]*1000) + '|' + Math.round(f[2]*1000);
      if (seen[key]) continue; // 保留首个出现者（周期像视为同一位点）
      var rec = { el: a.el, frac: f, occ: (a.occ !== undefined ? a.occ : 1) };
      seen[key] = rec; out.push(rec);
    }
    return out;
  }
  function csLatticeType(cell) {
    var a=cell.a,b=cell.b,c=cell.c,al=cell.al,be=cell.be,ga=cell.ga, e=0.5;
    function ap(x,y){ return Math.abs(x-y) < e; }
    var ab=ap(a,b), bc=ap(b,c), ca=ap(c,a);
    // 三方（六角设置）：a=b, α=β=90, γ=120
    if (ab && ap(al,90)&&ap(be,90)&&ap(ga,120)) return 'hexagonal';
    // 三方（菱面体设置）：a=b=c, α=β=γ 且 ≠90
    if (ab&&bc && !ap(al,90)&&ap(al,be)&&ap(al,ga)) return 'hexagonal';
    var right = ap(al,90)&&ap(be,90)&&ap(ga,90);
    if (right) {
      if (ab&&bc) return 'cubic';
      if (ab||bc||ca) return 'tetragonal';
      return 'orthorhombic';
    }
    var nNon = (!ap(al,90)?1:0)+(!ap(be,90)?1:0)+(!ap(ga,90)?1:0);
    if (nNon === 1) return 'monoclinic';
    return 'triclinic';
  }
  function csMatMul(A, B) {
    var C=[[0,0,0],[0,0,0],[0,0,0]];
    for (var i=0;i<3;i++) for (var j=0;j<3;j++) { var s=0; for (var k=0;k<3;k++) s+=A[i][k]*B[k][j]; C[i][j]=s; }
    return C;
  }
  function csMatEq(A, B) { for (var i=0;i<3;i++) for (var j=0;j<3;j++) if (A[i][j]!==B[i][j]) return false; return true; }
  function csCloseGroup(gens) {
    var I3=[[1,0,0],[0,1,0],[0,0,1]];
    var S=[I3];
    var changed=true;
    while (changed) {
      changed=false; var cur=S.slice();
      for (var i=0;i<cur.length;i++) for (var g=0;g<gens.length;g++) {
        var m=csMatMul(cur[i], gens[g]);
        var has=false; for (var s=0;s<S.length;s++) if (csMatEq(S[s],m)) { has=true; break; }
        if (!has) { S.push(m); changed=true; }
      }
    }
    return S;
  }
  function csLaueGens(system, uniAxis) {
    var inv=[[-1,0,0],[0,-1,0],[0,0,-1]];
    function diag(a,b,c){ return [[a,0,0],[0,b,0],[0,0,c]]; }
    switch (system) {
      case 'triclinic':  return [inv];
      case 'monoclinic': var c2 = uniAxis==='a'?diag(1,-1,-1):(uniAxis==='c'?diag(-1,-1,1):diag(-1,1,-1)); return [inv, c2];
      case 'orthorhombic': return [inv, diag(1,-1,-1), diag(-1,1,-1)];
      case 'tetragonal': return [inv, [[0,-1,0],[1,0,0],[0,0,1]], diag(1,1,-1)];
      case 'hexagonal': return [inv, [[1,-1,0],[1,0,0],[0,0,1]], diag(1,1,-1)];
      case 'cubic': return [inv, [[0,-1,0],[1,0,0],[0,0,1]], [[0,0,1],[1,0,0],[0,1,0]]];
      default: return [inv];
    }
  }
  function csApplyOp(M,h,k,l){ return [M[0][0]*h+M[0][1]*k+M[0][2]*l, M[1][0]*h+M[1][1]*k+M[1][2]*l, M[2][0]*h+M[2][1]*k+M[2][2]*l]; }
  function csCmp3(a,b){ for (var i=0;i<3;i++){ if (a[i]<b[i]) return -1; if (a[i]>b[i]) return 1; } return 0; }
  // 将拟合晶胞度量吸附到所判晶系的「全对称」度量（消去除唯一轴外的近似误差），使劳埃群算符真正保长
  function csSnapCell(cell, sys) {
    var a=cell.a,b=cell.b,c=cell.c,al=cell.al,be=cell.be,ga=cell.ga;
    if (sys==='cubic'){ var m=(a+b+c)/3; a=b=c=m; al=be=ga=90; }
    else if (sys==='tetragonal'){ var m2=(a+b)/2; a=b=m2; al=be=ga=90; }
    else if (sys==='hexagonal'){ var m3=(a+b)/2; a=b=m3; al=be=90; ga=120; }
    else if (sys==='orthorhombic'){ al=be=ga=90; }
    else if (sys==='monoclinic'){ if (Math.abs(cell.be-90)>=0.5){ al=ga=90; } else if (Math.abs(cell.ga-90)>=0.5){ al=be=90; } else { be=ga=90; } }
    var ca=Math.cos(al*Math.PI/180), cb=Math.cos(be*Math.PI/180), cg=Math.cos(ga*Math.PI/180);
    var sg=Math.sin(ga*Math.PI/180);
    var v=Math.sqrt(Math.max(1e-12, 1-ca*ca-cb*cb-cg*cg+2*ca*cb*cg))/sg;
    return { a:a,b:b,c:c,al:al,be:be,ga:ga, vectors:{ a:[a,0,0], b:[b*cg,b*sg,0], c:[c*cb,c*(ca-cb*cg)/sg,c*v] } };
  }
  function csCanonical(h,k,l,ops,rc){
    var d0=csDhklSq(h,k,l,rc), best=[h,k,l];
    for (var i=0;i<ops.length;i++){ var p=csApplyOp(ops[i],h,k,l);
      if (Math.abs(csDhklSq(p[0],p[1],p[2],rc)-d0) > 1e-4*(d0+1e-6)) continue; // 仅同 d 的真对称等价
      if (csCmp3(p,best)<0) best=p; }
    return best;
  }
  function csMul(h,k,l,ops,rc){
    var d0=csDhklSq(h,k,l,rc), seen={},n=0;
    for (var i=0;i<ops.length;i++){ var p=csApplyOp(ops[i],h,k,l);
      if (Math.abs(csDhklSq(p[0],p[1],p[2],rc)-d0) > 1e-4*(d0+1e-6)) continue;
      var key=p[0]+','+p[1]+','+p[2]; if (!seen[key]){ seen[key]=1; n++; } }
    return n;
  }
  function csReciprocal(cell) {
    var a=cell.vectors.a, b=cell.vectors.b, c=cell.vectors.c;
    function cross(u,v){ return [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]; }
    function dot(u,v){ return u[0]*v[0]+u[1]*v[1]+u[2]*v[2]; }
    var V=dot(a, cross(b,c)); if (Math.abs(V)<1e-9) return null;
    return { a: cross(b,c).map(function(x){return x/V;}), b: cross(c,a).map(function(x){return x/V;}), c: cross(a,b).map(function(x){return x/V;}) };
  }
  function csDhklSq(h,k,l,rc){
    var a=rc.a,b=rc.b,c=rc.c;
    function d2(u,v){ return u[0]*v[0]+u[1]*v[1]+u[2]*v[2]; }
    return h*h*d2(a,a)+k*k*d2(b,b)+l*l*d2(c,c)+2*h*k*d2(a,b)+2*h*l*d2(a,c)+2*k*l*d2(b,c);
  }
  function csStructureFactor(uc, h, k, l, s) {
    var re=0, im=0;
    for (var i=0;i<uc.length;i++) {
      var a=uc[i];
      var phase=2*Math.PI*(h*a.frac[0]+k*a.frac[1]+l*a.frac[2]);
      var fr=window.CS_SF ? window.CS_SF.fx(a.el, s) : { f:a.occ||1, fallback:true };
      var f=fr.f*(a.occ!==undefined?a.occ:1);
      re += f*Math.cos(phase); im += f*Math.sin(phase);
    }
    return { re:re, im:im };
  }
  // 中子相干散射长度 b_coh（单位 fm = 10^-15 m），常用元素；缺失则按首字母回退，再缺失回退 0
  var CS_NEUTRON = {
  H:-3.739,D:6.671,He:3.26,Li:-1.9,Be:7.79,B:5.3,C:6.646,N:9.36,O:5.803,F:5.654,
  Na:3.63,Mg:5.375,Al:3.449,Si:4.1491,P:5.13,S:2.847,Cl:9.577,K:3.67,Ca:4.7,Ti:-3.438,
  V:-0.3824,Cr:3.635,Mn:-3.73,Fe:9.45,Co:2.49,Ni:10.3,Cu:7.72,Zn:5.68,Ga:7.29,Ge:8.19,
  As:6.58,Se:7.97,Br:6.79,Kr:7.4,Rb:7.05,Sr:7.02,Y:7.75,Zr:7.16,Nb:7.05,Mo:6.72,
  Tc:6.8,Ru:7.03,Rh:5.91,Pd:5.91,Ag:5.92,Cd:4.83,In:4.01,Sn:6.23,Sb:5.64,Te:5.8,
  I:5.28,Xe:4.79,Cs:5.42,Ba:5.25,La:8.24,Ce:4.58,Nd:7.69,Sm:-0.06,Eu:5.36,Gd:9.5,
  Tb:7.34,Dy:16.9,Ho:8.01,Er:7.79,Tm:7.07,Yb:12.4,Lu:7.21,Hf:7.74,Ta:6.91,W:4.86,
  Re:9.2,Os:10.7,Ir:10.6,Pt:9.6,Au:7.63,Hg:12.7,Tl:8.78,Pb:9.4,Bi:8.53,U:8.42
};
  function csNeutronSF(uc, h, k, l) {
    var re=0, im=0;
    for (var i=0;i<uc.length;i++) {
      var a=uc[i];
      var b = CS_NEUTRON[a.el] !== undefined ? CS_NEUTRON[a.el]
            : (CS_NEUTRON[a.el.charAt(0)] !== undefined ? CS_NEUTRON[a.el.charAt(0)] : CS_FALLBACK.neutron);
      var phase=2*Math.PI*(h*a.frac[0]+k*a.frac[1]+l*a.frac[2]);
      var f=b*(a.occ!==undefined?a.occ:1);
      re += f*Math.cos(phase); im += f*Math.sin(phase);
    }
    return { re:re, im:im };
  }
  function csComputePXRD(kd, params) {
    if (!kd || !kd.atoms || !kd.atoms.length || !kd.cell || !kd.cell.vectors) return { error:'缺少结构或晶胞数据，请先载入结构' };
    var uc = csDedupUnitCell(kd.atoms);
    var cell0 = kd.cell;
    var sys = csLatticeType(cell0);
    var uniAxis='b';
    if (Math.abs(cell0.be-90)>=0.5) uniAxis='b'; else if (Math.abs(cell0.ga-90)>=0.5) uniAxis='c'; else if (Math.abs(cell0.al-90)>=0.5) uniAxis='a';
    var cell = csSnapCell(cell0, sys);
    var rc = csReciprocal(cell);
    if (!rc) return { error:'晶胞度量异常（体积为 0）' };
    var lam = params.lambda, tmax = params.ttwoMax || 60;
    // ttwoMin / iMax 省略时沿用旧行为（0° 起、归一到 100），保证「多 PXRD 对比」等既有调用不变
    var tmin = (params.ttwoMin !== undefined) ? params.ttwoMin : 0;
    var iScale = (params.iMax !== undefined && params.iMax > 0) ? params.iMax : 100;
    var thetaMax = tmax/2*Math.PI/180, sinTMax = Math.sin(thetaMax);
    var dmin = lam/(2*sinTMax);
    function vlen(v){ return Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]); }
    var smax = Math.max(vlen(rc.a),vlen(rc.b),vlen(rc.c)) + 0.001;
    var N = Math.ceil(smax/dmin) + 1;
    var ops = csCloseGroup(csLaueGens(sys, uniAxis));
    var peaks=[];
    for (var h=-N;h<=N;h++) for (var k=-N;k<=N;k++) for (var l=-N;l<=N;l++) {
      if (h===0&&k===0&&l===0) continue;
      var G2=csDhklSq(h,k,l,rc); if (G2<=0) continue;
      var d=1/Math.sqrt(G2); if (d < dmin-1e-9) continue;
      var canon=csCanonical(h,k,l,ops,rc);
      if (!(h===canon[0]&&k===canon[1]&&l===canon[2])) continue;
      var s=1/(2*d), sinT=lam/(2*d); if (sinT>1) continue;
      var theta=Math.asin(sinT), ttwo=2*theta*180/Math.PI;
      var F = params.neutron ? csNeutronSF(uc,h,k,l) : csStructureFactor(uc,h,k,l,s), F2=F.re*F.re+F.im*F.im;
      var p=csMul(h,k,l,ops,rc);
      peaks.push({ h:h,k:k,l:l, d:d, ttwo:ttwo, F2:F2, p:p });
    }
    peaks.forEach(function(pk){
      var theta=pk.ttwo/2*Math.PI/180, LP=1;
      if (params.lp) { var s2=Math.sin(theta), c2=Math.cos(theta); LP=(1+c2*c2)/(s2*s2*c2); if (!isFinite(LP)||LP<=0) LP=1; }
      pk.Iraw = pk.F2 * pk.p * LP;
    });
    var Imax=0; peaks.forEach(function(pk){ if (pk.Iraw>Imax) Imax=pk.Iraw; });
    peaks.forEach(function(pk){
      pk.I = Imax>0 ? pk.Iraw/Imax*100 : 0;   // 相对强度 (%)，内部判据/筛选仍用它
      pk.Iabs = pk.I/100*iScale;              // 绝对强度（最高峰 = iMax）
    });
    peaks.sort(function(a,b){ return a.ttwo-b.ttwo; });
    var spectrum = csSpectrum(peaks, params, lam);
    return { ok:true, peaks:peaks, spectrum:spectrum, cell:cell, sys:sys, nUnit:uc.length, lambda:lam,
      tmin:tmin, tmax:tmax, step:spectrum.step, iMax:iScale, structure:kd.structure,
      radiation:params.radiation || null,
      fellback: uc.some(function(a){ return window.CS_SF && window.CS_SF.fx(a.el,0.1).fallback; }) };
  }
  function csSpectrum(peaks, params, lam) {
    var tmax=params.ttwoMax||60, tmin=(params.ttwoMin!==undefined)?params.ttwoMin:0;
    var step=params.step||0.02, fwhm=params.fwhm||0.15, eta=(params.eta!==undefined)?params.eta:0.5;
    var iScale=(params.iMax!==undefined&&params.iMax>0)?params.iMax:100;
    var n=Math.max(2, Math.floor((tmax-tmin)/step)+1), xs=new Array(n), ys=new Array(n);
    var comps=[];
    for (var i=0;i<peaks.length;i++) {
      var pk=peaks[i]; if (pk.F2<=1e-9) continue;
      var I=pk.I/100;
      var lines = params.ka12 ? [{lam:params.alpha1,w:1},{lam:params.alpha2,w:(params.alpha2ratio||0.5)}] : [{lam:lam,w:1}];
      for (var li=0;li<lines.length;li++) {
        var L=lines[li], sinT=L.lam/(2*pk.d); if (sinT>1) continue;
        comps.push({ tt:2*Math.asin(sinT)*180/Math.PI, amp:I*L.w });
      }
    }
    var gamma=fwhm/2, sigma=fwhm/(2*Math.sqrt(2*Math.log(2)));
    for (var j=0;j<n;j++) {
      var x=tmin+j*step, y=0;
      for (var ci=0;ci<comps.length;ci++) { var c=comps[ci], dx=x-c.tt; var Lz=(gamma*gamma)/(dx*dx+gamma*gamma); var Gz=Math.exp(-(dx*dx)/(2*sigma*sigma)); y+=c.amp*(eta*Lz+(1-eta)*Gz); }
      xs[j]=x; ys[j]=y*iScale;
    }
    return { xs:xs, ys:ys, step:step, fwhm:fwhm, eta:eta, comps:comps, tmin:tmin, tmax:tmax, iMax:iScale };
  }
  // ===== 实验谱解析与对比（Phase 2 实验谱对比模式）=====
  function csParseExpXY(text, name) {
    if (typeof text !== 'string') return { error: '文件内容为空或非文本。' };
    var lines = text.split(/\r?\n/);
    var pts = [], firstIdx = -1;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      if (/^[#!;*@>"]/.test(line)) continue; // 注释 / 控制行
      if (/^(rem|title|bank|background|comment|date|time|user|scan|start|end|monitor|count|wavelength|filter|anode|kv|ma|sample|theta|lambda|—)\b/i.test(line)) continue;
      var nums = line.match(/-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/g);
      if (!nums || nums.length < 2) continue;
      var a = parseFloat(nums[0]), b = parseFloat(nums[1]);
      if (!isFinite(a) || !isFinite(b)) continue;
      if (firstIdx < 0) {
        firstIdx = i;
        // GSAS / 各类导出常见的表头行 "N tmin tmax"（3 个数，首为整数计数，tmin<tmax）——跳过
        if (nums.length === 3 && Math.abs(a - Math.round(a)) < 1e-6 && a > 0 && a < 5e6 && b < parseFloat(nums[2])) continue;
      }
      pts.push([a, b, nums.length >= 3 ? parseFloat(nums[2]) : null]);
    }
    if (pts.length < 2) return { error: '无法从该文件解析出至少两列数值（2θ, 强度）。请确认是 .xy/.xye/.csv/.txt 等文本格式（仪器二进制 .raw 暂不支持）。' };
    pts.sort(function (p, q) { return p[0] - q[0]; });
    return { name: name, xs: pts.map(function (p) { return p[0]; }), ys: pts.map(function (p) { return p[1]; }), sig: pts.map(function (p) { return p[2]; }), n: pts.length };
  }
  function csExpScale(exp, simMax, align, norm) {
    var expMax = 0; for (var e = 0; e < exp.ys.length; e++) if (exp.ys[e] > expMax) expMax = exp.ys[e];
    if (expMax <= 0) return { scale: 1, expMax: 0 };
    // 不按最强峰对齐时，把实验谱归一到与模拟谱同一标度（默认 100，新版为 iMax）
    var scale = (align && simMax > 0) ? simMax / expMax : (norm || 100) / expMax;
    return { scale: scale, expMax: expMax };
  }
  function csMatchPeaks(res, exp, tol) {
    if (!exp || !exp.xs || exp.xs.length < 2) return null;
    var simMax = 0; for (var s = 0; s < res.spectrum.ys.length; s++) if (res.spectrum.ys[s] > simMax) simMax = res.spectrum.ys[s];
    var align = document.getElementById('pxrd-align') ? document.getElementById('pxrd-align').checked : true;
    var sc = csExpScale(exp, simMax, align, res.iMax || 100), scale = sc.scale;
    var ex = exp.xs, ey = exp.ys, n = ex.length;
    function expAt(x) {
      if (x <= ex[0]) return ey[0] * scale; if (x >= ex[n - 1]) return ey[n - 1] * scale;
      var lo = 0, hi = n - 1; while (hi - lo > 1) { var m = (lo + hi) >> 1; if (ex[m] < x) lo = m; else hi = m; }
      var t = (x - ex[lo]) / (ex[hi] - ex[lo]); return (ey[lo] + (ey[hi] - ey[lo]) * t) * scale;
    }
    var sim = res.spectrum, N = sim.xs.length, sp = 0, sr = 0, eabs = 0, e2 = 0;
    for (var i = 0; i < N; i++) { var e = expAt(sim.xs[i]); var d = sim.ys[i] - e; sp += Math.abs(d); sr += d * d; eabs += Math.abs(e); e2 += e * e; }
    var Rp = eabs > 0 ? sp / eabs * 100 : 0, Rwp = e2 > 0 ? Math.sqrt(sr / e2) * 100 : 0;
    var simPeaks = res.peaks.filter(function (pk) { return pk.F2 > 1e-9 && pk.I > 0.5; });
    var matched = [], unmatchedSim = 0;
    simPeaks.forEach(function (pk) {
      var best = null, bd = 1e9;
      for (var j = 0; j < n; j++) { var dd = Math.abs(ex[j] - pk.ttwo); if (dd < bd) { bd = dd; best = j; } }
      if (best !== null && bd <= tol) matched.push({ h: pk.h, k: pk.k, l: pk.l, d: pk.d, ts: pk.ttwo, te: ex[best], dt: pk.ttwo - ex[best], Is: (pk.Iabs !== undefined ? pk.Iabs : pk.I), Ie: ey[best] * scale });
      else unmatchedSim++;
    });
    var unmatchedExp = [];
    for (var j2 = 0; j2 < n; j2++) { var Ie = ey[j2] * scale; if (Ie > 3) { var near = false; for (var s2 = 0; s2 < simPeaks.length; s2++) { if (Math.abs(ex[j2] - simPeaks[s2].ttwo) <= tol) { near = true; break; } } if (!near) unmatchedExp.push({ t: ex[j2], I: Ie }); } }
    return { Rp: Rp, Rwp: Rwp, matched: matched, unmatchedSim: unmatchedSim, totalSim: simPeaks.length, unmatchedExp: unmatchedExp, scale: scale, expMax: sc.expMax };
  }
  function csRenderMatchTable(res, exp, m) {
    var el = document.getElementById('pxrd-match'); if (!el) return;
    if (!m) {
      el.innerHTML = '<tbody><tr><td style="text-align:left;color:#7a8aa3;padding:12px">尚未导入实验谱。导入后此处显示模拟峰与实验峰的逐项匹配（含 Δ2θ）与一致性指标 Rp / Rwp。</td></tr></tbody>';
      var st0 = document.getElementById('pxrd-cmpstat'); if (st0) st0.innerHTML = '';
      return;
    }
    var html = '<thead><tr><th>h k l</th><th>d (Å)</th><th>2θ 模拟</th><th>2θ 实验</th><th>Δ2θ</th><th>I 模拟</th><th>I 实验</th></tr></thead><tbody>';
    m.matched.slice(0, 80).forEach(function (r) {
      html += '<tr><td>(' + r.h + ' ' + r.k + ' ' + r.l + ')</td><td>' + csFmt(r.d, 3) + '</td><td>' + csFmt(r.ts, 2) + '</td><td>' + csFmt(r.te, 2) + '</td><td>' + (r.dt >= 0 ? '+' : '') + csFmt(r.dt, 3) + '</td><td>' + csFmt(r.Is, 1) + '</td><td>' + csFmt(r.Ie, 1) + '</td></tr>';
    });
    html += '</tbody>';
    el.innerHTML = html;
    var st = document.getElementById('pxrd-cmpstat');
    if (st) st.innerHTML = '实验谱 <b>' + (exp.name || '实验') + '</b> · 匹配模拟峰 <b>' + m.matched.length + '/' + m.totalSim + '</b> · 未匹配实验峰 <b style="color:#ff9a76">' + m.unmatchedExp.length + '</b> · Rp <b>' + csFmt(m.Rp, 1) + '%</b> · Rwp <b>' + csFmt(m.Rwp, 1) + '%</b>';
  }
  function csNiceStep(v) {
    if (!(v > 0)) return 1;
    var e = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), f = v / e;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * e;
  }
  function csSpecAt(spec, t) {
    var xs = spec.xs, ys = spec.ys, n = xs.length;
    if (!n) return 0;
    if (t <= xs[0]) return ys[0];
    if (t >= xs[n - 1]) return ys[n - 1];
    var lo = 0, hi = n - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (xs[m] < t) lo = m; else hi = m; }
    var w = (t - xs[lo]) / ((xs[hi] - xs[lo]) || 1);
    return ys[lo] + (ys[hi] - ys[lo]) * w;
  }
  function csDrawPXRDCanvas(canvas, res, exp, opts) {
    if (!canvas) return [];
    opts = opts || {};
    var hasExp = !!(exp && exp.xs && exp.xs.length > 1);
    var W = 820, H = hasExp ? 540 : 380, padL = 66, padR = 16, padT = 34, padB = 42;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = '100%'; canvas.style.height = 'auto';
    var ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    var tmin = (res.tmin !== undefined) ? res.tmin : 0, tmax = res.tmax || 60;
    var xs = res.spectrum.xs, ys = res.spectrum.ys;
    var iMax = res.iMax || 100;
    var ymax = iMax * 1.14;   // 顶部留白：hkl 标注要画在峰尖上方
    var simMax = 0; for (var s2 = 0; s2 < ys.length; s2++) if (ys[s2] > simMax) simMax = ys[s2];
    var expScaled = null, expAt = null, ey = null, ex = null, nn = 0;
    if (hasExp) {
      var align = document.getElementById('pxrd-align') ? document.getElementById('pxrd-align').checked : true;
      var sc = csExpScale(exp, simMax, align, iMax);
      expScaled = exp.ys.map(function (v) { return v * sc.scale; });
      ex = exp.xs; ey = expScaled; nn = ex.length;
      expAt = function (x) { if (x <= ex[0]) return ey[0]; if (x >= ex[nn - 1]) return ey[nn - 1]; var lo = 0, hi = nn - 1; while (hi - lo > 1) { var m = (lo + hi) >> 1; if (ex[m] < x) lo = m; else hi = m; } var t = (x - ex[lo]) / (ex[hi] - ex[lo]); return ey[lo] + (ey[hi] - ey[lo]) * t; };
    }
    var topTop = padT, topBot = hasExp ? padT + (H - padT - padB) * 0.66 : H - padB;
    var diffTop = hasExp ? topBot + 20 : 0, diffBot = hasExp ? H - padB : 0;
    function X(t) { return padL + (t - tmin) / ((tmax - tmin) || 1) * (W - padL - padR); }
    function Ymain(v) { return topBot - Math.max(0, Math.min(1, v / (ymax || 1))) * (topBot - topTop); }
    ctx.lineWidth = 1; ctx.font = '11px "HarmonyOS Sans SC", sans-serif';
    ctx.strokeStyle = 'rgba(28,43,69,0.08)'; ctx.fillStyle = '#5c6d88'; ctx.textAlign = 'right';
    var gy = csNiceStep(iMax / 4);
    for (var g = 0; g <= ymax + 1e-9; g += gy) {
      var yy = Ymain(g); ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(W - padR, yy); ctx.stroke();
      ctx.fillText((g >= 1 ? String(Math.round(g)) : String(+g.toFixed(2))), padL - 8, yy + 4);
    }
    var gx = csNiceStep((tmax - tmin) / 8);
    ctx.textAlign = 'center';
    var xLabelY = (hasExp ? diffBot : topBot) + 18;
    for (var t = Math.ceil(tmin / gx) * gx; t <= tmax + 0.001; t += gx) {
      var xx = X(t); ctx.beginPath(); ctx.moveTo(xx, topTop); ctx.lineTo(xx, topBot); ctx.stroke();
      ctx.fillText((gx < 1 ? t.toFixed(1) : String(Math.round(t))) + '°', xx, xLabelY);
    }
    ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(28,43,69,0.45)'; ctx.beginPath(); ctx.moveTo(padL, topTop); ctx.lineTo(padL, topBot); ctx.lineTo(W - padR, topBot); ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.rect(padL, topTop, W - padL - padR, topBot - topTop); ctx.clip();
    if (xs.length) {
      ctx.beginPath(); ctx.moveTo(X(xs[0]), Ymain(0));
      for (var j = 0; j < xs.length; j++) ctx.lineTo(X(xs[j]), Ymain(ys[j]));
      ctx.lineTo(X(xs[xs.length - 1]), Ymain(0)); ctx.closePath(); ctx.fillStyle = 'rgba(37,99,235,0.14)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(X(xs[0]), Ymain(ys[0]));
      for (var j2 = 0; j2 < xs.length; j2++) ctx.lineTo(X(xs[j2]), Ymain(ys[j2]));
      ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 1.6; ctx.stroke();
    }
    if (hasExp) {
      ctx.beginPath(); ctx.moveTo(X(ex[0]), Ymain(ey[0]));
      for (var k = 1; k < nn; k++) ctx.lineTo(X(ex[k]), Ymain(ey[k]));
      ctx.strokeStyle = '#ef8a2b'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ef8a2b';
      for (var k2 = 0; k2 < nn; k2++) { if (ey[k2] < 1) continue; ctx.beginPath(); ctx.arc(X(ex[k2]), Ymain(ey[k2]), 1.8, 0, 2 * Math.PI); ctx.fill(); }
    }
    ctx.restore();
    // 晶面指数画在峰尖正上方：用谱图在峰位的实际高度定位，居中、防重叠、顶到画布上沿时才内移
    var labels = [], labelXs = [];
    ctx.fillStyle = '#1c2b45'; ctx.font = '10.5px "HarmonyOS Sans SC", sans-serif'; ctx.textAlign = 'center';
    res.peaks.forEach(function (pk) {
      if (pk.F2 <= 1e-9 || pk.I <= 3 || labels.length >= 16) return;
      if (pk.ttwo < tmin || pk.ttwo > tmax) return;
      var px = X(pk.ttwo);
      for (var q = 0; q < labelXs.length; q++) if (Math.abs(labelXs[q] - px) < 38) return;
      var peakY = Ymain(csSpecAt(res.spectrum, pk.ttwo));
      var ly = peakY - 9;
      if (ly < padT + 9) ly = peakY + 15;
      var txt = '(' + pk.h + ' ' + (pk.k < 0 ? '̶' : '') + Math.abs(pk.k) + ' ' + (pk.l < 0 ? '̶' : '') + Math.abs(pk.l) + ')';
      ctx.fillText(txt, px, ly);
      labelXs.push(px);
      labels.push({ text: txt, x: px, y: ly, peakY: peakY, above: ly < peakY });
    });
    ctx.textAlign = 'left';
    res.labels = labels;
    if (hasExp) {
      ctx.font = '600 12px "HarmonyOS Sans SC", sans-serif';
      var lx = padL + 8, ly = topTop + 15;
      ctx.fillStyle = '#2563eb'; ctx.fillRect(lx, ly - 9, 18, 4); ctx.fillStyle = '#1c2b45'; ctx.fillText('模拟谱', lx + 24, ly - 4);
      ctx.fillStyle = '#ef8a2b'; ctx.fillRect(lx + 84, ly - 9, 18, 4); ctx.fillStyle = '#1c2b45'; ctx.fillText('实验谱', lx + 110, ly - 4);
    }
    if (hasExp && opts.showDiff) {
      ctx.save();
      ctx.beginPath(); ctx.rect(padL, diffTop, W - padL - padR, diffBot - diffTop); ctx.clip();
      var dmax = 0; for (var di = 0; di < xs.length; di++) { var dd = Math.abs(ys[di] - expAt(xs[di])); if (dd > dmax) dmax = dd; }
      var dscale = dmax > 0 ? ((diffBot - diffTop) / 2 / dmax) : 0;
      var zeroY = diffTop + (diffBot - diffTop) / 2;
      ctx.strokeStyle = 'rgba(28,43,69,0.30)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(padL, zeroY); ctx.lineTo(W - padR, zeroY); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#5c6d88'; ctx.font = '10.5px "HarmonyOS Sans SC", sans-serif'; ctx.fillText('差谱（模拟 − 实验，按自身最大残差缩放）', padL + 2, diffTop + 12);
      for (var i3 = 1; i3 < xs.length; i3++) {
        var d0 = ys[i3 - 1] - expAt(xs[i3 - 1]), d1 = ys[i3] - expAt(xs[i3]);
        var x0 = X(xs[i3 - 1]), x1 = X(xs[i3]);
        var y0 = zeroY - d0 * dscale, y1 = zeroY - d1 * dscale;
        ctx.beginPath(); ctx.moveTo(x0, zeroY); ctx.lineTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x1, zeroY); ctx.closePath();
        ctx.fillStyle = (d0 + d1) >= 0 ? 'rgba(34,160,104,0.30)' : 'rgba(214,72,72,0.30)'; ctx.fill();
      }
      ctx.beginPath();
      for (var i4 = 0; i4 < xs.length; i4++) { var d4 = ys[i4] - expAt(xs[i4]); var yy4 = zeroY - d4 * dscale; if (i4 === 0) ctx.moveTo(X(xs[i4]), yy4); else ctx.lineTo(X(xs[i4]), yy4); }
      ctx.strokeStyle = '#e0a020'; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#1c2b45'; ctx.font = '12px "HarmonyOS Sans SC", sans-serif';
    ctx.fillText((res.structure || '当前结构') + ' · ' + res.sys + ' · λ ' + res.lambda.toFixed(4) +
      ' Å · 2θ ' + csFmt(tmin, 1) + '–' + csFmt(tmax, 1) + '° · ' + res.nUnit + ' 唯一位点' +
      (hasExp ? ' · 实验谱已叠加' : ''), padL, 18);
    return labels;
  }
  function csBuildPXRDTable(res) {
    var tbl=document.getElementById('pxrd-table'); if (!tbl) return;
    var tmin=res.tmin||0, tmax=res.tmax||60;
    var rows=res.peaks.filter(function(pk){ return pk.F2>1e-9 && pk.I>0.05 && pk.ttwo>=tmin && pk.ttwo<=tmax; });
    var html='<thead><tr><th>h k l</th><th>d (Å)</th><th>2θ (°)</th><th>强度</th><th>相对 (%)</th><th>多重性</th></tr></thead><tbody>';
    var show=rows.slice(0,80);
    show.forEach(function(pk){
      html+='<tr><td>('+pk.h+' '+pk.k+' '+pk.l+')</td><td>'+csFmt(pk.d,3)+'</td><td>'+csFmt(pk.ttwo,2)+
        '</td><td>'+csFmt(pk.Iabs!==undefined?pk.Iabs:pk.I,0)+'</td><td>'+csFmt(pk.I,1)+'</td><td>'+pk.p+'</td></tr>';
    });
    html+='</tbody>';
    tbl.innerHTML=html;
  }
  function csEscHtml(s) {
    return String(s == null ? '' : s).replace(/[<>&"']/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function csRenderPXRDModal(kd, opts) {
    opts = opts || {};
    if (!kd) return { title:'PXRD 模拟', html:'<p class="tool-soon">渲染内核尚未就绪，请稍候再试。</p>' };
    var cell=kd.cell;
    var cellHtml = cell ? ('a='+csFmt(cell.a,3)+' b='+csFmt(cell.b,3)+' c='+csFmt(cell.c,3)+' Å · α='+csFmt(cell.al,1)+' β='+csFmt(cell.be,1)+' γ='+csFmt(cell.ga,1)+'°') : '晶胞未知';
    // 辐射 / 波长默认从 CIF 的 _diffrn_radiation_* 读取；无记录时回退 Cu Kα
    var rad = csCifRadiation(lastCifText || '');
    var lam = rad.lambda || (opts.neutron ? CS_NEUTRON_LAMBDA : PXRD_PRESETS.Cu.lambda);
    var radType = rad.type || (rad.probe === 'neutron' ? '中子' : rad.probe === 'electron' ? '电子' : 'Cu Kα');
    var radFrom = rad.lambda
      ? ('自动取自 CIF' + (lastCifName ? '「' + lastCifName + '」' : '') + ' 的 _diffrn_radiation_wavelength')
      : '当前结构未提供 CIF 辐射字段，使用默认 Cu Kα 1.5418 Å（可手动指定波长）';
    var neutronOn = opts.neutron || rad.probe === 'neutron';
    var html='<div class="pxrd-card sim">'+
      '<div class="pxrd-card-h">模拟参数 <span class="tag">Simulation</span></div>'+
      '<div class="pxrd-summary"><b>'+(kd.structure||'当前结构')+'</b> · <span class="lat">'+cellHtml+'</span></div>'+
      '<div class="pxrd-controls">'+
        '<label>波长 λ (Å)<input type="number" id="pxrd-lambda" value="'+lam.toFixed(5)+'" min="0.2" max="6" step="0.0001"></label>'+
        '<label>最高强度<input type="number" id="pxrd-imax" value="10000" min="1" step="100"></label>'+
        '<label>起始 2θ (°)<input type="number" id="pxrd-tmin" value="2" min="0" max="100" step="0.5"></label>'+
        '<label>结束 2θ (°)<input type="number" id="pxrd-tmax" value="40" min="2" max="150" step="1"></label>'+
        '<label>步长 (°)<input type="number" id="pxrd-step" value="0.02" min="0.002" max="1" step="0.01"></label>'+
        '<label>峰宽 FWHM<input type="number" id="pxrd-fwhm" value="0.15" min="0.02" max="2" step="0.01"></label>'+
        '<label class="pxrd-inline"><input type="checkbox" id="pxrd-lp" checked> Lorentz–偏振</label>'+
        '<label class="pxrd-inline"><input type="checkbox" id="pxrd-neutron"'+(neutronOn?' checked':'')+'> 中子散射长度 b<sub>coh</sub></label>'+
        '<label>导出格式<select id="pxrd-format">'+
          '<option value="png">.png 图片</option><option value="jpg">.jpg 图片</option>'+
          '<option value="txt">.txt 数据</option><option value="csv">.csv 数据</option>'+
          '<option value="raw">.raw 数据</option></select></label>'+
        '<button id="pxrd-save" class="pp-btn primary">保存</button>'+
      '</div>'+
      '<div class="pxrd-radnote" id="pxrd-radnote">辐射 / 波长：<b>'+csEscHtml(radType+' · '+lam.toFixed(5)+' Å')+
        '</b> · <span>'+csEscHtml(radFrom)+'</span></div>'+
      '<canvas id="pxrd-canvas" class="pxrd-canvas"></canvas>'+
      '<h3 class="pxrd-mh">模拟峰位表</h3>'+
      '<div class="pxrd-table-wrap"><table id="pxrd-table" class="pxrd-table"></table></div>'+
    '</div>'+
    '<div class="pxrd-card exp">'+
      '<div class="pxrd-card-h">实验谱数据对比 <span class="tag">Experimental</span></div>'+
      '<div class="pxrd-controls pxrd-exp">'+
        '<button id="pxrd-imp" class="pp-btn">导入实验谱</button>'+
        '<span id="pxrd-expname" class="pxrd-expname"></span>'+
        '<button id="pxrd-clear" class="pp-btn ghost">清除</button>'+
        '<label class="pxrd-inline"><input type="checkbox" id="pxrd-diff" checked> 显示差谱</label>'+
        '<label>匹配容差 Δ2θ<input type="number" id="pxrd-tol" value="0.30" min="0.02" max="2" step="0.05"></label>'+
        '<label class="pxrd-inline"><input type="checkbox" id="pxrd-align" checked> 按最强峰对齐</label>'+
        '<input type="file" id="pxrd-file" accept=".xy,.xye,.csv,.txt,.dat,.raw" hidden>'+
      '</div>'+
      '<div id="pxrd-cmpstat" class="pxrd-cmpstat"></div>'+
      '<h3 class="pxrd-mh">实验谱峰匹配（模拟峰 ↔ 实验峰）</h3>'+
      '<div class="pxrd-table-wrap"><table id="pxrd-match" class="pxrd-table"></table></div>'+
      '<p class="ia-note">模拟部分：基于当前显示晶胞/超胞中的原子，去重为单一惯用晶胞的唯一位点后计算结构因子（Bragg 方程 + Cromer–Mann 散射因子）；系统消光由结构因子自动体现，多重性按晶系劳埃类几何计数。波长默认读取 CIF 的 _diffrn_radiation_wavelength（记录的是测定结构时所用辐射，并非物相固有属性，故仍可手动覆盖为其它实验条件）；谱图按「最高强度」标度，默认最强峰 10000，起始 / 结束 2θ 与步长决定数据点范围，峰形为 pseudo-Voigt。所有参数改动即时重算，无需点击计算。<br>保存：.png / .jpg 导出谱图图片；.txt（带 # 元信息头）、.csv（带列名）、.raw（纯数值两列、无表头）导出 2θ–强度数值序列，三者均可被本软件的实验谱导入重新读取。<br>对比部分：导入 .xy/.xye/.csv/.txt 文本实验谱（自动跳过注释与 GSAS 表头；仪器二进制 .raw 不支持），叠加并绘制差谱，按容差 Δ2θ 匹配峰位并输出 Rp / Rwp。</p>'+
    '</div>';
    var ptitle = opts.neutron ? 'PXRD 模拟（中子衍射）' : 'PXRD 模拟';
    return { title:ptitle, html:html, after:function(){ csPXRDWire(kd, opts, rad); } };
  }
  /* ---------- PXRD 导出：图片 / 数值数据 ---------- */
  function csPXRDExportText(res, fmt) {
    var xs=res.spectrum.xs, ys=res.spectrum.ys, L=[], i;
    if (fmt==='csv') {
      L.push('2theta_deg,intensity');
      for (i=0;i<xs.length;i++) L.push(xs[i].toFixed(4)+','+ys[i].toFixed(2));
    } else if (fmt==='raw') {
      // 纯数值两列（2θ 强度），无表头/注释，便于其它衍射软件直接读取
      for (i=0;i<xs.length;i++) L.push(xs[i].toFixed(4)+' '+ys[i].toFixed(2));
    } else {
      L.push('# CrystaSee PXRD simulated pattern');
      L.push('# Structure: '+res.structure);
      L.push('# Wavelength_A: '+res.lambda.toFixed(5));
      L.push('# 2Theta_deg: '+res.tmin.toFixed(2)+' to '+res.tmax.toFixed(2)+' step '+res.step.toFixed(4));
      L.push('# Imax: '+res.iMax+'  FWHM: '+res.spectrum.fwhm+'  points: '+xs.length);
      L.push('# 2theta_deg<TAB>intensity');
      for (i=0;i<xs.length;i++) L.push(xs[i].toFixed(4)+'\t'+ys[i].toFixed(2));
    }
    return L.join('\r\n')+'\r\n';
  }
  function csPXRDFileName(res, fmt) {
    var base=String(lastCifName||res.structure||'pattern').replace(/\.[^.\/\\]+$/,'').replace(/[\\\/:*?"<>|\s]+/g,'_');
    return 'PXRD_'+base+'.'+fmt;
  }
  function csSaveFeedback(r, name) {
    if (r && r.ok) toast('已保存：'+(r.path||name));
    else if (r && /取消/.test(r.error||'')) toast('已取消保存');
    else toast((r && r.error) || '保存失败', true);
  }
  /* 桌面端文本保存兼容层。
     旧版 exe 的 save_text 里文件过滤器描述含 "/"，pywebview 会抛
     "is not a valid file filter"，保存对话框弹不出来。新版 exe 已修好过滤器；
     这里对旧 exe 自动降级：把文本按 UTF-8(+BOM) 编码成 base64 data URL，
     借 save_png 的通用写盘通道保存（save_png 只解码 base64，不校验内容）。 */
  function csTextToDataUrl(text) {
    var bytes = new TextEncoder().encode('\ufeff' + text), bin = '', CH = 0x8000, i;
    for (i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return 'data:application/octet-stream;base64,' + btoa(bin);
  }
  function csBlobSave(text, name) {
    var blob = new Blob([text], { type:'text/plain;charset=utf-8' }), l = document.createElement('a');
    l.href = URL.createObjectURL(blob); l.download = name; l.click();
    setTimeout(function(){ URL.revokeObjectURL(l.href); }, 1000);
    toast('已导出 ' + name);
  }
  function csSaveTextCompat(text, name, done) {
    var a = api(); done = done || csSaveFeedback;
    if (!a || (!a.save_text && !a.save_png)) { csBlobSave(text, name); return; }
    function fallback(r) {
      if (!a.save_png) { done(r); return; }
      Promise.resolve(a.save_png(csTextToDataUrl(text), name)).then(done, function (e) {
        done({ ok:false, error:String(e) });
      });
    }
    if (!a.save_text) { fallback({ ok:false, error:'save_text unavailable' }); return; }
    Promise.resolve(a.save_text(text, name)).then(function (r) {
      if (r && !r.ok && /file filter|过滤器/i.test(String(r.error || ''))) fallback(r);
      else done(r);
    }, function (e) {
      if (/file filter|过滤器/i.test(String(e))) fallback({ ok:false, error:String(e) });
      else done({ ok:false, error:String(e) });
    });
  }
  function csSavePXRD(res, fmt) {
    if (!res || !res.spectrum) { toast('谱图尚未计算完成', true); return; }
    fmt=String(fmt||'png').toLowerCase();
    var name=csPXRDFileName(res,fmt), a=api();
    if (fmt==='png' || fmt==='jpg' || fmt==='jpeg') {
      var canvas=document.getElementById('pxrd-canvas');
      if (!canvas) { toast('谱图画布不可用', true); return; }
      var url=(fmt==='png') ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg',0.95);
      // 桌面端 save_png 实际是通用 base64 写盘，JPEG 的 data URL 同样适用
      if (a && a.save_png) Promise.resolve(a.save_png(url,name)).then(function(r){ csSaveFeedback(r,name); });
      else { var l=document.createElement('a'); l.href=url; l.download=name; l.click(); toast('已导出 '+name); }
      return;
    }
    if (fmt!=='txt' && fmt!=='csv' && fmt!=='raw') { toast('不支持的导出格式：'+fmt, true); return; }
    var text=csPXRDExportText(res,fmt);
    csSaveTextCompat(text, name, function (r) { csSaveFeedback(r, name); });
  }
  function csPXRDWire(kd, opts, rad) {
    opts = opts || {}; rad = rad || { lambda:0, type:'', origin:'none', probe:'' };
    if (!document.getElementById('pxrd-lambda')) return;
    var expData=null, lastRes=null, timer=null;
    function num(id, def, lo, hi) {
      var el=document.getElementById(id), v=el?parseFloat(el.value):NaN;
      if (!isFinite(v)) v=def;
      return Math.max(lo, Math.min(hi, v));
    }
    function run() {
      var tmin=num('pxrd-tmin',2,0,100), tmax=num('pxrd-tmax',40,tmin+1,150);
      var step=num('pxrd-step',0.02,0.002,1), iMax=num('pxrd-imax',10000,1,1e9);
      var lam=num('pxrd-lambda',rad.lambda||PXRD_PRESETS.Cu.lambda,0.2,6);
      var neutron=document.getElementById('pxrd-neutron') ? document.getElementById('pxrd-neutron').checked : false;
      var params={ lambda:lam, alpha1:lam, alpha2:lam, alpha2ratio:0, ka12:false,
        neutron:neutron, ttwoMin:tmin, ttwoMax:tmax, step:step, iMax:iMax,
        fwhm:num('pxrd-fwhm',0.15,0.02,2),
        lp:document.getElementById('pxrd-lp') ? document.getElementById('pxrd-lp').checked : true,
        eta:0.5, radiation:{ lambda:lam, type:rad.type, origin:rad.origin, probe:rad.probe } };
      var res=csComputePXRD(kd, params);
      var canvas=document.getElementById('pxrd-canvas');
      if (res.error) { if (canvas) canvas.style.display='none'; toast(res.error, true); return; }
      if (canvas) canvas.style.display='';
      res.params=params;
      lastRes=res; window.CS.lastPXRD=res;   // 供保存 / 回归验证读取
      var tol=num('pxrd-tol',0.30,0.02,2);
      var showDiff=document.getElementById('pxrd-diff') ? document.getElementById('pxrd-diff').checked : true;
      csDrawPXRDCanvas(canvas, res, expData, { showDiff:showDiff, tol:tol });
      csBuildPXRDTable(res);
      csRenderMatchTable(res, expData, expData ? csMatchPeaks(res, expData, tol) : null);
      var note=document.getElementById('pxrd-radnote');
      if (note) {
        var manual=Math.abs(lam-(rad.lambda||PXRD_PRESETS.Cu.lambda))>1e-5;
        var type=rad.type || (rad.probe==='neutron'?'中子':rad.probe==='electron'?'电子':'Cu Kα');
        note.innerHTML='辐射 / 波长：<b>'+csEscHtml(type+' · '+lam.toFixed(5)+' Å')+'</b> · <span>'+
          (manual ? '手动指定波长（CIF 值 '+(rad.lambda?rad.lambda.toFixed(5)+' Å':'未提供')+'）'
                  : (rad.lambda ? '自动取自 CIF 的 _diffrn_radiation_wavelength'
                                : '当前结构未提供 CIF 辐射字段，使用默认 Cu Kα'))+'</span>';
      }
    }
    function schedule(){ clearTimeout(timer); timer=setTimeout(run,150); }
    // 参数改动即时重算（防抖 150ms），故不再需要「计算 / 刷新」按钮
    ['pxrd-lambda','pxrd-imax','pxrd-tmin','pxrd-tmax','pxrd-step','pxrd-fwhm','pxrd-tol'].forEach(function(id){
      var el=document.getElementById(id); if (!el) return;
      el.addEventListener('input',schedule); el.addEventListener('change',schedule);
    });
    ['pxrd-lp','pxrd-neutron','pxrd-diff','pxrd-align'].forEach(function(id){
      var el=document.getElementById(id); if (el) el.addEventListener('change',schedule);
    });
    var saveBtn=document.getElementById('pxrd-save');
    if (saveBtn) saveBtn.addEventListener('click',function(){
      var sel=document.getElementById('pxrd-format');
      csSavePXRD(lastRes, sel?sel.value:'png');
    });
    // 实验谱导入
    var fileInput=document.getElementById('pxrd-file'), impBtn=document.getElementById('pxrd-imp'), clearBtn=document.getElementById('pxrd-clear');
    if (impBtn) impBtn.addEventListener('click', function(){ if (fileInput) fileInput.click(); });
    if (fileInput) fileInput.addEventListener('change', function(e){
      var f=e.target.files[0]; if (!f) return;
      var rd=new FileReader();
      rd.onload=function(){ var r=csParseExpXY(rd.result, f.name); if (r.error){ toast(r.error, true); return; } expData=r; var nm=document.getElementById('pxrd-expname'); if (nm) nm.textContent='✓ '+f.name; schedule(); };
      rd.onerror=function(){ toast('读取实验谱失败', true); };
      rd.readAsText(f);
      e.target.value='';
    });
    if (clearBtn) clearBtn.addEventListener('click', function(){ expData=null; var nm=document.getElementById('pxrd-expname'); if (nm) nm.textContent=''; schedule(); });
    run();
  }
  window.CS = window.CS || {};
  window.CS.cifRadiation = csCifRadiation;
  window.CS.pxrdExportText = csPXRDExportText;
  window.CS.textToDataUrl = csTextToDataUrl;
  window.CS.saveTextCompat = csSaveTextCompat;
  window.CS.drawPXRDCanvas = csDrawPXRDCanvas;
  window.CS.xlsxFromXY = csXlsxFromXY;
  window.CS.saveBinary = csSaveBinary;
  window.CS.openPXRDConvert = openPXRDConvert;
  window.CS.xyHasSigma = csXYSigma;
  window.CS.lastPXRD = null;
  window.CS.computePXRD = csComputePXRD;
  window.CS.getKernelData = csGetKernelData;
  // 三维晶习 / 自由体积：暴露计算层供回归脚本直接校验数值
  window.CS.habitPlanes = csHabitPlanes;
  window.CS.habitPolyhedron = csHabitPolyhedron;
  window.CS.freeVolume = csFreeVolume;
  window.CS.isoMesh = csIsoMesh;
  window.CS.pickIsoMesh = csPickIsoMesh;
  window.CS.habitState = function(){ return HABIT_STATE; };
  window.CS.freevolState = function(){ return FREEVOL_STATE; };
  window.CS.dedup = csDedupUnitCell;
  window.CS.fitCell = csFitCell;
  window.CS.structureFactor = csStructureFactor;
  window.CS.latticeType = csLatticeType;
  // 分析入口暴露（供程序化 / 端到端测试调用；不改变任何交互行为）
  window.CS.getMolecules = csGetMolecules;
  window.CS.matchAndAlign = csMatchAndAlign;
  window.CS.buildSupercell = csBuildSupercell;
  window.CS.analyze = csAnalyze;

  function openToolModal(name, opts) {
    opts = opts || {};
    if (name === 'packing') {
      var kd = csGetKernelData();
      var r = csRenderInteractionModal(kd);
      openModal(r.title, r.html);
      csWireInteractionControls();
      return;
    }
    if (name === 'pxrd') {
      var kd2 = csGetKernelData();
      var r2 = csRenderPXRDModal(kd2, opts);
      openModal(r2.title, r2.html);
      if (r2.after) r2.after();
      return;
    }
    var m = TOOL_META[name]; if (!m) return;
    var planHtml = m.plan.map(function (p) { return '<li>' + p + '</li>'; }).join('');
    var html =
      '<div class="tool-soon"><div class="ts-ico">' + m.ico + '</div>' +
        '<div class="ts-txt"><b>' + m.title + '</b><span>' + m.subtitle + '</span></div></div>' +
      '<p>该模块将在后续版本中开放（规划方案如下），V1.0 聚焦于三维可视化与出版级图片导出。当前可执行的部分（结构读取、晶胞展开、超胞、视角与图片导出）已在主界面提供。</p>' +
      '<h3>规划的功能步骤</h3><ul>' + planHtml + '</ul>';
    openModal(m.title, html);
  }
  document.getElementById('modalClose').addEventListener('click', closeModal);
  modalMask.addEventListener('click', function (e) { if (e.target === modalMask) closeModal(); });
  function closeModal() { modalMask.classList.remove('open'); }

  /* ---------- 按钮绑定 ---------- */
  var bind = function (id, fn) { var el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  ['btn-open', 'q-open', 'pp-open', 'mb-open'].forEach(function (id) { bind(id, openStructure); });
  bind('mb-export', function () { generatePreview(); });
  bind('pp-export', function () { generatePreview(); });
  bind('pp-fit', function () { post({ type: 'fit' }); toast('视角已复位'); });
  bind('pp-publish', function () { post({ type: 'click', selector: '#btn-publish' }); toast('出版风：纸白 + 瓷器'); });
  bind('pp-showcase', function () { post({ type: 'click', selector: '#btn-showcase' }); toast('已回到酷炫默认'); });

  /* ---------- 自绘标题栏窗口控制 ----------
     最大化由 Python 侧铺满「工作区」（不含任务栏），返回新状态给按钮同步图标。 */
  function setMaximizeButton(max) {
    var b = document.getElementById('win-max'); if (!b) return;
    b.textContent = max ? '❐' : '□';
    b.title = max ? '还原窗口' : '最大化窗口';
  }
  function syncMaximizeState() {
    var a = api();
    if (!a || !a.win_maximize_state) return;
    var p = a.win_maximize_state();
    if (p && typeof p.then === 'function') p.then(function (r) {
      setMaximizeButton(!!(r && r.maximized));
    });
  }
  function toggleMaximize() {
    var a = api(); if (!a) { toast('窗口控制仅在桌面版中可用'); return; }
    var p = a.win_maximize();
    if (p && typeof p.then === 'function') p.then(function (r) {
      setMaximizeButton(!!(r && r.maximized));
    });
  }
  ['win-min', 'win-max', 'win-close'].forEach(function (id) {
    bind(id, function () {
      var a = api(); if (!a) { toast('窗口控制仅在桌面版中可用'); return; }
      if (id === 'win-min') a.win_minimize();
      else if (id === 'win-max') toggleMaximize();
      else a.win_close();
    });
  });
  // 标题栏双击 = 最大化 / 还原（与 Windows 原生标题栏一致）
  document.querySelectorAll('.pywebview-drag-region').forEach(function (el) {
    el.addEventListener('dblclick', toggleMaximize);
  });
  // V1.11：将窗口拖动范围扩展到整个顶部蓝条。
  // <nav> 已标记 pywebview-drag-region，故其空白区（含菜单间空隙）均可拖动窗口；
  // 但菜单项 / 语言下拉框 / 最小化·最大化·关闭按钮属于交互控件，须在 mousedown 捕获阶段
  // 阻止冒泡，避免触发 pywebview 的窗口拖动，从而保持可点击。
  document.addEventListener('mousedown', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('.menu-item, .mb-lang, .win-ctrl')) {
      e.stopPropagation();
    }
  }, true);
  // 启动、pywebview 就绪、窗口重新获得焦点（从任务栏还原）时同步按钮图标
  window.addEventListener('pywebviewready', syncMaximizeState);
  window.addEventListener('focus', syncMaximizeState);
  var rsTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(rsTimer);
    rsTimer = setTimeout(syncMaximizeState, 260);  // 拖动/贴靠后重新对齐按钮状态
  });
  setTimeout(syncMaximizeState, 800);

  /* ---------- 全局快捷键 ---------- */
  var STYLE_KEYS = ['line', 'stick', 'ballstick', 'cpk', 'wire'];
  document.addEventListener('keydown', function (e) {
    if (/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''))) return;
    if (modalMask.classList.contains('open') && e.key !== 'Escape') return;
    var k = e.key.toLowerCase();
    if (k >= '1' && k <= '5') { var st = STYLE_KEYS[+k - 1]; syncSelect('style', st); showStyleParams(st); post(CMD.style(st)); }
    else if (k === 'o') { var p = selectValue('proj') === 'persp' ? 'ortho' : 'persp'; syncSelect('proj', p); post(CMD.proj(p)); }
    else if (k === 'p') { post({ type: 'click', selector: '#btn-publish' }); }
    else if (k === 's') { post({ type: 'click', selector: '#btn-showcase' }); }
    else if (k === 'r') { post({ type: 'fit' }); }
    else if (k === 'h') { togglePanel(); }
    else if (k === 'e') { generatePreview(); }
    else if (k === ' ') {
      e.preventDefault();
      var box = document.querySelector('input[data-check="chk-rotate"]');
      box.checked = !box.checked; post({ type: 'check', id: 'chk-rotate', value: box.checked });
    } else if (k === 'escape') { closeModal(); closeAllMenus(); }
  });

  // 首屏同步一次
  setTimeout(function () { post({ type: 'state' }); }, 400);
  window.addEventListener('pywebviewready', function () { toast('CrystaSee晶见 V1.14 已就绪'); });

  /* ============ V1.9 新增：菜单命令实现 ============ */
  function csCellVolume(vectors) {
    var a=vectors.a, b=vectors.b, c=vectors.c;
    function cross(u,v){ return [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]; }
    var cr=cross(b,c); return Math.abs(a[0]*cr[0]+a[1]*cr[1]+a[2]*cr[2]);
  }
  function csFormula(atoms) {
    var cnt={}; atoms.forEach(function (a) { if (a.el) cnt[a.el]=(cnt[a.el]||0)+1; });
    var order=['H','C','N','O','F','P','S','Cl','Br','I','B','Si','Na','Mg','Al','K','Ca','Ti','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Rb','Sr','Y','Zr','Mo','Ag','Cd','In','Sn','Sb','Te','Cs','Ba','La','Ce','Nd','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb','Lu','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl','Pb','Bi'];
    var keys=Object.keys(cnt);
    keys.sort(function (a,b) { var ia=order.indexOf(a), ib=order.indexOf(b); ia=ia<0?999:ia; ib=ib<0?999:ib; if (ia!==ib) return ia-ib; return a<b?-1:1; });
    return keys.map(function (e) { return e + (cnt[e]>1 ? cnt[e] : ''); }).join('');
  }
  function saveTextFile(text, name) { csSaveTextCompat(text, name); }
  var RECENT = [];
  function loadRecent() { try { var s = localStorage.getItem('cs_recent'); if (s) return JSON.parse(s) || []; } catch (e) {} return []; }
  function saveRecent() { try { localStorage.setItem('cs_recent', JSON.stringify(RECENT.slice(0,12))); } catch (e) {} }
  function pushRecent(item) {
    if (!item) return;
    RECENT = RECENT.filter(function (x) { return !(x.type===item.type && ((x.key && x.key===item.key) || (x.path && x.path===item.path))); });
    RECENT.unshift(item); if (RECENT.length > 12) RECENT = RECENT.slice(0,12); saveRecent();
  }
  RECENT = loadRecent();

  function openRecentModal() {
    if (!RECENT.length) { openModal('最近文件', '<p>暂无最近打开的结构。可通过「文件 ▸ 打开结构文件」或左侧「案例演示」载入。</p>'); return; }
    var rows = RECENT.map(function (r, idx) {
      var label = r.type==='sample' ? ('案例：' + (r.name||r.key)) : ('文件：' + (r.name||r.path||''));
      var act = r.type==='sample' ? '<button class="pp-btn" data-recent="'+idx+'">载入</button>' : '<button class="pp-btn" data-recent="'+idx+'">重新打开</button>';
      return '<tr><td>'+label+'</td><td>'+act+'</td></tr>';
    }).join('');
    openModal('最近文件', '<table class="pxrd-table"><tr class="ia-head"><th>最近结构</th><th></th></tr>'+rows+'</table>');
    Array.prototype.slice.call(document.querySelectorAll('[data-recent]')).forEach(function (b) {
      b.addEventListener('click', function () {
        var it = RECENT[+b.dataset.recent]; closeModal();
        if (it.type==='sample') { dispatch('sample', it.key); toast('正在载入 ' + (it.name||it.key) + '…'); }
        else { openStructure(); }
      });
    });
  }

  // 把相互作用分析面板里的「氢键几何定义」输入框接到全局阈值与三维可视化
  function csWireInteractionControls() {
    var haEl = document.getElementById('hb-ha-max'), angEl = document.getElementById('hb-ang-min');
    if (!haEl || !angEl) return;
    function apply() {
      var ha = parseFloat(haEl.value), ang = parseFloat(angEl.value);
      if (!isFinite(ha) || ha <= 0) ha = CS_HBOND_HA_MAX;
      if (!isFinite(ang) || ang < 0) ang = CS_HBOND_ANG_MIN;
      CS_HBOND_HA_MAX = ha; CS_HBOND_ANG_MIN = ang;
      var rep = document.getElementById('ia-report');
      if (rep) rep.innerHTML = csInteractionReportHtml(csGetKernelData());
      post({ type:'hbpar', ha: ha, ang: ang });   // 同步到三维渲染内核
    }
    haEl.addEventListener('input', apply);
    angEl.addEventListener('input', apply);
  }

  function openInteractionAnalysis() {
    var kd = csGetKernelData();
    if (!kd) { openModal('相互作用分析', '<p class="tool-soon">渲染内核尚未就绪，请稍候再试。</p>'); return; }
    var r = csRenderInteractionModal(kd); openModal(r.title, r.html);
    csWireInteractionControls();
  }

  function csCifField(cif, names) {
    if (!cif) return '';
    var lines = cif.split('\n');
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      if (!line || line.charAt(0) === '#') continue;
      for (var ni = 0; ni < names.length; ni++) {
        var tag = names[ni], pos = line.indexOf(tag);
        if (pos === -1) continue;
        var before = pos === 0 ? '' : line.charAt(pos - 1);
        if (before && before !== ' ' && before !== '\t') continue;
        var after = line.charAt(pos + tag.length);
        if (after && after !== ' ' && after !== '\t' && after !== '\r') continue;
        var val = line.slice(pos + tag.length).trim();
        if (!val) { // 值可能在下一行
          for (var k = li + 1; k < lines.length; k++) {
            var nx = lines[k];
            if (nx.charAt(0) === '#' || !nx.trim()) continue;
            val = nx.trim(); break;
          }
        }
        if (val.charAt(0) === '\'') { var e = val.indexOf('\'', 1); val = e === -1 ? val.slice(1) : val.slice(1, e); }
        else if (val.charAt(0) === '"') { var e2 = val.indexOf('"', 1); val = e2 === -1 ? val.slice(1) : val.slice(1, e2); }
        else if (val.charAt(0) === ';') { val = ''; }
        else if (val.charAt(val.length - 1) === ';') { val = val.slice(0, -1); }
        return val.trim();
      }
    }
    return '';
  }
  function csCifNum(cif, names) {
    var s = csCifField(cif, names);
    if (!s) return null;
    s = s.replace(/\([^)]*\)/g, '').replace(/[^\d.\-eE]/g, '');
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
  }
  // 正确提取 _refine_ls_R_factor_gt 的数值（R 因子，转为百分数用）。
  // csCifField 对 loop 块会误抓相邻 header 字段名，故这里按「循环列索引 → 数据行」精确读取。
  function csGetRefineRfactorGt(cif) {
    if (!cif) return null;
    var lines = cif.split(/\r?\n/), n = lines.length, i = 0;
    function clean(s) { if (s == null) return ''; var ci = s.indexOf('#'); if (ci >= 0) s = s.slice(0, ci); return s.trim(); }
    function numOf(tok) { if (tok == null) return NaN; return parseFloat(String(tok).replace(/\([^)]*\)/g, '')); }
    while (i < n) {
      var L = clean(lines[i]);
      if (L === 'loop_') {
        // 收集紧邻的 header 键
        var keys = [], j = i + 1;
        while (j < n) {
          var hk = clean(lines[j]);
          if (hk === '') { j++; continue; }
          if (hk[0] === ';') { var k = j + 1; while (k < n && clean(lines[k])[0] !== ';') k++; j = k + 1; continue; }
          if (hk[0] === '_') { keys.push(hk); j++; continue; }
          break; // 数据行或其它结构
        }
        var idx = keys.indexOf('_refine_ls_R_factor_gt');
        if (idx >= 0) {
          while (j < n) {
            var dl = clean(lines[j]);
            if (dl === '' || dl[0] === '_' || dl === 'loop_') break;
            if (dl[0] === ';') { var k2 = j + 1; while (k2 < n && clean(lines[k2])[0] !== ';') k2++; j = k2 + 1; continue; }
            var toks = dl.split(/\s+/);
            if (idx < toks.length) { var v = numOf(toks[idx]); if (!isNaN(v)) return v; }
            j++;
          }
        }
        i = j; continue;
      } else if (L[0] === '_' && L.indexOf('_refine_ls_R_factor_gt') === 0) {
        // 单字段（非 loop）：值在同行的 token 之后，或下一行
        var t = L.split(/\s+/);
        if (t.length >= 2) { var v1 = numOf(t[1]); if (!isNaN(v1)) return v1; }
        for (var m = i + 1; m < n; m++) {
          var nx = clean(lines[m]);
          if (nx === '' || nx[0] === '_' || nx === 'loop_') break;
          var nv = numOf(nx.replace(/\([^)]*\)/g, '')); if (!isNaN(nv)) return nv;
        }
      }
      i++;
    }
    return null;
  }
  function openStructInfo() {
    var kd = csGetKernelData();
    if (!kd) { openModal('结构信息', '<p class="tool-soon">渲染内核尚未就绪，请稍候再试。</p>'); return; }
    var cell = kd.cell, cif = lastCifText || '';
    var aC = csCifNum(cif, ['_cell_length_a']), bC = csCifNum(cif, ['_cell_length_b']), cC = csCifNum(cif, ['_cell_length_c']);
    var alC = csCifNum(cif, ['_cell_angle_alpha']), beC = csCifNum(cif, ['_cell_angle_beta']), gaC = csCifNum(cif, ['_cell_angle_gamma']);
    var a = aC != null ? aC : cell.a, b = bC != null ? bC : cell.b, c = cC != null ? cC : cell.c;
    var al = alC != null ? alC : cell.al, be = beC != null ? beC : cell.be, ga = gaC != null ? gaC : cell.ga;
    var Vcif = csCifNum(cif, ['_cell_volume']);
    var V = Vcif != null ? Vcif : ((cell && cell.vectors) ? csCellVolume(cell.vectors) : null);
    var rows = [];
    rows.push(['结构名称', kd.structure || '']);
    var chemSum = csCifField(cif, ['_chemical_formula_sum', '_chemical_formula_moiety']);
    rows.push(['化学式', chemSum]);
    var fw = csCifField(cif, ['_chemical_formula_weight']);
    rows.push(['化学式量 (Formula weight)', fw]);
    var sys = csCifField(cif, ['_space_group_crystal_system']) || (cell ? csLatticeType(cell) : '');
    rows.push(['晶系', sys]);
    if (cell) {
      rows.push(['a / b / c (Å)', csFmt(a,3)+' / '+csFmt(b,3)+' / '+csFmt(c,3)]);
      rows.push(['α / β / γ (°)', csFmt(al,1)+' / '+csFmt(be,1)+' / '+csFmt(ga,1)]);
      rows.push(['晶胞体积 V (Å³)', csFmt(V,2)]);
    }
    rows.push(['超胞', kd.sc[0]+'×'+kd.sc[1]+'×'+kd.sc[2]]);
    var sg = csCifField(cif, ['_symmetry_space_group_name_H-M', '_space_group_name_H-M', '_symmetry_space_group_name_Hall', '_space_group_name_Hall']);
    if (!sg) { var itn = csCifField(cif, ['_symmetry_Int_Tables_number', '_space_group_IT_number']); if (itn) sg = 'No. ' + itn; }
    rows.push(['空间群', sg]);
    var z = csCifField(cif, ['_cell_formula_units_Z']);
    rows.push(['Z', z]);
    var rho = csCifField(cif, ['_exptl_crystal_density_diffrn', '_exptl_crystal_density_calc', '_exptl_crystal_density_meas']);
    rows.push(['ρ<sub>calc</sub> (g·cm<sup>−3</sup>)', rho]);
    var rfacNum = csGetRefineRfactorGt(cif);
    var rfac = rfacNum != null ? (rfacNum * 100).toFixed(2) + '%' : '';
    rows.push(['R 因子 (R_gt)', rfac]);
    var temp = csCifField(cif, ['_diffrn_ambient_temperature', '_cell_measurement_temperature', '_diffrn_temperature']);
    rows.push(['温度 (K)', temp]);
    var colour = csCifField(cif, ['_crystal_colour_primary', '_crystal_colour', '_exptl_crystal_colour']);
    rows.push(['晶体颜色', colour]);
    rows.push(['数据来源', '内置示例 / 已载入结构（.cif 等）']);
    var html = '<table class="pxrd-table ia-struct">' + rows.map(function (r) { return '<tr><th>'+r[0]+'</th><td>'+r[1]+'</td></tr>'; }).join('') + '</table>' +
      '<p class="ia-note">以上字段优先取自原始 .cif 的结构参数；未提供的字段显示空白。</p>';
    openModal('结构信息', html);
  }

  /* ================================================================
     V1.9 · 三维晶习（BFDH / AE Wulff 多面体）与自由体积并集
     全部在外壳计算，结果经 feature 通道交给内核 overlayGroup 渲染。
     ================================================================ */
  var HABIT_COLORS = ['#4f8ef7','#33b1a6','#a06be0','#e8933a','#e05c7a','#5fb85f',
                      '#3f8fd0','#d0a63c','#8f7ee0','#3fb0a0','#df7a4a','#6f9ee8',
                      '#4aa3d8','#b57bd0','#67b34f','#d9736a'];
  function csCross3(a,b){ return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
  function csUnit3(a){ var L=csVlen(a)||1; return [a[0]/L,a[1]/L,a[2]/L]; }
  function csDot3(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }

  // 枚举低指数晶面族（按劳埃类 canonical 去重），同时给出倒格矢 G、单位法向 n、1/d
  function csHabitPlanes(kd, maxIdx) {
    var sys=csLatticeType(kd.cell), cell=csSnapCell(kd.cell,sys), rc=csReciprocal(cell);
    if(!rc) return null;
    var ops=csCloseGroup(csLaueGens(sys,'b')), seen={}, planes=[], N=maxIdx||2;
    for(var h=-N;h<=N;h++) for(var k=-N;k<=N;k++) for(var l=-N;l<=N;l++) {
      if(!h && !k && !l) continue;
      var G2=csDhklSq(h,k,l,rc); if(!(G2>0)) continue;
      var canon=csCanonical(h,k,l,ops,rc);
      if(!(h===canon[0]&&k===canon[1]&&l===canon[2])) continue;
      var key=h+','+k+','+l; if(seen[key]) continue; seen[key]=1;
      var G=[rc.a[0]*h+rc.b[0]*k+rc.c[0]*l, rc.a[1]*h+rc.b[1]*k+rc.c[1]*l, rc.a[2]*h+rc.b[2]*k+rc.c[2]*l];
      var gl=Math.sqrt(G2);
      planes.push({h:h,k:k,l:l,d:1/gl,inv:gl,G:G,n:[G[0]/gl,G[1]/gl,G[2]/gl],
                   mult:csMul(h,k,l,ops,rc),ae:0,cH:0,cV:0,tNorm:1});
    }
    return {planes:planes,ops:ops,rc:rc,cell:cell,sys:sys};
  }
  // AE 附着能代理：被该晶面切片切断的分子间相互作用（沿用既有 AE 模型定义）
  function csHabitAE(kd, info) {
    var an=csAnalyze(kd); if(!an || an.empty) return false;
    var pairs=[];
    an.hbonds.forEach(function(b){ if(b.xi!=null&&b.xj!=null) pairs.push([b.xi,b.xj,1.0,1]); });
    an.contacts.forEach(function(c){
      var i=parseInt((c.a.split('#')[1]||'0')), j=parseInt((c.b.split('#')[1]||'0'));
      if(!isNaN(i)&&!isNaN(j)) pairs.push([i,j,0.6,0]);
    });
    info.planes.forEach(function(pl){
      var n=pl.G,w=0,cH=0,cV=0;
      pairs.forEach(function(p){
        var ai=kd.atoms[p[0]], aj=kd.atoms[p[1]]; if(!ai||!aj) return;
        var si=csDot3(ai.cart,n), sj=csDot3(aj.cart,n);
        if(si*sj<=0){ w+=p[2]; if(p[3]) cH++; else cV++; }
      });
      pl.ae=pl.d>0?w/pl.d:0; pl.cH=cH; pl.cV=cV;
    });
    return true;
  }
  // Wulff 构造：每个晶面族的半空间 n·x <= t，t 由模型给的相对生长速率决定。
  // 半空间交的顶点由三平面求交枚举，逐面的多边形按平面内极角排序。
  function csHabitPolyhedron(kd, model, opt) {
    opt=opt||{};
    var info=csHabitPlanes(kd,opt.maxIdx||2); if(!info) return null;
    var useAE = model==='ae' && csHabitAE(kd,info);
    var vals=info.planes.map(function(p){ return useAE?p.ae:p.inv; });
    var mx=Math.max.apply(null,vals.concat([1e-9])), mn=Math.min.apply(null,vals);
    var flat = useAE && (mx-mn)<1e-9;            // AE 全零时退化为 BFDH
    if(flat){ vals=info.planes.map(function(p){return p.inv;}); mx=Math.max.apply(null,vals); }
    info.planes.forEach(function(p,i){ p.tNorm=0.25+0.75*(mx>0?vals[i]/mx:1); });
    var V=kd.cell.vectors;
    var L=Math.max(csVlen(V.a),csVlen(V.b),csVlen(V.c));
    var size=L*1.35*(opt.size||1);
    var sc=kd.sc||[1,1,1];
    var center=[(sc[0]*V.a[0]+sc[1]*V.b[0]+sc[2]*V.c[0])*0.5,
                (sc[0]*V.a[1]+sc[1]*V.b[1]+sc[2]*V.c[1])*0.5,
                (sc[0]*V.a[2]+sc[1]*V.b[2]+sc[2]*V.c[2])*0.5];
    // 按 t 升序逐族展开为完整对称等价面（含 ±），保证晶系对称性不被截断
    var ordered=info.planes.slice().sort(function(a,b){return a.tNorm-b.tNorm;});
    var hs=[], famCount=0;
    for(var fi=0;fi<ordered.length;fi++){
      var fam=ordered[fi], variants={};
      info.ops.forEach(function(op){
        var p=csApplyOp(op,fam.h,fam.k,fam.l);
        var G2=csDhklSq(p[0],p[1],p[2],info.rc);
        if(Math.abs(G2-fam.inv*fam.inv)>1e-4*(fam.inv*fam.inv+1e-6)) return;
        variants[p.join(',')]=p;
        var q=[-p[0],-p[1],-p[2]]; variants[q.join(',')]=q;
      });
      var vs=Object.keys(variants).map(function(key){return variants[key];});
      if(hs.length && hs.length+vs.length>64) break;
      var faceCol = (opt && opt.colorMode==='mono')
        ? (opt.monoColor || '#4f8ef7')
        : HABIT_COLORS[famCount % HABIT_COLORS.length];
      vs.forEach(function(p){
        var G=[info.rc.a[0]*p[0]+info.rc.b[0]*p[1]+info.rc.c[0]*p[2],
               info.rc.a[1]*p[0]+info.rc.b[1]*p[1]+info.rc.c[1]*p[2],
               info.rc.a[2]*p[0]+info.rc.b[2]*p[1]+info.rc.c[2]*p[2]];
        var gl=csVlen(G)||1;
        hs.push({h:p[0],k:p[1],l:p[2],n:[G[0]/gl,G[1]/gl,G[2]/gl],
                 t:fam.tNorm*size, col:faceCol});
      });
      famCount++;
      if(hs.length>=64) break;
    }
    if(hs.length<4) return {faces:[],families:famCount,hs:hs.length,verts:0,info:info,model:flat?'bfdh':(useAE?'ae':'bfdh'),size:size,center:center};
    var tol=2e-4*size, vseen={}, verts=[];
    for(var i=0;i<hs.length;i++) for(var j=i+1;j<hs.length;j++) for(var m=j+1;m<hs.length;m++){
      var A=[hs[i].n,hs[j].n,hs[m].n];
      var sol=csSolve3(A,[hs[i].t,hs[j].t,hs[m].t]); if(!sol) continue;
      var ok=true;
      for(var q=0;q<hs.length;q++){ if(csDot3(hs[q].n,sol)>hs[q].t+tol){ok=false;break;} }
      if(!ok) continue;
      var key=Math.round(sol[0]*200)+','+Math.round(sol[1]*200)+','+Math.round(sol[2]*200);
      if(vseen[key]) continue; vseen[key]=1; verts.push(sol);
    }
    var faces=[];
    hs.forEach(function(F){
      var pts=[], seen2={};
      verts.forEach(function(v){
        if(Math.abs(csDot3(F.n,v)-F.t)>tol) return;
        var kk=Math.round(v[0]*200)+','+Math.round(v[1]*200)+','+Math.round(v[2]*200);
        if(seen2[kk]) return; seen2[kk]=1; pts.push(v);
      });
      if(pts.length<3) return;
      var ctr=[0,0,0]; pts.forEach(function(p){ctr[0]+=p[0]/pts.length;ctr[1]+=p[1]/pts.length;ctr[2]+=p[2]/pts.length;});
      var arb=Math.abs(F.n[2])<0.9?[0,0,1]:[1,0,0];
      var e1=csUnit3(csCross3(F.n,arb)), e2=csUnit3(csCross3(F.n,e1));
      pts.sort(function(a,b){
        var da=[a[0]-ctr[0],a[1]-ctr[1],a[2]-ctr[2]], db=[b[0]-ctr[0],b[1]-ctr[1],b[2]-ctr[2]];
        return Math.atan2(csDot3(da,e2),csDot3(da,e1))-Math.atan2(csDot3(db,e2),csDot3(db,e1));
      });
      faces.push({h:F.h,k:F.k,l:F.l,n:F.n,col:F.col,
        poly:pts.map(function(p){return [p[0]+center[0],p[1]+center[1],p[2]+center[2]];}),
        center:[ctr[0]+center[0],ctr[1]+center[1],ctr[2]+center[2]]});
    });
    return {faces:faces,families:famCount,hs:hs.length,verts:verts.length,info:info,
            model:flat?'bfdh':(useAE?'ae':'bfdh'),size:size,center:center};
  }
  function csHabitTable(model, info) {
    var rows=info.planes.slice().sort(function(a,b){return b.d-a.d;}).slice(0,40);
    if(model==='ae'){
      return '<table class="pxrd-table"><tr class="ia-head"><th>h</th><th>k</th><th>l</th><th>d (Å)</th><th>多重性</th><th>切断 H</th><th>切断 vdW</th><th>AE 代理</th></tr>'+
        rows.map(function(r){return '<tr><td>'+r.h+'</td><td>'+r.k+'</td><td>'+r.l+'</td><td>'+csFmt(r.d,3)+'</td><td>'+r.mult+'</td><td>'+r.cH+'</td><td>'+r.cV+'</td><td>'+csFmt(r.ae,3)+'</td></tr>';}).join('')+'</table>';
    }
    return '<table class="pxrd-table"><tr class="ia-head"><th>h</th><th>k</th><th>l</th><th>d (Å)</th><th>多重性</th></tr>'+
      rows.map(function(r){return '<tr><td>'+r.h+'</td><td>'+r.k+'</td><td>'+r.l+'</td><td>'+csFmt(r.d,3)+'</td><td>'+r.mult+'</td></tr>';}).join('')+'</table>';
  }

  // 由已算好的标量场抽 s=iso 等值面（marching tetrahedra）。
  // iso>0 相当于用半径 iso 的探针球：只显示「探针可及」的空隙口袋，
  // 使绿色轮廓收缩成分散团块，不会整片盖住分子。体积统计始终按 s=0，不受 iso 影响。
  function csIsoMesh(base, iso) {
    var n0=base.N[0],n1=base.N[1],n2=base.N[2], node=base.node;
    var A=base.vec.a,B=base.vec.b,C=base.vec.c;
    var id=function(i,j,k){return (k*n1+j)*n0+i;};
    function cartAt(fx,fy,fz){
      return [fx*A[0]+fy*B[0]+fz*C[0], fx*A[1]+fy*B[1]+fz*C[1], fx*A[2]+fy*B[2]+fz*C[2]];
    }
    var C8=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
    var T6=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
    var vmap=new Map(), verts=[], tris=[], MAX_TRIS=80000, overflow=false;
    function vid(fr){
      var key=Math.round(fr[0]*100000)+','+Math.round(fr[1]*100000)+','+Math.round(fr[2]*100000);
      var v=vmap.get(key); if(v!==undefined) return v;
      var c=cartAt(fr[0],fr[1],fr[2]), vi=verts.length/3;
      verts.push(c[0],c[1],c[2]); vmap.set(key,vi); return vi;
    }
    function addTri(a,b,c,P,S){
      var u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
      var nn=csCross3(u,v), posP=P[0];
      for(var z=0;z<4;z++) if(S[z]>0){ posP=P[z]; break; }
      var d=nn[0]*(posP[0]-a[0])+nn[1]*(posP[1]-a[1])+nn[2]*(posP[2]-a[2]);
      var ids=[vid(a),vid(b),vid(c)];
      if(d<0) ids=[ids[0],ids[2],ids[1]];
      tris.push(ids[0],ids[1],ids[2]);
      if(tris.length/3>MAX_TRIS) overflow=true;
    }
    for(var kk=0;kk<n2&&!overflow;kk++) for(var jj=0;jj<n1&&!overflow;jj++) for(var ii=0;ii<n0&&!overflow;ii++){
      var cp=[], cv=[];
      for(var q=0;q<8;q++){
        var cc=C8[q];
        cp.push([(ii+cc[0])/n0,(jj+cc[1])/n1,(kk+cc[2])/n2]);
        cv.push(node[id((ii+cc[0])%n0,(jj+cc[1])%n1,(kk+cc[2])%n2)]-iso);
      }
      for(var t=0;t<6&&!overflow;t++){
        var T=T6[t], P=T.map(function(x){return cp[x];}), S=T.map(function(x){return cv[x];}), cross=[];
        for(var a=0;a<4;a++) for(var b=a+1;b<4;b++){
          if((S[a]>0)===(S[b]>0)) continue;
          var f=S[a]/(S[a]-S[b]);
          cross.push([P[a][0]+f*(P[b][0]-P[a][0]), P[a][1]+f*(P[b][1]-P[a][1]), P[a][2]+f*(P[b][2]-P[a][2])]);
        }
        if(cross.length===3){ addTri(cross[0],cross[1],cross[2],P,S); }
        else if(cross.length===4){
          var ctr=[0,0,0]; cross.forEach(function(p){ctr[0]+=p[0]/4;ctr[1]+=p[1]/4;ctr[2]+=p[2]/4;});
          var e1=csUnit3([cross[1][0]-cross[0][0],cross[1][1]-cross[0][1],cross[1][2]-cross[0][2]]);
          var np=csCross3(e1,[cross[2][0]-cross[0][0],cross[2][1]-cross[0][1],cross[2][2]-cross[0][2]]);
          var e2=csUnit3(csCross3(np,e1));
          cross.sort(function(p,q){
            var dp=[p[0]-ctr[0],p[1]-ctr[1],p[2]-ctr[2]], dq=[q[0]-ctr[0],q[1]-ctr[1],q[2]-ctr[2]];
            return Math.atan2(csDot3(dp,e2),csDot3(dp,e1))-Math.atan2(csDot3(dq,e2),csDot3(dq,e1));
          });
          addTri(cross[0],cross[1],cross[2],P,S);
          addTri(cross[0],cross[2],cross[3],P,S);
        }
      }
    }
    return {verts:verts,tris:tris,overflow:overflow};
  }

  // 自适应探针半径：「自动」模式下优先选**最饱满且不超过三角面预算**的探针，
  // 让绿色轮廓呈现为充实的空隙口袋（而非被收缩得只剩零星碎块，也非 s=0 时包裹原子的全包络）；
  // 致密结构（如 NaCl，smax 极小）在 iso>0 时根本没有可及空隙，此时回退到 s=0，保证总能看到轮廓。
  // 体积数值始终按 s=0 统计，与 iso 无关。
  // want='auto'（或省略）= 自动；显式数值 = 用户指定，不做回退（选 1.2 显示为空是合理的）。
  function csPickIsoMesh(base, want) {
    var TARGET_TRIS = 29000, CAP_TRIS = 42000, MIN_TRIS = 250;
    var auto = (want === undefined || want === null || want === '' || want === 'auto');
    var vals = auto ? [0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.2] : [Number(want) || 0];
    // 用收敛参考网格测得的 smax 筛候选（与显示步长解耦），必要时回退显示网格 smax
    var smax = (isFinite(base.smaxRef) && base.smaxRef > -1e8) ? base.smaxRef
             : (isFinite(base.smax) ? base.smax : NaN);
    if (auto && isFinite(smax)) {
      var f = vals.filter(function(v){ return v === 0 || v < smax - 1e-4; });
      if (!f.length) f = [0];
      vals = f;
    }
    var cands = vals.map(function(v){
      var m = csIsoMesh(base, v);
      return { iso:v, m:m, tris:m.tris.length / 3 };
    });
    var pick;
    if (!auto) {
      pick = cands[cands.length - 1];           // 显式模式：只算一次直接采用
    } else {
      // 仅保留「可见且不过载」的候选，取最接近目标面数者（优先更饱满的空隙表示）
      var ok = cands.filter(function(c){ return c.tris >= MIN_TRIS && c.tris <= CAP_TRIS; });
      if (ok.length) {
        ok.sort(function(a,b){ return Math.abs(a.tris - TARGET_TRIS) - Math.abs(b.tris - TARGET_TRIS); });
        pick = ok[0];
      } else {
        // 全部过大（高自由体积）：取三角形数最少者（最大探针，只显示最大的空隙核心）
        var big = cands.filter(function(c){ return c.tris >= MIN_TRIS; });
        pick = big.length ? big.reduce(function(p,c){ return c.tris < p.tris ? c : p; }) : cands[cands.length - 1];
      }
    }
    return { iso: pick.iso, verts: pick.m.verts, tris: pick.m.tris, overflow: pick.m.overflow, auto: auto };
  }

  // 自由体积：单晶胞内「原子范德华球的并集」占据体积。周期性最小像 + 体素采样，
  // 天然把相邻原子球的重叠只计一次；s=0 等值面用 marching tetrahedra 抽出供 3D 高亮。
  function csFreeVolume(kd, step, iso) {
    var V=kd.cell.vectors, A=V.a,B=V.b,C=V.c, Vcell=csCellVolume(V);
    var rc=csReciprocal(kd.cell); if(!rc||!(Vcell>0)) return {error:'晶胞数据无效'};
    var uc=csDedupUnitCell(kd.atoms).map(function(a){
      return {r:csVdwR(a.el), cart:csFracToCart(a.frac,V)};
    });
    if(!uc.length) return {error:'未读取到原子'};
    var rmax=0; uc.forEach(function(a){ if(a.r>rmax) rmax=a.r; });
    var h=step||0.45;
    var N=[csVlen(A),csVlen(B),csVlen(C)].map(function(L){return Math.max(8,Math.min(44,Math.ceil(L/h)));});
    var n0=N[0],n1=N[1],n2=N[2];
    function cartAt(fx,fy,fz){
      return [fx*A[0]+fy*B[0]+fz*C[0], fx*A[1]+fy*B[1]+fz*C[1], fx*A[2]+fy*B[2]+fz*C[2]];
    }
    // s(p)=min_i(|p-atom_i|_最小像 - r_i)，s>0 为自由空间
    function scalar(px,py,pz){
      var best=1e9;
      for(var q=0;q<uc.length;q++){
        var dx=px-uc[q].cart[0], dy=py-uc[q].cart[1], dz=pz-uc[q].cart[2];
        var f0=rc.a[0]*dx+rc.a[1]*dy+rc.a[2]*dz;
        var f1=rc.b[0]*dx+rc.b[1]*dy+rc.b[2]*dz;
        var f2=rc.c[0]*dx+rc.c[1]*dy+rc.c[2]*dz;
        f0-=Math.round(f0); f1-=Math.round(f1); f2-=Math.round(f2);
        var ex=f0*A[0]+f1*B[0]+f2*C[0], ey=f0*A[1]+f1*B[1]+f2*C[1], ez=f0*A[2]+f1*B[2]+f2*C[2];
        var d2=ex*ex+ey*ey+ez*ez, lim=best+uc[q].r;
        if(lim>0 && d2>=lim*lim) continue;
        var d=Math.sqrt(d2)-uc[q].r; if(d<best) best=d;
      }
      return best;
    }
    var id=function(i,j,k){return (k*n1+j)*n0+i;};
    var node=new Float32Array(n0*n1*n2), freeCnt=0, total=n0*n1*n2, smax=-1e9;
    for(var k=0;k<n2;k++) for(var j=0;j<n1;j++) for(var i=0;i<n0;i++){
      var pn=cartAt(i/n0,j/n1,k/n2), sv=scalar(pn[0],pn[1],pn[2]);
      node[id(i,j,k)]=sv; if(sv>smax) smax=sv;
      var pc=cartAt((i+0.5)/n0,(j+0.5)/n1,(k+0.5)/n2);
      if(scalar(pc[0],pc[1],pc[2])>0) freeCnt++;
    }
    var frac=freeCnt/total;
    // 收敛参考网格测 smax：与显示步长解耦，使「自动」探针的选值只由结构本身决定，
    // 不再随 0.25 / 0.35 等显示步长漂移（步长只影响渲染表面的精细度）。
    var hRef = Math.min(h, 0.2);
    var Nref = [csVlen(A),csVlen(B),csVlen(C)].map(function(L){return Math.max(8,Math.min(44,Math.ceil(L/hRef)));});
    var smaxRef = -1e9;
    for(var rk=0;rk<Nref[2];rk++) for(var rj=0;rj<Nref[1];rj++) for(var ri=0;ri<Nref[0];ri++){
      var rp=cartAt(ri/Nref[0],rj/Nref[1],rk/Nref[2]), rs=scalar(rp[0],rp[1],rp[2]);
      if(rs>smaxRef) smaxRef=rs;
    }
    var base={Vcell:Vcell,occ:Vcell*(1-frac),free:Vcell*frac,frac:frac,
              N:N,step:h,nAtoms:uc.length,cell:{a:A,b:B,c:C},sc:kd.sc.slice(),
              node:node,vec:V,smax:smax,smaxRef:smaxRef};
    var mesh=csPickIsoMesh(base,iso);
    base.verts=mesh.verts; base.tris=mesh.tris; base.overflow=mesh.overflow;
    base.iso=mesh.iso; base.isoAuto=mesh.auto;
    return base;
  }
  function csPostFreeVol(res,on,op){
    post({type:'feature',name:'freevol',data:{on:!!on,verts:res.verts,tris:res.tris,
      cell:res.cell,sc:res.sc,opacity:op}});
  }

  var FREEVOL_STATE = { step:0.35, res:null };
  function openFreeVol() {
    var kd = csGetKernelData();
    if (!kd || !kd.cell || !kd.cell.vectors) { toast('缺少晶胞数据，无法计算自由体积', true); return; }
    // 用户要求：进入自由体积计算时强制把显示范围设为「仅晶胞内部（含边界）」
    dispatch('range','interior');
    csExclusiveFeature('freevol');
    var html = '<div class="cv-chks"><label class="cv-chk"><input type="checkbox" id="fv-on" checked> 高亮自由区域（绿色轮廓）</label></div>' +
      '<div class="cv-row"><label>空隙探针半径</label><select id="fv-iso">' +
        '<option value="0.2" selected>0.2 Å</option>' +
        '<option value="0.3">0.3 Å</option><option value="0.4">0.4 Å</option>' +
        '<option value="0.6">0.6 Å</option><option value="0.8">0.8 Å</option>' +
        '<option value="auto">自动（致密结构回退全貌）</option>' +
        '<option value="1.2">1.2 Å（仅大空隙）</option></select></div>' +
      '<div class="cv-row"><label>轮廓透明度</label><input type="range" id="fv-op" min="0.12" max="0.85" step="0.02" value="0.3"><span class="cv-val" id="fv-op-v">0.3</span></div>' +
      '<div class="cv-btns"><button class="cv-btn primary" id="fv-run">重新计算</button></div>' +
      '<div class="ia-big" id="fv-big">计算中…</div>' +
      '<div class="cv-stat" id="fv-stat"></div>' +
      '<div class="cv-note">计算基于单一惯用晶胞：把晶胞内所有原子的范德华球视为一个<b>并集</b>（周期性最小像；相邻原子球的重叠区域只计一次），再用体素网格统计未被占据的空间。绿色半透明曲面是自由区域的等值面；<b>体积数值始终按 s=0 统计</b>，探针半径只影响轮廓显示。注意：占比（如 29.5%）指<b>全部</b>空隙体积（s&gt;0 的体素）；绿色轮廓是探针半径 X Å 下的「可及空隙核心」等值面，只包裹足够大的空隙，显示范围会小于全部空隙——属正常物理表现，不改变占比数值。「自动」优先显示充实的空隙口袋，若结构太致密没有可及空隙则自动回退到全部自由区；手动选大半径可能不显示轮廓（表示没有这么大的空隙）。已自动把显示范围强制设为「仅晶胞内部（含边界）」。</div>';
    openFloatPanel('freevol','自由体积占比 · 并集体积',html,
      function(){ post({type:'feature',name:'freevol',data:{on:false}}); },
      '关闭面板（同时隐藏三维轮廓）');
    setTimeout(function(){
      function statHtml(res){
        return '晶胞体积 V = <b>'+csFmt(res.Vcell,2)+'</b> Å³<br>'+
          '范德华球并集占据体积 = <b>'+csFmt(res.occ,2)+'</b> Å³<br>'+
          '自由体积 = <b>'+csFmt(res.free,2)+'</b> Å³<br>'+
          '唯一位点 '+res.nAtoms+' 个 · 网格 '+res.N.join('×')+'（步长 '+csFmt(res.step,2)+' Å）<br>'+
          '三维轮廓 '+Math.round(res.tris.length/3)+' 个三角形 · 探针半径 '+
          (res.isoAuto?'自动（实取 ':'')+csFmt(res.iso||0,1)+' Å'+(res.isoAuto?'）':'')+
          (res.isoAuto&&res.iso===0?'，该结构无可及空隙，已回退到全部自由区':'')+
          (res.overflow?'（已截断）':'');
      }
      function run(){
        var big=document.getElementById('fv-big');
        if(big) big.textContent='正在计算并生成三维轮廓…';
        var step=0.35;   // 网格步长固定 0.35 Å（用户不可改）
        var isoEl=document.getElementById('fv-iso');
        var iso=isoEl ? isoEl.value : 'auto';
        // 先让浏览器绘制「计算中」再进入同步数值计算
        setTimeout(function(){
          var res=csFreeVolume(kd,step,iso);
          if(res.error){ if(big) big.textContent=res.error; toast(res.error,true); return; }
          FREEVOL_STATE.res=res; FREEVOL_STATE.step=step;
          var onEl=document.getElementById('fv-on'), show=!!(onEl&&onEl.checked);
          var opEl=document.getElementById('fv-op'), op=parseFloat(opEl?opEl.value:'0.3')||0.3;
          csPostFreeVol(res,show,op);
          if(big) big.innerHTML='自由体积占比 = <b>'+csFmt(res.frac*100,1)+' %</b>';
          var stat=document.getElementById('fv-stat'); if(stat) stat.innerHTML=statHtml(res);
        },20);
      }
      // 只换探针半径时复用已算好的标量场，秒级刷新轮廓（体积数值不变）
      function refreshIso(){
        var r=FREEVOL_STATE.res; if(!r) return;
        var isoEl=document.getElementById('fv-iso');
        var want=isoEl ? isoEl.value : 'auto';
        var m=csPickIsoMesh(r,want);
        r.verts=m.verts; r.tris=m.tris; r.overflow=m.overflow;
        r.iso=m.iso; r.isoAuto=m.auto;
        var onEl=document.getElementById('fv-on'), show=!!(onEl&&onEl.checked);
        var opEl=document.getElementById('fv-op'), op=parseFloat(opEl?opEl.value:'0.3')||0.3;
        csPostFreeVol(r,show,op);
        var stat=document.getElementById('fv-stat'); if(stat) stat.innerHTML=statHtml(r);
      }
      var runBtn=document.getElementById('fv-run'); if(runBtn) runBtn.addEventListener('click',run);
      var isoSel=document.getElementById('fv-iso'); if(isoSel) isoSel.addEventListener('change',refreshIso);
      var onChk=document.getElementById('fv-on'); if(onChk) onChk.addEventListener('change',function(){
        post({type:'feature',name:'freevol',data:{on:onChk.checked}});
      });
      var opR=document.getElementById('fv-op'); if(opR) opR.addEventListener('input',function(){
        var v=document.getElementById('fv-op-v'); if(v) v.textContent=(+opR.value).toFixed(2);
        post({type:'feature',name:'freevol',data:{opacity:+opR.value}});
      });
      run();
    },30);
  }

  // ---------- 配位多面体（3D 叠加层，覆盖在球棍主结构之上）----------
  // 内核侧由 __cviz.setFeature('polyhedron') 驱动 cvBuildPoly()，默认关闭、不改球棍渲染路径；
  // 与 ORTEP / 晶习 / 自由体积等叠加层互斥。配体球与键由底层球棍模型绘制，故始终完整可见。
  var POLY_STATE = {
    on: true,
    buildMode: 'cluster', includeMetal: true, mmCut: 3.6, coordTol: 0.4,
    closeDegenerate: true,
    faceColorMode: 'single', faceColor: '#2ec4cf', opacity: 0.50, emissive: 0.22,
    showEdges: true, edgeColor: '#ffffff', edgeR: 0.055,
    showTriangulation: false,
    showVerts: true, vertR: 0.30, vertColorMode: 'element', vertColor: '#e8443c',
    showCenter: true, centerR: 0.38,
    showBonds: false, bondR: 0.04, bondColor: '#e6f0fb'
  };
  function openPolyhedron() {
    csExclusiveFeature('polyhedron');
    var html = '<div class="cv-chks">' +
      '<label class="cv-chk"><input type="checkbox" id="pl-on" checked> 显示配位多面体</label>' +
      '<label class="cv-chk"><input type="checkbox" id="pl-edges" checked> 显示棱线</label>' +
      '<label class="cv-chk"><input type="checkbox" id="pl-tri"> 显示三角剖分线（密集白线）</label>' +
      '<label class="cv-chk"><input type="checkbox" id="pl-verts" checked> 显示顶点（配体）原子</label>' +
      '<label class="cv-chk"><input type="checkbox" id="pl-center" checked> 显示金属球</label>' +
      '<label class="cv-chk"><input type="checkbox" id="pl-bonds"> 补画金属—配体键</label></div>' +
      '<div class="cv-sec">几何（决定是否为封闭多面体）</div>' +
      '<div class="cv-row"><label>构建方式</label><select id="pl-mode">' +
        '<option value="cluster" selected>金属簇合并（推荐 · 封闭笼）</option>' +
        '<option value="center">每个金属中心单独</option></select></div>' +
      '<label class="cv-chk"><input type="checkbox" id="pl-metal" checked> 邻近金属并入顶点（消除平面配位扁片）</label>' +
      '<div class="cv-row"><label>金属邻接阈值 (Å)</label><input type="range" id="pl-mmcut" min="2.0" max="5.0" step="0.1" value="3.6"><span class="cv-val" id="pl-mmcut-v">3.6</span></div>' +
      '<div class="cv-row"><label>配位判定容差 (Å)</label><input type="range" id="pl-tol" min="0.2" max="1.0" step="0.05" value="0.40"><span class="cv-val" id="pl-tol-v">0.40</span></div>' +
      '<label class="cv-chk"><input type="checkbox" id="pl-close" checked> 共面配位自动封闭（补双锥顶点）</label>' +
      '<div class="cv-sec">面</div>' +
      '<div class="cv-row"><label>面颜色</label><select id="pl-facemode">' +
        '<option value="single" selected>单色（青绿）</option>' +
        '<option value="element">按金属元素色</option></select></div>' +
      '<div class="cv-row" id="pl-facecolor-row"><label>单色面颜色</label><input type="color" id="pl-facecolor" value="#2ec4cf"></div>' +
      '<div class="cv-row"><label>面透明度</label><input type="range" id="pl-op" min="0.08" max="0.90" step="0.02" value="0.50"><span class="cv-val" id="pl-op-v">0.50</span></div>' +
      '<div class="cv-row"><label>面自发光（暗底提亮）</label><input type="range" id="pl-em" min="0" max="0.60" step="0.02" value="0.22"><span class="cv-val" id="pl-em-v">0.22</span></div>' +
      '<div class="cv-sec">棱线</div>' +
      '<div class="cv-row"><label>棱线颜色</label><input type="color" id="pl-edgecolor" value="#ffffff"></div>' +
      '<div class="cv-row"><label>棱线半径 (Å)</label><input type="range" id="pl-edger" min="0.01" max="0.15" step="0.005" value="0.055"><span class="cv-val" id="pl-edger-v">0.055</span></div>' +
      '<div class="cv-sec">顶点 / 金属球</div>' +
      '<div class="cv-row"><label>顶点球半径比例</label><input type="range" id="pl-vertr" min="0.10" max="0.60" step="0.02" value="0.30"><span class="cv-val" id="pl-vertr-v">0.30</span></div>' +
      '<div class="cv-row"><label>顶点球颜色</label><select id="pl-vertmode">' +
        '<option value="element" selected>按元素色（O 红 / C 灰…）</option>' +
        '<option value="single">统一颜色</option></select></div>' +
      '<div class="cv-row" id="pl-vertcolor-row" style="display:none"><label>顶点球统一色</label><input type="color" id="pl-vertcolor" value="#e8443c"></div>' +
      '<div class="cv-row"><label>金属球半径比例</label><input type="range" id="pl-centerr" min="0.10" max="0.70" step="0.02" value="0.38"><span class="cv-val" id="pl-centerr-v">0.38</span></div>' +
      '<div class="cv-sec">金属—配体键（补画）</div>' +
      '<div class="cv-row"><label>键颜色</label><input type="color" id="pl-bondcolor" value="#e6f0fb"></div>' +
      '<div class="cv-row"><label>键半径 (Å)</label><input type="range" id="pl-bondr" min="0.02" max="0.16" step="0.01" value="0.04"><span class="cv-val" id="pl-bondr-v">0.04</span></div>' +
      '<div class="cv-stat" id="pl-stat"></div>' +
      '<div class="cv-note">默认按「金属簇」构建：M–M 邻接的金属合并为一个多面体，顶点取簇内金属及其第一配位壳层配体，因此得到封闭立体（方平面配位如 Cu-BTC 桨轮不再是扁平方片）。共面点集会自动补双锥顶点强制封闭。多面体叠加在当前渲染风格之上，底层球棍始终显示，故配体球与键完整可见；与 ORTEP / 晶习 / 自由体积互斥。</div>';
    openFloatPanel('polyhedron', '配位多面体 · 3D', html,
      function () { post({ type: 'feature', name: 'polyhedron', data: { on: false } }); },
      '关闭面板（同时隐藏三维多面体）');
    setTimeout(function () {
      function sync() {
        var st = POLY_STATE, g = function (id) { return document.getElementById(id); };
        var num = function (id, d) { var v = parseFloat((g(id) || {}).value); return isFinite(v) ? v : d; };
        var col = function (id, d) { return (g(id) || {}).value || d; };
        var chk = function (id) { return !!(g(id) || {}).checked; };
        st.on = chk('pl-on');
        st.buildMode = col('pl-mode', 'cluster');
        st.includeMetal = chk('pl-metal');
        st.mmCut = num('pl-mmcut', 3.6);
        st.coordTol = num('pl-tol', 0.4);
        st.closeDegenerate = chk('pl-close');
        st.faceColorMode = col('pl-facemode', 'single');
        st.faceColor = col('pl-facecolor', '#2ec4cf');
        st.opacity = num('pl-op', 0.50);
        st.emissive = num('pl-em', 0.22);
        st.showEdges = chk('pl-edges');
        st.edgeColor = col('pl-edgecolor', '#ffffff');
        st.edgeR = num('pl-edger', 0.055);
        st.showTriangulation = chk('pl-tri');
        st.showVerts = chk('pl-verts');
        st.vertR = num('pl-vertr', 0.30);
        st.vertColorMode = col('pl-vertmode', 'element');
        st.vertColor = col('pl-vertcolor', '#e8443c');
        st.showCenter = chk('pl-center');
        st.centerR = num('pl-centerr', 0.38);
        st.showBonds = chk('pl-bonds');
        st.bondColor = col('pl-bondcolor', '#e6f0fb');
        st.bondR = num('pl-bondr', 0.04);
        if (g('pl-facecolor-row')) g('pl-facecolor-row').style.display = (st.faceColorMode === 'single') ? '' : 'none';
        if (g('pl-vertcolor-row')) g('pl-vertcolor-row').style.display = (st.vertColorMode === 'single') ? '' : 'none';
        var vals = { 'pl-op-v': st.opacity.toFixed(2), 'pl-em-v': st.emissive.toFixed(2),
          'pl-edger-v': st.edgeR.toFixed(3),
          'pl-vertr-v': st.vertR.toFixed(2), 'pl-centerr-v': st.centerR.toFixed(2),
          'pl-bondr-v': st.bondR.toFixed(2), 'pl-mmcut-v': st.mmCut.toFixed(1),
          'pl-tol-v': st.coordTol.toFixed(2) };
        Object.keys(vals).forEach(function (id) { if (g(id)) g(id).textContent = vals[id]; });
        post({ type: 'feature', name: 'polyhedron', data: {
          on: st.on, buildMode: st.buildMode, includeMetal: st.includeMetal,
          mmCut: st.mmCut, coordTol: st.coordTol, closeDegenerate: st.closeDegenerate,
          faceColorMode: st.faceColorMode, faceColor: st.faceColor,
          opacity: st.opacity, emissive: st.emissive,
          showEdges: st.showEdges, edgeColor: st.edgeColor, edgeR: st.edgeR,
          showTriangulation: st.showTriangulation,
          showVerts: st.showVerts, vertR: st.vertR,
          vertColorMode: st.vertColorMode, vertColor: st.vertColor,
          showCenter: st.showCenter, centerR: st.centerR,
          showBonds: st.showBonds, bondColor: st.bondColor, bondR: st.bondR } });
        var stat = g('pl-stat');
        if (stat) stat.innerHTML = st.on
          ? '配位多面体：已开启 · ' + (st.buildMode === 'cluster' ? '金属簇模式（封闭立体）' : '单金属中心模式') + ' · 叠加在球棍模型之上'
          : '配位多面体：已关闭';
      }
      // 滑块 / 取色器为连续输入：防抖 120 ms，避免大结构拖动时反复重建全部多面体；
      // 复选框与下拉（离散操作）立即生效。
      var syncTimer = null;
      function queueSync() { clearTimeout(syncTimer); syncTimer = setTimeout(sync, 120); }
      ['pl-on', 'pl-edges', 'pl-tri', 'pl-verts', 'pl-center', 'pl-bonds',
       'pl-mode', 'pl-metal', 'pl-mmcut', 'pl-tol', 'pl-close',
       'pl-facemode', 'pl-facecolor', 'pl-op', 'pl-em', 'pl-edgecolor', 'pl-edger',
       'pl-vertr', 'pl-vertmode', 'pl-vertcolor', 'pl-centerr',
       'pl-bondcolor', 'pl-bondr'].forEach(function (id) {
        var e = document.getElementById(id);
        if (!e) return;
        var continuous = (e.type === 'range' || e.type === 'color');
        e.addEventListener(continuous ? 'input' : 'change', continuous ? queueSync : sync);
      });
      sync();
    }, 30);
  }

  var MULTI_COLORS = ['#e8830c','#2e9e4f','#9b3fd1','#c2362f','#1f8fa6'];
  function csDrawPXRDMulti(canvas, res, expList) {
    if (!canvas) return;
    var W=900, H=460; canvas.width=W; canvas.height=H;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H);
    var tmax = (res.spectrum.xs[res.spectrum.xs.length-1]) || 60;
    var ymax = Math.max.apply(null, res.spectrum.ys);
    expList.forEach(function (e) { var m = Math.max.apply(null, e.ys); if (m > ymax) ymax = m; });
    ymax = (ymax*1.05) || 1;
    var padL=50, padR=120, padT=18, padB=40;
    var px = function (t) { return padL + (t/tmax)*(W-padL-padR); };
    var py = function (v) { return H-padB - (v/ymax)*(H-padT-padB); };
    ctx.strokeStyle='#e3e8ef'; ctx.lineWidth=1; ctx.fillStyle='#5a6675'; ctx.font='11px "HarmonyOS Sans SC", sans-serif';
    for (var g=0; g<=tmax+0.001; g+=10) { var x=px(g); ctx.beginPath(); ctx.moveTo(x,padT); ctx.lineTo(x,H-padB); ctx.stroke(); ctx.fillText(g+'°', x-8, H-padB+16); }
    function series(xs, ys) { var a=[]; for (var i=0;i<xs.length;i++) a.push({x:xs[i], y:ys[i]}); return a; }
    function poly(arr, color) {
      ctx.beginPath();
      for (var i=0;i<arr.length;i++) { var x=px(arr[i].x), y=py(arr[i].y); if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }
      ctx.strokeStyle=color; ctx.lineWidth=1.6; ctx.stroke();
    }
    ctx.fillStyle='rgba(31,111,235,0.12)';
    (function(){ var a=series(res.spectrum.xs, res.spectrum.ys); ctx.beginPath(); for (var i=0;i<a.length;i++){ var x=px(a[i].x), y=py(a[i].y); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);} ctx.lineTo(px(a[a.length-1].x), py(0)); ctx.lineTo(px(a[0].x), py(0)); ctx.closePath(); ctx.fill(); })();
    poly(series(res.spectrum.xs, res.spectrum.ys), '#1f6feb');
    expList.forEach(function (e, i) {
      var col = MULTI_COLORS[i % MULTI_COLORS.length];
      ctx.strokeStyle=col; ctx.lineWidth=1.6; ctx.beginPath();
      for (var j=0;j<e.xs.length;j++) { var x=px(e.xs[j]), y=py(e.ys[j]); if (j===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }
      ctx.stroke();
      ctx.fillStyle=col; for (var k=0;k<e.xs.length;k+=Math.max(1,Math.floor(e.xs.length/140))) { ctx.beginPath(); ctx.arc(px(e.xs[k]),py(e.ys[k]),1.6,0,2*Math.PI); ctx.fill(); }
    });
    ctx.fillStyle='#1f6feb'; ctx.fillText('■ 模拟', W-padR+8, padT+6);
    expList.forEach(function (e, i) { ctx.fillStyle=MULTI_COLORS[i % MULTI_COLORS.length]; ctx.fillText('■ '+String(e.name).slice(0,12), W-padR+8, padT+22+i*16); });
  }
  function openPXRDMulti() {
    var kd = csGetKernelData();
    if (!kd) { openModal('多 PXRD 对比', '<p class="tool-soon">渲染内核尚未就绪，请稍候再试。</p>'); return; }
    var html = '<div class="pxrd-card sim"><div class="pxrd-card-h">模拟参数 <span class="tag">Simulation</span></div>' +
      '<div class="pxrd-summary"><b>'+(kd.structure||'当前结构')+'</b></div>' +
      '<div class="pxrd-controls"><label>2θ 上限<input type="number" id="pxrdm-tmax" value="60" min="10" max="150" step="5"></label>' +
      '<label>峰宽 FWHM<input type="number" id="pxrdm-fwhm" value="0.15" min="0.02" max="2" step="0.01"></label>' +
      '<label class="pxrd-inline"><input type="checkbox" id="pxrdm-lp" checked> Lorentz–偏振</label>' +
      '<button id="pxrdm-calc" class="pp-btn primary">计算 / 刷新</button></div>' +
      '<canvas id="pxrdm-canvas" class="pxrd-canvas"></canvas></div>' +
      '<div class="pxrd-card exp"><div class="pxrd-card-h">多组实验谱对比 <span class="tag">多谱叠加对比</span></div>' +
      '<div class="pxrd-controls pxrd-exp"><button id="pxrdm-imp" class="pp-btn">导入实验谱（可多选）</button>' +
      '<input type="file" id="pxrdm-file" accept=".xy,.xye,.csv,.txt,.dat,.raw" multiple hidden></div>' +
      '<div id="pxrdm-list" class="pxrd-expname"></div>' +
      '<div class="pxrd-table-wrap"><table id="pxrdm-table" class="pxrd-table"></table></div>' +
      '<p class="ia-note">白底多谱叠加对比：模拟谱蓝色曲线，多组实验谱以不同颜色叠加。导入 .xy/.xye/.csv/.txt 文本谱；仪器二进制 .raw 暂不支持（会提示）。</p></div>';
    openModal('多 PXRD 对比', html);
    var expList = [];
    function draw() {
      var tmax = parseFloat(document.getElementById('pxrdm-tmax').value)||60;
      var fwhm = parseFloat(document.getElementById('pxrdm-fwhm').value)||0.15;
      // 多谱对比沿用旧标度（0–100、0° 起），不随主模拟界面的新默认值变化
      var params = { lambda:PXRD_PRESETS.Cu.alpha1, alpha1:PXRD_PRESETS.Cu.alpha1, alpha2:PXRD_PRESETS.Cu.alpha2, alpha2ratio:PXRD_PRESETS.Cu.alpha2ratio, ka12:true,
        ttwoMin:0, iMax:100, ttwoMax:tmax, fwhm:fwhm,
        lp:document.getElementById('pxrdm-lp').checked, step:0.02, eta:0.5 };
      var res = csComputePXRD(kd, params);
      var canvas = document.getElementById('pxrdm-canvas');
      if (res.error) { toast(res.error, true); if (canvas) canvas.style.display='none'; return; }
      if (canvas) canvas.style.display='';
      csDrawPXRDMulti(canvas, res, expList);
      var rows='<tr class="ia-head"><th>谱</th><th>2θ 范围</th><th>最大强度</th></tr>';
      rows += '<tr><td><span style="color:#1f6feb">■</span> 模拟</td><td>0–'+csFmt(tmax,1)+'</td><td>'+csFmt(Math.max.apply(null,res.spectrum.ys),1)+'</td></tr>';
      expList.forEach(function (e, i) { rows += '<tr><td><span style="color:'+MULTI_COLORS[i%MULTI_COLORS.length]+'">■</span> '+e.name+'</td><td>'+csFmt(e.xs[0],1)+'–'+csFmt(e.xs[e.xs.length-1],1)+'</td><td>'+csFmt(Math.max.apply(null,e.ys),1)+'</td></tr>'; });
      document.getElementById('pxrdm-table').innerHTML = rows;
    }
    document.getElementById('pxrdm-calc').addEventListener('click', draw);
    document.getElementById('pxrdm-imp').addEventListener('click', function () { document.getElementById('pxrdm-file').click(); });
    document.getElementById('pxrdm-file').addEventListener('change', function (e) {
      Array.prototype.slice.call(e.target.files||[]).forEach(function (f) {
        var rd = new FileReader();
        rd.onload = function () { var r = csParseExpXY(rd.result, f.name); if (r.error) { toast(f.name+': '+r.error, true); return; } expList.push(r); document.getElementById('pxrdm-list').textContent = '已载入 '+expList.length+' 组：' + expList.map(function (x){return x.name;}).join('、'); draw(); };
        rd.readAsText(f);
      });
      e.target.value='';
    });
    draw();
  }

  // ---------- 最小 XLSX 生成器（纯前端 / 零依赖 / 离线可用） ----------
  // .xlsx = ZIP(Store) 容器 + SpreadsheetML XML。手写 ZIP 是为了不引入 SheetJS 等
  // 外部库；保存复用桌面端 save_png 的通用 base64 写盘通道，Python 侧会按后缀
  // 生成合法的 "XLSX table (*.xlsx)" 文件过滤器，因此无需改动桌面端代码。
  var CRC32_TABLE = (function () {
    var t = new Uint32Array(256), n, k, c;
    for (n = 0; n < 256; n++) {
      c = n;
      for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function csCrc32(u8) {
    var c = 0xFFFFFFFF, i;
    for (i = 0; i < u8.length; i++) c = CRC32_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function csUtf8Bytes(s) { return new TextEncoder().encode(s); }
  function csZipStore(files) {
    var chunks = [], central = [], offset = 0, cdSize = 0;
    function w16(a, v) { a.push(v & 255, (v >>> 8) & 255); }
    function w32(a, v) { a.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255); }
    files.forEach(function (f) {
      var name = csUtf8Bytes(f.name), data = f.data, crc = csCrc32(data), loc = [], cd = [];
      // Local file header（30 字节）：压缩方式 0 = Store，文件名按 UTF-8（flag bit 11）
      w32(loc, 0x04034b50); w16(loc, 20); w16(loc, 0x0800); w16(loc, 0);
      w16(loc, 0); w16(loc, 33);  // DOS 时间 00:00 / 日期 1980-01-01
      w32(loc, crc); w32(loc, data.length); w32(loc, data.length);
      w16(loc, name.length); w16(loc, 0);
      var head = new Uint8Array(loc);
      chunks.push(head, name, data);
      // Central directory header（46 字节 + 文件名）
      w32(cd, 0x02014b50); w16(cd, 20); w16(cd, 20); w16(cd, 0x0800); w16(cd, 0);
      w16(cd, 0); w16(cd, 33);
      w32(cd, crc); w32(cd, data.length); w32(cd, data.length);
      w16(cd, name.length); w16(cd, 0); w16(cd, 0); w16(cd, 0); w16(cd, 0); w32(cd, 0);
      w32(cd, offset);
      central.push(new Uint8Array(cd), name);
      offset += head.length + name.length + data.length;
    });
    central.forEach(function (b) { cdSize += b.length; });
    var eocd = [];
    w32(eocd, 0x06054b50); w16(eocd, 0); w16(eocd, 0);
    w16(eocd, files.length); w16(eocd, files.length);
    w32(eocd, cdSize); w32(eocd, offset); w16(eocd, 0);
    var end = new Uint8Array(eocd), out = new Uint8Array(offset + cdSize + end.length), pos = 0;
    chunks.concat(central, [end]).forEach(function (b) { out.set(b, pos); pos += b.length; });
    return out;
  }
  function csXmlEsc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }
  function csColName(n) {
    var s = '';
    while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
    return s;
  }
  function csXlsxSheetXml(rows, headRow, nCols) {
    var X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    var out = X + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<dimension ref="A1:' + csColName(nCols) + rows.length + '"/>' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="' + (headRow + 1) +
        '" topLeftCell="A' + (headRow + 2) + '" activePane="bottomLeft" state="frozen"/>' +
      '</sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/><cols>' +
      '<col min="1" max="1" width="14" customWidth="1"/>' +
      '<col min="2" max="2" width="16" customWidth="1"/>' +
      (nCols > 2 ? '<col min="3" max="3" width="14" customWidth="1"/>' : '') +
      '</cols><sheetData>';
    rows.forEach(function (row, ri) {
      out += '<row r="' + (ri + 1) + '">';
      row.forEach(function (v, ci) {
        if (v === null || v === undefined || v === '') return;
        var ref = csColName(ci + 1) + (ri + 1), style = (ri === headRow) ? ' s="1"' : '';
        if (typeof v === 'number' && isFinite(v)) out += '<c r="' + ref + '"><v>' + v + '</v></c>';
        else out += '<c r="' + ref + '" t="inlineStr"' + style + '><is><t xml:space="preserve">' + csXmlEsc(v) + '</t></is></c>';
      });
      out += '</row>';
    });
    return out + '</sheetData></worksheet>';
  }
  function csXYSigma(data) {
    return !!(data && data.sig && data.sig.some(function (v) {
      return v !== null && v !== undefined && isFinite(v);
    }));
  }
  /* 把解析后的实验谱（{name,xs,ys,sig}）转成真正可被 Excel / WPS 打开的 .xlsx 字节流。
     keepHeader=true 时首行写 "# 原文件名"（与 .txt/.CSV 的「保留表头注释行」一致）。 */
  function csXlsxFromXY(data, keepHeader) {
    var hasSig = csXYSigma(data), rows = [], i;
    if (keepHeader) rows.push(['# ' + data.name]);
    var headRow = rows.length;
    rows.push(hasSig ? ['2θ (°)', 'Intensity', 'Sigma (σ)'] : ['2θ (°)', 'Intensity']);
    for (i = 0; i < data.xs.length; i++) {
      var r = [Number(data.xs[i].toFixed(4)), Number(data.ys[i].toFixed(2))];
      if (hasSig) {
        var sv = data.sig[i];
        r.push(sv === null || sv === undefined || !isFinite(sv) ? null : Number(sv.toFixed(2)));
      }
      rows.push(r);
    }
    var X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    var MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    var REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    var PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
    function part(name, xml) { return { name: name, data: csUtf8Bytes(X + xml) }; }
    return csZipStore([
      part('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>'),
      part('_rels/.rels', '<Relationships xmlns="' + PKG + '">' +
        '<Relationship Id="rId1" Type="' + REL + '/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>'),
      part('xl/workbook.xml', '<workbook xmlns="' + MAIN + '" xmlns:r="' + REL + '">' +
        '<sheets><sheet name="PXRD" sheetId="1" r:id="rId1"/></sheets></workbook>'),
      part('xl/_rels/workbook.xml.rels', '<Relationships xmlns="' + PKG + '">' +
        '<Relationship Id="rId1" Type="' + REL + '/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="' + REL + '/styles" Target="styles.xml"/>' +
        '</Relationships>'),
      part('xl/styles.xml', '<styleSheet xmlns="' + MAIN + '">' +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
        '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="2"><fill><patternFill patternType="none"/></fill>' +
        '<fill><patternFill patternType="gray125"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
        '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
        '</styleSheet>'),
      { name: 'xl/worksheets/sheet1.xml',
        data: csUtf8Bytes(csXlsxSheetXml(rows, headRow, hasSig ? 3 : 2)) }
    ]);
  }
  function csBytesToDataUrl(bytes, mime) {
    var bin = '', CH = 0x8000, i;
    for (i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return 'data:' + (mime || 'application/octet-stream') + ';base64,' + btoa(bin);
  }
  /* 通用二进制保存：桌面端走 save_png（实际是任意 base64 写盘），浏览器降级 Blob。 */
  function csSaveBinary(bytes, name, mime) {
    mime = mime || 'application/octet-stream';
    var a = api();
    if (a && a.save_png) {
      Promise.resolve(a.save_png(csBytesToDataUrl(bytes, mime), name)).then(function (r) {
        csSaveFeedback(r, name);
      }, function (e) { csSaveFeedback({ ok: false, error: String(e) }, name); });
      return;
    }
    var blob = new Blob([bytes], { type: mime }), l = document.createElement('a');
    l.href = URL.createObjectURL(blob); l.download = name; l.click();
    setTimeout(function () { URL.revokeObjectURL(l.href); }, 1000);
    toast('已导出 ' + name);
  }

  function openPXRDConvert() {
    var html = '<div class="pxrd-card exp"><div class="pxrd-card-h">PXRD 格式转换 <span class="tag">厂商格式 → .txt / .CSV / .xlsx</span></div>' +
      '<div class="pxrd-controls pxrd-exp"><button id="pxconv-imp" class="pp-btn">选择实验谱文件…</button>' +
      '<span id="pxconv-name" class="pxrd-expname"></span><input type="file" id="pxconv-file" accept=".xy,.xye,.csv,.txt,.dat,.raw" hidden></div>' +
      '<label class="pp-check"><input type="checkbox" id="pxconv-head" checked> 保留表头注释行</label>' +
      '<div class="pxrd-controls pxconv-actions"><button id="pxconv-txt" class="pp-btn">导出 .txt</button><button id="pxconv-csv" class="pp-btn">导出 .CSV</button><button id="pxconv-xlsx" class="pp-btn primary">导出 .xlsx</button></div>' +
      '<div class="pxrd-table-wrap"><pre id="pxconv-preview" class="pxrd-preview" style="white-space:pre;font-size:12px"></pre></div>' +
      '<p class="ia-note">将厂商 / GSAS 等格式实验谱（2θ, 强度[, σ]）统一转换为纯文本、CSV 或 Excel 工作簿。当前支持 .txt / .CSV / .xlsx 导出：.xlsx 是含「2θ / 强度 / σ」多列数值的真正工作簿，可直接用 Excel、WPS 打开绘图；勾选「保留表头注释行」时会在首行写入原文件名。输入侧仍为文本谱（仪器二进制 .raw 暂不支持）。</p></div>';
    openModal('PXRD 格式转换', html);
    var cur=null;
    function buildText(csv) {
      if (!cur) return '';
      var lines = [], hasSig = csXYSigma(cur);
      if (document.getElementById('pxconv-head').checked) lines.push('# ' + cur.name);
      for (var i=0;i<cur.xs.length;i++) {
        var row = cur.xs[i].toFixed(4) + (csv ? ',' : '\t') + cur.ys[i].toFixed(2);
        // 两列谱的 sig 全是 null，早期这里直接 null.toFixed 会抛异常，导致预览与导出都失败
        var sv = hasSig ? cur.sig[i] : null;
        if (sv !== null && sv !== undefined && isFinite(sv)) row += (csv ? ',' : '\t') + sv.toFixed(2);
        lines.push(row);
      }
      return lines.join('\n');
    }
    document.getElementById('pxconv-imp').addEventListener('click', function () { document.getElementById('pxconv-file').click(); });
    document.getElementById('pxconv-file').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { var r = csParseExpXY(rd.result, f.name); if (r.error) { toast(r.error, true); return; } cur = r; document.getElementById('pxconv-name').textContent='✓ '+f.name; document.getElementById('pxconv-preview').textContent = buildText(false).slice(0,4000); };
      rd.readAsText(f); e.target.value='';
    });
    document.getElementById('pxconv-txt').addEventListener('click', function () { if(!cur){ toast('请先选择文件', true); return; } saveTextFile(buildText(false), cur.name.replace(/\.[^.]+$/, '') + '.txt'); });
    document.getElementById('pxconv-csv').addEventListener('click', function () { if(!cur){ toast('请先选择文件', true); return; } saveTextFile(buildText(true), cur.name.replace(/\.[^.]+$/, '') + '.csv'); });
    document.getElementById('pxconv-xlsx').addEventListener('click', function () {
      if(!cur){ toast('请先选择文件', true); return; }
      var keep = document.getElementById('pxconv-head').checked;
      var bytes = csXlsxFromXY(cur, keep);
      csSaveBinary(bytes, cur.name.replace(/\.[^.]+$/, '') + '.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  }

  // ---------- 三维叠加层（ORTEP 热椭球 / (hkl) 晶面切片）----------
  // 内核侧由 __cviz.setFeature() 驱动独立的 overlayGroup，默认关闭、不改球棍渲染路径。
  function csORTEP3DData(parsed){
    return parsed.atoms.filter(function(a){ return !!a.Ucart; }).map(function(a){
      var eg=csJacobi3(a.Ucart);
      return { label:a.label, el:a.el, frac:a.frac.slice(), val:eg.val.slice(),
               vec:eg.vec.map(function(r){ return r.slice(); }) };
    });
  }
  function csSyncORTEP3D(){
    var onEl=document.getElementById('o3-on'), on=onEl?onEl.checked:false;
    var parsed=lastCifText?csParseCif(lastCifText):{ok:false};
    // 保留分子范围选择：若「仅显示所选分子」已勾选，则同步 scope
    var scEl=document.getElementById('o3-scope'), scopeData={};
    if(scEl&&scEl.checked){ scopeData={ scopeMode:'selected', scope:csGetKernelPickMols() }; }
    if(parsed.ok&&parsed.atoms.length){
      post({type:'feature',name:'ortep',data:Object.assign({on:on,atoms:csORTEP3DData(parsed),prob:ORTEP_PROB}, scopeData)});
    }else{
      post({type:'feature',name:'ortep',data:{on:false,atoms:null}});
    }
  }
  function csPostSlice(data){ post({type:'feature',name:'slice',data:data}); }
  // 四类 3D 叠加互斥：打开任一浮动面板时关闭其余，避免红色切片平面 / 椭球 /
  // 晶习多面体 / 绿色自由轮廓互相遮挡（面板本身也互斥显示）。
  function csExclusiveFeature(active){
    ['ortep','slice','habit','freevol','polyhedron'].forEach(function(n){
      if(n!==active) post({type:'feature',name:n,data:{on:false}});
    });
  }
  function openFloatPanel(id,title,html,onClose,closeTip){
    Array.prototype.forEach.call(document.querySelectorAll('.cv-float'),function(p){
      if(p.id!=='cv-float-'+id){
        // 关闭 / 切换面板时，先触发被隐藏面板的 onClose（如 ORTEP 的「隐藏球棍模型」），
        // 避免面板被隐藏但内核叠加层状态（CV_ORTEP.on）未复位，导致关闭后该选项仍控制主视窗。
        if(p._onClose) p._onClose();
        p.style.display='none';
      }
    });
    var el=document.getElementById('cv-float-'+id);
    if(!el){
      el=document.createElement('div'); el.className='cv-float'; el.id='cv-float-'+id;
      el.innerHTML='<div class="cv-float-h"><b></b><button class="cv-float-x" title="'+(closeTip||'关闭面板')+'">×</button></div><div class="cv-float-b"></div>';
      document.body.appendChild(el);
      var head=el.querySelector('.cv-float-h'), drag=false, ox=0, oy=0;
      head.addEventListener('mousedown',function(e){
        if(e.target.classList.contains('cv-float-x')) return;
        drag=true; var r=el.getBoundingClientRect(); ox=e.clientX-r.left; oy=e.clientY-r.top;
        el.style.right='auto'; el.style.left=r.left+'px'; el.style.top=r.top+'px'; e.preventDefault();
      });
      window.addEventListener('mousemove',function(e){ if(!drag) return; el.style.left=(e.clientX-ox)+'px'; el.style.top=(e.clientY-oy)+'px'; });
      window.addEventListener('mouseup',function(){ drag=false; });
      el.querySelector('.cv-float-x').addEventListener('click',function(){ el.style.display='none'; if(el._onClose) el._onClose(); });
    }
    el.querySelector('.cv-float-h b').textContent=title;
    el.querySelector('.cv-float-b').innerHTML=html;
    el._onClose = onClose || null;
    el.style.display='block';
    return el;
  }

  // ============ ORTEP / 晶面与晶习 真实实现 ============
  var ORTEP_PROB = 0.90;
  var ORTEP_VIEW = { yaw: 0.7, pitch: 0.45, zoom: 1 };
  var ORTEP_ATOMS = null, ORTEP_CELL = null;

  var CS_ELCOL = {
  H:'#ffffff',C:'#222222',N:'#2244cc',O:'#dd2222',F:'#22dd22',Na:'#ab5cf2',
  Mg:'#2cae57',Al:'#bfa6a6',Si:'#f0c8a0',P:'#ff8000',S:'#e8d11a',Cl:'#1fd01f',
  K:'#8f40d4',Ca:'#3dff65',Fe:'#e06633',Br:'#a52a2a',I:'#9400d3',Zn:'#7d80b0',
  B:'#ffb5b5',Ti:'#bfc4c4',Mn:'#9c7ac7',Ni:'#517d7a',Cu:'#c88033',default:'#cfcfcf'
};
  function csNormEl(el){ var m=(el||'').match(/[A-Z][a-z]?/); return m?m[0]:'C'; }
  function csCellVecs(a,b,c,al,be,ga){ var ca=Math.cos(al*Math.PI/180),cb=Math.cos(be*Math.PI/180),cg=Math.cos(ga*Math.PI/180),sg=Math.sin(ga*Math.PI/180);
    var av=[a,0,0], bv=[b*cg,b*sg,0]; var cx=c*cb, cy=c*(ca-cb*cg)/sg, cz=Math.sqrt(Math.max(0,c*c-cx*cx-cy*cy)); return {a:av,b:bv,c:[cx,cy,cz]}; }
  function csFracToCart(f,vec){ return [vec.a[0]*f[0]+vec.b[0]*f[1]+vec.c[0]*f[2], vec.a[1]*f[0]+vec.b[1]*f[1]+vec.c[1]*f[2], vec.a[2]*f[0]+vec.b[2]*f[1]+vec.c[2]*f[2]]; }
  function csSymMul(A,B){ var C=[[0,0,0],[0,0,0],[0,0,0]]; for(var i=0;i<3;i++)for(var j=0;j<3;j++){var s=0;for(var k=0;k<3;k++)s+=A[i][k]*B[k][j];C[i][j]=s;} return C; }
  function csTp(A){ return [[A[0][0],A[1][0],A[2][0]],[A[0][1],A[1][1],A[2][1]],[A[0][2],A[1][2],A[2][2]]]; }
  function csUfracToCart(u,vec){
    // CIF 的 _atom_site_aniso_U_ij 以「沿晶胞轴方向的位移长度(Å)」为分量，本身已含轴长量纲；
    // 转到笛卡尔系只需用晶胞轴的**单位方向向量**做基变换，若直接用未归一化的 a/b/c
    // 会把轴长平方再乘一次（如 0.064 Å² 被放大到十几 Å²），椭球会大得离谱。
    var R=[[vec.a[0],vec.b[0],vec.c[0]],[vec.a[1],vec.b[1],vec.c[1]],[vec.a[2],vec.b[2],vec.c[2]]];
    for(var c=0;c<3;c++){ var L=Math.sqrt(R[0][c]*R[0][c]+R[1][c]*R[1][c]+R[2][c]*R[2][c])||1;
      for(var r=0;r<3;r++) R[r][c]/=L; }
    var Uf=[[u.U11,u.U12,u.U13],[u.U12,u.U22,u.U23],[u.U13,u.U23,u.U33]]; return csSymMul(csSymMul(R,Uf),csTp(R)); }
  // 数值稳定的对称 3×3 特征分解（Jacobi 旋转，NR 形式）。
  // 返回 { val:[λ0,λ1,λ2], vec:[[r0],[r1],[r2]] }，vec 的每一行是一个单位特征向量。
  // 注意：旧实现因旋转更新顺序（行列更新共用已被改写的元素）与角度符号不一致，
  // 既不能把矩阵对角化（特征向量错位），也无法正确服务 Kabsch/ORTEP，故整体替换。
  function csJacobi3(A){ var a=A.map(function(r){return r.slice();}); var v=[[1,0,0],[0,1,0],[0,0,1]];
    for(var sweep=0;sweep<60;sweep++){ var off=Math.abs(a[0][1])+Math.abs(a[0][2])+Math.abs(a[1][2]); if(off<1e-14) break;
      for(var p=0;p<3;p++) for(var q=p+1;q<3;q++){ if(Math.abs(a[p][q])<1e-18) continue;
        var app=a[p][p], aqq=a[q][q], apq=a[p][q];
        var theta=(aqq-app)/(2*apq);
        var t=(theta<0 ? -1/(-theta+Math.sqrt(theta*theta+1)) : 1/(theta+Math.sqrt(theta*theta+1)));
        var c=1/Math.sqrt(t*t+1), s=t*c, tau=s/(1+c);
        a[p][p]=app - t*apq; a[q][q]=aqq + t*apq; a[p][q]=0; a[q][p]=0;
        for(var i=0;i<3;i++){ if(i===p||i===q) continue;
          var aip=a[i][p], aiq=a[i][q];
          a[i][p]=aip - s*(aiq + tau*aip); a[i][q]=aiq + s*(aip - tau*aiq);
          a[p][i]=a[i][p]; a[q][i]=a[i][q]; }
        for(var i2=0;i2<3;i2++){ var vip=v[i2][p], viq=v[i2][q]; v[i2][p]=vip - s*(viq + tau*vip); v[i2][q]=viq + s*(vip - tau*viq); }
      } }
    return { val:[a[0][0],a[1][1],a[2][2]], vec:csTp(v) }; }
  function csRotMat(view){ var cy=Math.cos(view.yaw),sy=Math.sin(view.yaw),cp=Math.cos(view.pitch),sp=Math.sin(view.pitch);
    return [[cy,0,sy],[sp*sy,cp,-sp*cy],[-cp*sy,sp,cp*cy]]; }  // Rx(pitch)·Ry(yaw)
  function csRotV(v,m){ return [m[0][0]*v[0]+m[0][1]*v[1]+m[0][2]*v[2], m[1][0]*v[0]+m[1][1]*v[1]+m[1][2]*v[2], m[2][0]*v[0]+m[2][1]*v[1]+m[2][2]*v[2]]; }
  function csViewAlong(nv){ var n=csNorm3(nv); if(Math.abs(n[2])<1e-6) n[2]=(Math.abs(n[0])<1e-6)?1e-6:1e-6;
    var y=Math.atan2(-n[0], n[2]); var Azp=Math.sqrt(n[0]*n[0]+n[2]*n[2]); var p=Math.atan2(n[1], Azp); return {yaw:y,pitch:p,zoom:ORTEP_VIEW.zoom}; }
  function csNorm3(v){ var L=Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])||1; return [v[0]/L,v[1]/L,v[2]/L]; }

  function csParseCif(text){
    if (!text) return { ok:false, reason:'no-text' };
    var lines=text.split(/\r?\n/); var uc={}; var loops=[]; var cur=null; var inSemi=false;
    var single={'_cell_length_a':'a','_cell_length_b':'b','_cell_length_c':'c','_cell_angle_alpha':'al','_cell_angle_beta':'be','_cell_angle_gamma':'ga'};
    for(var i=0;i<lines.length;i++){
      var L=lines[i];
      if(inSemi){ if((L.trim()[0]===';')) inSemi=false; continue; }
      if(L.trim()[0]===';'){ inSemi=true; continue; }
      var ci=L.indexOf('#'); if(ci>=0) L=L.slice(0,ci); L=L.trim(); if(L==='') continue;
      if(L==='loop_'){ cur={keys:[],data:[]}; loops.push(cur); continue; }
      if(L[0]==='_'){ var hd=false; for(var k in single){ if(L.indexOf(k)===0){ var t=L.split(/\s+/); uc[single[k]]=parseFloat(t[1]); hd=true; } } if(hd) continue; if(cur) cur.keys.push(L); continue; }
      if(cur){ if(L[0]==='data_'||L[0]==='save_'||L.indexOf('global_')===0){ cur=null; continue; } cur.data.push(L.split(/\s+/)); }
    }
    if(uc.a==null||uc.b==null||uc.c==null||uc.al==null||uc.be==null||uc.ga==null) return { ok:false, reason:'no-cell' };
    var siteLoop=loops.find(function(l){return l.keys.indexOf('_atom_site_label')>=0 && l.keys.indexOf('_atom_site_fract_x')>=0;});
    // 各向异性位移参数（ADP）解析：标准 CIF 为独立 _atom_site_aniso 循环（含 _atom_site_aniso_label），
    // 但大量实际 .cif 会省略 label 字段、仅靠与 _atom_site 同行序对应；少数程序把 U/B 分量直接并入主循环。
    // 因此检测条件放宽到「含 U_11/U_22 或 B_11/B_22 对角分量」即可，并兼容「内嵌主循环」与「缺 label 同行序」两种情形。
    function csAnisoKeyMap(keys){
      var U11=keys.indexOf('_atom_site_aniso_U_11'),U22=keys.indexOf('_atom_site_aniso_U_22'),U33=keys.indexOf('_atom_site_aniso_U_33'),
          U12=keys.indexOf('_atom_site_aniso_U_12'),U13=keys.indexOf('_atom_site_aniso_U_13'),U23=keys.indexOf('_atom_site_aniso_U_23');
      if(U11>=0||U22>=0) return {kind:'U',i11:U11,i22:U22,i33:U33,i12:U12,i13:U13,i23:U23};
      var B11=keys.indexOf('_atom_site_aniso_B_11'),B22=keys.indexOf('_atom_site_aniso_B_22'),B33=keys.indexOf('_atom_site_aniso_B_33'),
          B12=keys.indexOf('_atom_site_aniso_B_12'),B13=keys.indexOf('_atom_site_aniso_B_13'),B23=keys.indexOf('_atom_site_aniso_B_23');
      if(B11>=0||B22>=0) return {kind:'B',i11:B11,i22:B22,i33:B33,i12:B12,i13:B13,i23:B23};
      return null;
    }
    function csReadAnisoRow(d,map){
      if(!map) return null; var kk=1/(8*Math.PI*Math.PI);
      function num(i){ return (i>=0 && d[i]!=null)?csNumTok(d[i]):NaN; }
      function num0(i){ return (i>=0 && d[i]!=null)?csNumTok(d[i]):0; }
      if(map.kind==='U'){ var a=num(map.i11),b=num(map.i22),c=num(map.i33); if(isNaN(a)||isNaN(b)||isNaN(c)) return null;
        return {U11:a,U22:b,U33:c,U12:num0(map.i12),U13:num0(map.i13),U23:num0(map.i23)}; }
      var a2=num(map.i11),b2=num(map.i22),c2=num(map.i33); if(isNaN(a2)||isNaN(b2)||isNaN(c2)) return null;
      return {U11:a2*kk,U22:b2*kk,U33:c2*kk,U12:num0(map.i12)*kk,U13:num0(map.i13)*kk,U23:num0(map.i23)*kk};
    }
    var sites=[], siteRows=[]; // siteRows：与主循环数据行对齐的有效原子 {dataIdx,label}
    var embedMap = siteLoop ? csAnisoKeyMap(siteLoop.keys) : null; // 主循环内嵌 U/B 分量
    if(siteLoop){
      var iL=siteLoop.keys.indexOf('_atom_site_label'), iS=siteLoop.keys.indexOf('_atom_site_type_symbol'),
          iFx=siteLoop.keys.indexOf('_atom_site_fract_x'), iFy=siteLoop.keys.indexOf('_atom_site_fract_y'), iFz=siteLoop.keys.indexOf('_atom_site_fract_z'),
          iU=siteLoop.keys.indexOf('_atom_site_U_iso_or_equiv'), iB=siteLoop.keys.indexOf('_atom_site_B_iso_or_equiv');
      siteLoop.data.forEach(function(d,di){
        if(d.length<=Math.max(iFx,iFy,iFz)) return;
        var fx=parseFloat(d[iFx]),fy=parseFloat(d[iFy]),fz=parseFloat(d[iFz]); if(isNaN(fx)||isNaN(fy)||isNaN(fz)) return;
        var sym=iS>=0?d[iS]:d[iL].replace(/[0-9].*/,'');
        var Biso=null; if(iB>=0&&!isNaN(parseFloat(d[iB]))) Biso=parseFloat(d[iB]); else if(iU>=0&&!isNaN(parseFloat(d[iU]))) Biso=parseFloat(d[iU])*8*Math.PI*Math.PI;
        var lab=(d[iL]||'').trim(); sites.push({label:lab, el:csNormEl(sym), frac:[fx,fy,fz], Biso:Biso}); siteRows.push({dataIdx:di,label:lab});
      });
    }
    var aniso={};
    // (a) 主循环内嵌的 U/B 分量：直接按同一行 label 关联（同一 loop，无需 label 字段）
    if(siteLoop && embedMap){ siteLoop.data.forEach(function(d){ var u=csReadAnisoRow(d,embedMap); if(u&&d[iL]!=null) aniso[(d[iL]||'').trim()]=u; }); }
    // (b) 独立 _atom_site_aniso 循环：优先按 _atom_site_aniso_label 关联；无 label 时按行序与有效 site 行对齐
    var anisoLoop=loops.find(function(l){ return l!==siteLoop && csAnisoKeyMap(l.keys)!=null; });
    if(anisoLoop){
      var am=csAnisoKeyMap(anisoLoop.keys), aL=anisoLoop.keys.indexOf('_atom_site_aniso_label');
      if(aL>=0){
        anisoLoop.data.forEach(function(d){ var u=csReadAnisoRow(d,am); if(u&&d[aL]!=null) aniso[(d[aL]||'').trim()]=u; });
      } else {
        for(var k=0;k<siteRows.length && k<anisoLoop.data.length;k++){
          var u2=csReadAnisoRow(anisoLoop.data[k],am); if(u2) aniso[siteRows[k].label]=u2; }
      }
    }
    if(!sites.length) return { ok:false, reason:'no-sites' };
    var cell=csCellVecs(uc.a,uc.b,uc.c,uc.al,uc.be,uc.ga);
    var atoms=sites.map(function(s){ var cart=csFracToCart(s.frac,cell); var Uc=null; if(aniso[s.label]) Uc=csUfracToCart(aniso[s.label],cell); return {label:s.label,el:s.el,frac:s.frac,cart:cart,Ucart:Uc,Biso:s.Biso}; });
    var hasAniso=atoms.some(function(a){return a.Ucart;});
    return { ok:true, atoms:atoms, cell:cell, uc:uc, hasAniso:hasAniso, nAniso:Object.keys(aniso).length };
  }
  function csDrawOrt(canvas, atoms, opts){
    var ctx=canvas.getContext('2d'); var W=canvas.width, H=canvas.height;
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H);
    if(!atoms||!atoms.length){ ctx.fillStyle='#888'; ctx.font='14px "HarmonyOS Sans SC", sans-serif'; ctx.fillText('无原子数据',16,24); return; }
    var view=opts.view, m=csRotMat(view), r2=-Math.log(1-opts.prob);
    var pts=atoms.map(function(a){ var r=csRotV(a.cart,m); return {a:a,r:r}; });
    var minx=1e9,maxx=-1e9,miny=1e9,maxy=-1e9,maxr=1e-6;
    pts.forEach(function(p){ maxr=Math.max(maxr,Math.hypot(p.a[0],p.a[1],p.a[2])); minx=Math.min(minx,p.r[0]);maxx=Math.max(maxx,p.r[0]);miny=Math.min(miny,p.r[1]);maxy=Math.max(maxy,p.r[1]); });
    var spanx=Math.max(1e-6,maxx-minx), spany=Math.max(1e-6,maxy-miny);
    var scale=Math.min((W*0.86)/spanx,(H*0.86)/spany)*opts.zoom; if(!isFinite(scale)||scale<=0) scale=20;
    var cx0=W/2 - scale*(minx+maxx)/2, cy0=H/2 + scale*(miny+maxy)/2;
    pts.sort(function(p,q){ return p.r[2]-q.r[2]; }); // 远→近
    function proj(p){ return [cx0+scale*p.r[0], cy0-scale*p.r[1], p.r[2]]; }
    pts.forEach(function(p){
      var P=proj(p), c0=P[0], c1=P[1], depth=P[2], el=p.a.el;
      var col=CS_ELCOL[el]||CS_ELCOL.default;
      var rn=Math.max(2.0, scale*csRadius(el,CS_COV)*0.42);
      var iso = !p.a.Ucart;
      var doEll = (!iso && opts.showEll);
      if(doEll){
        var eg=csJacobi3(p.a.Ucart); var semi=eg.val.map(function(l){return Math.sqrt(Math.max(0,r2*l));});
        var anisoRatio=Math.max.apply(null,semi)/Math.max(1e-6,Math.min.apply(null,semi));
        if(anisoRatio<1.15){ doEll=false; }
        else {
          var Sm=[[0,0,0],[0,0,0],[0,0,0]]; for(var c=0;c<3;c++){ for(var d2=0;d2<3;d2++){ Sm[d2][c]=m[d2][0]*eg.vec[0][c]*semi[c]+m[d2][1]*eg.vec[1][c]*semi[c]+m[d2][2]*eg.vec[2][c]*semi[c]; } }
          var M2=[[Sm[0][0]*Sm[0][0]+Sm[1][0]*Sm[1][0], Sm[0][0]*Sm[0][1]+Sm[1][0]*Sm[1][1]],[Sm[0][0]*Sm[0][1]+Sm[1][0]*Sm[1][1], Sm[0][1]*Sm[0][1]+Sm[1][1]*Sm[1][1]]];
          var tr=M2[0][0]+M2[1][1], det=M2[0][0]*M2[1][1]-M2[0][1]*M2[1][0];
          var disc=Math.sqrt(Math.max(0,tr*tr/4-det)); var l1=tr/2+disc, l2=tr/2-disc;
          var ang=0.5*Math.atan2(2*M2[0][1], M2[0][0]-M2[1][1]);
          var sa=Math.sqrt(Math.max(0,l1))*scale, sb=Math.sqrt(Math.max(0,l2))*scale;
          ctx.save(); ctx.translate(c0,c1); ctx.rotate(-ang);
          ctx.beginPath(); ctx.ellipse(0,0,sa,sb,0,0,2*Math.PI);
          ctx.globalAlpha=0.30; ctx.fillStyle=col; ctx.fill();
          ctx.globalAlpha=0.95; ctx.lineWidth=1.4; ctx.strokeStyle=csShade(col,-0.35); ctx.stroke(); ctx.restore();
        }
      }
      // 实心核
      ctx.beginPath(); ctx.arc(c0,c1, rn, 0, 2*Math.PI);
      ctx.globalAlpha=1; ctx.fillStyle=col; ctx.fill();
      ctx.lineWidth=1; ctx.strokeStyle=(el==='H')?'#999999':csShade(col,-0.5); ctx.stroke();
    });
    ctx.globalAlpha=1;
  }
  function csShade(hex,f){ var m=hex.replace('#',''); var r=parseInt(m.substr(0,2),16),g=parseInt(m.substr(2,2),16),b=parseInt(m.substr(4,2),16);
    if(f<0){ r=Math.round(r*(1+f));g=Math.round(g*(1+f));b=Math.round(b*(1+f)); } else { r=Math.round(r+(255-r)*f);g=Math.round(g+(255-g)*f);b=Math.round(b+(255-b)*f); }
    return 'rgb('+r+','+g+','+b+')'; }
  function csDrawOrtLive(){
    var cv=document.getElementById('ort-canvas'); if(!cv||!ORTEP_ATOMS) return;
    csDrawOrt(cv, ORTEP_ATOMS, { prob:ORTEP_PROB, view:ORTEP_VIEW, zoom:ORTEP_VIEW.zoom, showEll:(document.getElementById('ort-ell')?document.getElementById('ort-ell').checked:true) });
  }
  function openORTEP() {
    csExclusiveFeature('ortep');
    var kd = csGetKernelData();
    var name = (kd && kd.structure) ? kd.structure : (lastCifName||'当前结构');
    var parsed = lastCifText ? csParseCif(lastCifText) : { ok:false, reason:'no-cif' };
    if (!parsed.ok || !parsed.atoms.length) {
      var why = !lastCifText ? '（当前为内置示例或未载入含结构坐标的 .cif）' :
                 (parsed.reason==='no-cell' ? '（CIF 缺少晶胞参数 _cell_length_* / _cell_angle_*）' :
                 (parsed.reason==='no-sites' ? '（CIF 缺少 _atom_site 坐标循环）' : '（无法解析）'));
      var html = '<div class="tool-soon"><div class="ts-ico">⬭</div><div class="ts-txt"><b>ORTEP · 各向异性位移椭球（ADPs）</b><span>原子的热运动各向异性椭球</span></div></div>' +
        '<p>ORTEP 需要结构含各向异性位移参数（CIF 的 <code>_atom_site_aniso_U_11/22/33/U12/U13/U23</code> 或其等价 B 因子）。</p>' +
        '<p>请在「文件 ▸ 打开结构文件」载入一个含上述字段的 <b>.cif</b>，再打开本功能即可看到投影热椭球（经典 ORTEP 风格，白底）。' + why + '</p>' +
        '<p class="ia-note">三维实时椭球由渲染内核的独立叠加层绘制（默认关闭、不影响已定版球棍渲染）。当前结构缺少可解析的 CIF 文本或各向异性参数，请载入含 <code>_atom_site_aniso_U_*</code> 的 .cif 后再试。</p>';
      openModal('ORTEP 各向异性位移椭球', html); return;
    }
    ORTEP_ATOMS = parsed.atoms; ORTEP_CELL = parsed.cell; ORTEP_VIEW = { yaw:0.7, pitch:0.45, zoom:1 };
    var nAniso = parsed.hasAniso ? parsed.nAniso : 0;
    var recs = csORTEP3DData(parsed);
    post({ type:'feature', name:'ortep', data:{ on:true, atoms:recs, prob:ORTEP_PROB } });
    var html = '<div class="cv-chks"><label class="cv-chk"><input type="checkbox" id="o3-on" checked> 三维实时椭球（隐藏球棍模型，独立显示）</label></div>' +
      '<div class="cv-row"><label>概率水平</label>' +
      '<button class="cv-btn'+(ORTEP_PROB===0.5?' active':'')+'" id="o3-p50" data-p="50">50%</button>' +
      '<button class="cv-btn'+(ORTEP_PROB===0.9?' active':'')+'" id="o3-p90" data-p="90">90%</button>' +
      '<span class="cv-val" id="o3-prob">'+(ORTEP_PROB===0.5?'50%':'90%')+'</span></div>' +
      '<div class="cv-sec">分子范围（可选）</div>' +
      '<div class="cv-chks"><label class="cv-chk"><input type="checkbox" id="o3-scope"> 仅显示所选分子</label></div>' +
      '<div class="cv-stat" id="o3-scopecnt"></div>' +
      '<div class="cv-btns"><button class="cv-btn" id="o3-applymol">应用所选分子</button></div>' +
      '<div class="cv-stat">结构：<b>'+(lastCifName||name)+'</b><br>原子 '+parsed.atoms.length+' 个 · 含各向异性位移参数 <b>'+nAniso+'</b> 个<br>' +
      '开启后主视图切换为白底，仅显示热椭球（非 H 原子，实心遮光）+ 氢原子小灰球 + 黑色化学键圆柱，随相机实时旋转；关闭面板即恢复开启前的显示（背景与球棍模型）。</div>' +
      '<div class="cv-note">半轴 aᵢ = √(−ln(1−p)·λᵢ)，λᵢ 为笛卡尔 U 张量特征值，主轴由特征向量给出。对称等价原子按 CIF 标签 / 模 1 分数坐标匹配 ADP，纯平移副本共用同一张量（方向不随对称操作旋转，属近似）。</div>' +
      '<details><summary>二维投影对照（经典 ORTEP 白底）</summary>' +
      '<canvas id="ort-canvas" width="600" height="460" class="ort-canvas"></canvas>' +
      '<div class="cv-btns"><button class="cv-btn" data-v="iso">等轴</button><button class="cv-btn" data-v="a">沿 a</button>' +
      '<button class="cv-btn" data-v="b">沿 b</button><button class="cv-btn" data-v="c">沿 c</button>' +
      '<label class="cv-chk"><input type="checkbox" id="ort-ell" checked> 椭球</label>' +
      '<label class="cv-chk">缩放 <input type="range" id="ort-zoom" min="0.4" max="3" step="0.1" value="1"></label></div>' +
      '<div class="ort-legend">拖拽旋转 / 滚轮缩放</div></details>';
    openFloatPanel('ortep', 'ORTEP · 三维实时热椭球', html, function(){
      // 关闭 ORTEP 浮动面板：同步关闭三维椭球叠加层，恢复默认球棍显示
      post({ type:'feature', name:'ortep', data:{ on:false, atoms:null } });
    });
    setTimeout(function(){
      var on=document.getElementById('o3-on');
      if(on) on.addEventListener('change', csSyncORTEP3D);
      // 分子范围：读取内核「分子」工具当前选择，勾选后仅显示所选分子
      var scChk=document.getElementById('o3-scope'), scCnt=document.getElementById('o3-scopecnt'), applyBtn=document.getElementById('o3-applymol');
      function updateScopeReadout(){
        var mols=csGetKernelPickMols();
        if(scCnt) scCnt.textContent = mols.length
          ? ('已选 '+mols.length+' 个分子（右侧「分子」工具选取）；勾选上方复选框即仅显示这些分子')
          : '尚未选择分子：请用右侧「分子」工具在视图中选取后，点「应用所选分子」';
      }
      var initMols=csGetKernelPickMols();
      if(scChk){
        if(initMols.length) scChk.checked=true;
        scChk.addEventListener('change',function(){
          post({type:'feature',name:'ortep',data: scChk.checked
            ? { scopeMode:'selected', scope: csGetKernelPickMols() }
            : { scopeMode:'all', scope:null }});
        });
      }
      if(applyBtn) applyBtn.addEventListener('click',function(){
        var mols=csGetKernelPickMols();
        post({type:'feature',name:'ortep',data:{ scopeMode:(scChk&&scChk.checked)?'selected':'all', scope:mols }});
        updateScopeReadout();
      });
      updateScopeReadout();
      ['o3-p50','o3-p90'].forEach(function(id){
        var b=document.getElementById(id); if(!b) return;
        b.addEventListener('click',function(){
          ORTEP_PROB=(b.dataset.p==='50')?0.50:0.90;
          ['o3-p50','o3-p90'].forEach(function(x){ var e=document.getElementById(x); if(e) e.classList.toggle('active', x===id); });
          var pl=document.getElementById('o3-prob'); if(pl) pl.textContent=(ORTEP_PROB===0.5?'50%':'90%');
          post({type:'feature',name:'ortep',data:{prob:ORTEP_PROB}});
          csDrawOrtLive();
        });
      });
      var cv=document.getElementById('ort-canvas'); if(!cv) return;
      csDrawOrtLive();
      var drag=false, lx=0, ly=0;
      cv.addEventListener('mousedown',function(e){ drag=true; lx=e.clientX; ly=e.clientY; });
      window.addEventListener('mouseup',function(){ drag=false; });
      cv.addEventListener('mousemove',function(e){ if(!drag) return; ORTEP_VIEW.yaw += (e.clientX-lx)*0.01; ORTEP_VIEW.pitch += (e.clientY-ly)*0.01; ORTEP_VIEW.pitch=Math.max(-1.5,Math.min(1.5,ORTEP_VIEW.pitch)); lx=e.clientX; ly=e.clientY; csDrawOrtLive(); });
      cv.addEventListener('wheel',function(e){ e.preventDefault(); ORTEP_VIEW.zoom *= (e.deltaY<0?1.1:0.9); ORTEP_VIEW.zoom=Math.max(0.3,Math.min(4,ORTEP_VIEW.zoom)); var z=document.getElementById('ort-zoom'); if(z) z.value=ORTEP_VIEW.zoom; csDrawOrtLive(); }, {passive:false});
      document.querySelectorAll('.cv-float [data-v]').forEach(function(b){ b.addEventListener('click',function(){
        var v=b.dataset.v; if(v==='iso') ORTEP_VIEW={yaw:0.7,pitch:0.45,zoom:ORTEP_VIEW.zoom};
        else { var ax = v==='a'?ORTEP_CELL.a : v==='b'?ORTEP_CELL.b : ORTEP_CELL.c; ORTEP_VIEW=csViewAlong(ax); }
        csDrawOrtLive(); }); });
      var zs=document.getElementById('ort-zoom'); if(zs) zs.addEventListener('input',function(){ ORTEP_VIEW.zoom=parseFloat(zs.value); csDrawOrtLive(); });
      var ell=document.getElementById('ort-ell'); if(ell) ell.addEventListener('change',csDrawOrtLive);
    }, 30);
  }
  // 文件配色（按来源文件区分，不同文件不同色，同一文件同色）
  var ST_FILE_COLORS = ['#ff5d5d','#4fa3ff','#54d18a','#ffc24b','#c77dff','#42d6d6','#ff8fc8','#9aa7b5'];
  // 晶体模式：以种子分子为中心、半径内抓取共晶胞邻近分子构成堆积对象（「缺失分子补全」即把含选区原子的分子整分子纳入）
  function csClusterAround(expanded, seedIdx, radius){
    var seed=expanded[seedIdx]; if(!seed) return []; var out=[seedIdx];
    for(var i=0;i<expanded.length;i++){ if(i===seedIdx) continue; var m=expanded[i], hit=false;
      for(var s=0;s<seed.atoms.length && !hit;s++) for(var a=0;a<m.atoms.length;a++){ if(csDist(seed.atoms[s].cart, m.atoms[a].cart)<radius){ hit=true; break; } }
      if(hit) out.push(i);
    } return out;
  }
  function openStackModal(type) {
    var isXtal = (type==='xtal');
    var title = isXtal ? '晶体结构堆叠（分子匹配 + RMSD）' : '单分子堆叠（原子匹配 + RMSD）';
    var ST = { type:type, files:[] };
    var html = '<div class="stw">' +
      '<p class="stw-desc">' + (isXtal
        ? '对比<b>两个及以上晶体结构</b>的「分子构象 + 堆积」整体差异：每个文件先选定一棵种子分子，按设定半径（默认 3.8 Å）抓取周围共晶胞邻近分子构成该晶体的堆积对象，再跨文件做分子最优匹配与全局 Kabsch 叠合。'
        : '对比<b>两个及以上分子</b>之间的构象差异：每个文件选定一棵待比分子（单分子模式取该文件中的一棵分子），自动按元素分组做原子最优匹配与 Kabsch 叠合。') + '</p>' +
      '<p class="stw-note">RMSD（Å，越接近 0 表示相似度越高）。支持多文件导入，每导入一个文件完成一次选择；至少选择两个已就绪文件后运行。</p>' +
      '<div class="stw-import"><label class="stw-filebtn">选择结构文件…<input type="file" id="st-file" multiple accept=".cif,.mmcif,.xyz"></label>' +
      '<span class="stw-hint">可重复选择以追加多个文件</span></div>' +
      '<div id="st-files" class="st-files"></div>' +
      '<div class="stw-foot"><button id="st-run" class="pp-btn primary" disabled>运行堆叠分析</button>' +
      '<span id="st-count" class="stw-count"></span></div>' +
      '<div id="st-msg" class="stw-msg"></div></div>';
    openModal(title, html);
    setTimeout(function(){
      var filesBox=document.getElementById('st-files'), runBtn=document.getElementById('st-run'),
          msgBox=document.getElementById('st-msg'), countBox=document.getElementById('st-count');
      function isReady(f){ return isXtal ? f.cluster.length>0 : f.pick>=0; }
      function refreshCount(){ var ok=ST.files.filter(isReady).length;
        countBox.textContent='已就绪 '+ok+' / '+ST.files.length+' 个文件'; runBtn.disabled = ok<2; }
      function molOptions(mols){ return mols.map(function(m,i){ return '<option value="'+i+'">分子 #'+i+' · '+m.formula+' · '+m.idxs.length+' 原子</option>'; }).join(''); }
      function addFileCard(file, idx){
        var card=document.createElement('div'); card.className='st-card'; card.setAttribute('data-fi',idx);
        var head='<div class="st-card-h"><span class="st-dot" style="background:'+ST_FILE_COLORS[idx%ST_FILE_COLORS.length]+'"></span>'+file.name+' · '+file.mols.length+' 个分子</div>';
        var body='<div class="st-card-body"><canvas class="st-canvas" width="230" height="198"></canvas><div class="st-ctrls">';
        if(isXtal){
          body+='<label>种子分子</label><select class="st-seed">'+molOptions(file.mols)+'</select>'+
            '<label>半径 (Å)</label><input type="number" class="st-rad" min="1" max="15" step="0.1" value="3.8">'+
            '<button class="st-complete pp-btn">缺失分子补全</button>'+
            '<div class="st-stat"></div>';
        } else {
          body+='<label>选择分子</label><select class="st-mol">'+molOptions(file.mols)+'</select>';
        }
        body+='</div></div>';
        card.innerHTML=head+body; filesBox.appendChild(card);
        var canvas=card.querySelector('.st-canvas'), sc=csScene3D(canvas); file._sc=sc;
        if(isXtal){ file.pick=0; file.cluster=[];
          var seed=card.querySelector('.st-seed'), rad=card.querySelector('.st-rad'), btn=card.querySelector('.st-complete'), stat=card.querySelector('.st-stat');
          function rebuildCluster(){ var ci=parseInt(seed.value,10)||0, r=parseFloat(rad.value)||3.8; file.radius=r;
            file.cluster=csClusterAround(file.expanded, ci, r);
            var atoms=[]; file.cluster.forEach(function(mi){ file.expanded[mi].atoms.forEach(function(a){ atoms.push({el:a.el,cart:a.cart.slice()}); }); });
            sc.setGroups([{ atoms:atoms, color:null, bonds:csBondsDirect(atoms) }]);
            stat.textContent='已选 '+file.cluster.length+' 个分子 · '+atoms.length+' 个原子（点「缺失分子补全」按当前半径刷新）'; }
          seed.addEventListener('change', rebuildCluster); rad.addEventListener('change', rebuildCluster);
          btn.addEventListener('click', rebuildCluster); rebuildCluster();
        } else {
          var sel=card.querySelector('.st-mol'); file.pick=parseInt(sel.value,10)||0;
          function redrawMol(){ file.pick=parseInt(sel.value,10)||0; var m=file.mols[file.pick];
            sc.setGroups([{ atoms:m.atoms.map(function(a){return {el:a.el,cart:a.cart.slice()};}), color:null,
              bonds:csBondsDirect(m.atoms.map(function(a){return {el:a.el,cart:a.cart};})) }]); }
          sel.addEventListener('change', redrawMol); redrawMol();
        }
        refreshCount();
      }
      function handleFiles(fileList){
        var idx0=ST.files.length;
        Array.prototype.forEach.call(fileList, function(fl, k){
          var reader=new FileReader();
          reader.onload=function(){ var txt=reader.result, kd=csParseStructure(fl.name, txt);
            if(!kd.ok){ msgBox.textContent+='⚠ '+fl.name+'：'+(kd.error||'解析失败')+'\n'; return; }
            var mi=csGetMolecules(kd), expanded=csBuildSupercell(mi.mols, kd.cell);
            var file={ name:fl.name, kd:kd, mols:mi.mols, expanded:expanded, pick:-1, cluster:[], radius:3.8,
                       color:ST_FILE_COLORS[(idx0+k)%ST_FILE_COLORS.length] };
            ST.files.push(file); addFileCard(file, ST.files.length-1); };
          reader.readAsText(fl);
        });
      }
      var fileInput=document.getElementById('st-file');
      fileInput.addEventListener('change', function(){ if(fileInput.files&&fileInput.files.length) handleFiles(fileInput.files); fileInput.value=''; });
      runBtn.addEventListener('click', function(){ runStack(ST, isXtal); });
      refreshCount();
    }, 40);
  }
  // 运行堆叠：计算 RMSD 并打开结果弹窗（嵌入式 3D 按文件着色 + RMSD 数据表）
  function runStack(ST, isXtal){
    var ready=ST.files.filter(function(f){ return isXtal ? f.cluster.length>0 : f.pick>=0; });
    if(ready.length<2){ openModal('提示','<p>至少需要两个已就绪的文件才能运行堆叠分析。</p>'); return; }
    var groups=[], rows=[], legend=[];
    if(!isXtal){
      var sel=ready.map(function(f){ return f.mols[f.pick]; });
      var ref=sel[0], refFile=ready[0];
      groups.push({ atoms:ref.atoms.map(function(a){return {el:a.el,cart:a.cart.slice()};}), color:ST_FILE_COLORS[0],
                    bonds:csBondsDirect(ref.atoms.map(function(a){return {el:a.el,cart:a.cart};})) });
      legend.push({ name:refFile.name, color:ST_FILE_COLORS[0] });
      for(var i=1;i<sel.length;i++){
        var ka=csMatchAndAlign(ref.atoms, sel[i].atoms);
        if(!ka){ rows.push({ a:refFile.name, b:ready[i].name, rmsd:'匹配失败' }); continue; }
        var tr=sel[i].atoms.map(function(a){ var c=[a.cart[0]-ka.cq[0],a.cart[1]-ka.cq[1],a.cart[2]-ka.cq[2]]; var r=csRotV(c,ka.R);
          return { el:a.el, cart:[r[0]+ka.cp[0],r[1]+ka.cp[1],r[2]+ka.cp[2]] }; });
        groups.push({ atoms:tr, color:ST_FILE_COLORS[i%ST_FILE_COLORS.length], bonds:csBondsDirect(tr.map(function(a){return {el:a.el,cart:a.cart};})) });
        legend.push({ name:ready[i].name, color:ST_FILE_COLORS[i%ST_FILE_COLORS.length] });
        rows.push({ a:refFile.name, b:ready[i].name, rmsd:csFmt(ka.rmsd,3), n:ka.n, ang:csFmt(ka.angle,1) });
      }
    } else {
      var refMol=ready[0].cluster.map(function(mi){ return ready[0].expanded[mi]; });
      var colorIdx=0;
      var refMulti=refMol.length>1;
      refMol.forEach(function(m, mi){
        var ra=[]; m.atoms.forEach(function(a){ ra.push({el:a.el,cart:a.cart.slice()}); });
        var rname = refMulti ? (ready[0].name+' · 分子 '+String.fromCharCode(65+mi)) : ready[0].name;
        groups.push({ atoms:ra, color:ST_FILE_COLORS[colorIdx%ST_FILE_COLORS.length], bonds:csBondsDirect(ra) });
        legend.push({ name:rname, color:ST_FILE_COLORS[colorIdx%ST_FILE_COLORS.length] });
        colorIdx++;
      });
      for(var fi=1; fi<ready.length; fi++){
        var f=ready[fi], otherMol=f.cluster.map(function(mi){ return f.expanded[mi]; });
        var cost=[], paAll=[], pbAll=[];
        for(var x=0;x<refMol.length;x++){ cost.push([]); for(var y=0;y<otherMol.length;y++){
          if(refMol[x].formula!==otherMol[y].formula){ cost[x].push(1e9); continue; }
          var kx0=csMatchAndAlign(refMol[x].atoms, otherMol[y].atoms); cost[x].push(kx0?kx0.rmsd:1e9); } }
        var asg=csHungarian(cost), P=[], Q=[], atomN=0, pairRows=[];
        for(var x2=0;x2<refMol.length;x2++){ var y2=asg[x2]; if(y2<0||y2>=otherMol.length) continue; if(cost[x2][y2]>=1e8) continue;
          var kx=csMatchAndAlign(refMol[x2].atoms, otherMol[y2].atoms); if(!kx||!kx.pa||!kx.pa.length) continue;
          for(var p=0;p<kx.pa.length;p++){ P.push(kx.pa[p]); Q.push(kx.pb[p]); }
          atomN+=kx.n; pairRows.push({ other:f.name, formula:refMol[x2].formula, rmsd:csFmt(kx.rmsd,3), n:kx.n }); }
        if(!P.length){ rows.push({ a:ready[0].name, b:f.name, rmsd:'无匹配分子' }); continue; }
        var kg=csKabsch(P, Q);
        var fMulti=otherMol.length>1;
        otherMol.forEach(function(m, mi){
          var tf=[]; m.atoms.forEach(function(a){ var c=[a.cart[0]-kg.cq[0],a.cart[1]-kg.cq[1],a.cart[2]-kg.cq[2]]; var r=csRotV(c,kg.R);
            tf.push({ el:a.el, cart:[r[0]+kg.cp[0],r[1]+kg.cp[1],r[2]+kg.cp[2]] }); });
          var fname = fMulti ? (f.name+' · 分子 '+String.fromCharCode(65+mi)) : f.name;
          groups.push({ atoms:tf, color:ST_FILE_COLORS[colorIdx%ST_FILE_COLORS.length], bonds:csBondsDirect(tf.map(function(a){return {el:a.el,cart:a.cart};})) });
          legend.push({ name:fname, color:ST_FILE_COLORS[colorIdx%ST_FILE_COLORS.length] });
          colorIdx++;
        });
        rows.push({ a:ready[0].name, b:f.name, rmsd:csFmt(kg.rmsd,3), n:atomN, ang:csFmt(kg.angle,1), detail:pairRows });
      }
    }
    openStackResult(isXtal, groups, rows, legend);
  }
  // 结果弹窗：嵌入式 3D 叠合图（白底、按分子 / 晶型着色）+ RMSD 数据表
  function openStackResult(isXtal, groups, rows, legend){
    var title=isXtal?'晶体结构堆叠 · RMSD 最小叠合结果':'单分子堆叠 · RMSD 最小叠合结果';
    var head='<p class="stw-note">不同来源的分子 / 晶型以不同颜色区分，全部叠加于同一张 3D 视图中对比（拖拽旋转，滚轮缩放）。右侧图例标明各分子 / 晶型配色。下方表格为跨文件最优刚体叠合（Kabsch）后的最小 RMSD 数值。</p>';
    var legendHtml='<div class="st-legend-right"><div class="st-leg-title">分子 / 晶型配色</div>'+legend.map(function(l){ return '<div class="st-leg"><span class="st-dot" style="background:'+l.color+'"></span><span class="st-leg-name">'+l.name+'</span></div>'; }).join('')+'</div>';
    var canvasHtml='<div class="st-result-wrap"><canvas id="st-result" width="680" height="520" class="st-result-canvas"></canvas>'+legendHtml+'</div>';
    var tblRows=rows.map(function(r,i){ if(!r) return ''; if(r.detail){ return r.detail.map(function(d,j){ return '<tr'+(j%2?' class="ia-alt"':'')+'><td>—</td><td>'+d.other+'</td><td>'+d.rmsd+'</td><td>'+d.n+'</td><td>'+d.formula+'</td></tr>'; }).join(''); }
      return '<tr'+(i%2?' class="ia-alt"':'')+'><td>'+r.a+'</td><td>'+r.b+'</td><td>'+(r.rmsd||'')+'</td><td>'+(r.n!=null?r.n:'')+'</td><td>'+(r.ang!=null?r.ang+'°':'')+'</td></tr>'; }).join('');
    var tbl='<table class="pxrd-table"><tr class="ia-head"><th>参考</th><th>对比文件</th><th>RMSD (Å)</th><th>匹配原子</th><th>旋转角 / 分子式</th></tr>'+tblRows+'</table>';
    var back='<div class="stw-foot"><button id="st-back" class="pp-btn">返回选择</button></div>';
    openModal(title, head+canvasHtml+tbl+back);
    setTimeout(function(){ var cv=document.getElementById('st-result'); if(cv){ var sc=csScene3D(cv,{bg:'light'}); sc.setGroups(groups); }
      var bk=document.getElementById('st-back'); if(bk) bk.addEventListener('click', function(){ openStackModal(isXtal?'xtal':'mol'); }); }, 40);
  }
  var HABIT_STATE = { model:'bfdh', maxIdx:2, size:1, on:true, labels:true, opacity:0.28,
                      colorMode:'multi', monoColor:'#4f8ef7', res:null };
  function openHabit3D(model) {
    var kd = csGetKernelData();
    if (!kd || !kd.cell) { toast('晶胞数据尚未就绪，请先载入结构', true); return; }
    HABIT_STATE.model = model || 'bfdh';
    csExclusiveFeature('habit');
    var html = '<div class="cv-chks">' +
      '<label class="cv-chk"><input type="checkbox" id="hb-on" checked> 显示 3D 晶习</label>' +
      '<label class="cv-chk"><input type="checkbox" id="hb-labels" checked> 显示 (hkl) 标签</label></div>' +
      '<div class="cv-sec">生长模型</div>' +
      '<div class="cv-btns"><button class="cv-btn active" id="hb-bfdh">BFDH 模型</button></div>' +
      '<div class="cv-row"><label>最大晶面指数</label><select id="hb-idx">' +
        '<option value="1">±1（低指数）</option><option value="2" selected>±2</option><option value="3">±3</option></select></div>' +
      '<div class="cv-row"><label>晶习尺寸</label><input type="range" id="hb-size" min="0.5" max="3" step="0.05" value="1"><span class="cv-val" id="hb-size-v">1.00</span></div>' +
      '<div class="cv-row"><label>晶面颜色</label><select id="hb-color">' +
        '<option value="multi" selected>彩色（对称一致）</option>' +
        '<option value="mono">单色</option></select></div>' +
      '<div class="cv-row" id="hb-mono-row" style="display:none"><label>单色色板</label><select id="hb-mono">' +
        '<option value="#4f8ef7" selected>蓝色</option>' +
        '<option value="#e05c7a">红色</option>' +
        '<option value="#5fb85f">绿色</option>' +
        '<option value="#e8933a">橙色</option>' +
        '<option value="#a06be0">紫色</option>' +
        '<option value="#33b1a6">青色</option>' +
        '<option value="#d0a63c">黄色</option></select></div>' +
      '<div class="cv-row"><label>面透明度</label><input type="range" id="hb-op" min="0.08" max="0.70" step="0.02" value="0.28"><span class="cv-val" id="hb-op-v">0.28</span></div>' +
      '<div class="cv-stat" id="hb-stat"></div>' +
      '<div class="cv-note">Wulff 构造：按劳埃类展开完整晶面族，每个晶面族取半空间 n·x ≤ t。<b>BFDH</b> 取 t ∝ 1/d（大面间距的面生长慢、暴露面积大），各晶面在 3D 主视图实时标注 (hkl)，随相机一起旋转。</div>' +
      '<details><summary>晶面数据表（当前模型，前 40 族）</summary><div id="hb-table" class="hb-table"></div></details>';
    openFloatPanel('habit','晶习模拟 · 3D（BFDH）',html);
    setTimeout(function(){
      function sync(){
        var st=HABIT_STATE;
        st.maxIdx=+(document.getElementById('hb-idx')||{}).value||2;
        st.size=parseFloat((document.getElementById('hb-size')||{}).value)||1;
        st.opacity=parseFloat((document.getElementById('hb-op')||{}).value)||0.28;
        st.on=!!(document.getElementById('hb-on')||{}).checked;
        st.labels=!!(document.getElementById('hb-labels')||{}).checked;
        st.colorMode=(document.getElementById('hb-color')||{}).value||'multi';
        st.monoColor=(document.getElementById('hb-mono')||{}).value||'#4f8ef7';
        // 单色模式下隐藏色板选择行，彩色模式下显示
        var monoRow=document.getElementById('hb-mono-row'); if(monoRow) monoRow.style.display=(st.colorMode==='mono')?'':'none';
        var szv=document.getElementById('hb-size-v'); if(szv) szv.textContent=st.size.toFixed(2);
        var opv=document.getElementById('hb-op-v'); if(opv) opv.textContent=st.opacity.toFixed(2);
        var res=csHabitPolyhedron(kd,st.model,{maxIdx:st.maxIdx,size:st.size,
          colorMode:st.colorMode,monoColor:st.monoColor});
        st.res=res;
        if(!res){ toast('无法生成晶习多面体',true); return; }
        post({type:'feature',name:'habit',data:{on:st.on,model:res.model,faces:res.faces,
          showLabels:st.labels,opacity:st.opacity,labelSize:res.size*0.045}});
        var b1=document.getElementById('hb-bfdh'), b2=document.getElementById('hb-ae');
        if(b1) b1.classList.toggle('active',st.model==='bfdh');
        if(b2) b2.classList.toggle('active',st.model==='ae');
        var stat=document.getElementById('hb-stat');
        if(stat) stat.innerHTML='当前模型 <b>'+(res.model==='ae'?'AE 附着能代理':'BFDH 晶面间距')+'</b><br>'+
          '参与晶面族 <b>'+res.families+'</b> 个 · 半空间 <b>'+res.hs+'</b> 个<br>'+
          '有效晶面 <b>'+res.faces.length+'</b> 个 · 多面体顶点 <b>'+res.verts+'</b> 个';
        var tbl=document.getElementById('hb-table'); if(tbl) tbl.innerHTML=csHabitTable(res.model,res.info);
      }
      ['hb-on','hb-labels','hb-idx','hb-size','hb-op','hb-color','hb-mono'].forEach(function(id){
        var e=document.getElementById(id); if(e) e.addEventListener(e.type==='range'?'input':'change',sync);
      });
      ['hb-bfdh','hb-ae'].forEach(function(id){
        var e=document.getElementById(id); if(e) e.addEventListener('click',function(){
          HABIT_STATE.model=(id==='hb-bfdh'?'bfdh':'ae'); sync();
        });
      });
      sync();
    },30);
  }
  function openBFDH() { openHabit3D('bfdh'); }
  function openAE() { openHabit3D('ae'); }
  function csDrawSlab(canvas, atoms, normal, viewState){
    var ctx=canvas.getContext('2d'); var W=canvas.width,H=canvas.height;
    ctx.fillStyle='#fbfbfd'; ctx.fillRect(0,0,W,H);
    if(!atoms||!atoms.length){ return; }
    var m=csRotMat(viewState), r2=-Math.log(1-0.9);
    var n=csNorm3(normal);
    var arb = Math.abs(n[0])<0.9?[1,0,0]:[0,1,0];
    var e1=csNorm3([n[1]*arb[2]-n[2]*arb[1], n[2]*arb[0]-n[0]*arb[2], n[0]*arb[1]-n[1]*arb[0]]);
    var e2=[n[1]*e1[2]-n[2]*e1[1], n[2]*e1[0]-n[0]*e1[2], n[0]*e1[1]-n[1]*e1[0]];
    var size=viewState.size||10;
    var corners=[]; [-1,1].forEach(function(s1){ [-1,1].forEach(function(s2){ corners.push([(s1*size/2)*e1[0]+(s2*size/2)*e2[0],(s1*size/2)*e1[1]+(s2*size/2)*e2[1],(s1*size/2)*e1[2]+(s2*size/2)*e2[2]]); }); });
    var pts=atoms.map(function(a){ return {el:a.el, r:csRotV(a.cart,m)}; });
    var minx=1e9,maxx=-1e9,miny=1e9,maxy=-1e9;
    pts.forEach(function(p){ minx=Math.min(minx,p.r[0]);maxx=Math.max(maxx,p.r[0]);miny=Math.min(miny,p.r[1]);maxy=Math.max(maxy,p.r[1]); });
    corners.forEach(function(c){ var rc=csRotV(c,m); minx=Math.min(minx,rc[0]);maxx=Math.max(maxx,rc[0]);miny=Math.min(miny,rc[1]);maxy=Math.max(maxy,rc[1]); });
    var spanx=Math.max(1e-6,maxx-minx), spany=Math.max(1e-6,maxy-miny);
    var scale=Math.min((W*0.86)/spanx,(H*0.86)/spany)*viewState.zoom; if(!isFinite(scale)||scale<=0) scale=20;
    var cx0=W/2 - scale*(minx+maxx)/2, cy0=H/2 + scale*(miny+maxy)/2;
    function proj(v){ return [cx0+scale*v[0], cy0-scale*v[1], v[2]]; }
    // 晶面（半透明蓝）
    ctx.save(); ctx.beginPath();
    corners.forEach(function(c,i){ var P=proj(csRotV(c,m)); if(i===0) ctx.moveTo(P[0],P[1]); else ctx.lineTo(P[0],P[1]); });
    ctx.closePath(); ctx.fillStyle='rgba(70,130,230,0.14)'; ctx.fill(); ctx.setLineDash([6,4]); ctx.lineWidth=1.5; ctx.strokeStyle='rgba(40,90,200,0.8)'; ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    pts.sort(function(p,q){ return p.r[2]-q.r[2]; });
    pts.forEach(function(p){ var P=proj(p.r), col=CS_ELCOL[p.el]||CS_ELCOL.default; var rn=Math.max(2.0, scale*csRadius(p.el,CS_COV)*0.42);
      ctx.beginPath(); ctx.arc(P[0],P[1],rn,0,2*Math.PI); ctx.fillStyle=col; ctx.fill();
      ctx.lineWidth=1; ctx.strokeStyle=(p.el==='H')?'#999':'#444'; ctx.stroke(); });
  }
  function openCleavage() {
    csExclusiveFeature('slice');
    var kd = csGetKernelData();
    if (!kd) { openModal('晶面解理', '<p class="tool-soon">渲染内核尚未就绪。</p>'); return; }
    if (!kd.cell || !kd.cell.vectors) { openModal('晶面解理', '<p>缺少晶胞数据。</p>'); return; }
    var V=kd.cell.vectors, A=V.a, B=V.b, C=V.c;
    var size=Math.max(csVlen(A),csVlen(B),csVlen(C))*1.05;
    var sys=csLatticeType(kd.cell), c2=csSnapCell(kd.cell,sys), rc=csReciprocal(c2);
    var ops=csCloseGroup(csLaueGens(sys,'b'));
    var HKL=[[0,0,1],[1,0,0],[0,1,0],[0,1,1],[1,0,1],[1,1,0],[1,1,1],[1,1,-1],[2,0,1],[0,2,1]];
    var planes=HKL.map(function(t){
      var G2=csDhklSq(t[0],t[1],t[2],rc), d=G2>0?1/Math.sqrt(G2):0;
      var mult=csMul(t[0],t[1],t[2],ops,rc);
      return {h:t[0],k:t[1],l:t[2],d:d,mult:mult,score:d*mult};
    });
    var scoreSum=planes.reduce(function(s,p){return s+p.score;},0)||1;
    planes.forEach(function(p){ p.rel=p.score/scoreSum; });
    var opts=planes.map(function(p,i){ return '<option value="'+i+'" title="BFDH 相对面积 '+csFmt(p.rel,3)+'">('+p.h+' '+p.k+' '+p.l+') · d='+csFmt(p.d,2)+' · 面积 '+csFmt(p.rel,3)+'</option>'; }).join('');
    var html = '<div class="cv-chks">' +
      '<label class="cv-chk"><input type="checkbox" id="cl-on" checked> 显示切片（3D）</label>' +
      '<label class="cv-chk"><input type="checkbox" id="cl-plane-chk" checked> 显示平面</label>' +
      '<label class="cv-chk"><input type="checkbox" id="cl-bounds" checked> 显示边界</label>' +
      '<label class="cv-chk"><input type="checkbox" id="cl-isolate" checked> 隔离切片内堆积（隐藏外部原子）</label></div>' +
      '<div class="cv-sec">选择晶面</div>' +
      '<div class="cv-row"><label>晶面族</label><select id="cl-plane">'+opts+'</select></div>' +
      '<div class="cv-row cl-hkl"><label>(h k l)</label>' +
      '<input type="number" id="cl-h" value="0"><input type="number" id="cl-k" value="0"><input type="number" id="cl-l" value="1">' +
      '<button class="cv-btn primary" id="cl-go">应用</button></div>' +
      '<div class="cv-sec">切片几何</div>' +
      '<div class="cv-row"><label>Depth 厚度 Å</label><input type="range" id="cl-depth" min="1" max="40" step="0.5" value="10"><span class="cv-val" id="cl-depth-v">10.0</span></div>' +
      '<div class="cv-row"><label>Area 边长 Å</label><input type="range" id="cl-area" min="5" max="60" step="1" value="20"><span class="cv-val" id="cl-area-v">20.0</span></div>' +
      '<div class="cv-row"><label>Displacement Å</label><input type="range" id="cl-disp" min="-20" max="20" step="0.5" value="0"><span class="cv-val" id="cl-disp-v">0.0</span></div>' +
      '<div class="cv-btns"><button class="cv-btn" id="cl-reset">重置</button></div>' +
      '<div class="cv-stat" id="cl-stat"></div>' +
      '<div class="cv-note"><span class="cv-swatch"></span>红色为选定 (hkl) 晶面，灰色为 ±Depth/2 的切片边界；Displacement 沿面法向平移。平面与分子同处 3D 场景，随主视图相机实时旋转。勾选「隔离切片内堆积」后，仅保留晶面与边界之间（厚度 = Depth、边长 = Area 的切片体）内的分子堆积，其余原子与键隐藏，便于清晰查看该层堆积；取消勾选则恢复全结构 + 半透明平面。BFDH 相对面积 = (d × 劳埃多重性) 归一化的定性估计。</div>' +
      '<details><summary>二维投影对照（旧版）</summary><canvas id="cl-canvas" width="600" height="440"></canvas><div id="cl-out" class="ort-legend"></div></details>';
    openFloatPanel('slice', '晶面解理 · (hkl) 三维切片', html);
    var clView={yaw:0.7,pitch:0.5,zoom:1,size:size};
    var CL_ATOMS=null, CL_NORMAL=[0,0,1];
    function collect(){
      return {
        on:document.getElementById('cl-on').checked,
        h:+document.getElementById('cl-h').value||0,
        k:+document.getElementById('cl-k').value||0,
        l:+document.getElementById('cl-l').value||0,
        depth:+document.getElementById('cl-depth').value,
        area:+document.getElementById('cl-area').value,
        disp:+document.getElementById('cl-disp').value,
        showPlane:document.getElementById('cl-plane-chk').checked,
        showBounds:document.getElementById('cl-bounds').checked,
        isolate:document.getElementById('cl-isolate').checked
      };
    }
    function sync2d(d){
      var g=[rc.a[0]*d.h+rc.b[0]*d.k+rc.c[0]*d.l, rc.a[1]*d.h+rc.b[1]*d.k+rc.c[1]*d.l, rc.a[2]*d.h+rc.b[2]*d.k+rc.c[2]*d.l];
      // 原实现在 base.forEach 遍历期间又向 base 里 push：每轮外层循环都会让
      // 数组长度翻倍，26 轮后达到 N×2^26，浏览器直接 OOM 卡死（「点晶面解理就宕机」）。
      // 改为从固定源数组生成 27 份平移副本，长度恒为 27×N。
      var src=kd.atoms.slice(), base=src.slice();
      if(src.length>0 && src.length<=140){
        for(var ix=-1;ix<=1;ix++)for(var iy=-1;iy<=1;iy++)for(var iz=-1;iz<=1;iz++){
          if(ix===0&&iy===0&&iz===0)continue;
          var sh=[ix*A[0]+iy*B[0]+iz*C[0], ix*A[1]+iy*B[1]+iz*C[1], ix*A[2]+iy*B[2]+iz*C[2]];
          for(var ai=0;ai<src.length;ai++){
            var a=src[ai];
            base.push({el:a.el, cart:[a.cart[0]+sh[0],a.cart[1]+sh[1],a.cart[2]+sh[2]]});
          }
        }
      }
      CL_ATOMS=base; CL_NORMAL=g;
      var nrm=csNorm3(g), va=csViewAlong(nrm); clView.yaw=va.yaw; clView.pitch=va.pitch+0.5; clView.size=size;
      var cv=document.getElementById('cl-canvas'); if(cv) csDrawSlab(cv,base,g,clView);
      var out=document.getElementById('cl-out'); if(out) out.textContent='二维投影 · 显示原子 '+base.length+' 个';
    }
    function sync(){
      var d=collect();
      ['cl-depth','cl-area','cl-disp'].forEach(function(id){
        var v=document.getElementById(id+'-v'); if(v) v.textContent=(+document.getElementById(id).value).toFixed(1);
      });
      csPostSlice(d);
      var G2=csDhklSq(d.h,d.k,d.l,rc), dd=G2>0?1/Math.sqrt(G2):0;
      var st=document.getElementById('cl-stat');
      if(st) st.innerHTML='晶面 ('+d.h+' '+d.k+' '+d.l+') · 面间距 d = <b>'+csFmt(dd,4)+' Å</b> · 切片厚度 <b>'+csFmt(d.depth,1)+' Å</b><br>平面边长 '+csFmt(d.area,1)+' Å · 法向位移 '+csFmt(d.disp,1)+' Å';
      sync2d(d);
    }
    setTimeout(function(){
      sync();
      ['cl-on','cl-plane-chk','cl-bounds','cl-isolate','cl-depth','cl-area','cl-disp'].forEach(function(id){
        var e=document.getElementById(id); if(e) e.addEventListener(e.type==='range'?'input':'change',sync);
      });
      var sel=document.getElementById('cl-plane');
      if(sel) sel.addEventListener('change',function(){
        var p=planes[+sel.value]||planes[0];
        document.getElementById('cl-h').value=p.h; document.getElementById('cl-k').value=p.k; document.getElementById('cl-l').value=p.l;
        sync();
      });
      var go=document.getElementById('cl-go'); if(go) go.addEventListener('click',sync);
      var rs=document.getElementById('cl-reset');
      if(rs) rs.addEventListener('click',function(){
        document.getElementById('cl-h').value=0; document.getElementById('cl-k').value=0; document.getElementById('cl-l').value=1;
        document.getElementById('cl-depth').value=10; document.getElementById('cl-area').value=20; document.getElementById('cl-disp').value=0;
        document.getElementById('cl-on').checked=true; document.getElementById('cl-plane-chk').checked=true; document.getElementById('cl-bounds').checked=true; document.getElementById('cl-isolate').checked=true;
        sync();
      });
      var cv=document.getElementById('cl-canvas'); if(!cv) return;
      var drag=false,lx=0,ly=0;
      cv.addEventListener('mousedown',function(e){drag=true;lx=e.clientX;ly=e.clientY;});
      window.addEventListener('mouseup',function(){drag=false;});
      cv.addEventListener('mousemove',function(e){ if(!drag)return; clView.yaw+=(e.clientX-lx)*0.01; clView.pitch+=(e.clientY-ly)*0.01; clView.pitch=Math.max(-1.5,Math.min(1.5,clView.pitch)); lx=e.clientX;ly=e.clientY; if(CL_ATOMS) csDrawSlab(cv,CL_ATOMS,CL_NORMAL,clView); });
      cv.addEventListener('wheel',function(e){ e.preventDefault(); clView.zoom*=(e.deltaY<0?1.1:0.9); clView.zoom=Math.max(0.3,Math.min(4,clView.zoom)); if(CL_ATOMS) csDrawSlab(cv,CL_ATOMS,CL_NORMAL,clView); },{passive:false});
    },30);
  }
  var CS_MANUAL_HTML = '<div class="help-grid">' +
    '<div class="help-item"><b>打开结构</b><span>文件 ▸ 打开结构文件（或左侧「案例演示」）。支持 .cif / .mmcif / .mol / .mol2 / .xyz / .pdb；也可将文件直接拖入视图。</span></div>' +
    '<div class="help-item"><b>显示范围</b><span>显示 ▸ 显示范围：仅晶胞内部 / 补全截断分子 / 仅不对称单元 / 堆积模式（单晶胞 · 补全分子）；超胞 a·b·c 可在左侧面板设 1–5。</span></div>' +
    '<div class="help-item"><b>相互作用</b><span>显示 ▸ 相互作用：氢键显示（虚线）与范德华接触显示；两者亦可在「计算 ▸ 相互作用分析」中查看完整清单（供体 / 氢 / 受体 / 距离 / 角度）。</span></div>' +
    '<div class="help-item"><b>PXRD</b><span>PXRD ▸ PXRD 模拟：选辐射/波长、2θ 上限、峰宽、Lorentz–偏振，计算并绘制谱图与峰表；导入实验谱做叠加对比（Rp / Rwp）。多 PXRD 对比可叠加多组实验谱；中子衍射模拟切换散射长度；格式转换导出 .txt / .CSV / .xlsx（Excel 工作簿）。</span></div>' +
    '<div class="help-item"><b>计算</b><span>结构信息、相互作用分析、自由体积占比等量化工具；ORTEP 热椭球（计算 ▸ ORTEP 椭球展示）；晶面与晶习（BFDH 晶习模拟 / 晶面解理切片）。</span></div>' +
    '<div class="help-item"><b>计算 · ORTEP</b><span>在「计算 ▸ ORTEP 椭球展示」打开三维实时热椭球浮动面板：需载入含 _atom_site_aniso_U_* 的 .cif；3D 主视图以经典出版风叠加<b>实心遮光热椭球</b>（白底 + 黑色主轴十字 + 黑色化学键圆柱，随相机实时旋转），可切换 50%·90% 概率、按分子范围过滤（先在主视图用「分子」工具选取，再在面板勾选「仅显示所选分子」）并随时开关；关闭面板即恢复开启前显示（背景与球棍模型）。面板内保留经典白底二维投影对照（可拖拽旋转 / 缩放 / 沿 a·b·c 轴视角）。</span></div>' +
    '<div class="help-item"><b>晶面与晶习</b><span>已并入「计算」菜单：BFDH 模型（晶面间距 + 多重性表）在 3D 主视图生成晶习多面体并逐面标注 (hkl)，可调最大晶面指数、晶习尺寸、面透明度与颜色；晶面解理（沿 (hkl) 的三维切片，Depth / Area / Displacement / 显示平面与边界实时联动，另保留二维投影对照）。AE 附着能模型为后续待上线功能。</span></div>' +
    '<div class="help-item"><b>导出图片</b><span>左侧面板「图片导出」选分辨率 / 背景（含透明 PNG），点「导出 PNG 图片」；或文件 ▸ 保存 / 另存为图片。</span></div>' +
    '<div class="help-item"><b>快捷键</b><span>1–6 切换模型 · O 投影 · P 出版风 · S 酷炫默认 · R 复位视角 · 空格 自动旋转 · H 收起面板。</span></div>' +
    '</div>';
  var CS_LICENSE_HTML = '<div class="about-lines">' +
    '<div><b>字体声明 · HarmonyOS Sans Fonts</b><span>本软件界面全部文字均使用 HarmonyOS Sans SC 字体：标题、软件名等使用 HarmonyOS Sans SC Black，正文与详细内容使用 HarmonyOS Sans SC Regular。字体著作权归华为终端有限公司所有（Copyright 2021 Huawei Device Co., Ltd.），依《HarmonyOS Sans Fonts License Agreement》以未经修改的原始 TTF 文件随本软件捆绑分发，允许免费商业使用；本软件未对该字体作任何修改，亦未单独分发该字体。协议全文见随包 _internal/ui/fonts/LICENSE.txt，资产登记见 THIRD_PARTY_NOTICES.md 附录 D。</span></div>' +
    '<div><b>软件许可（MIT License）</b><span>CrystaSee（晶见）为本地运行的晶体结构可视化与分析工具。本项目自行编写、拥有著作权的源码以 MIT License 开源（Copyright (c) 2026 Yang Ye）：任何人均可免费使用、复制、修改、合并、发布、分发、再授权及销售，包括商业用途，无须事先取得书面授权；唯一条件是保留版权声明与许可文本。许可全文见随包 LICENSE 文件。随软件分发的第三方组件、字体、示例结构数据与运行库不在本 MIT 授权范围内，仍按其各自许可条款执行（见下文及随包 THIRD_PARTY_NOTICES.md）。本软件按「原样」提供，不提供任何明示或暗示担保。</span></div>' +
    '<div><b>知识产权</b><span>本软件核心代码自主实现；不内置商业晶体学数据库检索功能，仅提供跳转至公开在线服务（CCDC 沉积号 / CheckCif / COD）的外部链接，由用户浏览器独立访问，仅解析开放的 CIF / COD 等公开格式。随附演示结构文件与散射因子参数的来源、权属及授权状态详见随包 THIRD_PARTY_NOTICES.md；散射因子采用国际晶体学表（Cromer–Mann / 中子相干散射长度）公开参数。</span></div>' +
    '<div><b>示例结构数据</b><span>内置示例 CIF 均为可再分发数据：NaCl.cif 来自 Crystallography Open Database 条目 1000041（CC0 公有领域）；COF-5.cif 与 Cu-BTC.cif 来自 numat/RASPA2（MIT 许可）；其余 5 个有机分子晶体为用户提供/自有的 Olex2 精修结果。此前随包的 CSD/CCDC 导出数据已全部移除。完整来源、引用与许可全文见随包 THIRD_PARTY_NOTICES.md。</span></div>' +
    '<div><b>数据与隐私</b><span>所有结构解析与计算均在本地完成，零外部网络请求；结构文件与导出图片仅保存在用户本机。</span></div>' +
    '<div><b>免责声明</b><span>计算结果（峰位、强度、体积、R 因子等）为基于结构模型的理论估算，仅供参考；精确值以实验与权威数据库为准。</span></div>' +
    '<div><b>第三方开源组件</b><span>本软件分发中包含以下开源组件，并遵照其许可条款保留版权与许可声明：three.js 0.160.0（MIT，© 2010–2023 Three.js Authors，三维渲染内核）；pywebview 6.2.1（BSD-3-Clause，© 2014–2017 Roman Sirokov，原生窗口外壳）；pythonnet 3.2.1、clr-loader 0.3.1、cffi 2.1.1（MIT-0）、setuptools 84.2.1、domJSON 0.1.2（MIT，© 2013 Alex Zaslavsky）；three.js 的 RoomEnvironment 模块源自 google/model-viewer（Apache-2.0），随 three.js MIT 发行版提供。pywebview 未启用的可选 SSL 依赖 cryptography 已从发行包排除。随包的 OpenSSL 3.x 运行库（libcrypto-3.dll / libssl-3.dll，Apache-2.0）为 CPython 运行时自身所需，并非 cryptography 组件，已按条款单独登记。完整许可文本、Apache-2.0 专项记录与数据来源说明见随包 THIRD_PARTY_NOTICES.md 及 _internal 内各 .dist-info/licenses/ 目录；运行环境另依赖 Microsoft Edge WebView2 运行时与 VC++ 运行库（各自单独许可）。</span></div>' +
    '</div>';

  // —— 国际化：页面加载与动态渲染后自动翻译外壳（中 ⇄ 英）——
  if (window.initCsI18n) { try { window.initCsI18n(); } catch (e) { console.error('i18n init failed', e); } }
})();
