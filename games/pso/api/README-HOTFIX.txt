PSO API robust hotfix

Upload these files into the API directory that sits NEXT TO the index.html/app.js you are actually running.
The config resolver now walks upward only as far as DOCUMENT_ROOT, so it can find pso/private/config.php even if the site was accidentally nested as pso/pso/... .

Test after upload:
  /pso/api/health.php
Look for:
  config_found: true
  api_key_configured: true
  config_source: private/config.php found in ancestor tree

This ZIP contains NO API key.
