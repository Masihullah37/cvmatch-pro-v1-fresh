# 🚀 OuiCV

> **AI-Powered CV Optimization & ATS Compatibility Platform**  
> Built for the French & European job market using **Next.js, React, TypeScript, PostgreSQL, AI, and Stripe**.

---

## 📖 Overview

OuiCV is a full-stack SaaS application that helps job seekers optimize their CVs to pass Applicant Tracking Systems (ATS)—the automated software used by companies to filter resumes before they reach recruiters.

Users can upload a CV (PDF or DOCX), optionally provide a target job description or job posting URL, and receive AI-powered recommendations to improve their chances of getting interviews.

The platform analyzes resume quality, detects ATS issues, rewrites CV content using AI, generates professional PDF templates, and recommends live job opportunities matching the candidate's profile.

---

## ✨ Features

### 📊 ATS Compatibility Analysis
- ATS compatibility score (0–100)
- Keyword matching and missing keyword detection
- Formatting validation
- Readability analysis
- Skills, education, and experience evaluation

### 🤖 AI-Powered CV Optimization
- AI-generated resume improvements
- Domain-aware keyword optimization
- Intelligent rewriting using modern LLMs
- Support for multiple professional domains including:
  - IT
  - Engineering
  - Healthcare
  - Legal
  - Finance
  - Business
  - Education
  - Administrative
  - Trades
  - Services

### 📄 Professional PDF Generation
- Multiple modern CV templates
- High-quality PDF export
- Browser-based rendering with Puppeteer
- ATS-friendly layouts

### 💼 Job Recommendations
- Live job recommendations
- France Travail integration
- Adzuna integration
- Automatic profile matching

### 🔗 Job URL Auto Extraction
Paste a job posting URL and OuiCV automatically extracts the job description for analysis, with a graceful fallback to manual input when scraping is unavailable.

### 🌍 Internationalization
- French (default)
- English

### 💳 Flexible Monetization
- Free plan
- One-time Starter credit packs
- Monthly Pro subscription
- Stripe payment integration

---

# 🏗 Tech Stack

| Category | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (Neon) |
| ORM | Drizzle ORM |
| Authentication | Clerk |
| Payments | Stripe |
| AI Providers | Groq + Google Gemini (Fallback) |
| File Uploads | UploadThing |
| PDF Parsing | pdf2json |
| DOCX Parsing | Mammoth |
| PDF Generation | Puppeteer + Chromium |
| Rate Limiting | Upstash Redis |
| Internationalization | next-intl |
| Job APIs | France Travail + Adzuna |
| Error Monitoring | Sentry |
| Analytics | Google Analytics 4 |
| Hosting | Railway |
| Testing | Jest |
| CI/CD | GitHub Actions |

---

# 🏛 Architecture

```
Browser
      │
      ▼
Next.js Application
      │
 ┌────┼───────────────────────────────┐
 ▼    ▼                               ▼
Clerk Stripe                    PostgreSQL
 │      │                             │
 ▼      ▼                             ▼
Authentication Payments         Drizzle ORM
        │
        ▼
 Groq / Gemini AI
        │
        ▼
 Puppeteer
        │
        ▼
 PDF Templates

### External Services

- France Travail API
- Adzuna API
- UploadThing
- Upstash Redis
- Google Analytics 4
- Sentry

---

# 📂 Project Structure
app/
├── [locale]/
│   ├── dashboard/
│   ├── results/
│   ├── templates/
│   ├── sign-in/
│   └── sign-up/
│
├── api/
│   ├── analyze-cv/
│   ├── generate-pdf/
│   ├── generate-templates/
│   ├── job-recommendations/
│   ├── stripe/
│   ├── webhooks/
│   └── admin/

components/
├── home/
├── results/
├── templates/
└── settings/

lib/
├── ai/
├── billing/
├── db/
├── jobs/
├── pdf/
├── rate-limit/
├── scraper/
└── utils/

i18n/
messages/
.github/workflows/

# 🚀 Getting Started

## Clone the repository

git clone https://github.com/Masihullah37/cvmatch-pro-v1-fresh.git

cd cvmatch-pro-v1-fresh
```
## Install dependencies

npm install --legacy-peer-deps
```
## Configure environment variables

cp .env.example .env.local

Configure the required environment variables for:

- PostgreSQL
- Clerk
- Stripe
- Groq
- Google Gemini
- UploadThing
- Upstash Redis
- France Travail
- Adzuna
- Sentry
- Google Analytics
- hCaptcha
- Resend

---

## Database

Generate and apply migrations:

```bash
npx drizzle-kit generate

npx drizzle-kit push
```

---

## Run the development server

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

The application redirects to the default French locale (`/fr`).

---

## Run Tests
npm run test:run

Coverage:
npm run test:coverage
Type checking:
npx tsc --noEmit
Linting:
npm run lint

# 🔑 Key Environment Variables

| Variable | Purpose |
|----------|---------|
| DATABASE_URL | PostgreSQL database |
| Clerk Keys | Authentication |
| Stripe Keys | Payments |
| Groq API | Primary AI provider |
| Gemini API | Fallback AI provider |
| UploadThing | File uploads |
| Upstash Redis | Rate limiting |
| France Travail | Job recommendations |
| Adzuna | Additional job recommendations |
| Sentry | Error monitoring |
| Google Analytics | Analytics |
| hCaptcha | Bot protection |
| Resend | Email delivery |

---

# 🗄 Database

The application uses **PostgreSQL hosted on Neon** with **Drizzle ORM**.

Core entities include:

- Users
- CV Analyses
- CV Templates
- Credit Transactions
- Usage Logs
- Job Recommendations
- Stripe Events

Useful commands:

```bash
npx drizzle-kit generate

npx drizzle-kit push

npx drizzle-kit studio
```

---

# 🧪 Testing

| Type | Command |
|------|---------|
| Unit Tests | `npm run test:run` |
| Coverage | `npm run test:coverage` |
| Type Check | `npx tsc --noEmit` |
| Lint | `npm run lint` |

---

# 🚀 CI/CD

GitHub Actions automatically runs:

- Unit Tests
- ESLint
- Type Checking
- Production Build Verification

Railway automatically deploys the application after successful validation of the `main` branch.

---

# 🔒 Security

OuiCV follows modern SaaS security practices:

- Clerk authentication
- Secure Stripe webhook verification
- User ownership validation
- Redis-backed rate limiting
- Bot protection using hCaptcha
- GDPR-compliant cookie consent
- Automated deletion of expired user data
- Idempotent payment handling

---

# 🛠 Engineering Challenges Solved

This project addresses several production-level engineering challenges:

- AI retry and fallback architecture (Groq → Gemini)
- ATS scoring reliability improvements
- Prevention of silent AI processing failures
- Secure ownership validation to eliminate IDOR vulnerabilities
- Optimized PDF generation through pooled Chromium instances
- Android Chrome rendering compatibility fixes
- Tiered Redis-based rate limiting with automatic refund handling
- Scheduled GDPR-compliant data cleanup

---

# 🌐 Third-Party Services

- Clerk
- Stripe
- Groq
- Google Gemini
- UploadThing
- Upstash Redis
- France Travail API
- Adzuna API
- Sentry
- Google Analytics 4
- hCaptcha
- Resend

---

# 📄 License

This project is private and proprietary.

Copyright © OuiCV. All rights reserved.
