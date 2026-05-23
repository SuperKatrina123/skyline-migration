/**
 * Skyline Knowledge Scanner v2
 * Scans project source for Skyline compatibility issues.
 * Handles both CSS syntax (.scss/.css) and JS style object syntax (.style.ts, inline styles).
 *
 * Usage: node scripts/scan-knowledge.js <project-root>
 */

const fs = require('fs');
const path = require('path');

const root = process.argv[2];
if (!root) { console.error('Usage: node scripts/scan-knowledge.js <project-root>'); process.exit(1); }

const pageDir = 'src/pages/hoteldetail/detail';
const srcDir = path.join(root, pageDir);

// ── Helpers ───────────────────────────────────────
function walk(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (!e.name.startsWith('.')) results.push(...walk(full)); }
    else results.push(full);
  }
  return results;
}

function rel(f) { return path.relative(root, f); }

// ── Scan ──────────────────────────────────────────
const all = walk(srcDir);
const styleFiles = all.filter(f => /\.(scss|css|less)$/.test(f));
const tsxFiles = all.filter(f => /\.tsx?$/.test(f));
const styleObjFiles = tsxFiles.filter(f => /style\.ts$|\.style\.ts$/.test(f) || f.endsWith('style.ts'));
const configFiles = all.filter(f => /\.config\.(mini\.)?(ts|js)$/.test(f));

// aggregate results
const counts = {};
function inc(key) { counts[key] = (counts[key] || 0) + 1; }
function addTo(key, val) {
  if (!counts[key]) counts[key] = {};
  counts[key][val] = (counts[key][val] || 0) + 1;
}

// 1. Config
for (const f of configFiles) {
  const c = fs.readFileSync(f, 'utf-8');
  if (f.includes('.config.mini.')) {
    if (!c.includes('navigationStyle')) inc('config_missing_navStyle');
    if (!c.includes('disableScroll')) inc('config_missing_disableScroll');
  }
}

// 2. CSS incompatibilities in style files
// CSS syntax: `position: sticky;`
// JS syntax: `position: 'sticky',` or `position: "sticky"`
const cssChecks = [
  { css: /position:\s*sticky\b/, js: /position:\s*['"]sticky['"]/, key: 'css_position_sticky' },
  { css: /overflow:\s*(auto|scroll)\b/, js: /overflow:\s*['"](auto|scroll)['"]/, key: 'css_overflow_scroll_auto' },
  { css: /overflow-x:\s*(auto|scroll)\b/, js: /overflowX:\s*['"](auto|scroll)['"]/, key: 'css_overflow_x_scroll' },
  { css: /overflow-y:\s*(auto|scroll)\b/, js: /overflowY:\s*['"](auto|scroll)['"]/, key: 'css_overflow_y_scroll' },
  { css: /display:\s*grid\b/, js: /display:\s*['"]grid['"]/, key: 'css_display_grid' },
  { css: /float:\s*(left|right|none)\b/, js: /float:\s*['"](left|right|none)['"]/, key: 'css_float' },
  { css: /\bclear:\s/, js: /\bclear:\s/, key: 'css_clear' },
  { css: /\bbackground-clip:/, js: /\bbackgroundClip:/, key: 'css_background_clip' },
  { css: /\bbackground-attachment:/, js: /\bbackgroundAttachment:/, key: 'css_background_attachment' },
  { css: /\bwriting-mode:/, js: /\bwritingMode:/, key: 'css_writing_mode' },
  { css: /\btext-indent:/, js: /\btextIndent:/, key: 'css_text_indent' },
  { css: /\boverflow-wrap:/, js: /\boverflowWrap:/, key: 'css_overflow_wrap' },
  { css: /\bresize:/, js: /\bresize:/, key: 'css_resize' },
  { css: /\bjustify-items:/, js: /\bjustifyItems:/, key: 'css_justify_items' },
  { css: /white-space:\s*pre\b/, js: /whiteSpace:\s*['"]pre['"]/, key: 'css_white_space_pre' },
  { css: /white-space:\s*pre-wrap\b/, js: /whiteSpace:\s*['"]pre-wrap['"]/, key: 'css_white_space_prewrap' },
  { css: /white-space:\s*pre-line\b/, js: /whiteSpace:\s*['"]pre-line['"]/, key: 'css_white_space_preline' },
  { css: /text-overflow:\s*ellipsis/, js: /textOverflow:\s*['"]ellipsis['"]/, key: 'css_text_overflow_ellipsis' },
  { css: /\bcontain:/, js: /\bcontain:/, key: 'css_contain' },
  { css: /backdrop-filter:/, js: /\bbackdropFilter:/, key: 'css_backdrop_filter' },
];

for (const f of styleFiles) {
  const c = fs.readFileSync(f, 'utf-8');
  for (const check of cssChecks) {
    if (check.css.test(c)) { inc(check.key); addTo(check.key, rel(f)); }
  }
}
for (const f of tsxFiles) {
  const c = fs.readFileSync(f, 'utf-8');
  for (const check of cssChecks) {
    if (check.js.test(c)) { inc(check.key); addTo(check.key, rel(f)); }
  }
}

// 3. display:flex without flexDirection in style.ts files
for (const f of styleObjFiles) {
  const c = fs.readFileSync(f, 'utf-8');
  const lines = c.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/display:\s*['"]\s*flex\s*['"]/.test(line) && !/flexDirection/.test(lines.slice(i, i+3).join('\n'))) {
      inc('css_flex_no_direction');
    }
  }
}

// 4. Inline display:flex without flexDirection in tsx
for (const f of tsxFiles) {
  const c = fs.readFileSync(f, 'utf-8');
  const lines = c.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // match display:'flex' in inline style contexts
    if (/display['"\s:]*['"]\s*flex\s*['"]/.test(line) && !/flexDirection/.test(lines.slice(i, i+3).join('\n'))) {
      inc('jsx_inline_flex_no_direction');
    }
  }
}

// 5. scroll-view without type
for (const f of tsxFiles) {
  const c = fs.readFileSync(f, 'utf-8');
  const lines = c.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/<scroll-view[\s>]/.test(line) && !/type=/.test(line.substring(0, line.indexOf('>') + 1))) {
      inc('scrollview_no_type');
    }
  }
}

// 6. position:fixed count
let fixedCount = 0;
for (const f of [...styleFiles, ...tsxFiles]) {
  const c = fs.readFileSync(f, 'utf-8');
  fixedCount += (c.match(/position:\s*(fixed|'fixed'|"fixed")/g) || []).length;
}
counts.position_fixed_total = fixedCount;

// 7. page-level scroll APIs
let pageScrollCount = 0;
const pageScrollFiles = [];
for (const f of tsxFiles) {
  const c = fs.readFileSync(f, 'utf-8');
  if (/window\.(scrollY|scrollTo|addEventListener\(['"]scroll)/.test(c)) {
    pageScrollFiles.push(rel(f));
    pageScrollCount += (c.match(/window\.(scrollY|scrollTo)/g) || []).length;
  }
}
counts.page_scroll_api_count = pageScrollCount;
counts.page_scroll_files = pageScrollFiles;

// 8. XScrollView usage
for (const f of tsxFiles) {
  const c = fs.readFileSync(f, 'utf-8');
  if (/XScrollView/.test(c) && !/type=/.test(c)) {
    inc('xscrollview_no_type');
  }
}

// ── Output summary ────────────────────────────────
const result = {
  scanned: { tsx: tsxFiles.length, style: styleFiles.length, styleObj: styleObjFiles.length, config: configFiles.length },
  totalSourceFiles: all.length,
  counts,
  // Summarize per-file details only for key issues
};

// Count unique files per pattern
for (const key of Object.keys(counts)) {
  if (typeof counts[key] === 'object' && !Array.isArray(counts[key])) {
    const files = Object.keys(counts[key]);
    result.counts[key] = files.length;
    if (key.includes('sticky') || key.includes('overflow') || key.includes('float') || key.includes('scrollview')) {
      result[`${key}_files`] = files.slice(0, 15); // sample
    }
  }
}

console.log(JSON.stringify(result, null, 2));
