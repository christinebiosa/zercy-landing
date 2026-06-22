// Zentrale Affiliate-Konfiguration — Booking.com via CJ (Commission Junction).
//
// SOBALD Booking.com dich freigibt ("Approved", aktuell PENDING seit 2026-06-22):
//   1. In CJ -> Links / "Deep Link Generator" den Tracking-Link für
//      Advertiser 7864295 (Booking.com North America) erzeugen.
//   2. Die darin enthaltene Website-PID (NICHT die Member-ID 7672553!) unten
//      bei BOOKING_CJ_PID eintragen — EINE Zeile.
//   3. Denselben Wert auch in ZercyLayout.astro setzen (Konstante BOOKING_CJ_PID
//      im <script is:inline>, dort steht ein Hinweis-Kommentar).
//   -> Ab dann werden ALLE Booking-Links der ganzen Seite (Blog-CTAs + App-Tool)
//      automatisch zu CJ-Deep-Links mit Tracking. Leer = heutiges Verhalten
//      (normale Booking.com-Links, kein Tracking) — bis zur Freigabe genau richtig.
//
// CJ-Deep-Link-Format (Standard "dlg" = deep link generator):
//   https://www.anrdoezrs.net/links/{PID}/type/dlg/sid/{SID}/{ZIEL-URL-encoded}
// "sid" = Sub-ID fürs eigene CJ-Reporting (wir nutzen Stadt-/Artikel-Slug,
//          damit man sieht, welcher Artikel Buchungen bringt).
//
// WICHTIG (CJ-Regel): Affiliate-Links NUR auf zercy.app verwenden — NIE auf
// Reddit/Quora/Foren/in Kommentaren/per Mail (= Spam = Konto-Kündigung).

export const BOOKING_CJ_PID = '';                // <- CJ Website-PID hier eintragen (aus dem Deep Link Generator)
export const BOOKING_CJ_ADVERTISER = '7864295';  // Booking.com North America (CJ Advertiser-ID), nur zur Doku
export const BOOKING_LABEL_PREFIX = 'zercy';

// Wandelt eine Booking.com-Ziel-URL in einen CJ-Deep-Link um.
// Leerer PID => Ziel-URL unverändert zurück (kein Tracking, heutiges Verhalten).
export function bookingLink(destinationUrl, sid = 'blog') {
  if (!BOOKING_CJ_PID) return destinationUrl;
  const cleanSid = `${BOOKING_LABEL_PREFIX}-${sid}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
  return `https://www.anrdoezrs.net/links/${BOOKING_CJ_PID}/type/dlg/sid/${cleanSid}/${encodeURIComponent(destinationUrl)}`;
}
