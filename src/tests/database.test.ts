import assert from 'node:assert/strict';
import { test } from 'node:test';
import { supportsTransactions } from '../config/database';

void test('only replica sets and sharded clusters support booking transactions', (): void => {
  assert.equal(
    supportsTransactions({ isWritablePrimary: true, setName: 'rs0' }),
    true,
  );
  assert.equal(
    supportsTransactions({ isWritablePrimary: true, msg: 'isdbgrid' }),
    true,
  );
  assert.equal(supportsTransactions({ isWritablePrimary: true }), false);
  assert.equal(supportsTransactions(null), false);
});
