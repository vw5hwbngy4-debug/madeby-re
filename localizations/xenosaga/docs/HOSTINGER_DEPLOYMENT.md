# Hostinger Deployment

Target: `https://madeby.re/localizations/xenosaga/`

1. In Hostinger, open the document root assigned to the `localizations.madeby.re/xenosaga` subdomain.
2. Remove or rename any placeholder `index.html` in that document root.
3. Upload `xenosaga_wolken_page_v0.1-rc1.zip`.
4. Extract the ZIP directly into the document root. The root must contain `index.html`, `css/`, `js/`, `assets/`, `docs/`, `robots.txt`, `sitemap.xml` and `favicon.svg`. Do not leave the site inside an extra nested folder.
5. Confirm HTTPS is active.
6. Open the live site and confirm the homepage renders.
7. Click `Download BPS` to verify the 56,540,257-byte patch is served correctly.
8. Perform a patch smoke test with the exact clean Japanese source. The site should reject a random/wrong file, accept the supported source, and only offer the generated ROM after the output SHA-256 matches the canonical RC1.

If Hostinger has aggressive caching enabled, purge cache after replacing JavaScript or the BPS file.
