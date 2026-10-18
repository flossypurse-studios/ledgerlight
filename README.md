# ledgerlight

**Your ledger says the loss is covered. Did the test actually run?**

[Site](https://ledgerlight-site.vercel.app) · [npm](https://www.npmjs.com/package/ledgerlight) · [Changelog](CHANGELOG.md)

A loss ledger names a handful of outcomes that must never happen to the people
your software touches — `L1`, `L2`, `L8` — and, for each one, says which code
and which tests stand in front of it. `ledgerlight` reads that ledger and the
test reports from a real run, and tells you, loss by loss, whether every check
the ledger cites actually executed and passed in that run.

It is an execution checker, not an existence checker. A test that exists but
never ran is never reported as a pass.

## When you'd reach for it

You are about to say "that's covered" and point at a green test run.

The failure this tool exists to catch is not a missing test. It is this: the
ledger claims a loss is covered by a test, the test exists, it is well written,
and it does not execute in the run people quote as proof. A typical way it
happens: the test lives in a separate `integration` project behind
`describe.skipIf(!HAS_DB)`, so the default `npm test` never runs it, and the
green default run gets cited as the evidence anyway.

## Install

Nothing to install. Run it with `npx`, pinned to a version:

```
npx ledgerlight@0.1.0 verify docs/loss-ledger.md --report unit=reports/unit.json
```

Node 20 or newer. No runtime dependencies. To keep it in a project instead:
`npm install --save-dev ledgerlight@0.1.0`.

## A worked example

A small, invented ledger with two losses. Both read, in prose, as covered:

````markdown
# Harbour Supply Co. — loss ledger

```ledgerlight-config
repo: ./app
```

## Loss list

- **L1** — We ask a customer for money during a cooldown they were promised.
- **L8** — An erasure request completes while rows for the subject survive.

## Lights currently burning

**L1** — The ask cooldown is enforced in one place and unit-tested against the
boundary day in both directions.

```ledgerlight
loss: L1
covers:
  - test: test/unit/refund-guards.test.ts
    project: unit
```

**L8** — Erasure completeness is checked by an integration test that reads back
every table after the erase.

```ledgerlight
loss: L8
covers:
  - test: test/integration/erasure-completeness.test.ts
    project: integration
```
````

Run the default test command, save its report, and hand only that to
`ledgerlight`:

```
$ npx vitest run --reporter=json --outputFile=reports/unit.json
$ npx ledgerlight@0.1.0 verify loss-ledger.md --report unit=reports/unit.json
ledger: loss-ledger.md
repo:   /work/harbour/app
reports: unit

L8  DARK-IN-PRACTICE  NO-REPORT: no report supplied for project "integration"; nothing shows this test ever ran
  NO-REPORT  test    test/integration/erasure-completeness.test.ts (project: integration)
                     no report supplied for project "integration"; nothing shows this test ever ran

L1  LIT
  LIT        test    test/unit/refund-guards.test.ts (project: unit)
                     3 of 3 cases passed in the "unit" report

2 losses: 1 lit, 1 dark-in-practice, 0 unclaimed.
A loss is only lit when every claim standing in front of it ran, in a run you supplied.
$ echo $?
1
```

L8's test is real and it passes when it runs. Nothing you supplied shows that it
ran. Supply the integration report too and both losses go `LIT`, exit 0. Supply
an integration report from a run where the database was missing and the cases
skipped, and L8 reads `SKIPPED: 2 of 2 cases did not run`, still exit 1.

This example is the `test/fixtures/ledger-signature.md` fixture in this repo;
only the paths differ.

## Use

```
ledgerlight verify <ledger.md> [--report <project>=<report.json>]... [--json]
```

- `--report <project>=<path>` — a test-run report (vitest or Playwright JSON).
  `<project>` matches the `project:` key on a test claim. Repeatable, once per
  project.
- `--json` — print the whole result as JSON on stdout instead of the table.

Reports are given on the command line, never in the ledger. The ledger says
what should guard a loss; the command line says what you actually ran. Keeping
them apart is the point.

### Exit codes

| code | meaning |
| --- | --- |
| 0 | every loss is `LIT` |
| 1 | some loss is `DARK-IN-PRACTICE` or `UNCLAIMED` |
| 2 | usage or parse error |

## Verdicts

Per claim:

| verdict | meaning |
| --- | --- |
| `LIT` | resolved, and for tests, present in a supplied report with every case passing |
| `SKIPPED` | the file is in a report, but some or all cases are `skipped` or `todo`. Says how many of how many |
| `FAILED` | in a report, with a failing case |
| `NOT-RUN` | a report **was** supplied for this project, but this file is not in it. Usually filtered out by the runner's include globs, or gated so it never collected |
| `NO-REPORT` | **no report was supplied for this claim's project at all** |
| `UNRESOLVED` | the file, symbol or commit is not in the repo |

`NO-REPORT` is the verdict the tool was written for, and it is not a pass. It
means: you are claiming this light burns, and you have handed over nothing
showing it ever ran. A ledger checked with no reports at all is entirely
`NO-REPORT`, and exits 1.

Per loss: `LIT` only when **every** claim is `LIT`. Otherwise
`DARK-IN-PRACTICE`, headlined by the weakest claim's reason. Severity runs
`UNRESOLVED` → `FAILED` → `NO-REPORT` → `NOT-RUN` → `SKIPPED` → `LIT`, and the
output is ordered worst first.

A loss in the list with no claim block at all is `UNCLAIMED`, reported last.
That is a real finding, not a parse gap.

## Ledger format

Two fenced block types. Everything else in the file is prose, which
`ledgerlight` ignores.

### The config block — exactly once, anywhere

````markdown
```ledgerlight-config
repo: ../app
```
````

`repo` is the git repository root every file, symbol and commit citation
resolves against, **relative to the ledger file's own location** (not the
working directory).

This matters more than it looks. Real code often lives in a git repository
nested inside another one, and a checker pointed at the outer repository
false-negatives every commit citation in the inner one. `ledgerlight` uses
exactly the path you give it, runs every git command as `git -C <repo>`, and
says in its notes when that path is not itself the top level of a repository.

### A claim block — one per light, right after its prose

````markdown
```ledgerlight
loss: L8
covers:
  - test: test/unit/refund-guards.test.ts
    project: unit
  - file: lib/refund-guards.ts
  - symbol: applyRefund
    file: lib/order-router.ts
  - commit: 7c3a1e9
```
````

Four claim kinds. All paths are relative to `repo`.

- **`test:`** a test file, plus a required **`project:`** naming which suite it
  belongs to. `project` is what `--report <project>=...` keys off. This is the
  kind that carries the tool's weight; the other three are supporting evidence.
- **`file:`** a source file that must exist.
- **`symbol:`** an identifier that must appear in the named **`file:`**.
- **`commit:`** a SHA, possibly abbreviated, that must resolve **and** be an
  ancestor of `HEAD`.

Unrecognised keys are an error, with the ledger file and line number. A typo'd
`projet:` that got silently dropped would turn a claim into nothing at all,
which is the same kind of failure the tool exists to catch.

### The loss list

`ledgerlight` looks for a heading whose text contains "loss list" and collects
`L<number>` identifiers in bold or table-leading position until the next
heading at the same or a higher level. Tables, bullet lists and plain lines all
work:

```markdown
## Loss list

| ID | Unacceptable outcome |
| --- | --- |
| **L1** | We ask a customer for money during a promised cooldown. |
```

An `L9` mentioned mid-sentence is prose and is ignored. If there is no
loss-list section at all, `ledgerlight` says so and exits 2 rather than
reporting zero losses.

### Old fence tags

Before its first release this tool was called `lantern`, and its blocks were
tagged `lantern-config` and `lantern`. Those tags still work exactly as the new
ones, with one warning on stderr per ledger:

```
ledgerlight: warning: loss-ledger.md: deprecated fence tags "lantern-config" and "lantern"; rename them to "ledgerlight-config" and "ledgerlight"
```

An old-tag block and a new-tag block for the same loss count as a duplicate,
and one of each config tag counts as two config blocks; both are errors.

## Report formats

Detected by shape, not by filename.

- **Vitest JSON reporter** — `vitest run --reporter=json --outputFile=unit.json`
- **Playwright JSON reporter** — `playwright test --reporter=json > e2e.json`

Report paths are usually absolute and from some other machine, so claim paths
are matched by resolving against the repo root and comparing whole path
segments from the right. Never a bare substring: `test/unit/erasure.test.ts`
must not match `test/integration/erasure.test.ts`.

## In CI

Generate each project's report in the same job that runs `ledgerlight`, so the
reports are the run you are talking about. Exit 1 fails the job.

```yaml
- run: npx vitest run --project unit --reporter=json --outputFile=reports/unit.json
- run: npx vitest run --project integration --reporter=json --outputFile=reports/integration.json
- run: >
    npx ledgerlight@0.1.0 verify docs/loss-ledger.md
    --report unit=reports/unit.json
    --report integration=reports/integration.json
```

If a test step fails, the job stops before `ledgerlight` runs; add
`if: always()` to the last step if you want the verdicts either way. Use
`--json` if something downstream reads the result.

## Limits

- **`symbol:` is a text search, not AST analysis.** It checks the identifier
  appears in the file on a word boundary. It will match inside a comment or a
  string, and it cannot tell an export from a local.
- **A report is taken at its word.** `ledgerlight` cannot tell whether the JSON
  came from the run you are talking about or a lucky run last Tuesday. Generate
  reports in the same job as the claim you are making.
- **`flaky` counts as failed.** A guard that holds only on retry is not a light
  that burns. This is a judgement call, not something the format dictates.
- **An unknown case status counts as failed**, never as a pass.
- **Only the four claim kinds exist.** If a light is a manual procedure or a
  monitor, `ledgerlight` cannot see it.
- **One command.** `verify` is the whole tool for now.

## Development

```
npm install
npm run build      # tsc to dist/, no bundler
npm test           # vitest
npm run typecheck
```

The verdict logic in `src/verdict.ts` is a pure function from parsed claims and
parsed reports to verdicts, with no I/O, so all of it is tested in memory in
`test/verdict.test.ts`. Every fixture under `test/` is invented.

| file | job |
| --- | --- |
| `src/yaml.ts` | the hand-rolled YAML subset, and its rejections |
| `src/parse-ledger.ts` | fences, config, claim blocks, the loss list, old tags |
| `src/reports.ts` | vitest and Playwright JSON, flattened to one shape |
| `src/paths.ts` | repo-relative claim path vs absolute report path |
| `src/resolve.ts` | file, symbol and commit checks against the repo (the I/O) |
| `src/verdict.ts` | the pure core |
| `src/render.ts` | plain-text output |
| `src/verify.ts` | argument parsing and wiring |
| `src/cli.ts` | the bin |

MIT © FlossyPurse Studios
