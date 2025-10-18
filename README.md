# TikTok Shop List - Product Crawler & Analytics

Production-ready web app tập trung crawl dữ liệu sản phẩm từ TikTok Shop với tính năng phân tích và theo dõi tăng trưởng.

## 🎯 Tính Năng Chính

- **Không đăng nhập** - Mở app là sử dụng ngay
- **Crawl thông minh** - Hỗ trợ cả shop links và product links
- **Dedupe tự động** - Loại bỏ shop trùng lặp trong batch
- **Theo dõi tăng trưởng** - Growth tracking theo ngày với %
- **Export CSV** - Xuất dữ liệu products và growth
- **Proxy support** - Tự động test và quản lý proxy
- **SadCaptcha integration** - Giải captcha tự động

## 🏗 Kiến Trúc

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Serverless API (Vercel Functions)
- **Scraping**: Playwright + @sparticuz/chromium
- **Storage**: Vercel KV (Redis)
- **Deploy**: Vercel

## 🚀 Cài Đặt Local

### 1. Clone & Install

```bash
git clone <repo-url>
cd TikTokShopTool
npm install
```

### 2. Setup Environment

Copy `.env.example` to `.env.local` và cập nhật:

```bash
cp .env.example .env.local
```

Cấu hình Vercel KV:
```env
KV_REST_API_URL=https://your-kv-instance.upstash.io
KV_REST_API_TOKEN=your-kv-token
```

### 3. Run Development

```bash
npm run dev
```

Mở http://localhost:3000

## 📚 API Endpoints

### Crawling
- `POST /api/crawl/shops` - Crawl shop links
- `POST /api/crawl/products` - Crawl product links (group by shop)
- `POST /api/crawl/run` - Start crawler
- `POST /api/crawl/stop` - Stop crawler

### Data
- `GET /api/products/list` - List products với search/paging
- `GET /api/growth/list` - Growth data với filters
- `POST /api/export/products` - Export products CSV
- `POST /api/export/growth` - Export growth CSV

### Settings
- `GET /api/settings` - Get settings
- `POST /api/settings` - Save settings
- `POST /api/proxies/test` - Test & activate proxies

## 🎮 Cách Sử dụng

### 1. Thêm Shop/Product Links

Dán links vào textarea, chọn mode:
- **Shop links**: Direct crawl shops
- **Product links**: Extract shop từ products → crawl

### 2. Run Crawl

Nhấn "Run" để bắt đầu crawl. Theo dõi logs realtime.

### 3. Xem Dữ Liệu

- **Shops table**: shop_name | sold_today | delta | %growth | status
- **Products table**: Search, sort, paging, export CSV
- **Growth analytics**: Theo dõi tăng trưởng theo thời gian

### 4. Settings

- **SadCaptcha**: Toggle + API key
- **Proxies**: Paste list, test & activate
- **Export**: CSV delimiter, filename templates

## 🚢 Deploy Vercel

### 1. Vercel CLI

```bash
npx vercel
```

### 2. Setup Vercel KV

Tạo KV database trong Vercel dashboard:
1. Go to Storage → KV → Create
2. Copy connection details
3. Add to Environment Variables

### 3. Environment Variables

Trong Vercel dashboard, thêm:
```
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
SADCAPTCHA_ENABLED=false
NODE_ENV=production
```

### 4. Deploy

```bash
npx vercel --prod
```

## ⚡ Performance & Limits

### Serverless Constraints
- Max function duration: 60s (crawl), 20s (API)
- Memory: 1536MB (crawl), 3008MB (worker)
- Concurrent: Limited by plan

### Best Practices
- Batch crawl: ≤20 shops per request
- Throttling: 1000-2500ms between requests
- Retry: 1-2 attempts max
- Proxy rotation: Auto quarantine failures

### Storage Limits
- Vercel KV: 30MB (Free), scaling by plan
- Products: ~1000 chars per record
- Growth: ~100 chars per daily snapshot

## 🛠 Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint check
npm run test       # Jest tests
npm run type-check # TypeScript check
```

## 📁 Cấu Trúc Project

```
app/
├── api/           # API routes
├── globals.css    # Tailwind styles
├── layout.tsx     # Root layout
└── page.tsx       # Dashboard page

lib/
├── models.ts      # TypeScript types & schemas
├── kv.ts          # Vercel KV operations
└── scraper.ts     # Playwright scraping engine

components/
└── ui/            # Reusable UI components

public/            # Static assets
vercel.json        # Vercel config
```

## 🔧 Troubleshooting

### Common Issues

**KV Connection Error**
- Check KV_REST_API_URL/TOKEN
- Verify Vercel KV instance active

**Chromium Launch Failed**
- Check Vercel function memory limits
- Ensure @sparticuz/chromium compatibility

**Captcha Blocks**
- Configure SadCaptcha API key
- Add proxy pool
- Increase throttling delays

**Scraping Failures**
- Check TikTok anti-bot measures
- Rotate user agents
- Use residential proxies

### Debug Mode

Set `NODE_ENV=development` for verbose logging.

## 📄 License

MIT License - see LICENSE file

---

**Built with ❤️ for TikTok Shop analytics**