#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ISSUES_DIR = path.join(__dirname, '..', 'issues');
const OPEN_DIR = path.join(ISSUES_DIR, 'open');
const CLOSED_DIR = path.join(ISSUES_DIR, 'closed');
const TEMPLATE_PATH = path.join(ISSUES_DIR, 'templates', 'migration-issue-card.yaml');
const KNOWLEDGE_DIR = path.join(__dirname, '..', 'knowledge');
const CASES_DIR = path.join(KNOWLEDGE_DIR, 'cases');

// --- Risk Rules ---

const RISK_RULES = {
  'fixed-bottom': {
    keywords: ['bottom', 'footer', 'fixed', 'safe-area', 'safeArea', 'ActionBar', 'SubmitBar', 'BottomBar', 'button', '底部', '遮挡', '按钮'],
    cssSignals: ['position: fixed', 'position:fixed', 'bottom:', 'safe-area-inset-bottom', 'env('],
    componentNamePatterns: ['Bottom', 'Footer', 'Action', 'Submit', 'Bar'],
  },
  'sticky': {
    keywords: ['sticky', 'filter', 'tab', 'nav', 'scroll', '吸顶', '筛选', '导航'],
    cssSignals: ['position: sticky', 'position:sticky', 'top:', 'overflow', 'transform'],
    componentNamePatterns: ['Sticky', 'Filter', 'Tab', 'Nav'],
  },
  'scroll': {
    keywords: ['scroll-view', 'ScrollView', 'onScroll', 'scrollTop', 'scrollY', 'scrollIntoView', '滚动', '列表'],
    codeSignals: ['ScrollView', 'onScroll', 'scrollTop', 'scrollIntoView'],
    componentNamePatterns: ['Scroll', 'List'],
  },
  'swiper': {
    keywords: ['swiper', 'Swiper', 'SwiperItem', 'current', 'onChange', '轮播', '滑动'],
    codeSignals: ['Swiper', 'SwiperItem', 'onChange', 'current'],
    componentNamePatterns: ['Swiper', 'Carousel', 'Banner'],
  },
  'popup': {
    keywords: ['popup', 'modal', 'dialog', 'overlay', 'mask', '弹窗', '蒙层', '浮层'],
    cssSignals: ['position: fixed', 'position:fixed', 'z-index', 'overlay', 'mask'],
    componentNamePatterns: ['Popup', 'Modal', 'Dialog', 'Overlay'],
  },
};

// --- YAML Helpers (minimal, no deps) ---

function yamlStringify(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  let out = '';
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined || val === '') {
      out += `${pad}${key}: ""\n`;
    } else if (typeof val === 'boolean') {
      out += `${pad}${key}: ${val}\n`;
    } else if (typeof val === 'number') {
      out += `${pad}${key}: ${val}\n`;
    } else if (typeof val === 'string') {
      if (val.includes('\n') || val.includes('"') || val.includes(':') || val.includes('#')) {
        out += `${pad}${key}: "${val.replace(/"/g, '\\"')}"\n`;
      } else {
        out += `${pad}${key}: "${val}"\n`;
      }
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        out += `${pad}${key}: []\n`;
      } else if (typeof val[0] === 'object') {
        out += `${pad}${key}:\n`;
        for (const item of val) {
          const lines = yamlStringify(item, indent + 2).split('\n').filter(Boolean);
          out += `${pad}  - ${lines[0].trim()}\n`;
          for (let i = 1; i < lines.length; i++) {
            out += `${pad}    ${lines[i].trim()}\n`;
          }
        }
      } else {
        out += `${pad}${key}:\n`;
        for (const item of val) {
          out += `${pad}  - "${item}"\n`;
        }
      }
    } else if (typeof val === 'object') {
      out += `${pad}${key}:\n`;
      out += yamlStringify(val, indent + 1);
    }
  }
  return out;
}

function yamlParse(text) {
  const lines = text.split('\n');
  const root = {};
  const stack = [{ obj: root, indent: -2, key: null }];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // Key-value line
    const kvMatch = line.match(/^(\s*)([\w_-]+):\s*(.*)/);
    if (kvMatch) {
      const indent = kvMatch[1].length;
      const key = kvMatch[2];
      let rawVal = kvMatch[3].trim();

      // Strip inline comments (not inside quotes)
      if (rawVal && !rawVal.startsWith('"')) {
        const commentIdx = rawVal.indexOf(' #');
        if (commentIdx > 0) rawVal = rawVal.substring(0, commentIdx).trim();
      }

      // Pop stack to find correct parent
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1].obj;

      if (rawVal === '' || rawVal === '""') {
        // Check if next non-empty line is indented more (nested object/array)
        let nextIdx = i + 1;
        while (nextIdx < lines.length && (!lines[nextIdx].trim() || lines[nextIdx].trim().startsWith('#'))) nextIdx++;
        if (nextIdx < lines.length) {
          const nextIndent = lines[nextIdx].match(/^(\s*)/)[1].length;
          if (nextIndent > indent) {
            if (lines[nextIdx].trim().startsWith('-')) {
              parent[key] = [];
              stack.push({ obj: parent[key], indent, key, isArray: true });
            } else {
              parent[key] = {};
              stack.push({ obj: parent[key], indent, key });
            }
          } else {
            parent[key] = rawVal === '""' ? '' : '';
          }
        } else {
          parent[key] = '';
        }
      } else if (rawVal === '[]') {
        parent[key] = [];
      } else if (rawVal === 'true') {
        parent[key] = true;
      } else if (rawVal === 'false') {
        parent[key] = false;
      } else if (rawVal.match(/^-?\d+(\.\d+)?$/)) {
        parent[key] = Number(rawVal);
      } else if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
        parent[key] = rawVal.slice(1, -1).replace(/\\"/g, '"');
      } else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
        const inner = rawVal.slice(1, -1).trim();
        parent[key] = inner ? inner.split(',').map(s => s.trim().replace(/^"|"$/g, '')) : [];
      } else {
        if (rawVal.startsWith('"') && rawVal.endsWith('"')) rawVal = rawVal.slice(1, -1);
        parent[key] = rawVal;
      }
      continue;
    }

    // Array item line
    const arrMatch = line.match(/^(\s*)-\s+(.*)/);
    if (arrMatch) {
      const indent = arrMatch[1].length;
      let val = arrMatch[2].trim();

      // Find parent array
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent && !stack[stack.length - 1].isArray) {
        stack.pop();
      }

      // Find the array in parent
      let targetArray = null;
      if (stack[stack.length - 1].isArray) {
        targetArray = stack[stack.length - 1].obj;
      } else {
        const parent = stack[stack.length - 1].obj;
        const keys = Object.keys(parent);
        for (let k = keys.length - 1; k >= 0; k--) {
          if (Array.isArray(parent[keys[k]])) {
            targetArray = parent[keys[k]];
            break;
          }
        }
      }

      if (targetArray) {
        // Strip quotes
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        // Check if it's a key-value (object item in array)
        const objMatch = val.match(/^([\w_-]+):\s*(.*)/);
        if (objMatch) {
          const obj = {};
          obj[objMatch[1]] = parseInlineValue(objMatch[2]);
          // Read subsequent indented lines as part of this object
          const itemIndent = indent + 2;
          while (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            if (!nextLine.trim() || nextLine.trim().startsWith('#')) { i++; continue; }
            const nextKv = nextLine.match(/^(\s*)([\w_-]+):\s*(.*)/);
            if (nextKv && nextKv[1].length >= itemIndent) {
              let nv = nextKv[3].trim();
              const cIdx = nv.indexOf(' #');
              if (cIdx > 0 && !nv.startsWith('"')) nv = nv.substring(0, cIdx).trim();
              obj[nextKv[2]] = parseInlineValue(nv);
              i++;
            } else {
              break;
            }
          }
          targetArray.push(obj);
        } else {
          targetArray.push(val);
        }
      }
    }
  }

  return root;
}

function parseInlineValue(val) {
  if (!val || val === '""') return '';
  if (val === '[]') return [];
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val.match(/^-?\d+(\.\d+)?$/)) return Number(val);
  if (val.startsWith('"') && val.endsWith('"')) return val.slice(1, -1);
  if (val.startsWith('[') && val.endsWith(']')) {
    const inner = val.slice(1, -1).trim();
    return inner ? inner.split(',').map(s => s.trim().replace(/^"|"$/g, '')) : [];
  }
  return val;
}

// --- ID Generation ---

function getNextId() {
  const openFiles = fs.existsSync(OPEN_DIR) ? fs.readdirSync(OPEN_DIR).filter(f => f.endsWith('.yaml')) : [];
  const closedFiles = fs.existsSync(CLOSED_DIR) ? fs.readdirSync(CLOSED_DIR).filter(f => f.endsWith('.yaml')) : [];
  const allFiles = [...openFiles, ...closedFiles];

  let maxNum = 0;
  for (const f of allFiles) {
    const m = f.match(/skyline-issue-(\d+)\.yaml/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  const num = maxNum + 1;
  return `skyline-issue-${String(num).padStart(3, '0')}`;
}

// --- Risk Inference ---

function inferRiskTypes(text) {
  const types = [];
  const keywords = [];
  const lowerText = (text || '').toLowerCase();

  for (const [riskType, rules] of Object.entries(RISK_RULES)) {
    for (const kw of rules.keywords) {
      if (lowerText.includes(kw.toLowerCase())) {
        if (!types.includes(riskType)) types.push(riskType);
        if (!keywords.includes(kw)) keywords.push(kw);
      }
    }
  }

  return { types, keywords };
}

function inferRiskLevel(types) {
  if (types.length === 0) return 'unknown';
  if (types.length >= 2) return 'high';
  return 'medium';
}

function generateQueries(description, pageHint, riskTypes) {
  const queries = [];
  if (description) {
    queries.push(`Skyline ${description}`);
  }
  for (const rt of riskTypes) {
    queries.push(`Skyline ${rt} 兼容性`);
  }
  if (pageHint) {
    queries.push(`${pageHint} Skyline 迁移`);
  }
  return queries;
}

// --- Commands ---

function cmdCreate(args) {
  const description = args._[0];
  if (!description) {
    console.error('Error: 请提供问题描述');
    console.error('Usage: node issue-card.js create "问题描述" [--page <name>] [--mode <mode>] [--device <device>] [--screenshot <path>]');
    process.exit(1);
  }

  const id = getNextId();
  const { types: riskTypes, keywords: suspectedKeywords } = inferRiskTypes(description + ' ' + (args.page || ''));
  const queries = generateQueries(description, args.page, riskTypes);

  const screenshots = args.screenshot ? [args.screenshot] : [];
  const visualSource = screenshots.length > 0 ? 'screenshot_pending_analysis' : 'none';

  const card = {
    id,
    status: 'draft',
    title: description.length > 50 ? description.substring(0, 50) + '...' : description,
    inputs: {
      raw_description: description,
      page_hint: args.page || '',
      mode: args.mode || 'unknown',
      device: args.device || '',
      attachments: {
        screenshots,
        videos: [],
        logs: [],
      },
    },
    context: {
      project: 'XTaro miniapp Skyline migration',
      page_route: '',
      page_name: args.page || '',
      platform: 'weapp',
      renderer_before: 'webview',
      renderer_after: 'skyline',
      ab_experiment: 'HTL_Skyline_Migration',
    },
    symptom: {
      summary: description,
      before_behavior: '',
      after_behavior: '',
      reproduce_steps: [],
    },
    visual_context: {
      source: visualSource,
      affected_area: '',
      visible_text: [],
      visual_component_types: [],
      observed_symptoms: [],
      inferred_risk_types: riskTypes,
      confidence: 'none',
    },
    risk: {
      types: riskTypes,
      level: inferRiskLevel(riskTypes),
      suspected_keywords: suspectedKeywords,
    },
    knowledge: {
      queries,
      matched_docs: [],
      matched_rules: [],
    },
    component_retrieval: {
      search_queries: [],
      candidate_components: [],
      rejected_components: [],
      confirmed_component: '',
      reviewed: false,
      status: 'pending',
    },
    code_context: {
      suspected_files: [],
      suspected_components: [],
      evidence: [],
    },
    claude_code: {
      task_prompt: '',
      prompt_file: '',
    },
    verification: {
      checklist: [],
      result: 'pending',
      devices: [],
      notes: '',
    },
    resolution: {
      root_cause: '',
      fix_summary: [],
      changed_files: [],
      reusable_rule: '',
    },
    case_output: {
      should_write_to_kb: false,
      target_file: '',
    },
    uncertainty: {
      why_might_be_wrong: [],
      missing_evidence: [],
    },
  };

  const filePath = path.join(OPEN_DIR, `${id}.yaml`);
  fs.writeFileSync(filePath, yamlStringify(card));

  console.log(`✓ Created: ${filePath}`);
  console.log(`  ID: ${id}`);
  console.log(`  Status: draft`);
  console.log(`  Risk types: ${riskTypes.length > 0 ? riskTypes.join(', ') : '(none detected)'}`);
  console.log(`  Keywords: ${suspectedKeywords.length > 0 ? suspectedKeywords.join(', ') : '(none)'}`);
  console.log(`  Queries: ${queries.join(' | ')}`);
  console.log('');
  console.log('Next: run `node scripts/issue-card.js enrich ' + filePath + ' --repo /path/to/project` to search for candidate components.');
}

function cmdList() {
  const openFiles = fs.existsSync(OPEN_DIR) ? fs.readdirSync(OPEN_DIR).filter(f => f.endsWith('.yaml')) : [];
  const closedFiles = fs.existsSync(CLOSED_DIR) ? fs.readdirSync(CLOSED_DIR).filter(f => f.endsWith('.yaml')) : [];

  if (openFiles.length === 0 && closedFiles.length === 0) {
    console.log('No issue cards found.');
    return;
  }

  if (openFiles.length > 0) {
    console.log(`── Open (${openFiles.length}) ──`);
    for (const f of openFiles.sort()) {
      const content = fs.readFileSync(path.join(OPEN_DIR, f), 'utf-8');
      const card = yamlParse(content);
      const status = card.status || 'draft';
      const title = card.title || '(no title)';
      console.log(`  ${card.id || f}  [${status}]  ${title}`);
    }
  }

  if (closedFiles.length > 0) {
    console.log(`── Closed (${closedFiles.length}) ──`);
    for (const f of closedFiles.sort()) {
      const content = fs.readFileSync(path.join(CLOSED_DIR, f), 'utf-8');
      const card = yamlParse(content);
      const result = card.verification && card.verification.result ? card.verification.result : '?';
      const title = card.title || '(no title)';
      console.log(`  ${card.id || f}  [closed:${result}]  ${title}`);
    }
  }
}

function cmdShow(args) {
  const target = args._[0];
  if (!target) {
    console.error('Usage: node issue-card.js show <id|file>');
    process.exit(1);
  }

  const filePath = resolveCardPath(target);
  if (!filePath) {
    console.error(`Error: Card not found: ${target}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const card = yamlParse(content);

  console.log(`═══ ${card.id} ═══`);
  console.log(`Status:  ${card.status}`);
  console.log(`Title:   ${card.title}`);
  console.log(`File:    ${filePath}`);
  console.log('');

  if (card.inputs) {
    console.log(`── Inputs ──`);
    console.log(`  Description: ${card.inputs.raw_description || '(empty)'}`);
    console.log(`  Page hint:   ${card.inputs.page_hint || '(empty)'}`);
    console.log(`  Mode:        ${card.inputs.mode || '(empty)'}`);
    console.log(`  Device:      ${card.inputs.device || '(empty)'}`);
  }

  if (card.risk) {
    console.log(`── Risk ──`);
    console.log(`  Types:    ${Array.isArray(card.risk.types) && card.risk.types.length > 0 ? card.risk.types.join(', ') : '(none)'}`);
    console.log(`  Level:    ${card.risk.level || 'unknown'}`);
    console.log(`  Keywords: ${Array.isArray(card.risk.suspected_keywords) && card.risk.suspected_keywords.length > 0 ? card.risk.suspected_keywords.join(', ') : '(none)'}`);
  }

  if (card.component_retrieval) {
    console.log(`── Component Retrieval ──`);
    console.log(`  Status:    ${card.component_retrieval.status || 'pending'}`);
    console.log(`  Reviewed:  ${card.component_retrieval.reviewed || false}`);
    console.log(`  Confirmed: ${card.component_retrieval.confirmed_component || '(none)'}`);
    const candidates = card.component_retrieval.candidate_components;
    if (Array.isArray(candidates) && candidates.length > 0) {
      console.log(`  Candidates: ${candidates.length}`);
    }
  }

  if (card.verification) {
    console.log(`── Verification ──`);
    console.log(`  Result:    ${card.verification.result || 'pending'}`);
    const checklist = card.verification.checklist;
    if (Array.isArray(checklist) && checklist.length > 0) {
      console.log(`  Checklist: ${checklist.length} items`);
    }
  }

  if (card.knowledge) {
    console.log(`── Knowledge ──`);
    const queries = card.knowledge.queries;
    if (Array.isArray(queries) && queries.length > 0) {
      console.log(`  Queries: ${queries.join(' | ')}`);
    }
  }
}

// --- Enrich Command ---

function cmdEnrich(args) {
  const target = args._[0];
  const repoPath = args.repo;

  if (!target) {
    console.error('Usage: node issue-card.js enrich <file> --repo <path>');
    process.exit(1);
  }
  if (!repoPath) {
    console.error('Error: --repo is required for enrich');
    process.exit(1);
  }
  if (!fs.existsSync(repoPath)) {
    console.error(`Error: repo path not found: ${repoPath}`);
    process.exit(1);
  }

  const filePath = resolveCardPath(target);
  if (!filePath) {
    console.error(`Error: Card not found: ${target}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const card = yamlParse(content);

  const description = card.inputs ? card.inputs.raw_description || '' : '';
  const pageHint = card.inputs ? card.inputs.page_hint || '' : '';
  const riskTypes = card.risk ? (Array.isArray(card.risk.types) ? card.risk.types : []) : [];

  // Step 1: Try to locate page route
  const routeInfo = findPageRoute(repoPath, pageHint);
  if (routeInfo.route) {
    card.context = card.context || {};
    card.context.page_route = routeInfo.route;
  }

  // Step 2: Generate search queries based on risk types
  const searchQueries = generateSearchQueries(description, pageHint, riskTypes);
  card.component_retrieval = card.component_retrieval || {};
  card.component_retrieval.search_queries = searchQueries;

  // Step 3: Search for candidate components
  const candidates = searchCandidateComponents(repoPath, routeInfo, riskTypes, description, pageHint);

  // Step 4: Apply confidence rules
  for (const c of candidates) {
    c.confidence = calculateConfidence(c.evidence);
    c.missing_evidence = getMissingEvidence(c.evidence);
  }

  // Sort by confidence
  const confidenceOrder = { high: 0, medium: 1, low: 2 };
  candidates.sort((a, b) => (confidenceOrder[a.confidence] || 3) - (confidenceOrder[b.confidence] || 3));

  card.component_retrieval.candidate_components = candidates;

  // Step 5: Determine status
  const hasCodeEvidence = candidates.some(c => c.confidence === 'high' || c.confidence === 'medium');
  if (!hasCodeEvidence && candidates.length === 0) {
    card.component_retrieval.status = 'insufficient_code_evidence';
    card.uncertainty = card.uncertainty || {};
    card.uncertainty.missing_evidence = card.uncertainty.missing_evidence || [];
    if (!card.uncertainty.missing_evidence.includes('no_candidates_found')) {
      card.uncertainty.missing_evidence.push('no_candidates_found');
    }
  } else if (!hasCodeEvidence) {
    card.component_retrieval.status = 'insufficient_code_evidence';
  } else {
    card.component_retrieval.status = 'pending';
  }

  card.status = 'enriched';

  fs.writeFileSync(filePath, yamlStringify(card));

  console.log(`✓ Enriched: ${filePath}`);
  console.log(`  Status: enriched`);
  console.log(`  Route: ${routeInfo.route || '(not found)'}`);
  console.log(`  Candidates: ${candidates.length}`);
  console.log(`  Retrieval status: ${card.component_retrieval.status}`);
  if (candidates.length > 0) {
    console.log('');
    console.log('  Top candidates:');
    for (const c of candidates.slice(0, 5)) {
      console.log(`    ${c.confidence.toUpperCase().padEnd(6)} ${c.name} (${c.role}) — ${c.file}`);
    }
  }
  console.log('');
  console.log('Next: run `node scripts/issue-card.js candidates ' + filePath + '` to review.');
}

// --- Candidates Command ---

function cmdCandidates(args) {
  const target = args._[0];
  if (!target) {
    console.error('Usage: node issue-card.js candidates <file>');
    process.exit(1);
  }

  const filePath = resolveCardPath(target);
  if (!filePath) {
    console.error(`Error: Card not found: ${target}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const card = yamlParse(content);
  const candidates = card.component_retrieval && card.component_retrieval.candidate_components;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    console.log('No candidate components found. Run enrich first.');
    return;
  }

  console.log(`═══ Candidates for ${card.id} ═══`);
  console.log(`Retrieval status: ${card.component_retrieval.status}`);
  console.log('');

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const evidence = c.evidence || {};
    const evidenceFlags = Object.entries(evidence)
      .filter(([, v]) => v === true || v === 'true')
      .map(([k]) => k)
      .join(', ');

    console.log(`  [${i + 1}] ${c.name}`);
    console.log(`      File:       ${c.file}`);
    console.log(`      Role:       ${c.role}`);
    console.log(`      Confidence: ${c.confidence}`);
    console.log(`      Evidence:   ${evidenceFlags || '(none)'}`);
    console.log(`      Reason:     ${c.reason || '(none)'}`);
    if (c.missing_evidence && c.missing_evidence.length > 0) {
      console.log(`      Missing:    ${c.missing_evidence.join(', ')}`);
    }
    console.log('');
  }

  if (card.component_retrieval.rejected_components && card.component_retrieval.rejected_components.length > 0) {
    console.log(`  Rejected: ${card.component_retrieval.rejected_components.join(', ')}`);
    console.log('');
  }

  console.log('Actions:');
  console.log(`  confirm: node scripts/issue-card.js confirm ${filePath} <componentName>`);
  console.log(`  reject:  node scripts/issue-card.js reject ${filePath} <componentName>`);
  console.log(`  more:    node scripts/issue-card.js more ${filePath} --repo <path>`);
}

// --- Confirm Command ---

function cmdConfirm(args) {
  const target = args._[0];
  const componentName = args._[1];

  if (!target || !componentName) {
    console.error('Usage: node issue-card.js confirm <file> <componentName>');
    process.exit(1);
  }

  const filePath = resolveCardPath(target);
  if (!filePath) {
    console.error(`Error: Card not found: ${target}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const card = yamlParse(content);

  const candidates = card.component_retrieval && card.component_retrieval.candidate_components;
  if (!Array.isArray(candidates)) {
    console.error('Error: No candidates to confirm. Run enrich first.');
    process.exit(1);
  }

  const found = candidates.find(c => c.name === componentName);
  if (!found) {
    console.error(`Error: Component "${componentName}" not in candidates.`);
    console.error('Available: ' + candidates.map(c => c.name).join(', '));
    process.exit(1);
  }

  // Check evidence sufficiency
  const evidence = found.evidence || {};
  const codeEvidenceCount = ['route_match', 'text_match', 'import_relation', 'style_signal']
    .filter(k => evidence[k] === true || evidence[k] === 'true').length;

  if (codeEvidenceCount < 2) {
    console.warn(`⚠ Warning: "${componentName}" has insufficient code evidence (${codeEvidenceCount}/2 required).`);
    console.warn('  Cannot enter fix stage without stronger evidence.');
    console.warn('  Consider running `more` to gather additional evidence.');
    card.component_retrieval.confirmed_component = componentName;
    card.component_retrieval.reviewed = true;
    card.component_retrieval.status = 'insufficient_code_evidence';
  } else {
    card.component_retrieval.confirmed_component = componentName;
    card.component_retrieval.reviewed = true;
    card.component_retrieval.status = 'ready_for_fix';
    card.status = 'reviewed';
  }

  fs.writeFileSync(filePath, yamlStringify(card));

  console.log(`✓ Confirmed: ${componentName}`);
  console.log(`  Reviewed: true`);
  console.log(`  Status: ${card.component_retrieval.status}`);
  console.log(`  Card status: ${card.status}`);

  if (card.status === 'reviewed') {
    console.log('');
    console.log('Next: run `node scripts/issue-card.js plan ' + filePath + '` to generate verification plan.');
  }
}

// --- Reject Command ---

function cmdReject(args) {
  const target = args._[0];
  const componentName = args._[1];

  if (!target || !componentName) {
    console.error('Usage: node issue-card.js reject <file> <componentName>');
    process.exit(1);
  }

  const filePath = resolveCardPath(target);
  if (!filePath) {
    console.error(`Error: Card not found: ${target}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const card = yamlParse(content);

  if (!card.component_retrieval) card.component_retrieval = {};
  if (!Array.isArray(card.component_retrieval.rejected_components)) {
    card.component_retrieval.rejected_components = [];
  }

  if (!card.component_retrieval.rejected_components.includes(componentName)) {
    card.component_retrieval.rejected_components.push(componentName);
  }

  fs.writeFileSync(filePath, yamlStringify(card));

  console.log(`✓ Rejected: ${componentName}`);
  console.log(`  Rejected list: ${card.component_retrieval.rejected_components.join(', ')}`);
  console.log('');
  console.log('Next: run `node scripts/issue-card.js more ' + filePath + ' --repo <path>` to search for more candidates.');
}

// --- More Command ---

function cmdMore(args) {
  const target = args._[0];
  const repoPath = args.repo;

  if (!target) {
    console.error('Usage: node issue-card.js more <file> --repo <path>');
    process.exit(1);
  }
  if (!repoPath) {
    console.error('Error: --repo is required for more');
    process.exit(1);
  }

  const filePath = resolveCardPath(target);
  if (!filePath) {
    console.error(`Error: Card not found: ${target}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const card = yamlParse(content);

  const description = card.inputs ? card.inputs.raw_description || '' : '';
  const pageHint = card.inputs ? card.inputs.page_hint || '' : '';
  const riskTypes = card.risk ? (Array.isArray(card.risk.types) ? card.risk.types : []) : [];
  const rejected = card.component_retrieval && Array.isArray(card.component_retrieval.rejected_components)
    ? card.component_retrieval.rejected_components : [];
  const existing = card.component_retrieval && Array.isArray(card.component_retrieval.candidate_components)
    ? card.component_retrieval.candidate_components : [];

  const routeInfo = findPageRoute(repoPath, pageHint);

  // Generate broader search queries
  const additionalQueries = [];
  for (const rt of riskTypes) {
    const rules = RISK_RULES[rt];
    if (rules && rules.componentNamePatterns) {
      for (const pat of rules.componentNamePatterns) {
        additionalQueries.push(pat);
      }
    }
  }

  // Search with broader scope
  const newCandidates = searchCandidateComponents(repoPath, routeInfo, riskTypes, description, pageHint, true);

  // Filter out rejected and already existing
  const existingNames = new Set([...existing.map(c => c.name), ...rejected]);
  const filtered = newCandidates.filter(c => !existingNames.has(c.name));

  for (const c of filtered) {
    c.confidence = calculateConfidence(c.evidence);
    c.missing_evidence = getMissingEvidence(c.evidence);
  }

  // Merge
  const allCandidates = [...existing.filter(c => !rejected.includes(c.name)), ...filtered];
  const confidenceOrder = { high: 0, medium: 1, low: 2 };
  allCandidates.sort((a, b) => (confidenceOrder[a.confidence] || 3) - (confidenceOrder[b.confidence] || 3));

  card.component_retrieval.candidate_components = allCandidates;
  card.component_retrieval.search_queries = [
    ...(card.component_retrieval.search_queries || []),
    ...additionalQueries,
  ];

  fs.writeFileSync(filePath, yamlStringify(card));

  console.log(`✓ More search completed: ${filePath}`);
  console.log(`  New candidates found: ${filtered.length}`);
  console.log(`  Total candidates: ${allCandidates.length}`);
  console.log(`  Rejected: ${rejected.join(', ') || '(none)'}`);
  console.log('');
  console.log('Next: run `node scripts/issue-card.js candidates ' + filePath + '` to review.');
}

// --- Plan Command ---

function cmdPlan(args) {
  const target = args._[0];
  if (!target) {
    console.error('Usage: node issue-card.js plan <file>');
    process.exit(1);
  }

  const filePath = resolveCardPath(target);
  if (!filePath) {
    console.error(`Error: Card not found: ${target}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const card = yamlParse(content);

  // Check preconditions
  if (!card.component_retrieval || !card.component_retrieval.reviewed) {
    console.error('Error: component must be reviewed before generating plan.');
    console.error('Run `confirm` first.');
    process.exit(1);
  }

  const confirmed = card.component_retrieval.confirmed_component;
  if (!confirmed) {
    console.error('Error: no confirmed component. Run `confirm` first.');
    process.exit(1);
  }

  const riskTypes = card.risk && Array.isArray(card.risk.types) ? card.risk.types : [];

  // Generate checklist
  const checklist = [];

  // Always include base checks
  checklist.push('WebView 模式下原功能正常（AB 关闭状态）');
  checklist.push('Skyline 模式下修复后功能正常');
  checklist.push('iOS 设备验证');
  checklist.push('Android 设备验证');
  checklist.push('非微信端（H5/CRN）回归不受影响');
  checklist.push('AB 实验关闭后回退正常');

  // Risk-specific checks
  for (const rt of riskTypes) {
    switch (rt) {
      case 'fixed-bottom':
        checklist.push('[fixed-bottom] 底部元素不遮挡内容');
        checklist.push('[fixed-bottom] 安全区域适配正确');
        checklist.push('[fixed-bottom] 键盘弹起时底部元素行为正常');
        break;
      case 'sticky':
        checklist.push('[sticky] 吸顶元素滚动时正确固定');
        checklist.push('[sticky] 吸顶临界位置无跳动');
        break;
      case 'scroll':
        checklist.push('[scroll] 列表滚动流畅');
        checklist.push('[scroll] scrollIntoView 行为正确');
        checklist.push('[scroll] 下拉刷新/上拉加载正常');
        break;
      case 'swiper':
        checklist.push('[swiper] 轮播切换正常');
        checklist.push('[swiper] 手势滑动响应正确');
        checklist.push('[swiper] autoplay 行为正常');
        break;
      case 'popup':
        checklist.push('[popup] 弹窗层级正确');
        checklist.push('[popup] 蒙层点击行为正常');
        checklist.push('[popup] 弹窗动画正常');
        break;
    }
  }

  card.verification = card.verification || {};
  card.verification.checklist = checklist;
  card.verification.devices = ['iOS', 'Android'];

  fs.writeFileSync(filePath, yamlStringify(card));

  console.log(`✓ Verification plan generated: ${filePath}`);
  console.log(`  Checklist (${checklist.length} items):`);
  for (const item of checklist) {
    console.log(`    □ ${item}`);
  }
}

// --- Close Command ---

function cmdClose(args) {
  const target = args._[0];
  const result = args.result;

  if (!target) {
    console.error('Usage: node issue-card.js close <file> --result passed|failed');
    process.exit(1);
  }
  if (!result || !['passed', 'failed'].includes(result)) {
    console.error('Error: --result must be "passed" or "failed"');
    process.exit(1);
  }

  const filePath = resolveCardPath(target);
  if (!filePath) {
    console.error(`Error: Card not found: ${target}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const card = yamlParse(content);

  card.status = 'closed';
  card.verification = card.verification || {};
  card.verification.result = result;

  // Generate case output
  const caseId = card.id || 'unknown';
  const caseFile = `knowledge/cases/${caseId}.md`;

  let caseContent = '';
  if (result === 'passed') {
    caseContent = generatePassedCase(card);
    card.case_output = { should_write_to_kb: true, target_file: caseFile };
  } else {
    caseContent = generateFailedCase(card);
    card.case_output = { should_write_to_kb: false, target_file: caseFile };
  }

  // Write case file
  const caseFilePath = path.join(__dirname, '..', caseFile);
  fs.writeFileSync(caseFilePath, caseContent);

  // Move to closed
  const closedPath = path.join(CLOSED_DIR, path.basename(filePath));
  fs.writeFileSync(closedPath, yamlStringify(card));
  fs.unlinkSync(filePath);

  console.log(`✓ Closed: ${card.id} [${result}]`);
  console.log(`  Moved to: ${closedPath}`);
  console.log(`  Case file: ${caseFilePath}`);
}

function generatePassedCase(card) {
  const title = card.title || '(no title)';
  const riskTypes = card.risk && Array.isArray(card.risk.types) ? card.risk.types.join(', ') : 'unknown';
  const confirmed = card.component_retrieval ? card.component_retrieval.confirmed_component || '' : '';
  const rootCause = card.resolution ? card.resolution.root_cause || '' : '';
  const fixSummary = card.resolution && Array.isArray(card.resolution.fix_summary) ? card.resolution.fix_summary : [];
  const rule = card.resolution ? card.resolution.reusable_rule || '' : '';

  return `# Migration Case: ${title}

## 问题现象

${card.symptom ? card.symptom.summary || '' : ''}

## 风险类型

${riskTypes}

## 根因

${rootCause || '(待补充)'}

## 目标组件

${confirmed || '(待补充)'}

## 修复方案

${fixSummary.length > 0 ? fixSummary.map(s => `- ${s}`).join('\n') : '(待补充)'}

## 可复用规则

${rule || '(待补充)'}

## 验证方法

${card.verification && Array.isArray(card.verification.checklist) ? card.verification.checklist.map(c => `- [ ] ${c}`).join('\n') : '(待补充)'}

## 适用条件

- 渲染引擎: WebView → Skyline
- 平台: weapp
- 风险类型: ${riskTypes}
`;
}

function generateFailedCase(card) {
  const title = card.title || '(no title)';

  return `# Unresolved Case: ${title}

## 问题现象

${card.symptom ? card.symptom.summary || '' : ''}

## 状态

未解决 (failed)

## 已排查

${card.component_retrieval && Array.isArray(card.component_retrieval.rejected_components)
    ? card.component_retrieval.rejected_components.map(c => `- ~~${c}~~ (已排除)`).join('\n')
    : '(无)'}

## 不确定性

${card.uncertainty && Array.isArray(card.uncertainty.why_might_be_wrong)
    ? card.uncertainty.why_might_be_wrong.map(w => `- ${w}`).join('\n')
    : '(无)'}

## 后续建议

- 补充更多运行时日志
- 扩大 repo 搜索范围
- 真机对比调试
`;
}

// --- Helper Functions ---

function resolveCardPath(target) {
  // Try as direct path
  if (fs.existsSync(target)) return target;

  // Try as ID in open
  const openPath = path.join(OPEN_DIR, `${target}.yaml`);
  if (fs.existsSync(openPath)) return openPath;

  // Try as ID in closed
  const closedPath = path.join(CLOSED_DIR, `${target}.yaml`);
  if (fs.existsSync(closedPath)) return closedPath;

  // Try matching partial
  const openFiles = fs.existsSync(OPEN_DIR) ? fs.readdirSync(OPEN_DIR) : [];
  const match = openFiles.find(f => f.includes(target));
  if (match) return path.join(OPEN_DIR, match);

  const closedFiles = fs.existsSync(CLOSED_DIR) ? fs.readdirSync(CLOSED_DIR) : [];
  const closedMatch = closedFiles.find(f => f.includes(target));
  if (closedMatch) return path.join(CLOSED_DIR, closedMatch);

  return null;
}

function findPageRoute(repoPath, pageHint) {
  const result = { route: '', pageFile: '', configSource: '' };
  if (!pageHint) return result;

  // Try app.config.ts / app.json
  const configFiles = ['app.config.ts', 'app.config.js', 'app.json', 'src/app.config.ts', 'src/app.json'];
  for (const cf of configFiles) {
    const cfPath = path.join(repoPath, cf);
    if (fs.existsSync(cfPath)) {
      const content = fs.readFileSync(cfPath, 'utf-8');
      // Simple route extraction: look for pages array entries
      const pageMatches = content.match(/['"`](pages\/[^'"`]+)['"`]/g);
      if (pageMatches) {
        for (const pm of pageMatches) {
          const route = pm.replace(/['"`]/g, '');
          if (route.toLowerCase().includes(pageHint.toLowerCase().replace(/[页面]/g, ''))) {
            result.route = route;
            result.configSource = cf;
            break;
          }
        }
      }
      if (result.route) break;
    }
  }

  // Try knowledge/route-guide.md
  if (!result.route) {
    const routeGuide = path.join(__dirname, '..', 'knowledge', 'route-guide.md');
    if (fs.existsSync(routeGuide)) {
      const content = fs.readFileSync(routeGuide, 'utf-8');
      const lines = content.split('\n');
      const hint = pageHint.toLowerCase().replace(/[页面]/g, '');
      for (const line of lines) {
        if (line.toLowerCase().includes(hint)) {
          const routeMatch = line.match(/pages\/[^\s|)}\]]+/);
          if (routeMatch) {
            result.route = routeMatch[0];
            result.configSource = 'knowledge/route-guide.md';
            break;
          }
        }
      }
    }
  }

  // Derive page file from route
  if (result.route) {
    const candidates = [
      path.join(repoPath, 'src', result.route, 'index.tsx'),
      path.join(repoPath, 'src', result.route, 'index.jsx'),
      path.join(repoPath, 'src', result.route + '.tsx'),
      path.join(repoPath, result.route, 'index.tsx'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        result.pageFile = c;
        break;
      }
    }
  }

  return result;
}

function generateSearchQueries(description, pageHint, riskTypes) {
  const queries = [];
  for (const rt of riskTypes) {
    const rules = RISK_RULES[rt];
    if (rules) {
      queries.push(...rules.keywords.slice(0, 3));
      if (rules.cssSignals) queries.push(...rules.cssSignals.slice(0, 2));
    }
  }
  return [...new Set(queries)];
}

function searchCandidateComponents(repoPath, routeInfo, riskTypes, description, pageHint, broader) {
  const candidates = [];
  const searchDirs = [];

  // Determine search scope
  if (routeInfo.pageFile) {
    const pageDir = path.dirname(routeInfo.pageFile);
    searchDirs.push(pageDir);
    // Also check sibling components dir
    const componentsDir = path.join(pageDir, 'components');
    if (fs.existsSync(componentsDir)) searchDirs.push(componentsDir);
  }

  if (broader || searchDirs.length === 0) {
    // Broader search in src/components or src/pages
    const srcComponents = path.join(repoPath, 'src', 'components');
    const srcPages = path.join(repoPath, 'src', 'pages');
    if (fs.existsSync(srcComponents)) searchDirs.push(srcComponents);
    if (fs.existsSync(srcPages)) searchDirs.push(srcPages);
  }

  // Collect risk keywords and patterns
  const allKeywords = [];
  const allCssSignals = [];
  const allCodeSignals = [];
  const allNamePatterns = [];

  for (const rt of riskTypes) {
    const rules = RISK_RULES[rt];
    if (rules) {
      allKeywords.push(...rules.keywords);
      if (rules.cssSignals) allCssSignals.push(...rules.cssSignals);
      if (rules.codeSignals) allCodeSignals.push(...rules.codeSignals);
      allNamePatterns.push(...rules.componentNamePatterns);
    }
  }

  // Search files
  const seen = new Set();

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = walkDir(dir, ['.tsx', '.jsx', '.ts', '.js', '.scss', '.css', '.wxss']);

    for (const file of files) {
      const basename = path.basename(file, path.extname(file));
      const relPath = path.relative(repoPath, file);

      if (seen.has(relPath)) continue;

      // Skip non-component files
      if (basename === 'index' || basename.startsWith('_')) {
        // For index files, use parent dir name
      }

      const content = safeReadFile(file);
      if (!content) continue;

      const evidence = {
        route_match: false,
        text_match: false,
        import_relation: false,
        style_signal: false,
        code_signal: false,
        visual_match: false,
        name_match: false,
      };

      // Check route_match
      if (routeInfo.route && relPath.includes(routeInfo.route.replace('pages/', ''))) {
        evidence.route_match = true;
      }

      // Check name_match against risk patterns
      const componentName = getComponentName(file);
      for (const pat of allNamePatterns) {
        if (componentName.toLowerCase().includes(pat.toLowerCase())) {
          evidence.name_match = true;
          break;
        }
      }

      // Check text_match (description keywords in file)
      const descWords = extractKeywords(description + ' ' + pageHint);
      for (const w of descWords) {
        if (content.includes(w)) {
          evidence.text_match = true;
          break;
        }
      }

      // Check style_signal
      for (const sig of allCssSignals) {
        if (content.includes(sig)) {
          evidence.style_signal = true;
          break;
        }
      }

      // Check code_signal
      for (const sig of allCodeSignals || []) {
        if (content.includes(sig)) {
          evidence.code_signal = true;
          break;
        }
      }

      // Check import_relation (if page file imports this)
      if (routeInfo.pageFile) {
        const pageContent = safeReadFile(routeInfo.pageFile);
        if (pageContent && pageContent.includes(componentName)) {
          evidence.import_relation = true;
        }
      }

      // Only add as candidate if has some evidence
      const hasEvidence = Object.values(evidence).some(v => v === true);
      if (hasEvidence) {
        if (!seen.has(componentName)) {
          seen.add(componentName);
          candidates.push({
            name: componentName,
            file: relPath,
            role: determineRole(evidence),
            confidence: 'low',
            evidence,
            reason: generateReason(evidence, componentName, riskTypes),
            missing_evidence: [],
          });
        }
      }
    }
  }

  return candidates;
}

function calculateConfidence(evidence) {
  if (!evidence) return 'low';

  const codeEvidenceKeys = ['route_match', 'text_match', 'import_relation', 'style_signal'];
  const codeCount = codeEvidenceKeys.filter(k => evidence[k] === true).length;

  // Rule: visual_match + name_match alone cannot be high
  const onlyVisualAndName = (evidence.visual_match || evidence.name_match) &&
    codeCount === 0 && !evidence.code_signal;
  if (onlyVisualAndName) return 'low';

  // high: at least 2 code evidence
  if (codeCount >= 2) return 'high';

  // medium: 1 code evidence + something else
  if (codeCount === 1 && (evidence.code_signal || evidence.name_match || evidence.visual_match)) {
    return 'medium';
  }

  if (codeCount === 1) return 'medium';

  return 'low';
}

function getMissingEvidence(evidence) {
  if (!evidence) return ['route_match', 'text_match', 'import_relation', 'style_signal'];
  const missing = [];
  const important = ['route_match', 'text_match', 'import_relation', 'style_signal'];
  for (const k of important) {
    if (!evidence[k]) missing.push(k);
  }
  return missing;
}

function determineRole(evidence) {
  if (evidence.style_signal || evidence.code_signal) return 'likely_source';
  if (evidence.import_relation && evidence.route_match) return 'affected_area';
  if (evidence.route_match) return 'container_context';
  return 'unknown';
}

function generateReason(evidence, name, riskTypes) {
  const parts = [];
  if (evidence.route_match) parts.push('位于目标页面路由下');
  if (evidence.text_match) parts.push('包含描述中的关键文案');
  if (evidence.import_relation) parts.push('被页面直接引用');
  if (evidence.style_signal) parts.push('样式包含风险信号');
  if (evidence.code_signal) parts.push('代码包含风险 API');
  if (evidence.name_match) parts.push('组件名匹配风险模式');
  return parts.length > 0 ? parts.join('，') + '。' : `名称 ${name} 可能相关。`;
}

function getComponentName(filePath) {
  const basename = path.basename(filePath, path.extname(filePath));
  if (basename === 'index') {
    return path.basename(path.dirname(filePath));
  }
  return basename;
}

function extractKeywords(text) {
  // Extract meaningful Chinese/English words
  const words = [];
  // Chinese word segments (2+ chars)
  const zhMatches = text.match(/[\u4e00-\u9fff]{2,}/g);
  if (zhMatches) words.push(...zhMatches);
  // English words (3+ chars, not common)
  const enMatches = text.match(/[a-zA-Z]{3,}/g);
  if (enMatches) {
    const common = new Set(['the', 'and', 'for', 'not', 'are', 'but', 'was', 'with']);
    words.push(...enMatches.filter(w => !common.has(w.toLowerCase())));
  }
  return words;
}

function walkDir(dir, extensions) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
        results.push(...walkDir(fullPath, extensions));
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  } catch (e) {
    // Skip unreadable dirs
  }
  return results;
}

function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return null;
  }
}

// --- Argument Parsing ---

function parseArgs(argv) {
  const args = { _: [] };
  let i = 0;
  while (i < argv.length) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args[key] = argv[i + 1];
        i += 2;
      } else {
        args[key] = true;
        i += 1;
      }
    } else {
      args._.push(argv[i]);
      i += 1;
    }
  }
  return args;
}

// --- Main ---

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    printUsage();
    process.exit(0);
  }

  const command = argv[0];
  const args = parseArgs(argv.slice(1));

  switch (command) {
    case 'create':
      cmdCreate(args);
      break;
    case 'list':
      cmdList();
      break;
    case 'show':
      cmdShow(args);
      break;
    case 'enrich':
      cmdEnrich(args);
      break;
    case 'candidates':
      cmdCandidates(args);
      break;
    case 'confirm':
      cmdConfirm(args);
      break;
    case 'reject':
      cmdReject(args);
      break;
    case 'more':
      cmdMore(args);
      break;
    case 'plan':
      cmdPlan(args);
      break;
    case 'close':
      cmdClose(args);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

function printUsage() {
  console.log(`
Migration Issue Card CLI

Usage: node scripts/issue-card.js <command> [options]

Commands:
  create <description>     Create a new issue card
    --page <name>            Page hint
    --mode <mode>            Renderer mode (webview|skyline|unknown)
    --device <device>        Device info
    --screenshot <path>      Screenshot path

  list                     List all open/closed cards

  show <id|file>           Show card summary

  enrich <file>            Search for candidate components
    --repo <path>            Project repo path (required)

  candidates <file>        Show candidate components

  confirm <file> <name>    Confirm a component as target

  reject <file> <name>     Reject a component

  more <file>              Search for more candidates
    --repo <path>            Project repo path (required)

  plan <file>              Generate verification plan

  close <file>             Close the issue card
    --result <passed|failed> Verification result (required)
`);
}

main();
