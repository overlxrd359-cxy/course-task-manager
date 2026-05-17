# CLAUDE.md — AI 助手工作指引

## 项目概况

这是一个**作业管理器 (Course Task Manager)** Web 应用，帮助用户在浏览器中管理课程作业和截止日期。

- **用户角色**：编程初学者
- **项目根目录**：`/Users/overlxrd/vibe coding project`
- **应用代码**：
  - 纯前端版：`Course Task Manager/index.html`
  - Flask 版后端：`Course Task Manager/flask-app/app.py`
  - Flask 版前端：`Course Task Manager/flask-app/templates/index.html` + `static/`

## 标准文件路径

以下文档是项目的权威规范，所有开发决策必须遵守：

| 文档 | 路径 | 说明 |
|------|------|------|
| 需求文档 | [docs/requirements.md](docs/requirements.md) | 功能与非功能需求 |
| 技术规范 | [docs/tech-spec.md](docs/tech-spec.md) | 技术栈、数据存储、编码规范 |
| 设计规范 | [docs/design-spec.md](docs/design-spec.md) | UI 颜色、字体、间距、组件规格 |
| 执行步骤 | [docs/dev-plan.md](docs/dev-plan.md) | 分阶段开发任务清单 |

## 工作原则

1. **分阶段推进**：严格按照 docs/dev-plan.md 的阶段顺序开发，不跳步、不一口气做完
2. **零依赖**：单文件 HTML 应用，不引入任何第三方框架或库
3. **文档驱动**：编码前先查阅对应的规范文档
4. **每日记录**：每次完成开发后更新 devlog/ 目录下的日志

## 开发日志

日志目录：[devlog/](devlog/)

- 文件名格式：`YYYY-MM-DD.md`
- 每次完成阶段性工作后更新
- 记录：已完成事项 + 待办事项

## 代码规范

### 纯前端版
- 所有代码在 `Course Task Manager/index.html` 单文件中
- HTML、CSS、JS 分别用 `<style>` 和 `<script>` 标签内嵌
- 数据存储：`localStorage`，key = `courseTasks`、`courseSubjectColors`

### Flask 升级版
- 后端：`Course Task Manager/flask-app/app.py`（Flask + SQLite + REST API）
- 前端：拆分到 `templates/index.html` + `static/style.css` + `static/app.js`
- API 格式：JSON，统一返回 `{ "ok": true/false, "data": ... }`
- 前端通过 `fetch()` 调用 API，不再直接操作 localStorage
- 启动命令：`cd flask-app && python app.py`，访问 `http://localhost:5050`

### 通用规范
- JavaScript 使用 ES6 语法，const/let 声明变量
- 2 空格缩进
- UTF-8 编码
- 使用 `uuid.uuid4()`（Python）生成唯一 ID

## 颜色速查

主色 `#5B9BD5` | 背景 `#F0F6FB` | 高重要性 `#E74C3C` | 中重要性 `#F39C12` | 低重要性 `#27AE60`
