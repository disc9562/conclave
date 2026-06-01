# 官网项目 (Docusaurus)

此目录包含 DreamCoder 的官方文档网站，基于 Docusaurus 构建。

## 🛠️ 本地开发

```bash
# 安装依赖
cd website
npm install

# 启动本地开发服务器 (热更新)
npm run start

# 构建生产环境静态文件
npm run build

# 预览构建产物
npm run serve
```

## 🌐 部署

构建后的静态文件位于 `website/build`。可以直接部署到 GitHub Pages：

1. 修改 `docusaurus.config.ts` 中的 `baseUrl` 为 `/`（如果部署到根目录）。
2. 运行 `npm run build`。
3. 将 `build` 目录内容推送到 `gh-pages` 分支。

## 📝 添加新文档

1. 在 `website/docs/` 目录下创建 `.md` 或 `.mdx` 文件。
2. 在 `sidebars.ts` 中注册或自动生成侧边栏。
3. 支持 React 组件嵌入 (MDX)。

## 🎨 主题定制

- 夜间/日间模式切换已默认启用。
- 主题变量定义在 `src/css/custom.css` 中，可修改 `--dc-*` 变量调整配色。