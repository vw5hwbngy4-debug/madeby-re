PSO UI + runtime asset fix
==========================

Cause:
After fixing <base href="/pso/">, the page correctly uses /pso/ as its root.
However, several newer RICO/Ragol assets only existed in the old nested /pso/pso/ folder.

Most visibly:
  /pso/rico-intelligence.css   -> missing
so the Ragol Link release block rendered as mostly unstyled HTML.

This patch also restores the module dependencies that were still only present in /pso/pso/.

UPLOAD
------
Upload ALL files in this patch directly into:

  games.madeby.re/pso/

Overwrite index.html.

Expected files include:
  /pso/index.html
  /pso/rico-intelligence.css
  /pso/save-mag-coach.js
  /pso/pso-character-link.js
  /pso/hunt-router-core.js
  /pso/account-router-core.js
  /pso/account-router-ui.js
  /pso/gear-progression-core.js
  /pso/gear-progression-ui.js

Your working API in /pso/api/ is not touched.

The index query versions were bumped to force the browser/CDN to request the repaired assets.
