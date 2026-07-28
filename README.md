# DeedSheet

CMA reports and listing copy in two minutes.

## Deploy in 15 minutes

**1. GitHub**
- Create a new private repo on github.com
- Click "uploading an existing file" and drag ALL the files INSIDE this folder into the upload box (the `app` folder, `package.json`, `next.config.js`, `.gitignore`, this README)
- Check: `package.json` should be visible on the repo front page, NOT inside a subfolder
- Commit changes

**2. Anthropic API key**
- Go to console.anthropic.com → API Keys → Create Key
- Copy it somewhere safe, you only see it once

**3. Vercel**
- vercel.com → log in with GitHub → Add New → Project → Import this repo
- Framework should auto-detect as Next.js
- Open "Environment Variables" BEFORE deploying and add:
  - Name: `ANTHROPIC_API_KEY`  Value: your key from step 2
- Click Deploy

**4. Done**
- Your site is live at yourproject.vercel.app
- The "Listing copy" tab now generates for real
- Print / PDF button exports the report

## Updating the site later

Edit any file on GitHub (pencil icon → commit). Vercel redeploys automatically in ~2 minutes.

## What's NOT in this version (add later)

- Accounts / login (right now anyone with the link can use it — fine for demos and free samples, add auth before charging)
- Saved reports (data lives in the browser session only)
- Stripe billing
