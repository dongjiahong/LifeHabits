
# 人生习惯 (Life Habits) 🌱

> 夺回生活的掌控权，让成长自然发生。

**人生习惯** 是一款基于极简主义理念打造的个人成长管理工具。它摒弃了繁杂的功能堆砌，将**每日待办**、**习惯养成**、**时间/金钱记账**以及**AI 深度复盘**有机结合，帮助你通过微小的积累，达成长期的人生目标。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.0-61dafb.svg)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-06b6d4.svg)
![Dexie](https://img.shields.io/badge/Storage-IndexedDB-22c55e.svg)

## ✨ 核心功能

### 1. ✅ 极简待办 (Todo)
- **今日/明日视图**：专注于当下的执行与明天的规划，减少焦虑。
- **Top 5 优先聚焦**：限制每天只能设定 5 件“重要事项”，强制进行精力排序。
- **Backlog**：普通任务与重要任务分离，确保要事第一。

### 2. 🌱 习惯花园 (Habit Garden)
- **可视化积累**：每一个习惯都是一个玻璃瓶，每一次坚持都是一颗“绿豆”，每一次放弃是一颗“红豆”。
- **物理反馈**：模拟真实的豆子堆积效果（基于 Canvas/CSS），直观感受时间的复利。
- **养成归档**：达成 100 次坚持后，习惯将“已养成”并归档，成为你的勋章。

### 3. 💰 统一记账 (Accounting)
- **双维度记录**：在同一个界面记录“时间开销”与“金钱消费”。
- **可视化图表**：自动生成饼图分布，清晰看见你的时间与金钱流向。
- **极简录入**：无干扰的输入体验，支持快速编辑与修正。

### 4. 🧠 AI 深度复盘 (Review)
- **多模版支持**：内置“每日四问”、“KPT”等经典复盘模版，支持自定义。
- **AI 洞察**：集成 **Google Gemini** (及 OpenAI 兼容接口)。AI 会读取你今日的**任务清单**、**记账数据**和**复盘内容**，生成温暖且深刻的每日总结与建议。
- **历史足迹**：按时间轴回顾每一天的成长轨迹。

### 5. ☁️ 隐私与同步
- **Local First**：所有数据默认存储在浏览器本地 (IndexedDB)，极速且隐私。
- **WebDAV 同步**：支持坚果云、Nextcloud 等标准 WebDAV 服务，数据加密同步，完全掌握在自己手中。

## 🛠 技术栈

- **前端框架**: React 19 (Hooks, Context)
- **样式方案**: Tailwind CSS (Glassmorphism 玻璃拟态风格)
- **本地数据库**: Dexie.js (IndexedDB 封装)
- **AI 集成**: @google/genai (Google Gemini SDK)
- **图表库**: Recharts
- **图标库**: Lucide React
- **Markdown 渲染**: React Markdown

## 🚀 快速开始

### 环境要求
- Node.js 18+
- 现代浏览器 (Chrome/Edge/Safari)

### 安装与运行

```bash
# 1. 克隆项目
git clone https://github.com/your-username/life-habits.git

# 2. 进入目录
cd life-habits

# 3. 安装依赖
npm install

# 4. 启动开发服务器
npm start
```

## ⚙️ 配置说明

### 1. AI 设置 (Gemini)
为了体验核心的 AI 复盘功能，你需要配置 API Key：
1. 访问 [Google AI Studio](https://aistudio.google.com/) 获取 API Key。
2. 在应用左上角点击 **设置 (Settings)**。
3. 在 **AI 助手配置** 中选择 `Google Gemini`，填入 API Key。
4. 模型默认为 `gemini-3-flash-preview`，也可自行修改。

### 2. 数据同步 (WebDAV)
如果你需要在多台设备间同步数据：
1. 准备一个支持 WebDAV 的网盘（如：坚果云）。
2. 在坚果云中开启 WebDAV 并获取应用密码。
3. 在应用设置中填入服务器 URL、账号及密码。
4. 点击“立即同步”。

## 📱 移动端适配
本项目采用响应式设计，完美适配移动端与桌面端。推荐在手机浏览器中将网页“添加到主屏幕”，获得类似原生 App 的全屏体验。

## 📄 许可证
MIT License
