# 作业管理器 / Course Task Manager

一个简洁直观的作业管理 Web 应用，帮助你记录和追踪各科目作业的截止日期（DDL）。

A clean and intuitive web app for managing course assignments and tracking their deadlines (DDL).

---

## 功能介绍 / Features

| 功能                                | Feature                                             |
| ----------------------------------- | --------------------------------------------------- |
| 添加作业（科目、内容、DDL、重要性） | Add assignments (subject, content, DDL, importance) |
| 按 DDL 升序排列，置顶优先           | Sorted by DDL ascending, pinned items first         |
| 标记完成 / 未完成                   | Mark as complete / incomplete                       |
| 置顶 / 取消置顶                     | Pin / unpin assignments                             |
| 搜索过滤                            | Search and filter                                   |
| 本地数据持久化                      | Local data persistence (localStorage)               |

## 使用方法 / How to Use

### 纯前端版（零依赖，双击即用）

1. 下载或克隆本项目 / Download or clone this project
2. 用浏览器打开 `Course Task Manager/index.html` / Open `Course Task Manager/index.html` in your browser
3. 开始添加作业 / Start adding assignments

### Flask 升级版（后端 + 数据库）

```bash
cd "Course Task Manager/flask-app"
pip install flask              # 仅需一次
python app.py                  # 启动服务器
# 浏览器打开 http://localhost:5050
```

## 技术栈 / Tech Stack

### 纯前端版

- 纯 HTML5 + CSS3 + JavaScript (ES6)
- 零外部依赖 / Zero external dependencies
- 浏览器本地存储 / Browser localStorage

### Flask 升级版

- Python Flask + SQLite
- RESTful JSON API
- 前后端分离架构 / Frontend-backend separation

## 项目结构 / Project Structure

```
├── README.md                 # 项目说明 / Project overview
├── CLAUDE.md                 # AI 开发指引 / AI dev guide
├── docs/                     # 项目文档 / Documentation
│   ├── requirements.md       # 需求文档
│   ├── tech-spec.md          # 技术规范
│   ├── design-spec.md        # 设计规范
│   └── dev-plan.md           # 开发计划
├── devlog/                   # 开发日志 / Dev logs
└── Course Task Manager/
    ├── index.html            # 纯前端版（双击即用）
    └── flask-app/            # Flask 升级版
        ├── app.py            # Flask 服务器 + API
        ├── requirements.txt  # Python 依赖
        ├── templates/        # HTML 模板
        ├── static/           # CSS + JS
        └── data/             # SQLite 数据库
```

## 许可证 / License

[MIT](LICENSE)
