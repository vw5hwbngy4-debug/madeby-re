# Rollback — v0.1.24.9.2.2.7

## Browser build

The rollback unit is the complete known-good baseline:

`EMERALD_v0.1.24.9.2.2.6_HOENN_OVERLAY_ESCAPE_PUBLISH_LOCK_HOTFIX.zip`

Restore that full tree over the Emerald deployment. Do not selectively roll back Save Vault or emulator files because this release does not modify them.

## Backend integration kit

If the backend hardening hooks have been merged, first restore the prior `/api/hoenn` implementation.

The new idempotency tables are sidecars and can safely remain unused. If you deliberately want to remove them after application rollback:

```sql
DROP TABLE IF EXISTS hoenn_native_sync_idempotency;
DROP TABLE IF EXISTS hoenn_activity_idempotency;
DROP TABLE IF EXISTS hoenn_delivery_idempotency;
```

Do not delete or alter the existing account, session, Save Vault save, publication, delivery or activity tables as part of this rollback.
