# Domain setup — pennypantry.xyz

Penny Pantry uses **https://pennypantry.xyz** as the primary production web origin.  
**https://www.pennypantry.xyz** should redirect to the apex (configure in Vercel → Domains).

The Vercel project slug remains `grocery-financial-system`; only the public domain changed.

**Status (2026-06-25):** `pennypantry.xyz` and `www.pennypantry.xyz` were added to the Vercel project `grocery-financial-system` via CLI. DNS at the registrar is still pending — see records below.

---

## 1. Vercel — add domain & DNS

### Dashboard (recommended)

1. Open [Vercel Dashboard](https://vercel.com) → project **grocery-financial-system** → **Settings** → **Domains**.
2. Add **pennypantry.xyz** and **www.pennypantry.xyz**.
3. Set **pennypantry.xyz** as the primary domain; redirect **www** → apex.
4. Copy the DNS records Vercel shows for your registrar.

### CLI (optional)

```bash
npx vercel domains add pennypantry.xyz
npx vercel domains add www.pennypantry.xyz
```

Requires `vercel login` and a linked project (`npx vercel link`).

### DNS records (typical)

At your domain registrar (where you bought pennypantry.xyz):

| Host | Type | Value | Notes |
|------|------|-------|-------|
| `@` (apex) | **A** | `76.76.21.21` | Required by Vercel (`vercel domains inspect pennypantry.xyz`) |
| `www` | **A** | `76.76.21.21` | Vercel-recommended for this project (or CNAME `cname.vercel-dns.com` if your registrar prefers) |

Some registrars use ALIAS/ANAME for apex instead of A — follow Vercel’s instructions for your provider.

After DNS propagates, Vercel will issue HTTPS certificates automatically.

### Vercel environment variable

In **Project → Settings → Environment Variables**, set for Production (and Preview if desired):

```
EXPO_PUBLIC_APP_URL=https://pennypantry.xyz
```

Redeploy after changing env vars so the web build picks up the new URL.

---

## 2. Expo / app config

Local `.env` and `.env.example`:

```
EXPO_PUBLIC_APP_URL=https://pennypantry.xyz
```

Used for:

- Native Google OAuth redirect (`/onboarding/upgrade`)
- Password reset email redirect (`/reset-password`)
- Family invite links (`/list/join?code=…`)

Web dev uses `window.location.origin` automatically (e.g. `http://localhost:8081`).

### Deep links (native)

`app.config.ts` configures:

- **iOS** `associatedDomains`: `applinks:pennypantry.xyz`, `applinks:www.pennypantry.xyz`
- **Android** HTTPS intent filters for both hosts

After changing these, run `npx expo prebuild` and rebuild native apps.  
Host `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` on the web app for universal links (Expo Router / Vercel can serve these when you add them).

Custom URL scheme (fallback): `groceryfinancialsystem://` (from `app.json`).

---

## 3. Supabase — URL configuration

**Authentication → URL Configuration**

| Setting | Value |
|---------|-------|
| **Site URL** | `https://pennypantry.xyz` |

**Redirect URLs** — add all of:

```
https://pennypantry.xyz/**
https://www.pennypantry.xyz/**
http://localhost:8081/**
```

Optional explicit paths (if you prefer not to use wildcards):

```
http://localhost:8081/onboarding/upgrade
http://localhost:8081/reset-password
https://pennypantry.xyz/onboarding/upgrade
https://pennypantry.xyz/reset-password
https://www.pennypantry.xyz/onboarding/upgrade
https://www.pennypantry.xyz/reset-password
groceryfinancialsystem://onboarding/upgrade
groceryfinancialsystem://reset-password
exp://**
```

---

## 4. Google Cloud — OAuth client

**Google Cloud Console** → **APIs & Services** → **Google Auth Platform**

### Branding

- **App name**: Penny Pantry
- **Authorized domains**: `pennypantry.xyz`, `www.pennypantry.xyz`, `<project-ref>.supabase.co`

### OAuth client (Web)

**Authorized JavaScript origins**

```
https://pennypantry.xyz
https://www.pennypantry.xyz
http://localhost:8081
```

**Authorized redirect URI** (from Supabase → Authentication → Providers → Google):

```
https://<project-ref>.supabase.co/auth/v1/callback
```

### OAuth consent screen links

- Privacy policy: `https://pennypantry.xyz/privacy`
- Terms of service: `https://pennypantry.xyz/terms`

---

## 5. Verification checklist

- [ ] DNS resolves: `pennypantry.xyz` and `www.pennypantry.xyz` → Vercel
- [ ] HTTPS works on both; www redirects to apex
- [ ] `EXPO_PUBLIC_APP_URL` set locally, on Vercel, and in EAS secrets for native builds
- [ ] Supabase Site URL + redirect URLs updated
- [ ] Google OAuth origins and Supabase callback URI configured
- [ ] Google sign-in works on web production and localhost:8081
- [ ] Password reset email lands on `/reset-password`
- [ ] Family invite links use `https://pennypantry.xyz/list/join?code=…`

---

## Legacy URL

The old deployment URL `https://grocery-financial-system.vercel.app` may remain as a Vercel alias.  
You can remove it from **Domains** once pennypantry.xyz is live, or keep it temporarily and redirect to the new domain in Vercel.
