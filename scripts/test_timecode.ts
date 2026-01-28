import assert from 'assert';
import { formatTimecode, parseTimecodeToSeconds } from '../lib/timecode.ts';

function testFormat() {
  assert.strictEqual(formatTimecode(0, 24), '00:00:00.000');
  assert.strictEqual(formatTimecode(1, 24), '00:00:01.000');
  assert.strictEqual(formatTimecode(1, 25), '00:00:01.000');
  assert.strictEqual(formatTimecode(12.5, 24), '00:00:12.500');
}

function testParse() {
  assert.strictEqual(parseTimecodeToSeconds('00:00:10.000', 24), 10);
  const tc = parseTimecodeToSeconds('00:00:10:12', 24);
  assert.ok(tc > 10 && tc < 10.6);
}

try {
  testFormat();
  testParse();
  console.log('✅ timecode tests passed');
} catch (err) {
  console.error('❌ timecode tests failed');
  console.error(err);
  process.exit(1);
}
