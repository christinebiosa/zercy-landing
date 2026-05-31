# TikTok App Audit — Submission-Vorlage (Zercy Social Poster)

Production-Formular im Developer-Portal → alles vorausgefüllt zum Reinkopieren.
App-ID 7646064728317544449. Erst ausfüllen, dann „Submit for review".

## App details
- **App name:** `Zercy Social Poster`
- **App icon:** `~/Desktop/zercy-app-icon-1024.png` (1024×1024)
- **Category:** `Productivity`
- **Description (max 120):** `Posts our own travel slideshow videos from zercy.app to our TikTok account @zercytravel.`
- **Terms of Service URL:** `https://www.zercy.app/terms/`
- **Privacy Policy URL:** `https://www.zercy.app/privacy/`
- **Platforms:** ☑️ Web
- **Redirect URI (Login Kit, Web):** `https://www.zercy.app`

## App review → "Explain how each product and scope works" (max 1000)
```
Zercy (zercy.app) is our own travel-planning website. We use this TikTok integration ONLY to publish our OWN marketing videos to our OWN TikTok account (@zercytravel). No third-party users or third-party content are involved.

Login Kit (user.info.basic): the account owner authorizes our internal tool once via TikTok login, so we can identify the target account (open_id) to post to.

Content Posting API (video.upload, video.publish): our backend script uploads our pre-made travel slideshow videos (produced on zercy.app) to our TikTok account. We currently push them as drafts via video.upload; with Direct Post (video.publish) we will publish them directly. We only post our own content to our own account.

Purpose: automate our social posting so we do not upload each video manually.
```

## Demo-Video (Pflicht, mp4/mov, ≤50MB) — was aufnehmen (~1-2 Min, Bildschirmaufnahme Mac: Cmd+Shift+5)
1. **zercy.app zeigen** — Startseite + ein Blog-Artikel (zeigt: das ist die echte Website der Integration).
2. **OAuth-Flow** — den Authorize-Link öffnen → TikTok-Login → der Authorize-Screen (@zercytravel + die Scopes video.upload/user.info.basic) → „Continue" → Weiterleitung auf zercy.app.
3. **Upload zeigen** — im Terminal `node scripts/post-tiktok.mjs best-luggage-trackers-2026` laufen lassen → bis `SEND_TO_USER_INBOX`.
4. **Ergebnis in TikTok** — die TikTok-App: das Video erscheint als Entwurf im Postfach.
→ Das demonstriert Login Kit + Content Posting API + die Scopes, in der Sandbox, auf der echten Website. Genau das verlangt TikTok.

## Hinweis
- Audit-Dauer: ~paar Tage bis 2 Wochen. Kann auch abgelehnt werden (dann Demo-Video nachbessern).
- Nach Freigabe: in Production „Direct Post" anschalten → `post-tiktok.mjs <slug> --direct` = vollautomatisch öffentlich (Zero-Touch).
