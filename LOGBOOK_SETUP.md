# Zercy Logbook — Setup Guide

The Logbook is built and deployed to zercy.app/logbook. Before it works, you need to set up two external services and add 4 environment variables to Vercel.

---

## Step 1: Supabase (free database)

1. Go to **https://supabase.com** → Sign up (free)
2. Click **New project** → name it "zercy-logbook"
3. Wait ~2 minutes for it to spin up
4. Click **SQL Editor** (left sidebar)
5. Paste the entire content of `zercy-logbook-schema.sql` → click **Run**
6. Go to **Settings → API**
   - Copy **Project URL** → this is your `SUPABASE_URL`
   - Copy **service_role** key (under "Project API keys") → this is your `SUPABASE_SERVICE_KEY`

---

## Step 2: Resend (free email sending)

1. Go to **https://resend.com** → Sign up (free, 100 emails/day)
2. Go to **Domains** → Add domain → enter `zercy.app`
3. Add the DNS records they show you in your domain registrar (OVH)
   - These are just TXT/CNAME records for DKIM — they don't affect existing email delivery
4. Once verified, go to **API Keys** → Create API key
   - Copy it → this is your `RESEND_API_KEY`

> **Note:** Until Resend is set up, the login still works in "dev mode" — the magic link is returned in the API response body and shown directly on the login page. So you can test right now.

---

## Step 3: Add environment variables to Vercel

Go to **https://vercel.com/christinebiosas-projects/zercy-landing/settings/environment-variables**

Add these 4 variables (for **All Environments**):

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` (from Step 1) |
| `SUPABASE_SERVICE_KEY` | `eyJ...` (service_role key from Step 1) |
| `LOGBOOK_SECRET` | Any random string, e.g. `zercy-logbook-2026-s3cr3t-!X9` |
| `RESEND_API_KEY` | Your Resend API key (from Step 2, or skip for now) |
| `APP_URL` | `https://zercy.app` |

---

## Step 4: Deploy

```bash
cd /Users/christinebork/Desktop/zercy-landing
npx vercel --prod --force
```

---

## How it works

1. Go to **zercy.app/logbook**
2. Enter your email → receive magic link
3. Click link → signed in for 90 days
4. Create a trip (e.g. "Japan 2026")
5. Click **+ Add booking** → paste any booking confirmation email
6. Zercy AI extracts all details → review → save
7. Your full itinerary is organized by trip

---

## Future: Email forwarding

To forward booking emails directly to Zercy Logbook (instead of pasting):

1. The API endpoint `/api/logbook-inbound` is ready for a webhook
2. Set up **Mailgun** with a subdomain (e.g. `mail.zercy.app`) for inbound parsing
3. Or use **Zapier**: Gmail → Zercy Logbook webhook
4. Zercy identifies you by your sender email address

This can be added later without changing any existing code.
