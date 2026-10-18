#!/usr/bin/env node
import { LedgerlightError } from './errors.js';
import { parseArgs, verify } from './verify.js';
import { render } from './render.js';

try {
  const args = parseArgs(process.argv.slice(2));
  const result = verify(args);
  for (const w of result.warnings) process.stderr.write(`ledgerlight: warning: ${w}\n`);
  process.stdout.write(
    (args.json ? JSON.stringify(result, null, 2) : render(result)) + '\n',
  );
  process.exitCode = result.exitCode;
} catch (err) {
  const message =
    err instanceof LedgerlightError ? err.format() : (err as Error).message;
  process.stderr.write(`ledgerlight: ${message}\n`);
  process.exitCode = 2;
}
