# MadeBy.re on GitHub Pages

This repository is the static MadeBy.re site migrated from Hostinger.

## Published content

- Main portfolio
- Games and static playable projects
- Localizations and patch downloads
- Research library
- Historical static archives

## Intentionally excluded

GitHub Pages cannot execute PHP. Old PHP endpoints, `.htaccess` files,
server-private configuration and deployment notes that may contain credentials
are excluded by `.gitignore`. The original Hostinger export remains the private
backup for those files.

## Domain layout

The canonical site uses one domain and path-based sections:

- `https://madeby.re/games/`
- `https://madeby.re/localizations/`
- `https://madeby.re/research/`

Legacy subdomains can be preserved with Cloudflare redirects to these paths.
