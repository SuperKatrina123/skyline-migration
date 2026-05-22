# Skyline 迁移方案

> 目标：将项目小程序端从 WebView 渲染引擎迁移至 Skyline 渲染引擎。

---

## 一、整体策略

### 核心原则

1. **AB 实验只控制 renderer 配置** — 不做两套代码共存
2. **不改 H5/CRN 代码** — 所有修改限定在小程序端
3. **回退 = AB 关掉 + 发版** — 不引入运行时条件分支

### 架构示意

```
AB 实验 → app.json renderer: "skyline" → 同一份代码 → WebView 或 Skyline 渲染引擎
```

---

## 二、前置条件

- [ ] app.json 配置 Skyline 必需项（renderer, componentFramework, lazyCodeLoading）
- [ ] 每个页面 .json 配置 `navigationStyle: "custom"`
- [ ] 配置 rendererOptions（defaultDisplayBlock, defaultContentBox 等）

---

## 三、分批次迁移计划

| 批次 | 内容 | 风险等级 | 预估工作量 |
|------|------|---------|-----------|
| Batch 1 | | | |
| Batch 2 | | | |
| Batch 3 | | | |

---

## 四、风险清单

| 风险项 | 等级 | 缓解方案 |
|--------|------|---------|
| | | |

---

## 五、回滚方案

1. 关掉 AB 实验
2. 发版回退

---

## 六、验证清单

- [ ] 核心页面渲染正常
- [ ] 滚动交互正常
- [ ] 弹层/浮层显示正常
- [ ] 动画效果正常
- [ ] 路由跳转正常
- [ ] 原生组件（video 等）正常
