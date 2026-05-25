# Skyline flex column + alignItems:start 文字不换行

## 问题

WebView 下，flex column 容器设置 `alignItems: 'start'` 时，子文字元素仍能根据容器宽度自动换行。

Skyline 下，`alignItems: 'start'` 导致子元素不继承容器宽度（取 intrinsic width），文字元素变成单行溢出。

## 修复方案

给需要换行的文字元素加 `alignSelf: 'stretch'`，覆盖父级的 `alignItems: 'start'`：

```ts
sentenceText: {
    // ...
    alignSelf: 'stretch', // 继承容器宽度，允许文字换行
}
```

## 为什么不用 width: '100%'

两者效果相同，但 `alignSelf: 'stretch'` 更优：
- 语义精确：直接覆盖父级的 cross-axis 对齐
- flex 布局引擎自动扣除 padding，不依赖 boxSizing 计算
- 父容器宽度变化时自动适应

## 适用场景

- flex column 容器 + `alignItems: 'start'`（或 `flex-start`）
- 子元素是文字需要多行换行
- 子元素有 `numberOfLines` 限制需要生效

## 关联 Issue

- skyline-issue-002: 评分区域评论文字超出容器未换行
