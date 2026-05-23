# Skyline Migration — 团队工作手册

将 `xtaro-hotel-detail-page` 从 WebView 迁移至 Skyline 的兼容性指导手册。团队在日常开发中遇到 Skyline 兼容问题时，按此流程处理。

---

## 工作流程

```
开发需求 → node scripts/skyline-check.js  →  通过 ✅   → 提交
                                     ↓ 不通过
                         查 compatibility-matrix 确认问题
                                     ↓
                         查 guides/migration-patterns 找解法
                                     ↓
                         修改代码，重新校验，通过后提交
```

### 日常开发：改完就跑检查

```bash
node scripts/skyline-check.js          # 检查所有未提交变更
node scripts/skyline-check.js <path>   # 检查单个文件
node scripts/skyline-check.js --commit <hash>  # 检查某个 commit
```

检查不通过时：
1. 看 `knowledge/compatibility-matrix.md` — 确认问题类型和优先级
2. 看 `guides/migration-patterns.md` — 参考改法
3. 修完再跑一次检查，通过后提交

### 遇到新兼容问题：补充知识

当前扫描脚本和知识库覆盖的是已知问题。遇到新的兼容性问题时：

1. 更新 `knowledge/compatibility-matrix.md` — 加一行
2. 更新 `guides/migration-patterns.md` — 有通用性的改法写成新模式
3. 改完后 PR 合入，团队共享

---

## 文件说明

| 文件 | 谁看 | 用途 |
|------|------|------|
| `scripts/skyline-check.js` | **人执行** | 一键校验变更是否引入 Skyline 不兼容代码 |
| `knowledge/compatibility-matrix.md` | **人 + AI** | 项目已知兼容性问题清单（什么不兼容、怎么改、优先级） |
| `guides/migration-patterns.md` | **人 + AI** | 每种不兼容的改法示例（before → after） |
| `plans/migration-plan.md` | **人 + AI** | 迁移的整体分期策略和风险清单 |
| `knowledge/project-scan-summary.md` | **AI 优先** | 项目结构和摸底数据 |
| `knowledge/component-mapping.md` | **AI 优先** | XTaro 组件到原生组件的映射 |
| `knowledge/scroll-api-guide.md` | **AI 优先** | 滚动 API 的 Skyline 差异 |
| `guides/workflow.md` | **人 + AI** | 完整迁移工作流步骤 |
| `guides/testing-guide.md` | **人** | 三层验证方法（静态扫描 → 工具预览 → 真机） |

---

## 迁移策略

**AB 实验只控制 renderer 配置，代码只维护一份**，不做两套代码共存：

```
AB 实验 → app.json renderer: "skyline" → 同一份代码 → WebView 或 Skyline
```

回退 = 关 AB + 发版，不引入运行时条件分支。

---

## CSS 改动规则速查

| 场景 | 做法 |
|------|------|
| 文件是 `.mini.scss` / `.mini.tsx` / `.mini.ts` | **直接改** |
| 共享 style.ts，属性**影响 H5/CRN** | `IS_MINI` 条件分支保护 |
| 共享 style.ts，属性**只影响小程序** | 直接改 |
| `position: fixed` / `@keyframes` | 先保留，Skyline 下测试后再决定 |
| `overflow: auto/scroll` | 改 `.mini.*` 或用 `IS_MINI` 保护 |
| `display: flex` 缺方向 | `IS_MINI` 条件分支加 `flexDirection` |

---

## 团队维护守则

1. **发现新兼容问题，随手补进 compatibility-matrix** — 一行就够了
2. **有通用性的改法，写成 migration-patterns 的一个新模式** — before → after + 注意点
3. **不要直接修改别人正在迁移的批次文件** — 分批方案见 `plans/migration-plan.md`
