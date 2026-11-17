import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRepair, applyRepair } from './patch.ts';
void test('accepts a small model patch only at its unique exact match', (): void => {
  const repair = parseRepair({
    reason: 'Correct a boundary',
    before: 'wrong',
    after: 'right',
  });
  assert.equal(applyRepair('before wrong after', repair), 'before right after');
  assert.throws(
    (): string => applyRepair('wrong wrong', repair),
    /exactly one/,
  );
  assert.throws((): string => applyRepair('unrelated', repair), /exactly one/);
});
void test('rejects malformed, empty, unchanged and oversized model output', (): void => {
  for (const value of [
    null,
    {},
    { reason: 'why', before: '', after: 'x' },
    { reason: 'why', before: 'x', after: 'x' },
    { reason: 'why', before: 'x', after: 'x\n'.repeat(21) },
    { reason: 'why', before: 'x', after: 42 },
  ])
    assert.throws((): unknown => parseRepair(value));
});
