# MineChat 毛玻璃质感基线

> MineChat 独创 SVG 玻璃扭曲质感，适配聊天软件场景

---

## User Approval

用户确认 MineChat 的毛玻璃设计语言，要求：

- 不能接受普通毛玻璃（仅blur），没有扭曲质感
- 不能接受中间糊成一团的毛玻璃
- 不能接受大面积白色渐变扫过去的廉价质感
- 不能接受右侧缺一块、整体右偏、上下错位明显
- 因套用SVG导致性能明显下降不可接受

## 三层毛玻璃体系

MineChat 定义三层毛玻璃，对应不同UI层级：

### 层级1：侧栏 — 最强模糊

```css
--glass-sidebar-bg: rgba(14,16,20,.72);
--glass-sidebar-filter: blur(40px) saturate(1.4) brightness(1.1);
--glass-sidebar-border: 1px solid rgba(0,245,212,.12);
--glass-sidebar-shadow: 
  inset -1px 0 0 rgba(255,255,255,.04),
  4px 0 24px rgba(0,0,0,.20);
```

### 层级2：面板/卡片 — 中等模糊

```css
--glass-panel-bg: linear-gradient(112deg, rgba(72,74,76,.62), rgba(24,27,30,.70) 48%, rgba(8,12,14,.74));
--glass-panel-filter: blur(34px) saturate(1.34);
--glass-panel-border: 1px solid rgba(0,245,212,.30);
--glass-panel-shadow: 
  0 22px 64px rgba(0,0,0,.30),
  0 0 34px rgba(0,245,212,.052),
  inset 0 1px 0 rgba(255,255,255,.16);
```

### 层级3：弹窗/浮层 — 轻模糊

```css
--glass-overlay-bg: rgba(12,12,18,.78);
--glass-overlay-filter: blur(24px) saturate(1.12);
--glass-overlay-border: 1px solid rgba(255,255,255,.09);
--glass-overlay-shadow: 
  0 18px 54px rgba(0,0,0,.38),
  inset 0 1px 0 rgba(255,255,255,.07);
```

## SVG Filter 规划

MineChat 初期使用标准 `backdrop-filter: blur()` 实现毛玻璃效果。
后续如需增强质感，可参考 SVG displacement map 方案：

- RGB三通道 displacement scale: Red 180, Green 170, Blue 160
- RGB偏移: dx="-90" dy="0"
- merge后用 screen 混合
- 最后 feGaussianBlur stdDeviation="0.5"

## Safe Change Rules

- 可以：调整模糊半径、透明度、边框颜色
- 可以：为不同组件新增独立filter
- 谨慎：调整SVG filter区域、offset、scale
- 禁止：整体替换为无扭曲质感的普通blur
- 禁止：为了性能删除色差或扭曲质感

## Verification Checklist

在黑底和亮底都看一遍：

- 侧栏毛玻璃没有糊成一团
- 面板/卡片边缘清晰，中间有水波扭曲感
- 弹窗/浮层轻模糊，不抢主内容焦点
- hover/focus状态没有明显卡顿
- 消息气泡区域毛玻璃不影响文字可读性
