// ====================================================================
//  Puppeteer 自动登录 V6 — 截图式全平台统一方案
//
//  核心策略（极简）：
//  1. 打开登录页 → 等页面加载完
//  2. 如果没二维码 → 尝试点"登录"按钮
//  3. 截图整页（或弹窗区域）→ 返回给前端显示
//  4. 保持浏览器打开，每 2.5 秒检测：URL 变了？Cookie 变了？
//  5. 用户扫码/登录成功后 → 自动提取 Cookie → 关闭浏览器
//
//  优势：不需要找 QR 选择器、不需要解析 iframe、不需要知道各平台的 DOM 结构
//  用户看到的就是真实登录页的截图，扫码就行
// ====================================================================

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

// ════════════════════════════════════════
//  Puppeteer 懒加载
// ════════════════════════════════════════
var _puppeteer = null;
var _puppeteerDiag = null;

function getPuppeteer() {
  if (_puppeteer) return _puppeteer;

  var diag = { cwd: process.cwd(), nodeVersion: process.version, attempts: [] };

  try {
    diag.attempts.push('require("puppeteer")');
    _puppeteer = require('puppeteer');
    console.log('[Puppeteer] ✅ 加载成功 (direct)');
    _puppeteerDiag = diag;
    return _puppeteer;
  } catch (e1) {
    diag.attempts.push('fail: ' + e1.message.split('\n')[0]);
  }

  try {
    var p2 = path.join(__dirname, 'node_modules', 'puppeteer');
    diag.attempts.push('require(__dirname/puppeteer)');
    fs.accessSync(p2);
    _puppeteer = require(p2);
    console.log('[Puppeteer] ✅ 加载成功 (__dirname)');
    _puppeteerDiag = diag;
    return _puppeteer;
  } catch (e2) {
    diag.attempts.push('fail: ' + (e2.message || e2.code).split('\n')[0]);
  }

  try {
    var resolvePaths = require.resolve.paths && require.resolve.paths('puppeteer') || [];
    for (var i = 0; i < resolvePaths.length; i++) {
      try {
        var candidate = path.join(resolvePaths[i], 'puppeteer');
        fs.accessSync(path.join(candidate, 'package.json'));
        diag.attempts.push('resolve path[' + i + ']');
        _puppeteer = require(candidate);
        console.log('[Puppeteer] ✅ 加载成功 (resolve)');
        _puppeteerDiag = diag;
        return _puppeteer;
      } catch (e3) { /* continue */ }
    }
  } catch (e4) { /* ignore */ }

  _puppeteerDiag = diag;
  console.warn('[Puppeteer] ❌ 加载失败:', JSON.stringify(diag, null, 2));
  return null;
}

function isPuppeteerAvailable() { return !!getPuppeteer(); }
function getDiag() { return _puppeteerDiag || { error: '从未尝试加载' }; }

// ════════════════════════════════════════
//  平台配置（精简版 — 只需要 URL 和 Cookie 域名）
// ════════════════════════════════════════
var PLATFORMS = {

  qq: {
    name: 'QQ音乐',
    // QQ 音乐登录页
    loginUrl: 'https://y.qq.com/n/ryqq/login',
    // 如果被重定向到首页，尝试点击的按钮
    loginBtnSelectors: [
      'a[href*="login"]', '.login-btn', '#top_login_btn',
      '.nav__login', '.header_login', '[data-type="login"]',
    ],
    // Cookie 收集域名
    cookieDomains: ['https://y.qq.com', 'https://qq.com'],
    // 判断已登录：URL 不再包含 login 关键词 + 有认证 cookie
    checkLogin: function(url, cookies) {
      if (url.includes('/login') || url.includes('/ryqq/login') || url.includes('ptlogin2')) return false;
      var hasUin = cookies.some(function(c) { return c.name === 'uin' && c.value; });
      var hasKey = cookies.some(function(c) { return c.name === 'qm_keyst' && c.value; });
      return hasUin || hasKey;
    },
    extraHeaders: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  },

  kugou: {
    name: '酷狗音乐',
    loginUrl: 'https://www.kugou.com/',
    loginBtnSelectors: [
      'a[href*="login"]', '.loginBtn', '.pop-login-btn',
      '.login-btn', '[data-log="login"]',
    ],
    cookieDomains: ['https://www.kugou.com', 'https://kugou.com', 'https://login.kugou.com'],
    checkLogin: function(url, cookies) {
      if (url.includes('login.kugou')) return false;
      return cookies.some(function(c) {
        return (c.name === 'KugooID' || c.name === 'kg_mid') && c.value;
      });
    },
    extraHeaders: {
      'Referer': 'https://www.kugou.com/',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  },

  kuwo: {
    name: '酷我音乐',
    loginUrl: 'https://www.kuwo.cn/login',
    loginBtnSelectors: [
      'a[href*="login"]', '.login-btn', '#loginBtn',
    ],
    cookieDomains: ['https://www.kuwo.cn'],
    checkLogin: function(url, cookies) {
      if (url.includes('/login')) return false;
      return cookies.some(function(c) {
        return (c.name === 'kw_token' || c.name === 'uid') && c.value;
      });
    },
    extraHeaders: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  },

  qishui: {
    name: '汽水音乐',
    loginUrl: 'https://qishui.douyin.com/',
    loginBtnSelectors: [
      'a[href*="login"]', '.web-login-btn', '.header-login',
    ],
    cookieDomains: ['https://qishui.douyin.com', 'https://douyin.com'],
    checkLogin: function(url, cookies) {
      return cookies.some(function(c) {
        return (c.name === 'sessionid' || c.name === 'uid_tt' || c.name === 'passport_csrf_token') && c.value;
      });
    },
    extraHeaders: {},
  },

};

// ════════════════════════════════════════
//  Chrome 路径检测
// ════════════════════════════════════════
function detectChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  var candidates = [
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser', '/usr/bin/chromium',
    '/snap/bin/chromium',
  ];
  for (var i = 0; i < candidates.length; i++) {
    try { if (fs.existsSync(candidates[i])) return candidates[i]; } catch (e) {}
  }
  return null;
}

var CHROME_PATH = detectChromePath();

// ════════════════════════════════════════
//  浏览器单例
// ════════════════════════════════════════
var globalBrowser = null;
var launchPromise = null;

async function getBrowser() {
  if (globalBrowser && globalBrowser.isConnected()) return globalBrowser;
  if (launchPromise) return launchPromise;

  launchPromise = (async function() {
    var puppeteer = getPuppeteer();
    if (!puppeteer) throw new Error('Puppeteer 未安装');

    var opts = {
      headless: 'new',
      args: [
        '--no-sandbox', '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1366,768',
        '--disable-infobars', '--no-first-run',
        '--disable-extensions', '--disable-background-networking',
        '--disable-client-side-phishing-detection',
        '--disable-sync', '--disable-default-apps',
        '--disable-translate', '--disable-breakpad',
        '--silent', '--log-level=3',
      ],
    };
    if (CHROME_PATH) opts.executablePath = CHROME_PATH;

    globalBrowser = await puppeteer.launch(opts);
    console.log('[Puppeteer] 🌐 浏览器已启动 (V6 截图模式)');

    globalBrowser.on('disconnected', function() {
      console.log('[Puppeteer] 🌐 浏览器断开');
      globalBrowser = null; launchPromise = null;
    });

    launchPromise = null;
    return globalBrowser;
  })();

  return launchPromise;
}

// ════════════════════════════════════════
//  安全关闭页面
// ════════════════════════════════════════
async function safeClose(page) {
  try {
    if (page && typeof page.isClosed === 'function' && page.isClosed() === false) {
      await page.close();
    }
  } catch (e) {
    if (!String(e.message).match(/closeTarget|Protocol error/i)) {
      console.warn('[safeClose] ' + e.message.substr(0, 100));
    }
  }
}

// ════════════════════════════════════════
//  反检测脚本
// ════════════════════════════════════════
var STEALTH_SCRIPT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'plugins', {
    get: () => [1,2,3,4,5].map(() => ({name:'Chrome PDF Plugin',filename:'internal-pdf-viewer',description:'PDF'}))
  });
  Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN','zh','en-US','en'] });
  window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){} };
  const origQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (params) =>
    params.name === 'notifications' ? Promise.resolve({state: Notification.permission}) : origQuery(params);
  const getParam = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(p) {
    if (p === 37445) return 'Intel Inc.';
    if (p === 37446) return 'Intel Iris OpenGL Engine';
    return getParam.call(this, p);
  };
`;

async function initPage(page, config) {
  await page.evaluateOnNewDocument(STEALTH_SCRIPT);
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.6367.91 Safari/537.36'
  );
  await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1 });

  if (config.extraHeaders) {
    await page.setExtraHTTPHeaders(config.extraHeaders);
  }

  // 只拦截字体和视频，放行所有图片和 CSS！
  await page.setRequestInterception(true);
  page.on('request', function(req) {
    var type = req.resourceType();
    if (type === 'font' || type === 'media') {
      req.abort();
    } else {
      req.continue();
    }
  });
}

// ════════════════════════════════════════
//  核心函数：导航到登录页 + 截图返回
// ════════════════════════════════════════
function sleep(ms) {
  return new Promise(function(r) { setTimeout(r, ms); });
}

/**
 * 导航到登录页，确保二维码可见，然后截图
 * 返回 { qrData: base64图片 } 或 { qrData: null, error: string }
 */
async function navigateAndScreenshot(page, provider, config) {
  var tag = '[' + provider + ']';

  // Step 1: 导航到登录页
  console.log('[Puppeteer]' + tag + ' 打开登录页: ' + config.loginUrl);
  try {
    await page.goto(config.loginUrl, {
      waitUntil: 'networkidle2', timeout: 25000,
    });
  } catch (e) {
    console.warn('[Puppeteer]' + tag + ' 导航警告(可能超时): ' + e.message.substr(0, 80));
  }
  await sleep(2000);

  var currentUrl = page.url();
  console.log('[Puppeteer]' + tag + ' 当前 URL: ' + currentUrl);

  // Step 2: 检测是否需要点"登录"按钮弹出二维码弹窗
  var urlHasLogin = currentUrl.toLowerCase().includes('login');
  var isOnLoginPage = urlHasLogin || currentUrl === config.loginUrl;

  if (!isOnLoginPage) {
    console.log('[Puppeteer]' + tag + ' 被重定向到非登录页，尝试点击登录按钮...');
    var clicked = await tryClickLoginButton(page, config.loginBtnSelectors);

    if (clicked) {
      // 等弹窗动画 + 二维码加载
      console.log('[Puppeteer]' + tag + ' 已点击登录按钮，等待弹窗加载...');
      await sleep(4000);
    } else {
      // 文本匹配兜底
      console.log('[Puppeteer]' + tag + ' 选择器未匹配，尝试文本匹配"登录"...');
      var textHit = await page.evaluate(function() {
        var els = document.querySelectorAll('a,button,[role="button"],span,div,li');
        for (var i = 0; i < els.length; i++) {
          var t = (els[i].textContent || '').trim();
          if ((t === '登录' || t === 'LOGIN') && els[i].offsetParent !== null) {
            els[i].click(); return true;
          }
        }
        return false;
      }).catch(function() { return false; });

      if (textHit) {
        console.log('[Puppeteer]' + tag + ' 文本匹配成功，等待弹窗...');
        await sleep(4000);
      } else {
        console.warn('[Puppeteer]' + tag + ' ⚠️ 未找到登录按钮，将直接截图当前页面');
      }
    }
  }

  // Step 3: 截图！这就是核心 — 直接截屏发给前端
  var screenshot = await takeSmartScreenshot(page);
  if (screenshot) {
    console.log('[Puppeteer]' + tag + ' ✅ 截图成功 (' + screenshot.length + ' bytes base64)');
  } else {
    console.warn('[Puppeteer]' + tag + ' ⚠️ 截图失败');
  }

  return { qrData: screenshot };
}

// 尝试点击登录按钮
async function tryClickLoginButton(page, selectors) {
  for (var i = 0; i < selectors.length; i++) {
    try {
      var btn = await page.waitForSelector(selectors[i], { timeout: 1500 }).catch(function() { return null; });
      if (btn) {
        await btn.evaluate(function(el) { el.click(); }).catch(function() {});
        console.log('[tryClick] 点击了: ' + selectors[i]);
        return true;
      }
    } catch (e) {}
  }
  return false;
}

// 智能截图：优先截登录弹窗区域，否则截整页
async function takeSmartScreenshot(page) {
  // 策略 A：查找可能的登录弹窗/模态框并局部截图
  var modalSelectors = [
    '[class*="modal"]:not([class*="music"])', '[class*="popup"]', '[class*="dialog"]',
    '[class*="overlay"]', '[class*="panel"][class*="login"]',
    '[class*="qr-code"]', '[class*="qrcode"]', '[class*="login-box"]',
    '[class*="login-pop"]', '[role="dialog"]',
  ];

  for (var i = 0; i < modalSelectors.length; i++) {
    try {
      var el = await page.$(modalSelectors[i]);
      if (!el) continue;
      var box = await el.boundingBox().catch(function() { return null; });
      // 合理的弹窗尺寸：至少 120x120，不超过 800x800
      if (box && box.width >= 120 && box.height >= 120 && box.width <= 800 && box.height <= 800) {
        var shot = await el.screenshot({ type: 'png', encoding: 'base64' }).catch(function() { return null; });
        if (shot) {
          console.log('[screenshot] 局部截图: ' + modalSelectors[i] + ' (' +
            Math.round(box.width) + 'x' + Math.round(box.height) + ')');
          return 'data:image/png;base64,' + shot;
        }
      }
    } catch (e) {}
  }

  // 策略 B：整页截图
  try {
    var fullShot = await page.screenshot({
      type: 'png', encoding: 'base64', fullPage: false,
    });
    if (fullShot) {
      console.log('[screenshot] 整页截图 (' + Math.round(fullShot.length / 1024) + 'KB)');
      return 'data:image/png;base64,' + fullShot;
    }
  } catch (e) {
    console.error('[screenshot] 失败:', e.message);
  }

  return null;
}

// ════════════════════════════════════════
//  会话管理
// ════════════════════════════════════════
var activeSessions = new Map();

async function createLoginSession(provider) {
  var config = PLATFORMS[provider];
  if (!config) throw new Error('不支持的登录平台: ' + provider);

  console.log('[Puppeteer] 🚀 创建会话: ' + provider + ' (' + config.name + ')');
  var sessionId = crypto.randomUUID();
  var browser = await getBrowser();
  var page = await browser.newPage();

  // 初始化页面
  await initPage(page, config);

  // 导航 + 截图
  var result = await navigateAndScreenshot(page, provider, config);

  var session = {
    id: sessionId,
    provider: provider,
    name: config.name,
    page: page,
    config: config,
    status: result.qrData ? 'waiting' : 'error',
    qrData: result.qrData,
    cookies: null,
    error: result.qrData ? null : '无法获取登录页截图（可能被反爬拦截）',
    createdAt: Date.now(),
    initialCookies: [],  // 初始 cookie 快照，用于对比变化
    lastUrl: page.url(),
    _pollTimer: null,
  };

  // 记录初始 cookies 用于后续对比
  try {
    for (var di = 0; di < config.cookieDomains.length; di++) {
      session.initialCookies = session.initialCookies.concat(
        await page.cookies(config.cookieDomains[di]).catch(function() { return []; })
      );
    }
  } catch (e) {}

  activeSessions.set(sessionId, session);

  if (session.status === 'waiting') {
    startPolling(session);
  }

  console.log('[Puppeteer] ✅ 会话就绪: ' + sessionId.substr(0,12) + ' status=' + session.status);

  return {
    sessionId: sessionId,
    qrData: session.qrData,
    status: session.status,
    error: session.error,
    message: session.qrData ? '请扫描下方二维码登录' : session.error,
  };
}

// ════════════════════════════════════════
//  轮询：自动检测用户登录完成
// ════════════════════════════════════════
function startPolling(session) {
  var MAX_DURATION = 5 * 60 * 1000;   // 5 分钟超时
  var POLL_INTERVAL = 2500;            // 2.5 秒检查一次
  var page = session.page;
  var config = session.config;

  session._pollTimer = setInterval(async function() {
    // 会话已被清理？
    if (!activeSessions.has(session.id)) { clearInterval(session._pollTimer); return; }
    if (session.status === 'logged_in' || session.status === 'error') {
      clearInterval(session._pollTimer); return;
    }

    // 超时检查
    if (Date.now() - session.createdAt > MAX_DURATION) {
      session.status = 'error';
      session.error = '⏰ 登录超时（5分钟），请刷新重试';
      clearInterval(session._pollTimer);
      await safeClose(page);
      console.log('[Puppeteer] ⏰ 超时: ' + session.provider);
      return;
    }

    try {
      // 页面还活着？
      if (!page || typeof page.isClosed !== 'function' || page.isClosed()) {
        session.status = 'error'; session.error = '页面意外关闭';
        clearInterval(session._pollTimer); return;
      }

      var url = page.url();

      // 收集所有域名的 cookies
      var allCookies = [];
      for (var di = 0; di < config.cookieDomains.length; di++) {
        try {
          allCookies = allCookies.concat(
            await page.cookies(config.cookieDomains[di])
          );
        } catch (e) {}
      }

      // 方法A：用平台自定义判断函数
      var loggedIn = config.checkLogin(url, allCookies);

      // 方法B（备用）：cookie 数量显著增加（新增了登录后的认证 cookie）
      if (!loggedIn) {
        loggedIn = hasNewAuthCookies(session.initialCookies, allCookies);
      }

      if (loggedIn) {
        // ✅ 登录成功！提取 cookie 并关闭浏览器
        session.status = 'logged_in';

        // 去重合并
        var seen = {};
        var unique = [];
        allCookies.forEach(function(c) {
          if (!seen[c.name]) { seen[c.name] = 1; unique.push(c); }
        });
        session.cookies = unique.map(function(c) {
          return c.name + '=' + c.value;
        }).join('; ');

        clearInterval(session._pollTimer);
        console.log('[Puppeteer] ✅✅ ' + session.name + ' 登录成功! cookies=' +
          session.cookies.substr(0, 80) + '...');

        // 延迟关闭浏览器（确保所有请求完成）
        setTimeout(async function() {
          await safeClose(page);
          console.log('[Puppeteer] 🔒 已关闭 ' + session.name + ' 的浏览器页面');
        }, 3000);
      } else {
        // 记录 URL 变化
        if (url !== session.lastUrl) {
          if (session.status === 'waiting') session.status = 'scanning';
          session.lastUrl = url;
          console.log('[Puppeteer][' + session.provider + '] URL 变化: ' + url);
        }
      }
    } catch (e) {
      // 页面可能在导航中，静默忽略
    }
  }, POLL_INTERVAL);
}

// 检测是否有新的认证 cookie 出现（通用方法，不依赖具体 cookie 名字）
function hasNewAuthCookies(initial, current) {
  var initialNames = {};
  initial.forEach(function(c) { initialNames[c.name] = c.value; });

  var newCount = 0;
  var totalSize = 0;
  current.forEach(function(c) {
    var prevVal = initialNames[c.name];
    if (!prevVal || prevVal !== c.value) {
      // 新出现或有变化的 cookie
      if (c.value && c.value.length > 10) {
        newCount++;
        totalSize += c.value.length;
      }
    }
  });

  // 新增/变化了 >= 2 个有意义的 cookie → 很可能是登录成功了
  return newCount >= 2 && totalSize > 40;
}

// ════════════════════════════════════════
//  API 接口
// ════════════════════════════════════════
async function checkSession(sessionId) {
  var session = activeSessions.get(sessionId);
  if (!session) return { status: 'not_found', message: '会话不存在或已过期' };
  return {
    sessionId: sessionId,
    status: session.status,
    provider: session.provider,
    name: session.name,
    qrData: session.qrData,
    cookies: session.status === 'logged_in' ? session.cookies : null,
    error: session.error,
    createdAt: session.createdAt,
  };
}

async function getSessionQR(sessionId) {
  var session = activeSessions.get(sessionId);
  if (!session) return null;
  return { qrData: session.qrData, status: session.status, error: session.error };
}

// 定期清理过期会话
setInterval(function() {
  var now = Date.now();
  var maxAge = 10 * 60 * 1000;
  activeSessions.forEach(function(session, id) {
    var expired = session.status === 'logged_in' || session.status === 'error' || now - session.createdAt > maxAge;
    if (expired) {
      if (session._pollTimer) clearInterval(session._pollTimer);
      safeClose(session.page);
      activeSessions.delete(id);
    }
  });
}, 60000);

// ════════════════════════════════════════
//  导出接口
// ════════════════════════════════════════
module.exports = {
  createLoginSession: async function(provider) {
    if (!isPuppeteerAvailable()) return Promise.reject(new Error('Puppeteer 未安装'));
    return createLoginSession(provider);
  },
  checkSession: async function(sessionId) {
    if (!isPuppeteerAvailable()) return Promise.reject(new Error('Puppeteer 未安装'));
    return checkSession(sessionId);
  },
  getSessionQR: async function(sessionId) {
    if (!isPuppeteerAvailable()) return Promise.reject(new Error('Puppeteer 未安装'));
    return getSessionQR(sessionId);
  },
  closeAllSessions: async function() {
    activeSessions.forEach(function(s) {
      if (s._pollTimer) clearInterval(s._pollTimer);
      safeClose(s.page);
    });
    activeSessions.clear();
    if (globalBrowser) { try { await globalBrowser.close(); } catch(e) {} globalBrowser = null; launchPromise = null; }
  },
  cleanupSessions: function() {},  // 兼容旧调用
  activeSessions: activeSessions,
  PLATFORMS: PLATFORMS,
  isAvailable: isPuppeteerAvailable,
  getDiag: getDiag,
};
