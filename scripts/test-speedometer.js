/**
 * Standalone test for sanitizeSpeedKmh logic.
 * Runs without Jest setup — just: node scripts/test-speedometer.js
 *
 * Mirrors src/utils/locationSpeed.ts byte-for-byte so we test the
 * exact production logic.
 */

const KMH_PER_MPS = 3.6;
const JITTER_THRESHOLD_KMH = 1;
const POOR_ACCURACY_FAKE_SPEED_KMH = 2;
const POOR_ACCURACY_THRESHOLD_METERS = 25;

function sanitizeSpeedKmh(speedMps, accuracyMeters) {
  if (speedMps == null || speedMps < 0) return null;
  const speedKmh = speedMps * KMH_PER_MPS;
  const accuracy = accuracyMeters ?? null;
  if (speedKmh < JITTER_THRESHOLD_KMH) return 0;
  if (
    accuracy != null &&
    accuracy > POOR_ACCURACY_THRESHOLD_METERS &&
    speedKmh < POOR_ACCURACY_FAKE_SPEED_KMH
  ) {
    return 0;
  }
  return speedKmh;
}

// ─── Test cases ──────────────────────────────────────────────────────────────
const cases = [
  // [name, input speedMps, input accuracy, expected output]
  ['null input',                    null,   10,   null],
  ['negative input',                -1,     10,   null],
  ['undefined input',               undefined, 10, null],

  ['zero speed',                    0,      10,   0],
  ['tiny jitter 0.1 m/s = 0.36 km/h', 0.1,  5,    0],
  ['jitter cutoff 0.27 m/s = 0.97 km/h', 0.27, 5, 0],
  ['walking 1.5 m/s = 5.4 km/h',    1.5,    5,    5.4],
  ['jogging 2.5 m/s = 9 km/h',      2.5,    5,    9],
  ['biking 5 m/s = 18 km/h',        5,      5,    18],
  ['rickshaw 4 m/s = 14.4 km/h',    4,      8,    14.4],
  ['fast 15 m/s = 54 km/h',         15,     10,   54],

  ['poor GPS at low speed (1.5 km/h, accuracy 30m) -> 0', 0.42, 30, 0],
  ['poor GPS at decent speed (5 km/h, accuracy 30m) -> kept', 1.4, 30, 5.04],

  ['good GPS keeps slow walking (3 km/h, accuracy 8m)', 0.84, 8, 3.024],
];

let passed = 0;
let failed = 0;

for (const [name, speedMps, accuracy, expected] of cases) {
  const got = sanitizeSpeedKmh(speedMps, accuracy);
  // Compare with small float tolerance
  const ok = (expected === null && got === null)
    || (expected !== null && got !== null && Math.abs(got - expected) < 0.001);

  if (ok) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}`);
    console.log(`      expected: ${expected}`);
    console.log(`      got:      ${got}`);
    failed++;
  }
}

console.log('');
console.log(`Result: ${passed} passed, ${failed} failed (${cases.length} total)`);
process.exit(failed > 0 ? 1 : 0);
