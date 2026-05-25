# Issue Card 工作流

## 概述

Migration Issue Card 是 Skyline 迁移问题的闭环管理协议。每个迁移问题对应一张 Card，从问题描述到知识沉淀形成完整链路。

## 状态机（严格单向流转）

```
draft → enriched → reviewed → fixing → verifying → closed
```

- **draft**: 现象结构化（只有 symptom/risk/keywords）
- **enriched**: 候选组件 + 代码证据 + 根因假设（analysis.likely_root_cause）
- **reviewed**: 人工确认候选组件（confirmed_component 有值）
- **fixing**: 生成修复 prompt 并执行
- **verifying**: 执行验证计划
- **closed**: 验证后沉淀（resolution.root_cause + reusable_rule）

## 阶段字段约束

| 字段 | 最早允许写入阶段 | 说明 |
|------|------------------|------|
| `inputs.*` | draft | 用户输入 |
| `symptom.*` | draft | 现象描述 |
| `visual_context.*` | draft | 视觉信息 |
| `risk.*` | draft | 风险分类 |
| `knowledge.queries` | draft | 检索关键词 |
| `candidate_components` | enriched | 候选，不是结论 |
| `code_context.evidence` | enriched | 代码证据 |
| `matched_rules` | enriched | 必须带 doc 来源 |
| `analysis.likely_root_cause` | enriched | 假设，非最终结论 |
| `verification_checklist_draft` | enriched | 验证清单草稿 |
| `component_retrieval.reviewed` | reviewed | 人工 confirm 后 |
| `confirmed_component` | reviewed | 人工 confirm 后 |
| `resolution.root_cause` | closed | 验证通过后 |
| `resolution.fix_summary` | closed | 验证通过后 |
| `resolution.reusable_rule` | closed | 仅 passed 时 |
| `case_output.should_write_to_kb` | closed | 仅 passed 时 |

## 核心流程

```
粗糙问题描述 + 可选截图/日志/页面入口
    ↓
create → Draft Migration Issue Card（只做现象结构化）
    ↓
enrich → 检索 knowledge/、guides/、repo 代码
    ↓
生成 candidate_components、code_context.evidence、analysis.likely_root_cause
    ↓
人工 review：confirm / reject / more
    ↓
confirmed → 生成 Claude Code 修复 prompt
    ↓
plan → 生成 Verification Plan
    ↓
人工验证
    ↓
close → 写入 resolution，移动到 closed/，生成 Migration Case 草案
```

## 证据等级规则

### Level 1: User Report

- 用户一句话描述
- 只能作为弱证据
- 用途：生成初始 risk.types 和 knowledge.queries

### Level 2: Visual Evidence

- 截图/录屏证明现象存在
- 可以用于生成 visual_context 和 search_queries
- **不能单独证明根因**
- **不能单独作为 high-confidence component evidence**
- 可提高 `symptom_confidence`，不能提高 `root_cause_confidence`

### Level 3: Runtime Evidence

- 日志、报错、元素位置变化、自动化运行结果
- 可以辅助判断现象和复现稳定性
- 可作为中等证据

### Level 4: Code Evidence

- `route_match`: 页面路由匹配到组件所在目录
- `text_match`: 组件渲染文案与描述/截图文案匹配
- `import_relation`: 页面直接或间接引用该组件
- `style_signal`: 组件样式包含风险信号（fixed、sticky、z-index 等）
- `code_signal`: 组件代码包含风险 API（ScrollView、onScroll 等）
- 是**组件定位的强证据**

### Level 5: Verification Evidence

- WebView/Skyline 对比
- iOS/Android 对比
- 人工或自动化验证结果
- 是**关闭 Issue 的必要证据**

## 强制规则

1. `visual_match` + `name_match` **不能**给 high confidence
2. high confidence 至少需要 `route_match` / `text_match` / `import_relation` / `style_signal` / `code_signal` 中的**两个及以上**
3. 如果只有 visual evidence，`component_retrieval.status` 必须是 `insufficient_code_evidence`
4. `reviewed=false` 时**不能**生成 fix prompt
5. `confirmed_component` 为空时**不能**进入 fixing
6. close 时必须有 `verification.result`（passed 或 failed）
7. enriched 阶段**不能**写 `resolution.*` 任何字段
8. enriched 阶段**不能**设置 `reviewed: true`
9. enriched 阶段**不能**设置 `case_output.should_write_to_kb: true`
10. `knowledge.matched_rules` 的 `doc` 必须是**真实文件路径**，不允许 `doc: "inferred"`
11. `visual_context.root_cause_confidence` **永远不允许** `high`（截图不能证明根因）
12. 根因置信度**只由** `analysis.confidence` 表达
13. 推理出的规则放 `analysis.inferred_rules`，不放 `knowledge.matched_rules`
14. 构建产物路径（dist/、node_modules/）的候选必须标注 `build_artifact_constraint`
15. 证据不足时必须填 `uncertainty.missing_evidence` 并建议 `more` 检索，不得直接进入 fix

## Candidate Components 数据结构

每个 candidate 必须包含：

```yaml
- name: ComponentName
  file: src/path/to/file.tsx
  role: likely_source | affected_area | container_context | unknown
  confidence: high | medium | low
  evidence:
    route_match: true/false
    text_match: true/false
    import_relation: true/false
    style_signal: true/false
    code_signal: true/false
    visual_match: true/false
    name_match: true/false
  reason: "定位原因说明"
  missing_evidence: []
```

### Role 说明

- `likely_source`: 最可能是问题根因的组件
- `affected_area`: 被影响的区域，但不是根因
- `container_context`: 容器/上下文组件，提供布局信息
- `unknown`: 尚不确定角色

### Confidence 判定

- **high**: 至少 2 个 Level 4 代码证据 + route_match
- **medium**: 1 个 Level 4 代码证据 + 其他辅助证据
- **low**: 仅有 visual_match / name_match 或推测

## matched_rules 与 inferred_rules

### knowledge.matched_rules — 必须来自真实文档

```yaml
knowledge:
  matched_rules:
    - doc: "knowledge/compatibility-matrix.md"
      rule: "Skyline 不支持 position:sticky，需使用 sticky-header 组件替代"
      relevance: "high"
```

- `doc` 必须是**真实存在的知识库文件路径**
- **不允许** `doc: "inferred"` — 推断的规则不是知识库匹配
- 如果 knowledge/ 中没有匹配的文档，`matched_rules` 留空

### analysis.inferred_rules — 基于代码推理

```yaml
analysis:
  inferred_rules:
    - "疑似 Skyline 下 overflow:scroll 会产生原生滚动条"
    - "初步判断 wx.createAnimation 在 Skyline 下不执行"
```

- 必须使用推测语气
- close 阶段验证通过后才能固化为 `resolution.reusable_rule`

## visual_context.confidence 拆分

```yaml
visual_context:
  symptom_confidence: "high"        # 现象是否清晰可复现
  root_cause_confidence: "unknown"  # 截图不能证明根因，只允许 unknown 或 low
```

- 截图清晰 → `symptom_confidence: high`
- `root_cause_confidence` **永远不允许 high**（截图/录屏不能证明根因）
- 根因置信度唯一字段：`analysis.confidence`（基于代码证据判断）

## 人工 Review 机制

Review 成本要低，开发者只需要：

- `confirm <component>`: 确认某个组件是目标 → `reviewed=true`, `confirmed_component` 赋值, `component_retrieval.status = ready_for_fix`
- `reject <component>`: 排除某个组件 → 写入 `rejected_components`，基于 `missing_evidence` 继续检索
- `more`: 要求继续检索

不要求开发者手动提供组件文件名。

## component_retrieval.status 枚举

| 值 | 含义 | 允许阶段 |
|----|------|----------|
| `pending` | 尚未开始检索 | draft |
| `insufficient_code_evidence` | 证据不足，建议 more search | enriched |
| `ready_for_review` | 有候选组件，等人工确认 | enriched |
| `ready_for_fix` | 人工已确认，可生成修复 prompt | reviewed |

## 构建产物约束

当 candidate 的 file 指向以下路径时：
- `dist/mini/.minicache/...`
- `node_modules/...`
- 任何构建输出目录

**必须**添加 `build_artifact_constraint` 字段：

```yaml
- name: "XPoplayer"
  file: "dist/mini/.minicache/.../XPoplayer/action.ts"
  build_artifact_constraint: "不可直接修改构建产物。优先：1) 升级源依赖版本 2) 寻找业务封装层 3) 在业务层做兼容处理"
```

同时在 `analysis.open_questions` 中补充：
- 该依赖是否有 Skyline 兼容版本
- 是否有业务层 adapter 可拦截

## 证据不足时的处理

当 `component_retrieval.status = insufficient_code_evidence` 时：

1. 必须填写 `uncertainty.missing_evidence`
2. 必须填写 `uncertainty.suggested_next_search`
3. **不得**进入 fix 流程
4. 建议用户执行 `more` 继续检索

## Close 规则

- 只有 `verification.result = passed | failed` 后才能 close
- **passed** 时才能写：
  - `resolution.root_cause`（从 `analysis.likely_root_cause` 固化）
  - `resolution.fix_summary`
  - `resolution.reusable_rule`
  - `case_output.should_write_to_kb: true`
- **failed** 时只能写：
  - `resolution.root_cause`（如果已确认但修复失败）
  - unresolved notes
  - follow-up issue reference

## Verification Checklist 标准项

验证清单必须覆盖：

```yaml
verification_checklist_draft:
  - "Skyline 下验证修复效果"
  - "WebView 下对比验证（表现不变）"
  - "iOS / Android 双端验证"
  - "AB 回退验证（关闭实验后无异常）"
  - "非微信端回归（H5/CRN 不受影响）"
  # 根据具体问题补充场景：
  # - "多 tab 动态宽度场景"
  # - "maxWidth 边界 case"
  # - "横向滚动表现"
  # - "空数据/极端数据"
  # - "多设备分辨率"
```

## 风险类型

| 类型 | 典型关键词 | 典型 CSS 信号 |
|------|-----------|--------------|
| fixed-bottom | bottom, footer, fixed, safe-area | position: fixed, bottom: 0 |
| sticky | sticky, filter, tab, nav | position: sticky, top: 0 |
| scroll | scroll-view, ScrollView, onScroll | overflow: scroll/auto |
| swiper | swiper, Swiper, carousel | - |
| popup | popup, modal, dialog, overlay | position: fixed, z-index |
| animation | createAnimation, transition, transform | - |
| layout | absolute, flex, width, overflow | position: absolute, display: flex |

## CLI 命令速览

```bash
# 创建 Issue Card
node scripts/issue-card.js create "问题描述" --page "页面名" --mode skyline

# 列出所有 Card
node scripts/issue-card.js list

# 查看 Card
node scripts/issue-card.js show <id>

# 检索组件候选
node scripts/issue-card.js enrich <file> --repo /path/to/project

# 查看候选组件
node scripts/issue-card.js candidates <file>

# 确认/排除组件
node scripts/issue-card.js confirm <file> <componentName>
node scripts/issue-card.js reject <file> <componentName>

# 继续检索
node scripts/issue-card.js more <file> --repo /path/to/project

# 生成验证计划
node scripts/issue-card.js plan <file>

# 关闭 Card
node scripts/issue-card.js close <file> --result passed|failed
```
