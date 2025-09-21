# 🚂 Railway 部署指南

这个指南将帮你将 MCP Binance 服务器部署到 Railway，并配置 ChatGPT 集成。

## 📋 前置要求

- [x] GitHub 账户
- [x] Railway 账户（可以用 GitHub 登录）
- [x] 项目已推送到 GitHub

## 🚀 第一步：准备项目

### 1.1 检查项目文件
确保你的项目包含以下文件：
- ✅ `railway.json` - Railway 配置
- ✅ `Procfile` - 进程配置
- ✅ `.railwayignore` - 忽略文件
- ✅ `.env.railway` - 环境变量模板

### 1.2 推送到 GitHub
```bash
# 添加所有文件
git add .

# 提交更改
git commit -m "Add Railway deployment configuration

🚂 Added Railway deployment config files:
- railway.json for deployment settings
- Procfile for process configuration
- .railwayignore for file exclusions
- .env.railway for environment variables
- RAILWAY_DEPLOY.md for deployment guide

🎯 Ready for Railway deployment and ChatGPT integration"

# 推送到 GitHub
git push origin main
```

## 🏗️ 第二步：在 Railway 上部署

### 2.1 创建 Railway 项目

1. 访问 [Railway.app](https://railway.app)
2. 使用 GitHub 账户登录
3. 点击 "New Project"
4. 选择 "Deploy from GitHub repo"
5. 选择你的 `crypto-mcp` 仓库
6. 点击 "Deploy"

### 2.2 配置环境变量

在 Railway 项目仪表板中：

1. 点击你的服务
2. 转到 "Variables" 标签
3. 添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `TRANSPORT` | `http` | 必须设置为 http |
| `NODE_ENV` | `production` | 生产环境 |
| `LOG_LEVEL` | `info` | 日志级别 |
| `HOST` | `0.0.0.0` | 监听所有接口 |
| `AUTH_TOKEN` | `[生成的令牌]` | 见下方生成方法 |

### 2.3 生成安全的 AUTH_TOKEN

在本地终端运行：
```bash
# 生成 32 字节的随机令牌
openssl rand -hex 32
```

复制输出的令牌，添加到 Railway 环境变量中。

**重要**: 保存这个令牌，稍后在 ChatGPT 中需要使用！

## 🔍 第三步：验证部署

### 3.1 检查部署状态

1. 在 Railway 仪表板中查看部署日志
2. 等待部署完成（通常 2-5 分钟）
3. 点击 "View Logs" 查看运行状态

### 3.2 获取公网 URL

1. 在 Railway 项目中点击 "Settings"
2. 滚动到 "Domains" 部分
3. 点击 "Generate Domain"
4. 复制生成的 URL（类似：`https://your-project.railway.app`）

### 3.3 测试连接

使用生成的 URL 测试服务：

```bash
# 替换为你的 Railway URL 和 AUTH_TOKEN
RAILWAY_URL="https://your-project.railway.app"
AUTH_TOKEN="your-generated-token"

# 健康检查
curl $RAILWAY_URL/healthz

# 获取工具列表
curl $RAILWAY_URL/tools

# 测试 RPC 端点
curl -X POST $RAILWAY_URL/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 🤖 第四步：ChatGPT 集成

### 4.1 在 ChatGPT 中添加连接器

1. 打开 ChatGPT
2. 进入设置 > 连接器
3. 点击 "添加连接器"
4. 选择 "自定义连接器"

### 4.2 配置连接器

| 字段 | 值 |
|------|-----|
| 名称 | `MCP Binance` |
| 描述 | `Binance 加密货币市场数据` |
| URL | `https://your-project.railway.app/rpc` |
| 认证类型 | `Bearer Token` |
| Token | `[你的 AUTH_TOKEN]` |

### 4.3 测试集成

在 ChatGPT 中尝试：
```
请帮我获取 BTC/USDT 的最新价格数据
```

如果配置正确，ChatGPT 应该能够通过你的 MCP 服务器获取 Binance 数据。

## 🔧 故障排除

### 常见问题

#### 部署失败
- 检查 `package.json` 中的 Node.js 版本要求
- 确保所有依赖项都已正确安装
- 查看 Railway 部署日志了解具体错误

#### 健康检查失败
- 确认环境变量 `TRANSPORT=http`
- 检查 PORT 是否由 Railway 自动设置
- 查看应用日志确认服务是否正常启动

#### ChatGPT 连接失败
- 确认 Railway URL 可以公网访问
- 验证 AUTH_TOKEN 设置正确
- 测试 RPC 端点是否响应正常

### 调试步骤

1. **检查 Railway 日志**：
   ```
   Railway Dashboard > Your Service > Logs
   ```

2. **手动测试端点**：
   ```bash
   curl https://your-project.railway.app/healthz
   ```

3. **验证环境变量**：
   ```
   Railway Dashboard > Your Service > Variables
   ```

## 📊 监控和维护

### 查看运行状态
- Railway 仪表板显示 CPU、内存使用情况
- 应用日志记录所有请求和错误
- 健康检查端点：`/healthz`

### 更新部署
当你更新代码后：
1. 推送到 GitHub
2. Railway 自动检测并重新部署
3. 无需手动干预

### 扩展资源
如果需要更多资源：
1. 在 Railway 项目设置中升级计划
2. 调整内存和 CPU 限制

## 🎉 完成！

恭喜！你现在拥有：
- ✅ 在 Railway 上运行的 MCP 服务器
- ✅ HTTPS 安全连接
- ✅ 与 ChatGPT 的集成
- ✅ 24/7 可用的加密货币数据服务

## 📞 支持

如果遇到问题：
1. 查看 Railway 文档：https://docs.railway.app
2. 检查项目的 GitHub Issues
3. 参考本项目的故障排除部分