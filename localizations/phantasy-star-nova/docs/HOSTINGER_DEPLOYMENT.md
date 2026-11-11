# Hostinger deployment

1. Create the Wolken subdomain. Recommended hostname: `localizations.madeby.re/phantasy-star-nova`.
2. Open Hostinger File Manager for that subdomain document root.
3. Upload the contents of the site package, not the outer folder itself.
4. Confirm `index.html` is directly in the document root.
5. Preserve `assets/`, `css/` and `docs/` paths.
6. Enable HTTPS.
7. Open the site and test the builder ZIP download, GitHub links and screenshots.
8. If a different hostname is used, change canonical and Open Graph URLs in `index.html` and `sitemap.xml`.
