# Syndicate Client Hub

A mobile-first client management app, built to live on your iPhone home screen
and run your website-design-and-marketing business on the go. Create client
files on the fly, track projects/services, tasks, notes, invoices, and files —
all from your phone.

Plain Node.js + Express + EJS + SQLite. No build step, no external database,
no framework lock-in.

## Features

- **Clients** — quick-add a business in seconds; track contact info, status
  (lead / active / on hold / past), industry, source, monthly value, notes.
- **Projects & services** — website design, SEO, social, ads, branding, etc.
  per client, with price, billing type, due date, and status.
- **Tasks** — global and per-client to-dos with due dates, one-tap complete.
- **Notes** — a timestamped activity log per client (calls, meetings, ideas).
- **Invoices** — line-item invoices with statuses (draft/sent/paid/overdue),
  totals, and a print/share-friendly view.
- **Files** — upload and download files (contracts, logos, assets) per client.
- **Dashboard** — active clients, open tasks, unpaid invoice total, MRR,
  recent activity.
- **iPhone-ready** — installable as a home-screen PWA with a native-feeling
  bottom tab bar, dark theme, and safe-area support for notches/home bar.

## Requirements

- Node.js 18+ (tested on Node 22)
- No external database — uses SQLite via `better-sqlite3`, stored as a file
  in `data/app.db`.

## Local setup

```bash
npm install
cp .env.example .env
# edit .env: set SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm start
```

Visit `http://localhost:3000`, log in with the admin email/password you set.

On first boot, if no admin user exists yet, the server will automatically
create one from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`. To change the
password later, edit `.env` and run:

```bash
npm run seed
```

## Installing on your iPhone

1. Open the site in Safari (e.g. `https://internal.syndicatemarketing.co`).
2. Tap the **Share** icon → **Add to Home Screen**.
3. Launch it from the home screen — it opens full-screen, no browser chrome,
   with a native-style bottom tab bar.

## Deploying to `internal.syndicatemarketing.co`

This is a normal Node.js app — run it with a process manager behind a
reverse proxy that terminates HTTPS. Two common options below.

### 1. Get the code on the server

```bash
git clone <this-repo-url> /var/www/client-hub
cd /var/www/client-hub
npm install --omit=dev
cp .env.example .env
# edit .env with production values (SESSION_SECRET, ADMIN_EMAIL/PASSWORD,
# and NODE_ENV=production)
```

### 2. Run it with pm2 (recommended)

```bash
npm install -g pm2
pm2 start src/server.js --name client-hub
pm2 save
pm2 startup   # follow the printed instructions to start on boot
```

### 3. Reverse proxy with nginx + HTTPS

Point `internal.syndicatemarketing.co` at the server, then:

```nginx
server {
    listen 80;
    server_name internal.syndicatemarketing.co;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then get a certificate (Let's Encrypt via certbot is easiest):

```bash
sudo certbot --nginx -d internal.syndicatemarketing.co
```

`NODE_ENV=production` plus `app.set('trust proxy', 1)` (already set in
`src/server.js`) means session cookies will be marked `secure`, so this only
works correctly once HTTPS is in place — that's expected for something
holding client data.

### 4. Back up your data

Everything lives in `data/app.db` (SQLite) and `data/uploads/` (uploaded
files). Back up that whole `data/` folder regularly — it's the entire
database, gitignored on purpose so it never gets committed.

## Project structure

```
src/
  server.js         Express app setup, sessions, middleware, route mounting
  db.js              SQLite connection + schema bootstrap
  schema.sql         Table definitions
  seed.js            CLI: create/update the admin user from .env
  utils.js           Shared view helpers (money, dates, status labels)
  middleware/auth.js Session auth guard
  routes/            One file per resource (clients, projects, tasks, …)
  views/             EJS templates, mobile-first
public/
  css/style.css      Dark, iOS-styled design system
  js/app.js          Small progressive enhancements (no framework)
  manifest.json      PWA manifest
  icons/             App icons
data/                SQLite DB + uploaded files (created at runtime, gitignored)
```

## Notes on security

- Single admin account by design — this is an internal tool for one person.
  If you ever need multiple logins, the `users` table already supports more
  than one row; you'd just need a way to create them (currently only the
  `npm run seed` CLI does).
- Session cookies are httpOnly and (in production) secure/HTTPS-only.
- Uploaded files are stored with randomized filenames on disk; the original
  filename is only used for the download's `Content-Disposition` header.
