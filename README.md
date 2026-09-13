<div dir="rtl">

# 🧙 SiteSage

> حسابرسی هوشمند و خودکار SEO با عامل (Agent) مبتنی بر LLM — گزارش دقیق، شواهد‌محور و قابل دانلود

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-19-61dafb" alt="React" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-38bdf8" alt="Tailwind" />
  <img src="https://img.shields.io/badge/License-Private-red" alt="License" />
</p>

---

## ✨ چرا SiteSage؟

SiteSage فقط یک ابزار آنالیز سئو نیست؛ یک **عامل هوشمند (Agentic Auditor)** است که مثل یک کارشناس واقعی، سایت شما را گام‌به‌گام بازرسی می‌کند:

- 🔍 **ابزارهای واقعی، نه حدس** — عامل با ابزارهای تخصصی (HTML، لینک‌ها، تصاویر، سئو، امنیت، کارایی) سایت را عمیقاً بررسی می‌کند و هر ادعا با **شواهد** پشتیبانی می‌شود.
- 📡 **شفافیت کامل** — هر فراخوانی ابزار به‌صورت زنده (Live) قابل مشاهده است؛ هیچ چیز جعبه‌سیاه نیست.
- 🧮 **امتیازدهی قابل اعتماد** — نمره‌دهی با متدولوژی شفاف و ماژول `scoring` محاسبه می‌شود.
- 📄 **گزارش قابل دانلود** — خروجی در قالب Markdown و JSON برای اشتراک‌گذاری و آرشیو.
- 🛡️ **امن و محافظت‌شده** — اعتبارسنجی URL برای مقابله با SSRF، Rate-Limiting و اعتبارسنجی محیط با Zod.
- 🧪 **حالت دمو** — بدون هیچ API Key، با داده‌های نمونه می‌توانید کل تجربه را امتحان کنید.

## 🏗️ معماری

```
app/                  # روتینگ و صفحات (App Router)
├── api/              # API ها: شروع/لغو حسابرسی و دریافت وضعیت اجرا
├── audit/            # صفحه شروع حسابرسی
├── methodology/      # متدولوژی امتیازدهی
└── reports/example/  # گزارش نمونه

features/
├── agent/            # موتور عامل: حلقه اجرا (loop)، سیستم پرامپت، event stream و run-store
├── audit/            # fetcher، یافته‌ها، امتیازدهی، اسکیمای گزارش و خروجی Markdown
└── tools/            # ابزارهای بازرسی: HTML، لینک‌ها، تصاویر، SEO، امنیت، کارایی

components/           # کامپوننت‌های UI (هدر، فوتر، ویو گزارش و...)
lib/                  # env، rate-limit و ابزارهای مشترک
```

### جریان اجرای حسابرسی

1. کاربر URL را وارد می‌کند → `POST /api/audit`
2. URL اعتبارسنجی می‌شود (ضد SSRF) و یک Run با شناسه یکتا ساخته می‌شود
3. عامل با حلقه‌ی ابزارمحور سایت را بازرسی می‌کند (`features/agent/loop.ts`)
4. هر فراخوانی ابزار به‌صورت SSE/Events به فرانت استریم می‌شود
5. در پایان، گزارش امتیاز‌دار + Markdown + JSON تولید می‌شود

## 🛠️ تکنولوژی‌ها

| لایه | تکنولوژی |
|------|----------|
| فریمورک | [Next.js 16](https://nextjs.org) · React 19 |
| زبان | TypeScript 5.9 |
| استایل | Tailwind CSS 4 · shadcn/ui · Base UI · lucide-react |
| اعتبارسنجی | Zod 4 |
| هوش مصنوعی | OpenAI SDK (سازگار با هر پایگاه OpenAI-Compatible) |
| اسکرپ و تحلیل | Cheerio |
| داده | Drizzle ORM · PostgreSQL |
| تست | Vitest · Playwright |

## 🚀 شروع سریع

پیش‌نیازها: **Node.js 20+**

```bash
# نصب وابستگی‌ها
npm install

# اجرای محیط توسعه
npm run dev
```

سپس مرورگر را روی [http://localhost:3000](http://localhost:3000) باز کنید. 🎉

## ⚙️ متغیرهای محیطی

فایل `.env.local` بسازید:

```bash
# اختیاری — بدون این کلید، پروژه در حالت دمو اجرا می‌شود
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.gapgpt.app/v1   # اختیاری — پیش‌فرض
OPENAI_MODEL=gpt-4o-mini                    # اختیاری — پیش‌فرض

# اختیاری — برای آنالیز کارایی با Google PageSpeed
GOOGLE_PAGESPEED_API_KEY=...

# اختیاری — سکرت Rate-Limiting (حداقل ۸ کاراکتر)
AUDIT_RATE_LIMIT_SECRET=...
```

> 💡 **حالت دمو:** اگر `OPENAI_API_KEY` تنظیم نشده باشد، SiteSage با داده‌های نمونه اجرا می‌شود و می‌توانید تمام رابط کاربری را بدون هیچ کلیدی بررسی کنید.

## 🧪 اسکریپت‌ها

```bash
npm run dev          # سرور توسعه
npm run build        # بیلد پروداکشن
npm start            # اجرای بیلد پروداکشن
npm run lint         # بررسی با ESLint
npm run typecheck    # بررسی تایپ‌ها
npm test             # تست‌های واحد (Vitest)
npm run test:e2e     # تست‌های E2E (Playwright)
```

## 📊 متدولوژی امتیازدهی

هر حسابرسی چند محور را می‌سنجد — از ساختار HTML و متاتگ‌های سئو تا لینک‌های شکسته، تصاویر بدون alt، هدرهای امنیتی و معیارهای کارایی. جزئیات کامل محورها و وزن هر کدام را در صفحه **Methodology** و ماژول `features/audit/scoring.ts` ببینید.

## 🤝 مشارکت

1. ریپو را Fork کنید
2. یک برنچ بسازید: `git checkout -b feat/my-feature`
3. تغییرات را Commit کنید: `git commit -m 'feat: add my feature'`
4. Push و ساخت Pull Request

> قبل از ارسال PR حتماً `npm run lint` و `npm run typecheck` را بگیرید.

## 📜 مجوز

این پروژه صرفاً برای مقاصد آموزشی در حوزه حسابرسی عامل‌محور (Agentic Audit) ساخته شده است. امتیازها به‌صورت خودکار محاسبه می‌شوند و ملاک طراحی حرفه‌ای نیستند.

---

<div align="center">

ساخته‌شده با ☕ و Next.js 16

</div>

</div>

