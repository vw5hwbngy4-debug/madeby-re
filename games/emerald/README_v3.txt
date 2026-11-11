EMERALD · MADEBY.RE v3 — HOSTINGER FRONTEND HOTFIX (17 september 2026)

WAT IS DE OORZAAK / STATUS?
- In de oorspronkelijke hoenn.zip en migratie-v2 staat play/_headers (Netlify-stijl),
  maar géén play/.htaccess. Hostinger Apache/LiteSpeed gebruikt _headers niet.
- De mGBA-build maakt Web Workers/SharedArrayBuffer aan en heeft cross-origin
  isolation nodig. De ontbrekende COOP/COEP-headers zijn een aannemelijke oorzaak
  van het vastlopen; live response headers konden vanuit deze omgeving NIET worden gecontroleerd.
- De v2-migratie had bovendien interne SCHEMA-identifiers veranderd terwijl de
  geïnstalleerde API de originele identifiers verwacht. Dit is in v3 hersteld.
- De game toont nu een bruikbare fout/diagnoselink als het opstarten vastloopt.

INSTALLATIE (frontend, GEEN Node.js of database)
1. Maak op Hostinger eerst een back-up van de huidige emerald.wolken.page bestanden.
2. Gebruik bij voorkeur de kleine EMERALD_PLAY_HOTFIX_v3.zip: upload in de
   document root van emerald.wolken.page (de map waar index.html al staat),
   en pak uit MET behoud van de map 'play/'. Overschrijf bestaande bestanden.
   Let op: .htaccess begint met een punt en kan standaard verborgen zijn.
3. Als je de volledige frontend opnieuw wilt uploaden, gebruik dan
   EMERALD_WOLKEN_FRONTEND_v3_FULL.zip. Die ZIP heeft index.html rechtstreeks
   in de ZIP-root: pak hem uit in de document root van emerald.wolken.page,
   NIET in een extra map public_html/.
4. De Node-app op emerald-api.wolken.page en MySQL-database NIET vervangen,
   verwijderen of aanpassen. ROM, accounts, saves en browserstorage NIET wissen.
5. Open https://madeby.re/games/emerald/play/diagnostics.html
   Verwacht: crossOriginIsolated: true, SharedArrayBuffer: function,
   WASM/Worker/JS HTTP 200. De Save Vault status-CORS fetch moet ook werken.
6. Open https://madeby.re/games/emerald/play/?v=0.4.5.3 om te hertesten.
   Bij isolation=false: check of de .htaccess daadwerkelijk staat in /play/
   en laat Hostinger COOP/COEP op /play/ HTTP-responses aanzetten als
   de server .htaccess negeert of overschrijft.

GEEN BEWEZEN LIVE FIX
De code-/archive-vergelijking en lokale tests zijn afgerond, maar de live
Hostinger response headers en een iPhone-run waren vanuit de toolomgeving
niet te verifiëren. De diagnosepagina geeft daarvoor een concrete test.
