# Harbour Supply Co. — notes

Synthetic ledger invented for ledgerlight's own tests. It has a config block and a
claim block but no loss-list section at all, so ledgerlight must say so rather than
quietly reporting zero losses.

```ledgerlight-config
repo: ./repo
```

## Lights currently burning

**L1** — The ask cooldown is enforced in one place.

```ledgerlight
loss: L1
covers:
  - file: lib/refund-guards.ts
```
