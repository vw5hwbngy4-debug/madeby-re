/* SWITCH BRIDGE ROLLBACK v0.1.25.2
   Intentionally inert. This file overwrites the experimental v0.1.25 bridge
   so a stale/cached HTML reference cannot create localhost requests or UI.
*/
(()=>{'use strict';
  try { delete globalThis.JRPGWorldSwitchBridge; } catch (_) { globalThis.JRPGWorldSwitchBridge = undefined; }
})();
