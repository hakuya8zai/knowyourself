# 你的使用說明書 ✨

> 從五大視角認識真正的自己

一個結合東西方命理智慧的自我探索工具，用心理學視角解讀，讓洞見更實用。

## 功能

- 🌸 **梅花易數** - 當下能量、事件預測
- 💜 **紫微斗數** - 性格命盤、人生格局
- 🔥 **八字命理** - 五行能量、時運節奏
- ⭐ **西洋占星** - 心理原型、行星能量
- 🔺 **人類圖** - 能量中心、策略權威

## 技術棧

- **Framework**: Next.js 16.2.12 (App Router)
- **UI**: React 19.2.8
- **驗證**: Zod 4
- **套件管理**: pnpm 10.13.1
- **後端**: SelfKit Backend (FastAPI + Vertex AI)

## 安全性

- httpOnly Cookie、CSRF origin 驗證與後端資料所有權檢查
- CSP、HSTS、Permissions Policy 與安全回應標頭
- Dependabot 與 CI lint、typecheck、test、production build

## 開發

```bash
# 安裝依賴
pnpm install

# 開發模式
pnpm dev

# 建置
pnpm build

# 生產模式
pnpm start

# 完整檢查
pnpm check
```

## 環境變數

```env
NEXT_PUBLIC_API_URL=https://selfkit-backend-xxx.run.app/api/v1
```

## 部署

### Docker

```bash
docker build -t fortune-arena .
docker run -p 3000:3000 fortune-arena
```

## 路由

| 路徑 | 說明 |
|------|------|
| `/` | 首頁 |
| `/consult` | 輸入出生資料 |
| `/manual/[id]` | 使用說明書頁面 |
| `/chat` | AI 顧問對話 |

## License

MIT
