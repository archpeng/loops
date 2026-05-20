# 植物时光画廊 | PLANTS GALLERY 🌿

这是一个由 AI (Gemini 3.5 Flash) 驱动的智能植物相册和时光画廊。网页采用现代 **Neo-Brutalist (新粗野主义)** 视觉风格设计，支持智能搜索、特征浏览以及诗意治愈的配文展示。

## 🌟 项目特点

*   **智能植物识别**：使用 Google Gemini API 批量分析植物照片，自动提取中文常用名、拉丁学名、植物特征介绍以及文艺治愈的配图文字，并智能匹配卡片莫兰迪底色。
*   **新粗野主义美学 (Neo-Brutalist)**：粗边框 (`--border-w-thick`) + 硬偏移阴影 (`--shadow-*`) + 糖果色搭配 + 全大写英文标题，视觉冲击力强。
*   **原生 Web Components 驱动**：不依赖繁重的 JS 框架，纯原生 Web API 开发，性能极佳。
*   **自适应布局**：支持移动端和桌面端，完美适配各种屏幕尺寸。
*   **无障碍支持**：所有交互元素均有完整的无障碍（ARIA）标签和键盘导航支持。

## 📂 项目结构

项目采用标准 H5 / Vite 组织架构，清晰整洁：

```text
/ (项目根目录)
├── index.html          # 入口 HTML
├── package.json        # 依赖与脚本配置
├── vite.config.js      # Vite 配置文件
├── .gitignore          # Git 忽略文件
├── src/                # 源代码目录
│   ├── app.js          # 应用主逻辑
│   ├── index.css       # 核心样式系统 (Tokens)
│   └── components/     # 原生 Web Components 组件
│       ├── plant-card.js   # 植物卡片组件
│       └── plant-detail.js # 植物详情弹窗组件
├── public/             # 静态资源目录 (打包后映射到根目录)
│   ├── data.json       # 由 AI 识别生成的植物数据
│   └── photos/         # 植物照片文件夹 (80+ 张)
└── scripts/            # 工具脚本
    └── analyze.js      # Gemini AI 植物批量识别脚本
```

## 🛠️ 本地开发

本项目使用 Vite 作为开发服务器：

1.  **安装依赖**（推荐使用 Bun 或 npm）：
    ```bash
    npm install
    # 或
    bun install
    ```

2.  **启动本地开发服务器**：
    ```bash
    npm run dev
    # 或
    bun run dev
    ```

3.  **构建生产版本**：
    ```bash
    npm run build
    ```

---

*用绿意与科技，记录每一片叶子在时光中的温度。* 🌿
