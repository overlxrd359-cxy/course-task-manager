# 作业管理器 — 技术规范

## 运行环境

| 项目 | 要求 |
|------|------|
| 浏览器 | Chrome 90+, Safari 14+, Edge 90+, Firefox 90+ |
| 操作系统 | macOS / Windows / Linux |
| 其他 | 无需服务器、无需安装 |

## 技术栈

- **HTML5**：语义化标签，页面结构
- **CSS3**：样式布局，Flexbox，CSS 变量，过渡动画
- **ES6 JavaScript**：业务逻辑，DOM 操作，数据管理
- **Web Storage API**：localStorage 数据持久化

## 零外部依赖

本项目不引入任何第三方库、框架或 CDN 资源。所有代码在单个 HTML 文件中，确保离线可用、无网络依赖。

## 数据存储

### 存储方案

| 项目 | 说明 |
|------|------|
| 存储方式 | `window.localStorage` |
| 存储键名 | `courseTasks` |
| 数据格式 | JSON 字符串 |
| 存储时机 | 每次增删改操作后立即同步写入 |

### 数据结构

```javascript
{
  id: string,          // crypto.randomUUID() 生成
  subject: string,     // 科目名称
  content: string,     // 作业具体内容
  ddl: string,         // 截止日期，格式 YYYY-MM-DD
  importance: string,  // "high" | "medium" | "low"
  completed: boolean,  // 完成状态
  pinned: boolean      // 置顶状态
}
```

### 容量限制

localStorage 通常限制为 5-10MB，对于作业记录完全足够。

## 文件结构

```
index.html
├── <style>      CSS 样式（内嵌）
├── <body>       HTML 结构
└── <script>     JavaScript 逻辑（内嵌）
```

## 编码规范

- 文件编码：UTF-8
- 缩进：2 空格
- 命名：驼峰命名法（camelCase）
- 变量声明：const 优先，let 次之，禁用 var
- 函数：箭头函数优先用于回调，普通函数用于顶层逻辑
