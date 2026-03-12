# 时区问题修复计划

## 问题描述

- **实际时间**：北京时间 09:26
- **数据库保存时间**：`2026-03-12 01:25:47`
- **时间差**：8小时

## 问题根源分析

### 1. 后端时间保存（src/lib/db.ts）

```typescript
round.performance_start_time = new Date().toISOString().replace('T', ' ').substring(0, 19);
```

`new Date().toISOString()` 返回 UTC 时间字符串，保存的是 UTC 时间而非本地时间。

### 2. 前端时间解析

前端解析时没有正确处理时区，导致时间差 8 小时。

## 解决方案

### 方案选择：后端统一保存本地时间

根据用户反馈，后端改为保存本地时间（北京时间），前端直接使用。

### 实现步骤

#### ✅ 步骤 1：创建时间工具函数 `src/lib/timeUtils.ts`

提供统一的时间处理函数：
- `getLocalTimeString()` - 获取当前本地时间字符串，用于后端保存
- `parseTime()` - 解析时间字符串为时间戳
- `formatTime()` - 格式化时间字符串用于显示

#### ✅ 步骤 2：修改 `src/lib/db.ts` 中所有时间保存逻辑

将 10 处 `new Date().toISOString().replace('T', ' ').substring(0, 19)`
替换为 `getLocalTimeString()`

#### ✅ 步骤 3：修改前端组件的时间处理

| 文件 | 修改内容 |
|------|----------|
| `src/components/BusinessPanel.tsx` | 导入 parseTime, formatTime；移除内联 parseTime 函数 |
| `src/components/EvaluationRecords.tsx` | 导入 formatTime；替换 toLocaleString() |
| `src/components/ExpertEvaluation.tsx` | 导入 formatTime；替换 toLocaleString() |
| `src/components/RegularEvaluation.tsx` | 导入 formatTime；替换 toLocaleString() |

## 修改完成的文件

| 文件 | 状态 |
|------|------|
| `src/lib/timeUtils.ts` | ✅ 新建 |
| `src/lib/db.ts` | ✅ 修改 |
| `src/components/BusinessPanel.tsx` | ✅ 修改 |
| `src/components/EvaluationRecords.tsx` | ✅ 修改 |
| `src/components/ExpertEvaluation.tsx` | ✅ 修改 |
| `src/components/RegularEvaluation.tsx` | ✅ 修改 |

## 验证方法

1. 重启服务
2. 创建新的演出场次
3. 检查数据库中保存的时间是否为本地时间（北京时间）
4. 检查前端显示的时间是否正确

## 注意事项

1. 数据库统一存储本地时间（北京时间）
2. 所有新组件涉及时间显示时，必须使用工具函数
3. 历史数据仍为 UTC 时间，需要手动调整或接受时差