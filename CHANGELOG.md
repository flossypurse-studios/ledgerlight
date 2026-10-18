# Changelog

## 0.1.0 — unreleased

First release, under the name `ledgerlight`.

- `ledgerlight verify <ledger.md> [--report <project>=<report.json>]... [--json]`:
  checks every `test:`, `file:`, `symbol:` and `commit:` claim in a loss
  ledger against the repo and against the test reports you supply.
- Claim verdicts `LIT`, `SKIPPED`, `FAILED`, `NOT-RUN`, `NO-REPORT`,
  `UNRESOLVED`; loss verdicts `LIT`, `DARK-IN-PRACTICE`, `UNCLAIMED`.
  `NO-REPORT` is never a pass.
- Reads vitest and Playwright JSON reports, detected by shape.
- Fenced blocks are tagged `ledgerlight-config` and `ledgerlight`. The
  pre-release tags `lantern-config` and `lantern` are still read, with one
  warning per ledger.
- Exit codes: 0 all lit, 1 any dark or unclaimed, 2 usage or parse error.
