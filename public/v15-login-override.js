/**
 * V15 Login Override Script
 * 覆盖 openProviderWebLogin：非网易云/QQ平台 → 显示 Cookie-Editor 引导
 * 覆盖提交逻辑：用户粘贴 Cookie → POST 到后端 → 刷新状态
 */
(function() {
  'use strict';

  console.log('[V15] Loading multi-platform login override...');

  function getMeta(provider) {
    var map = {
      netease: { label: '网易云音乐', short: '网易云', url: 'https://music.163.com/#/login' },
      qq:      { label: 'QQ音乐', short: 'QQ', url: 'https://y.qq.com/n/ryqq/login' },
      kugou:   { label: '酷狗音乐', short: '酷狗', url: 'https://www.kugou.com' },
      kuwo:    { label: '酷我音乐', short: '酷我', url: 'https://www.kuwo.cn' },
      qishui:  { label: '汽水音乐（抖音）', short: '汽水', url: 'https://www.douyin.com' },
      spotify: { label: 'Spotify', short: 'Spotify', url: 'https://open.spotify.com' }
    };
    return map[provider] || { label: provider, short: provider, url: 'https://' + provider + '.com' };
  }

  // 保留 V13 原生的书签小程序流程，用于移动端
  var __origOpenProviderWebLogin = window.openProviderWebLogin;

  window.openProviderWebLogin = function() {
    var p = (window.loginProvider || 'netease') + '';

    // 移动端没有 Cookie-Editor，回退到原生的书签/弹窗取 Cookie 流程
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || (window.innerWidth < 768);
    if (isMobile && typeof __origOpenProviderWebLogin === 'function') {
      console.log('[V15] Mobile detected, delegating to native bookmarklet flow');
      __origOpenProviderWebLogin();
      return;
    }

    if (p === 'netease') {
      if (typeof window.refreshQr === 'function') window.refreshQr();
      return;
    }
    if (p === 'spotify') {
      if (typeof window.openSpotifyOAuth === 'function') { window.openSpotifyOAuth(); return; }
    }

    var meta = getMeta(p);
    var loginUrl = meta.url;

    ['qr-img','qr-shell','refresh-qr-btn','cookie-toggle-btn','cookie-panel'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    var titleEl = document.getElementById('login-modal-title');
    if (titleEl) titleEl.textContent = '\u767B\u5F55 ' + meta.label;
    var descEl = document.getElementById('login-modal-desc');
    if (descEl) descEl.textContent = '\u8BF7\u4F7F\u7528 Cookie-Editor \u83B7\u53D6 ' + meta.label + ' Cookie';

    var html = '<div class="cookie-guide-v15">';

    if (p === 'qishui') {
      html += '<div class="cg-douyin-notice">';
      html += '\u26A0\uFE0F 汽水音乐无独立网页版，请使用 <b>抖音网页版</b> 获取 Cookie。';
      html += '</div>';
    }

    html += '<div class="cg-title">\uD83C\uDF0A 使用 Cookie-Editor 获取 ' + meta.label + ' Cookie</div>';

    html += '<div class="cg-step"><span class="cg-num">1</span><div>';
    html += '打开 <a href="' + loginUrl + '" target="_blank" rel="noopener">' + meta.label + ' 官网</a>，完成账号登录';
    html += '</div></div>';

    html += '<div class="cg-step"><span class="cg-num">2</span><div>';
    html += '安装 Cookie-Editor 浏览器扩展：';
    html += '<div class="cg-extension-links">';
    html += '<a href="https://chrome.google.com/webstore/detail/cookie-editor/fngmhnnpilhplaeedifhccceomclgfk" target="_blank">Chrome</a>';
    html += '<a href="https://addons.mozilla.org/firefox/addon/cookie-editor/" target="_blank">Firefox</a>';
    html += '<a href="https://microsoftedge.microsoft.com/addons/detail/cookie-editor/neaplmfkplejbebmdcagcljejlfkcmgi" target="_blank">Edge</a>';
    html += '</div></div></div>';

    html += '<div class="cg-step"><span class="cg-num">3</span><div>';
    html += '登录后点击浏览器工具栏的 <b>Cookie-Editor</b> 图标 → Export → <b>Netscape HTTP Cookie File</b> → 复制全部内容';
    html += '</div></div>';

    html += '<div class="cg-step"><span class="cg-num">4</span><div>';
    html += '将复制的 Cookie 粘贴到下方文本框，点击保存';
    html += '</div></div>';

    html += '<textarea id="v15-cookie-input" class="cg-textarea" spellcheck="false" autocomplete="off" placeholder="在此粘贴 Cookie（Netscape 格式）..."></textarea>';

    html += '<div class="cg-actions">';
    html += '<button type="button" class="modal-btn" onclick="window.closeLoginModal && window.closeLoginModal()">取消</button>';
    html += '<button type="button" class="modal-btn primary" id="v15-save-cookie-btn" onclick="window.__v15SaveCookie()">保存 Cookie</button>';
    html += '</div>';

    html += '<div class="cg-alt">';
    html += '\uD83D\uDCA1 备用方案：在登录页按 F12 → 控制台输入 <code>copy(document.cookie)</code> → 回车 → 粘贴到上方';
    html += '</div>';

    html += '</div>';

    var statusEl = document.getElementById('qr-status');
    if (statusEl) {
      statusEl.innerHTML = html;
      statusEl.style.display = 'block';
      statusEl.className = 'preview';
    } else {
      console.error('[V15] #qr-status element not found!');
    }

    console.log('[V15] Showing cookie editor guide for:', p);
  };

  window.__v15SaveCookie = function() {
    var input = document.getElementById('v15-cookie-input');
    var cookieStr = (input ? input.value : '').trim();
    if (!cookieStr) {
      if (window.showToast) window.showToast('请先粘贴 Cookie');
      return;
    }

    var p = (window.loginProvider || 'netease') + '';
    var saveBtn = document.getElementById('v15-save-cookie-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '保存中...'; }

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/login/cookie');
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = function() {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '保存 Cookie'; }
      try {
        var res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && (res.ok || res.success || res.loggedIn)) {
          if (window.showToast) window.showToast('登录成功！正在同步用户信息...');
          setTimeout(function() {
            if (typeof window.refreshLoginStatus === 'function') window.refreshLoginStatus(true);
            if (window.closeLoginModal) setTimeout(function() { window.closeLoginModal(); }, 500);
          }, 600);
        } else {
          if (window.showToast) window.showToast('Cookie 无效，请确认已登录该平台后重试');
        }
      } catch(e) {
        if (window.showToast) window.showToast('响应格式异常');
      }
    };

    xhr.onerror = function() {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '保存 Cookie'; }
      if (window.showToast) window.showToast('网络错误，请检查后端是否运行');
    };

    xhr.send(JSON.stringify({ provider: p, cookie: cookieStr }));
    console.log('[V15] Submitting cookie for:', p, '(' + cookieStr.length + ' chars)');
  };

  console.log('[V15] Multi-platform login support loaded successfully.');
})();
