# Emerald Live v0.4.2 — Hoenn Presence

## What changed

Mobile BUZZ now has a live presence layer above the canonical story feed. A signed-in Emerald session sends a lightweight heartbeat once per minute while the page is visible. Presence is transient and never becomes a canonical game event.

BUZZ shows:

- **OTHER TRAINERS ONLINE** for the signed-in player;
- trainers active in the last 15 minutes;
- trainers seen in the last 24 hours;
- recent named trainers only when they already have a public Trainer Card or public Secret Base;
- an honest quiet state when nobody else is online.

The mobile BUZZ launcher gains a small live dot when another signed-in trainer is online. Desktop DEX remains unchanged.

## Presence semantics

- heartbeat cadence: 60 seconds while the page is visible;
- online TTL: 150 seconds;
- one presence row per Save Vault account, so multiple tabs do not create fake trainers;
- background/closed tabs naturally age out;
- no IP address, save hash, account id or private specimen data is exposed publicly;
- presence does not create `hoenn_base_event` or Trainer Card events.

## Server requirement

Requires Save Vault / Hoenn server **v0.4.2**.
