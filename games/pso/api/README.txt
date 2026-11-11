PSO API exact-layout fix
========================

This patch is based on the user's current api.zip.

Expected live layout:

  /pso/api/pso.php
  /pso/api/health.php
  /pso/private/config.php

Upload the CONTENTS of this patch directly into:

  games.madeby.re/pso/api/

Overwrite pso.php, health.php and install-health.php.

Do NOT upload your private/config.php in this patch.

After upload, open:

  https://madeby.re/games/pso/api/health.php

Expected:
  "config_found": true
  "config_readable": true
  "config_returned_array": true
  "api_key_configured": true
  "config_source": "../private/config.php"

If any of those are false, the JSON now shows which exact relative candidate PHP can see,
without exposing the API key value.

The config may use either:
  'openai_api_key' => '...'
or:
  'OPENAI_API_KEY' => '...'

Canonical example:

<?php
return [
    'openai_api_key' => 'YOUR_KEY_HERE',
    'openai_model' => 'gpt-5.2',
];
