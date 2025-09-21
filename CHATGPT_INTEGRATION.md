# 🤖 ChatGPT 集成指南

本指南将帮你将部署在 Railway 上的 MCP Binance 服务器集成到 ChatGPT 中，让 ChatGPT 能够获取实时的加密货币市场数据。

## 📋 前置要求

在开始之前，确保你已经完成：

- ✅ **Railway 部署**：已按照 `RAILWAY_DEPLOY.md` 成功部署到 Railway
- ✅ **服务正常运行**：健康检查 `/healthz` 返回正常
- ✅ **获得 Railway URL**：例如 `https://your-project.railway.app`
- ✅ **配置 AUTH_TOKEN**：已在 Railway 环境变量中设置安全令牌

## 🔗 第一步：验证 MCP 服务器

在配置 ChatGPT 之前，先确认你的 MCP 服务器正常工作：

### 1.1 测试健康检查

```bash
# 替换为你的 Railway URL
RAILWAY_URL="https://your-project.railway.app"

# 健康检查
curl $RAILWAY_URL/healthz
```

预期输出：
```json
{"status":"healthy","timestamp":"2024-01-01T12:00:00.000Z"}
```

### 1.2 测试工具列表

```bash
# 获取可用工具
curl $RAILWAY_URL/tools
```

预期输出：
```json
{
  "tools": [
    {
      "name": "get_ohlcv",
      "description": "获取加密货币的 OHLCV（开高低收成交量）数据"
    },
    {
      "name": "get_mark_price",
      "description": "获取期货合约的标记价格"
    },
    {
      "name": "get_funding_rate",
      "description": "获取期货合约的资金费率历史"
    },
    {
      "name": "get_open_interest",
      "description": "获取期货合约的持仓量数据"
    }
  ]
}
```

### 1.3 测试 JSON-RPC 接口

```bash
# 替换为你的实际 AUTH_TOKEN
AUTH_TOKEN="your-generated-token-here"

# 测试工具列表
curl -X POST $RAILWAY_URL/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### 1.4 测试实际数据获取

```bash
# 测试获取 BTC/USDT 价格数据
curl -X POST $RAILWAY_URL/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_ohlcv",
      "arguments": {
        "symbol": "BTC/USDT",
        "timeframe": "1h",
        "limit": 5
      }
    }
  }'
```

如果所有测试都成功，继续下一步。

## 🤖 第二步：在 ChatGPT 中配置连接器

### 2.1 进入 ChatGPT 设置

1. 打开 [ChatGPT](https://chat.openai.com)
2. 点击左下角的用户头像
3. 选择 **"设置"** (Settings)
4. 在左侧菜单中选择 **"连接器"** (Connectors)

### 2.2 添加自定义连接器

1. 点击 **"添加连接器"** (Add Connector) 按钮
2. 选择 **"自定义连接器"** (Custom Connector)
3. 填写连接器信息：

#### 基本信息

| 字段 | 值 | 说明 |
|------|-----|------|
| **名称** | `MCP Binance` | 连接器显示名称 |
| **描述** | `实时加密货币市场数据 - 支持现货和期货价格、资金费率、持仓量等数据` | 连接器功能描述 |

#### 连接配置

| 字段 | 值 | 说明 |
|------|-----|------|
| **URL** | `https://your-project.railway.app/rpc` | 你的 Railway RPC 端点 |
| **认证类型** | `Bearer Token` | 选择 Bearer Token 认证 |
| **Token** | `[你的 AUTH_TOKEN]` | 从 Railway 环境变量中复制 |

#### 高级设置（可选）

| 字段 | 值 | 说明 |
|------|-----|------|
| **请求超时** | `30 秒` | API 请求超时时间 |
| **重试次数** | `3` | 失败重试次数 |

### 2.3 测试连接

配置完成后，点击 **"测试连接"** 按钮。如果配置正确，应该显示：

```
✅ 连接成功
已发现 4 个可用工具：
- get_ohlcv: 获取 OHLCV 数据
- get_mark_price: 获取标记价格
- get_funding_rate: 获取资金费率
- get_open_interest: 获取持仓量
```

### 2.4 保存配置

测试成功后，点击 **"保存"** 按钮完成配置。

## ✅ 第三步：验证 ChatGPT 集成

### 3.1 基础测试

在 ChatGPT 对话中尝试：

```
请帮我获取 BTC/USDT 的最新价格数据
```

预期 ChatGPT 回复包含：
- 当前价格
- 24小时涨跌幅
- 成交量信息
- 数据来源时间

### 3.2 高级功能测试

#### 测试 OHLCV 数据
```
获取 ETH/USDT 过去 24 小时的小时级 K 线数据，我想看看价格走势
```

#### 测试期货数据
```
查询 BTC 期货的当前标记价格和最新资金费率
```

#### 测试持仓量数据
```
显示 ETH 永续合约的持仓量变化趋势
```

### 3.3 复杂查询测试

```
分析 BTC 和 ETH 的市场表现：
1. 获取两者的 4 小时 K 线数据（最近 48 小时）
2. 比较它们的价格变化和成交量
3. 查看期货市场的资金费率情况
```

## 🔧 故障排除

### 常见问题及解决方案

#### ❌ 连接失败：无法访问端点

**可能原因**：
- Railway URL 错误
- 服务未启动
- 防火墙阻挡

**解决方法**：
1. 检查 Railway 服务状态
2. 确认 URL 拼写正确
3. 测试健康检查端点

#### ❌ 认证失败：401 Unauthorized

**可能原因**：
- AUTH_TOKEN 错误
- Token 未设置
- 认证类型配置错误

**解决方法**：
1. 重新生成 AUTH_TOKEN：
   ```bash
   openssl rand -hex 32
   ```
2. 更新 Railway 环境变量
3. 重新部署服务

#### ❌ 工具调用失败

**可能原因**：
- Binance API 限流
- 参数格式错误
- 网络超时

**解决方法**：
1. 检查 Railway 日志：
   ```
   Railway Dashboard > Service > Logs
   ```
2. 验证参数格式
3. 等待一段时间后重试

#### ❌ ChatGPT 显示"工具不可用"

**可能原因**：
- 连接器配置错误
- URL 路径错误
- JSON-RPC 格式不匹配

**解决方法**：
1. 重新配置连接器
2. 确认 URL 以 `/rpc` 结尾
3. 测试手动 API 调用

### 调试步骤

#### 1. 检查 Railway 服务状态
```bash
# 健康检查
curl https://your-project.railway.app/healthz

# 检查工具列表
curl https://your-project.railway.app/tools
```

#### 2. 验证认证配置
```bash
# 测试认证
curl -X POST https://your-project.railway.app/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

#### 3. 查看详细日志
在 Railway Dashboard 中：
1. 进入你的项目
2. 点击服务名称
3. 选择 "Logs" 标签
4. 查看实时日志输出

#### 4. 重新部署（如果需要）
如果修改了环境变量：
1. 在 Railway Dashboard 中修改变量
2. 服务会自动重启
3. 等待重启完成后重新测试

## 🎯 使用技巧

### 优化 ChatGPT 提示

#### 获取具体数据
```
获取 BTC/USDT 的最新 1 小时 K 线数据，需要最近 12 小时的数据
```

#### 比较分析
```
比较 BTC 和 ETH 在现货和期货市场的价格差异，分析套利机会
```

#### 市场监控
```
监控 SOL/USDT 的资金费率变化，如果费率过高请提醒我
```

### 数据解释

ChatGPT 可以帮你：
- **解释市场数据**：分析价格趋势和交易信号
- **比较不同币种**：横向对比市场表现
- **识别交易机会**：基于技术指标提供建议
- **风险提醒**：提醒异常市场波动

### 定期监控

你可以要求 ChatGPT：
- 定期检查特定币种的价格
- 监控资金费率变化
- 分析持仓量趋势
- 提供市场摘要报告

## 📊 可用数据类型

### 现货市场数据
- **OHLCV**：开盘价、最高价、最低价、收盘价、成交量
- **时间周期**：1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M

### 期货市场数据
- **标记价格**：用于保证金计算的参考价格
- **资金费率**：永续合约的资金费率历史
- **持仓量**：市场总持仓量数据

### 支持的交易对
- **主流币种**：BTC, ETH, BNB, ADA, XRP, SOL, DOGE 等
- **交易对格式**：
  - 现货：BTC/USDT, ETH/USDT, BNB/BUSD 等
  - 期货：BTC/USDT, ETH/USDT（永续合约）

## 🔒 安全注意事项

### 保护 AUTH_TOKEN
- ❌ 不要在聊天中分享你的 TOKEN
- ❌ 不要将 TOKEN 提交到公开仓库
- ✅ 定期更换 TOKEN（建议每月一次）
- ✅ 使用强随机生成的 TOKEN

### 使用限制
- 服务仅提供**只读**市场数据
- **不支持**交易操作
- **不收集**个人交易信息
- 遵循 Binance API 使用条款

## 🎉 完成！

现在你已经成功将 MCP Binance 服务器集成到 ChatGPT 中！你可以：

- ✅ 通过自然语言获取实时加密货币数据
- ✅ 让 ChatGPT 分析市场趋势和交易信号
- ✅ 监控多个币种的价格和资金费率变化
- ✅ 获得专业的市场数据解读和建议

享受你的专属加密货币分析助手吧！🚀

## 📞 获取帮助

如果遇到问题：

1. **检查 Railway 部署**：参考 `RAILWAY_DEPLOY.md`
2. **查看项目文档**：阅读 `CLAUDE.md` 了解架构
3. **提交 Issue**：在 GitHub 仓库中报告问题
4. **查看日志**：使用 Railway Dashboard 调试