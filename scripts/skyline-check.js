/**
 * Skyline Quick Check — 校验本次变更或指定 commit 的 Skyline 兼容性
 *
 * Usage:
 *   node scripts/skyline-check.js                    # 校验所有未提交的变更
 *   node scripts/skyline-check.js --commit <hash>    # 校验某个 commit
 *   node scripts/skyline-check.js <path>             # 校验单个文件/目录
 *
 * Examples:
 *   node scripts/skyline-check.js
 *   node scripts/skyline-check.js --commit abc123
 *   node scripts/skyline-check.js src/pages/hoteldetail/detail
 *
 * 校验范围：
 *   1. Config 检查 — navigationStyle / disableScroll
 *   2. CSS 属性检查 — 不支持的属性/值
 *   3. 组件检查 — 不支持的组件
 *   4. ScrollView 检查 — 是否缺少 type 属性
 *   5. 内联样式 flex-direction 默认值提醒
 *
 * 工作流：
 *   日常开发中改完代码直接 node scripts/skyline-check.js，
 *   无需指定文件路径，自动比对变更内容。
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();

// ── Config 无问题清单 ──────────────────────────────────
const CONFIG_REQUIRED = {
  navigationStyle: 'custom',
  disableScroll: true,
};

// ── CSS 不支持的属性和值 ────────────────────────────
const UNSUPPORTED_CSS = [
  { prop: 'position', value: 'sticky', msg: '不支持 sticky，使用 sticky-header 组件或 position:fixed + 占位符替代' },
  { prop: 'overflow', value: 'auto', msg: '不支持 overflow:auto，使用 scroll-view 组件替代' },
  { prop: 'overflow', value: 'scroll', msg: '不支持 overflow:scroll，使用 scroll-view 组件替代' },
  { prop: 'overflow-x', value: null, checkAny: true, msg: 'overflow-x 不支持 scroll/auto 值，使用 scroll-view 替代' },
  { prop: 'overflow-y', value: null, checkAny: true, msg: 'overflow-y 不支持 scroll/auto 值，使用 scroll-view 替代' },
  { prop: 'display', value: 'grid', msg: '不支持 display:grid，使用 flex 布局替代' },
  { prop: 'display', value: 'flow-root', msg: '不支持 display:flow-root' },
  { prop: 'float', value: null, checkAny: true, msg: '不支持 float，使用 flex + marginLeft:auto 替代' },
  { prop: 'clear', value: null, checkAny: true, msg: '不支持 clear' },
  { prop: 'resize', value: null, checkAny: true, msg: '不支持 resize' },
  { prop: 'writing-mode', value: null, checkAny: true, msg: '不支持 writing-mode' },
  { prop: 'text-indent', value: null, checkAny: true, msg: '不支持 text-indent，使用 padding 模拟' },
  { prop: 'overflow-wrap', value: null, checkAny: true, msg: '不支持 overflow-wrap，改用 word-break:break-all' },
  { prop: 'background-attachment', value: null, checkAny: true, msg: '不支持 background-attachment' },
  { prop: 'background-clip', value: null, checkAny: true, msg: '不支持 background-clip，用嵌套元素模拟' },
  { prop: 'justify-items', value: null, checkAny: true, msg: '不支持 justify-items' },
  { prop: 'text-decoration-thickness', value: null, checkAny: true, msg: '不支持 text-decoration-thickness' },
  { prop: 'white-space', value: 'pre', msg: '不支持 white-space:pre' },
  { prop: 'white-space', value: 'pre-wrap', msg: '不支持 white-space:pre-wrap' },
  { prop: 'white-space', value: 'pre-line', msg: '不支持 white-space:pre-line' },
  { prop: 'contain', value: null, checkAny: true, msg: '不支持 contain，使用 -wx-contain 替代' },
];

// ── Skyline 不支持的组件 ────────────────────────────
const UNSUPPORTED_COMPONENTS = [
  'web-view',
  'editor',
  'movable-view',
  'movable-area',
  'cover-view',
  'cover-image',
  'match-media',
  'page-meta',
  'navigation-bar',
  'functional-page-navigator',
  'live-player',
  'live-pusher',
  'voip-room',
];

// ── Skyline 端组件映射 ────────────────────────────
const SKYLINE_ALT_COMPONENTS = {};

// ── 解析变更文件列表 ──────────────────────────────

function getChangedFiles(target) {
  let files = [];

  if (target && target.startsWith('--commit=')) {
    const hash = target.replace('--commit=', '');
    const output = execSync(`git diff-tree --no-commit-id -r -m --name-only ${hash}`, { cwd: ROOT }).toString().trim();
    files = output ? output.split('\n') : [];
    console.log(`  模式: commit ${hash} (${files.length} 个文件变更)\n`);
  } else if (target && target.startsWith('--commit ')) {
    const hash = target.replace('--commit ', '');
    const output = execSync(`git diff-tree --no-commit-id -r -m --name-only ${hash}`, { cwd: ROOT }).toString().trim();
    files = output ? output.split('\n') : [];
    console.log(`  模式: commit ${hash} (${files.length} 个文件变更)\n`);
  } else if (target) {
    // 指定路径
    const targetPath = path.resolve(ROOT, target);
    if (!fs.existsSync(targetPath)) {
      console.error(`Error: path not found — ${targetPath}`);
      process.exit(1);
    }
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      files = findFiles(targetPath, /\.(tsx?|scss|css|less)$/).map(f => path.relative(ROOT, f));
    } else {
      files = [path.relative(ROOT, targetPath)];
    }
    console.log(`  模式: 指定路径 (${files.length} 个文件)\n`);
  } else {
    // 默认: 所有未提交的变更 (staged + unstaged)
    const staged = execSync(`git diff --cached --name-only --diff-filter=ACMR`, { cwd: ROOT }).toString().trim();
    const unstaged = execSync(`git diff --name-only --diff-filter=ACMR`, { cwd: ROOT }).toString().trim();
    const all = [...(staged ? staged.split('\n') : []), ...(unstaged ? unstaged.split('\n') : [])];
    files = [...new Set(all)];
    console.log(`  模式: 未提交变更 (${files.length} 个文件变更)\n`);
  }

  // 只保留相关文件类型
  return files.filter(f => /\.(tsx?|scss|css|less|config\.(ts|js))$/.test(f));
}

// ── 工具函数 ──────────────────────────────────────

function findFiles(dir, pattern) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, pattern));
    } else if (pattern.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

// ── 单项检查函数 ──────────────────────────────────

/**
 * 检查 .config 文件
 */
function checkConfigFile(relativePath, content) {
  const issues = [];
  const isMiniConfig = relativePath.endsWith('.config.mini.js') || relativePath.endsWith('.config.mini.ts');
  const isConfig = /\.config\.(ts|js)$/.test(relativePath);

  if (!isConfig) return issues;

  const hasNavCustom = content.includes('"custom"') || content.includes("'custom'");
  const hasDisableScroll = content.includes('disableScroll');

  if (!hasNavCustom) {
    issues.push({
      severity: 'ERROR',
      msg: `需要配置 navigationStyle: "custom"${isMiniConfig ? '' : '（如已有 .mini 配置则忽略）'}`,
    });
  }
  if (!hasDisableScroll) {
    issues.push({
      severity: isMiniConfig ? 'WARN' : 'INFO',
      msg: `${isMiniConfig ? '推荐' : '建议在 .mini 配置中'}配置 disableScroll: true（如已用 scroll-view 管理滚动）`,
    });
  }

  return issues;
}

/**
 * 检查 style 文件中的 CSS 兼容性
 */
function checkStyleContent(relativePath, lines) {
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    for (const rule of UNSUPPORTED_CSS) {
      const propRegex = new RegExp(`${rule.prop}:\\s*`);
      if (!propRegex.test(trimmed)) continue;

      if (rule.checkAny) {
        // 只要出现这个属性就算问题
        issues.push({
          file: relativePath,
          line: i + 1,
          severity: 'ERROR',
          msg: rule.msg,
          code: trimmed,
        });
        break;
      }

      if (rule.value !== null && trimmed.includes(`${rule.prop}: ${rule.value}`)) {
        issues.push({
          file: relativePath,
          line: i + 1,
          severity: 'ERROR',
          msg: rule.msg,
          code: trimmed,
        });
        break;
      }
    }

    // text-overflow: ellipsis 在 view 上不生效的提醒
    if (/text-overflow\s*:\s*ellipsis/.test(trimmed)) {
      issues.push({
        file: relativePath,
        line: i + 1,
        severity: 'WARN',
        msg: 'text-overflow:ellipsis 仅在 <text> 组件生效，View 上无效',
        code: trimmed,
      });
    }
  }

  return issues;
}

function countChar(line, char) {
  return (line.match(new RegExp(`\\${char}`, 'g')) || []).length;
}

function findLineInBlock(blockLines, pattern, blockStartLine) {
  const index = blockLines.findIndex(line => pattern.test(line));
  return index === -1 ? blockStartLine : blockStartLine + index;
}

function hasStyleValue(block, prop, value) {
  const patterns = [
    new RegExp(`${prop}\\s*:\\s*['"\`]${value}['"\`]`),
    new RegExp(`${prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}\\s*:\\s*['"\`]${value}['"\`]`),
  ];
  return patterns.some(pattern => pattern.test(block));
}

/**
 * 检查 TS/TSX style object 中的文本兼容性。
 *
 * 这类问题通常不会表现为语法错误：WebView 下能换行/打点，Skyline 下因为
 * text 组件、flex cross-axis 或 unsupported value 差异而溢出。
 */
function checkStyleObjectBlocks(relativePath, lines) {
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    const startLine = lines[i];
    if (!/^\s*[\w$-]+\s*:\s*{/.test(startLine)) continue;

    const blockLines = [];
    let depth = 0;
    let started = false;

    for (let j = i; j < lines.length; j++) {
      const line = lines[j];
      blockLines.push(line);
      depth += countChar(line, '{');
      depth -= countChar(line, '}');
      if (line.includes('{')) started = true;
      if (started && depth <= 0) {
        const block = blockLines.join('\n');
        const blockStartLine = i + 1;

        if (/wordBreak\s*:\s*['"`]break-word['"`]/.test(block)) {
          issues.push({
            file: relativePath,
            line: findLineInBlock(blockLines, /wordBreak\s*:\s*['"`]break-word['"`]/, blockStartLine),
            severity: 'ERROR',
            msg: "Skyline 不支持 wordBreak:'break-word'，会映射为 normal；需要改用 break-all 或显式设置文本宽度/alignSelf",
            code: blockLines.find(line => /wordBreak\s*:\s*['"`]break-word['"`]/.test(line))?.trim(),
          });
        }

        if (/overflowWrap\s*:/.test(block)) {
          issues.push({
            file: relativePath,
            line: findLineInBlock(blockLines, /overflowWrap\s*:/, blockStartLine),
            severity: 'ERROR',
            msg: 'Skyline 不支持 overflowWrap，改用 wordBreak:break-all 并回归断词效果',
            code: blockLines.find(line => /overflowWrap\s*:/.test(line))?.trim(),
          });
        }

        if (/whiteSpace\s*:\s*['"`]pre(?:-wrap|-line)?['"`]/.test(block)) {
          issues.push({
            file: relativePath,
            line: findLineInBlock(blockLines, /whiteSpace\s*:\s*['"`]pre(?:-wrap|-line)?['"`]/, blockStartLine),
            severity: 'ERROR',
            msg: 'Skyline 仅支持 whiteSpace:normal/nowrap；pre/pre-wrap/pre-line 需要数据层处理换行',
            code: blockLines.find(line => /whiteSpace\s*:\s*['"`]pre(?:-wrap|-line)?['"`]/.test(line))?.trim(),
          });
        }

        if (/textOverflow\s*:\s*['"`]ellipsis['"`]/.test(block)) {
          const hasOverflowHidden = hasStyleValue(block, 'overflow', 'hidden');
          const hasWhiteSpaceNowrap = hasStyleValue(block, 'whiteSpace', 'nowrap');

          if (!hasOverflowHidden || !hasWhiteSpaceNowrap) {
            const missing = [
              !hasOverflowHidden ? 'overflow:hidden' : '',
              !hasWhiteSpaceNowrap ? 'whiteSpace:nowrap' : '',
            ].filter(Boolean).join(' + ');

            issues.push({
              file: relativePath,
              line: findLineInBlock(blockLines, /textOverflow\s*:\s*['"`]ellipsis['"`]/, blockStartLine),
              severity: 'WARN',
              msg: `textOverflow:ellipsis 需要与 overflow:hidden + whiteSpace:nowrap 同元素设置，当前缺少 ${missing}`,
              code: blockLines.find(line => /textOverflow\s*:\s*['"`]ellipsis['"`]/.test(line))?.trim(),
            });
          }
        }

        if (
          /flexDirection\s*:\s*['"`]column['"`]/.test(block) &&
          /alignItems\s*:\s*['"`](start|flex-start)['"`]/.test(block)
        ) {
          issues.push({
            file: relativePath,
            line: findLineInBlock(blockLines, /alignItems\s*:\s*['"`](start|flex-start)['"`]/, blockStartLine),
            severity: 'WARN',
            msg: "flex column + alignItems:flex-start 下，子文本可能不继承容器宽度；需要给换行文本加 alignSelf:'stretch' 或明确宽度",
            code: blockLines.find(line => /alignItems\s*:\s*['"`](start|flex-start)['"`]/.test(line))?.trim(),
          });
        }

        i = j;
        break;
      }
    }
  }

  return issues;
}

/**
 * 检查 tsx/ts 文件中的组件和样式
 */
function checkTSXContent(relativePath, lines) {
  const issues = checkStyleObjectBlocks(relativePath, lines);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检查不支持的组件
    for (const comp of UNSUPPORTED_COMPONENTS) {
      const compRegex = new RegExp(`['"\`]${comp}['"\`]|<${comp}[\\s>]`);
      if (compRegex.test(line)) {
        issues.push({
          file: relativePath,
          line: i + 1,
          severity: 'ERROR',
          msg: `使用了不支持的组件 <${comp}>${SKYLINE_ALT_COMPONENTS[comp] ? '，替代方案：' + SKYLINE_ALT_COMPONENTS[comp] : '，需要移除或替换'}`,
          code: line.trim(),
        });
      }
    }

    // 检查 scroll-view 是否缺少 type
    if (/<scroll-view[\s>]/.test(line) && !/type=/.test(line)) {
      issues.push({
        file: relativePath,
        line: i + 1,
        severity: 'ERROR',
        msg: 'scroll-view 缺少 type 属性（Skyline 下必须指定，如 type="list"）',
        code: line.trim(),
      });
    }

    // 检查内联样式 display:'flex' 但没有 flexDirection
    if (/display['"\s:]*['"]\s*flex\s*['"]/.test(line) && !/flexDirection/.test(line)) {
      issues.push({
        file: relativePath,
        line: i + 1,
        severity: 'WARN',
        msg: '内联 display:flex 但未设置 flexDirection，Skyline 默认为 column',
        code: line.trim(),
      });
    }
  }

  return issues;
}

// ── 主流程 ────────────────────────────────────────

function run() {
  const args = process.argv.slice(2);
  const target = args[0] || '';
  const isCommitMode = target.startsWith('--commit');

  // 解析目标
  const changedFiles = getChangedFiles(target);

  if (changedFiles.length === 0) {
    console.log('  没有需要检查的变更文件。\n');
    process.exit(0);
  }

  // 按类型分组
  const configFiles = changedFiles.filter(f => /\.config\.(ts|js)$/.test(f));
  const styleFiles = changedFiles.filter(f => /\.(scss|css|less)$/.test(f));
  const tsxFiles = changedFiles.filter(f => /\.(tsx?)$/.test(f) && !/\.config\./.test(f));

  const allIssues = [];

  // 检查 config 文件
  for (const file of configFiles) {
    const fullPath = path.resolve(ROOT, file);
    const content = readFileSafe(fullPath);
    if (!content) continue;
    const issues = checkConfigFile(file, content);
    for (const i of issues) {
      allIssues.push({ ...i, file });
    }
  }

  // 检查 style 文件
  for (const file of styleFiles) {
    const fullPath = path.resolve(ROOT, file);
    const content = readFileSafe(fullPath);
    if (!content) continue;
    const lines = content.split('\n');
    const issues = checkStyleContent(file, lines);
    allIssues.push(...issues);
  }

  // 检查 tsx/ts 文件
  for (const file of tsxFiles) {
    const fullPath = path.resolve(ROOT, file);
    const content = readFileSafe(fullPath);
    if (!content) continue;
    const lines = content.split('\n');
    const issues = checkTSXContent(file, lines);
    allIssues.push(...issues);
  }

  // ── 输出结果 ──────────────────────────────────
  if (allIssues.length === 0) {
    console.log('  ✅ 未发现 Skyline 兼容性问题。\n');
    process.exit(0);
  }

  // 按文件分组输出
  const byFile = {};
  for (const issue of allIssues) {
    if (!byFile[issue.file]) byFile[issue.file] = [];
    byFile[issue.file].push(issue);
  }

  let errorCount = 0;
  let warnCount = 0;

  for (const [file, issues] of Object.entries(byFile)) {
    console.log(`  📄 ${file}`);
    for (const issue of issues) {
      const tag = issue.severity === 'ERROR' ? 'ERROR' : 'WARN';
      if (issue.severity === 'ERROR') errorCount++;
      else warnCount++;
      const loc = issue.line ? `:${issue.line}` : '';
      console.log(`    ${tag}${loc}  ${issue.msg}`);
      if (issue.code) console.log(`           → ${issue.code}`);
    }
    console.log();
  }

  console.log(`  共 ${allIssues.length} 个问题（${errorCount} ERROR, ${warnCount} WARN）\n`);
}

run();
