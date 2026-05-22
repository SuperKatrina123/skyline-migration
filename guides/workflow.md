# 迁移工作流

## 总体流程

```
Phase 1 ── 知识采集
  │   AI 读取项目源码 + dist/mini/.../node_modules/@ctrip/*-mini/ 下的真实 mini 实现
  │   ⚠️ 不要仅依赖源 node_modules/ 查看组件实现——XTaro CLI 构建时会做包替换和路径重写
  │   输出: component-mapping.md + compatibility-matrix.md + project-scan-summary.md
  │   人工: review 采集结果，修正 AI 理解偏差
  ▼
Phase 2 ── 分批次迁移
  │   Batch 1: 纯机械替换（CSS 属性、已知 API 替换） → AI 批量改 → 人工 review diff
  │   Batch 2: 中等复杂度（组件 props 调整、事件处理） → AI 出 diff + 标注 → 人工 review
  │   Batch 3: 高风险（worklet、原生组件、复杂交互） → AI 出分析报告 → 结对改
  │   每批完成后: 补充 migration-patterns.md
  ▼
Phase 3 ── 验证
  │   AI 输出验证清单 → 逐条确认
  │   回归测试 → 补测
  ▼
Phase 4 ── 沉淀
  更新 knowledge/ 数据
  收拢可复用的模式到 guides/migration-patterns.md
  可选: 整理成 Skill
```

## 每次迁移的执行步骤

```
Step 1: AI 加载上下文
  - 读 knowledge/ 下的现有数据
  - 读 guides/migration-patterns.md 已有的模式

Step 2: AI 分析目标文件
  - 对照兼容性矩阵找出问题点
  - 对照已有模式匹配可复用的改造方案
  - 输出分析清单

Step 3: 执行改造
  - AI 生成 diff
  - 每个改造点标注:
    - 为什么这么改
    - 参考的迁移模式编号
    - 需要人工特别关注的点

Step 4: 人工 review
  - 逐 diff review
  - 有问题回退给 AI 重新生成

Step 5: 沉淀
  - 如果产生了新的改造模式，补充到 migration-patterns.md
  - 如果发现了默认知识库里遗漏的问题，更新 knowledge/
```

## 注意事项

- **不要一次性改太多文件**。每批 AI 出 diff 控制在 1 个页面或 3-5 个组件以内，否则 review 成本太高。
- **先做知识采集，再做迁移**。没有兼容性矩阵就动手，会反复返工。
- **模式库比代码本身重要**。迁移完成后的核心资产是可复用的迁移模式，不是改完的代码。
- **AI 说的不兼容项不一定对**。微信官方文档更新频繁，AI 知识可能有滞后，高风险的判断需要对照最新文档验证。
