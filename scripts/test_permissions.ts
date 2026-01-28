import assert from 'assert';
import { roleCanModify, roleCanReview } from '../lib/roles.ts';

function testRoles() {
  assert.strictEqual(roleCanModify('owner'), true);
  assert.strictEqual(roleCanModify('editor'), true);
  assert.strictEqual(roleCanModify('commenter'), false);
  assert.strictEqual(roleCanModify('viewer'), false);

  assert.strictEqual(roleCanReview('owner'), true);
  assert.strictEqual(roleCanReview('editor'), true);
  assert.strictEqual(roleCanReview('commenter'), true);
  assert.strictEqual(roleCanReview('viewer'), false);
}

try {
  testRoles();
  console.log('✅ permission tests passed');
} catch (err) {
  console.error('❌ permission tests failed');
  console.error(err);
  process.exit(1);
}
