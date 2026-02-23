# GitHub Pages 部署指南

## 自动部署设置

本项目已配置为自动部署到 GitHub Pages。

### 步骤 1: 创建 GitHub 仓库

```bash
cd e:\0_comps\00_FRC\00_codes\model\shooter-simulator
git add .
git commit -m "Initial commit: FRC Shooter Simulator"
```

如果还没有远程仓库，创建一个新的 GitHub 仓库，然后：

```bash
git remote add origin https://github.com/YOUR_USERNAME/shooter-simulator.git
git branch -M main
git push -u origin main
```

### 步骤 2: 启用 GitHub Pages

1. 进入你的 GitHub 仓库
2. 点击 **Settings** (设置)
3. 在左侧菜单中点击 **Pages**
4. 在 **Source** 下选择 **GitHub Actions**

### 步骤 3: 自动部署

推送代码后，GitHub Actions 会自动：
- 安装依赖
- 构建 Next.js 应用
- 部署到 GitHub Pages

查看部署状态：
- 进入仓库的 **Actions** 标签页
- 查看 "Deploy to GitHub Pages" 工作流

### 步骤 4: 访问网站

部署成功后，你的网站将在以下地址可用：

```
https://YOUR_USERNAME.github.io/shooter-simulator/
```

## 手动部署（可选）

如果需要手动构建和部署：

```bash
# 安装依赖
npm install

# 构建静态文件
npm run build

# 输出目录在 ./out
```

## 配置说明

### next.config.ts
- `output: 'export'` - 启用静态导出
- `images.unoptimized: true` - 禁用图片优化（静态导出需要）

### .github/workflows/deploy.yml
- 自动化部署工作流
- 在推送到 main 分支时触发
- 使用 Node.js 20 构建
- 部署到 GitHub Pages

### public/.nojekyll
- 防止 GitHub Pages 使用 Jekyll 处理文件
- 确保以 `_` 开头的文件可以正常访问

## 更新部署

每次推送到 main 分支时，网站会自动重新部署：

```bash
git add .
git commit -m "Update shooter simulator"
git push
```

## 故障排除

### 部署失败
- 检查 GitHub Actions 日志
- 确保 GitHub Pages 已启用
- 确认仓库有正确的权限设置

### 404 错误
- 确保 `.nojekyll` 文件存在于 `public/` 目录
- 检查 GitHub Pages 设置中的源是否为 "GitHub Actions"

### 资源加载失败
- 检查 `next.config.ts` 中的 `basePath` 配置
- 如果仓库名不是 `shooter-simulator`，可能需要调整配置
