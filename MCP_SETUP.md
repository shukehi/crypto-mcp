# Crypto MCP Server 本地开发部署指南

## 概述
Crypto MCP Server 是一个基于 Model Context Protocol (MCP) 的加密货币市场数据服务器，提供币安交易所的实时数据查询功能。

## 支持的传输模式

### 1. HTTP 模式 (JSON-RPC over HTTP)
适合独立运行和 API 调用测试：

```bash
# 构建项目
npm run build

# 启动 HTTP 服务器 (默认端口 8080)
npm start

# 或者指定端口
PORT=3000 npm start
```

测试 HTTP 端点：
```bash
# 健康检查
curl http://localhost:8080/healthz

# 获取工具列表
curl http://localhost:8080/tools

# 调用 MCP 工具
curl -X POST http://localhost:8080/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_mark_price",
      "arguments": {"symbol": "BTCUSDT"}
    }
  }'
```

### 2. STDIO 模式 (用于 Claude Desktop)
适合与 Claude Desktop 集成：

```bash
# STDIO 模式启动
TRANSPORT=stdio node dist/index.js
```

## Claude Desktop 配置

### 步骤 1: 构建项目
```bash
cd /Users/aries/Dve/crypto-mcp
npm install
npm run build
```

### 步骤 2: 配置 Claude Desktop
1. 打开 Claude Desktop
2. 进入 Settings → Developer
3. 点击 "Edit Config"
4. 添加以下配置：

```json
{
  "mcpServers": {
    "crypto-binance": {
      "command": "node",
      "args": ["/Users/aries/Dve/crypto-mcp/dist/index.js"],
      "env": {
        "TRANSPORT": "stdio"
      }
    }
  }
}
```

### 步骤 3: 重启 Claude Desktop
保存配置后重启 Claude Desktop，成功配置后会显示 MCP 服务器指示器。

## 可用工具

### 1. get_ohlcv
获取 OHLCV (K线) 数据
- `symbol`: 交易对 (如 "BTCUSDT")
- `interval`: 时间间隔 (如 "1h", "4h", "1d")
- `market`: 市场类型 ("spot" 或 "futures")
- `limit`: 返回数量 (可选)

### 2. get_mark_price
获取期货标记价格
- `symbol`: 交易对 (如 "BTCUSDT")

### 3. get_funding_rate
获取资金费率历史
- `symbol`: 交易对 (如 "BTCUSDT")
- `limit`: 返回数量 (可选)

### 4. get_open_interest
获取持仓量数据
- `symbol`: 交易对 (如 "BTCUSDT")

## 环境配置

可选环境变量：
- `TRANSPORT`: "http" (默认) 或 "stdio"
- `PORT`: HTTP 端口 (默认 8080)
- `HOST`: HTTP 主机 (默认 "0.0.0.0")
- `AUTH_TOKEN`: HTTP 认证令牌 (可选)
- `LOG_LEVEL`: 日志级别 (默认 "info")

## 故障排除

### 开发模式问题
由于 ES 模块配置问题，`npm run dev` 可能无法启动。建议使用：
```bash
npm run build && npm start
```

### STDIO 模式调试
如果 Claude Desktop 连接失败：
1. 检查文件路径是否正确
2. 确保项目已构建 (`npm run build`)
3. 检查 Node.js 版本兼容性
4. 查看 Claude Desktop 错误日志

### 权限问题
确保 Claude Desktop 有权限访问项目目录：
```bash
chmod +x /Users/aries/Dve/crypto-mcp/dist/index.js
```

## 项目结构
```
crypto-mcp/
├── src/
│   ├── index.ts          # 服务器入口
│   ├── mcp/
│   │   └── server.ts     # MCP 服务器实现
│   ├── tools/            # MCP 工具实现
│   ├── providers/        # 币安 API 提供者
│   └── core/            # 核心工具 (日志、限流等)
├── dist/                # 构建输出
├── package.json
└── tsconfig.json
```