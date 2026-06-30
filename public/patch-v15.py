# -*- coding: utf-8 -*-
"""
V15 Minimal Patch for index.html (based on V13 backup)
Changes:
1. Fix DIY button: add SVG gear icon before "DIY" text
2. Fix particle params: DPR_CAP=2.0 -> 1.35, PIXEL_BUDGET=12000000 -> 5200000
3. Inject cookie-guide CSS before </style>
4. Add v15-login-override.js <script> tag before </body>
"""
import re

html_path = 'index.html'

with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

changes = []

# ====== 1. FIX DIY BUTTON: add SVG icon ======
old_diy_pattern = r'(<button[^>]*id="diy-mode-btn"[^>]*>)(DIY)(</button>)'
new_diy_repl = r'''\1<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>\2\3'''

m = re.search(old_diy_pattern, html)
if m:
    html = re.sub(old_diy_pattern, new_diy_repl, html, count=1)
    changes.append('[OK] DIY button SVG icon added')
else:
    changes.append('[SKIP] DIY button pattern not matched')

# ====== 2. FIX PARTICLE PARAMS ======
p1_count = html.count('var RENDER_DPR_CAP = 2.0;')
if p1_count > 0:
    html = html.replace('var RENDER_DPR_CAP = 2.0;', 'var RENDER_DPR_CAP = 1.35;', 1)
    changes.append('[OK] RENDER_DPR_CAP: 2.0 -> 1.35')
else:
    changes.append(f'[SKIP] DPR_CAP already correct or not found (count={p1_count})')

p2_count = html.count('var RENDER_PIXEL_BUDGET = 12000000;')
if p2_count > 0:
    html = html.replace('var RENDER_PIXEL_BUDGET = 12000000;', 'var RENDER_PIXEL_BUDGET = 5200000;', 1)
    changes.append('[OK] RENDER_PIXEL_BUDGET: 12000000 -> 5200000')
else:
    changes.append(f'[SKIP] PIXEL_BUDGET already correct or not found (count={p2_count})')

# ====== 3. INJECT COOKIE-GUIDE CSS before </style> ======
css_block = """
    /* V15 Cookie-Editor Login Guide */
    .cookie-guide-v15 { padding: 14px 16px; text-align: left; }
    .cookie-guide-v15 .cg-title { font-size: 14px; font-weight: 700; margin-bottom: 10px; color: #fff; }
    .cookie-guide-v15 .cg-step { display: flex; align-items: flex-start; margin-bottom: 7px; font-size: 12.5px; color: rgba(255,255,255,0.82); line-height: 1.5; }
    .cookie-guide-v15 .cg-num { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; border-radius: 50%; background: rgba(255,255,255,0.13); color: #fff; font-size: 11px; font-weight: 700; margin-right: 8px; flex-shrink: 0; }
    .cookie-guide-v15 .cg-step a { color: #64b5f6; text-decoration: underline; }
    .cookie-guide-v15 .cg-textarea { width: 100%; min-height: 56px; margin: 8px 0 6px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.18); border-radius: 8px; color: #fff; padding: 8px 10px; font-size: 11.5px; font-family: monospace; resize: vertical; box-sizing: border-box; }
    .cookie-guide-v15 .cg-textarea::placeholder { color: rgba(255,255,255,0.35); }
    .cookie-guide-v15 .cg-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
    .cookie-guide-v15 .cg-alt { margin-top: 10px; font-size: 11.5px; color: rgba(255,255,255,0.45); }
    .cookie-guide-v15 .cg-alt a { color: #64b5f6; cursor: pointer; }
    .cg-douyin-notice { background: rgba(255,190,0,0.09); border: 1px solid rgba(255,190,0,0.25); border-radius: 8px; padding: 9px 12px; margin-bottom: 10px; font-size: 12.5px; color: #ffc107; line-height: 1.5; }
    .cg-extension-links { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
    .cg-extension-links a { display: inline-block; padding: 5px 10px; background: rgba(255,255,255,0.08); border-radius: 6px; color: #90caf9; font-size: 11.5px; text-decoration: none; }
    .cg-extension-links a:hover { background: rgba(255,255,255,0.14); }
"""

last_style_pos = html.rfind('</style>')
if last_style_pos != -1 and 'cookie-guide-v15' not in html:
    html = html[:last_style_pos] + css_block + '\n    ' + html[last_style_pos:]
    changes.append('[OK] Cookie-guide CSS injected before </style>')
else:
    if 'cookie-guide-v15' in html:
        changes.append('[SKIP] Cookie-guide CSS already present')
    else:
        changes.append('[WARN] Could not find </style> for CSS injection')

# ====== 4. ADD v15-login-override.js SCRIPT TAG before </body> ======
script_tag = '<script src="v15-login-override.js"></script>\n</body>'
if '</body>' in html and 'v15-login-override.js' not in html:
    html = html.replace('</body>', script_tag, 1)
    changes.append('[OK] v15-login-override.js script tag added before </body>')
elif 'v15-login-override.js' in html:
    changes.append('[SKIP] v15-login-override.js already included')
else:
    changes.append('[WARN] Could not find </body> for script injection')

# Write back
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print('\n=== V15 Patch Results ===')
for c in changes:
    print(c)

# Verify
with open(html_path, 'r', encoding='utf-8') as f:
    verify = f.read()
print('\n--- Verification ---')
print('Total lines:', len(verify.split('\n')))
print('Has DIY SVG:', '<svg' in verify[verify.find('diy-mode-btn'):verify.find('diy-mode-btn')+400])
print('Has DPR_CAP 1.35:', 'RENDER_DPR_CAP = 1.35' in verify)
print('Has PIXEL_BUDGET 5200000:', 'RENDER_PIXEL_BUDGET = 5200000' in verify)
print('Has cookie-guide CSS:', 'cookie-guide-v15' in verify)
print('Has v15 override JS:', 'v15-login-override.js' in verify)
