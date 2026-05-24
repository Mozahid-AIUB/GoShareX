/**
 * Standalone tests for anonymous chat join/create logic.
 * No Firebase — pure logic verification.
 *
 * Run: node scripts/test-chat-logic.js
 */

const ANON_GROUP_MIN = 2;
const ANON_GROUP_MAX = 10;
const ANON_1V1_MAX = 2;

// ─── Mirrored helpers from chatService.ts ──────────────────────────────────
function buildAlias(position) {
  return `Anonymous ${position}`;
}

// ─── 1v1 join logic ─────────────────────────────────────────────────────────
function canJoin1v1(room, userId, nowMs) {
  if (!room) return false;
  if (room.searching !== true) return false;
  if ((room.participants?.length ?? 0) >= ANON_1V1_MAX) return false;
  if ((room.expiresAt ?? 0) <= nowMs) return false;
  if (room.participants?.includes(userId)) return false;
  return true;
}

function performJoin1v1(room, userId) {
  const participants = [...(room.participants ?? []), userId];
  const aliases = {
    ...(room.participantAliases ?? {}),
    [userId]: buildAlias(participants.length),
  };
  return {
    ...room,
    participants,
    participantAliases: aliases,
    participantNames: aliases,
    searching: false, // 1v1 full at 2
  };
}

// ─── Group join logic ──────────────────────────────────────────────────────
function canJoinGroup(room, userId, nowMs) {
  if (!room) return false;
  if (room.searching !== true) return false;
  if ((room.participants?.length ?? 0) >= ANON_GROUP_MAX) return false;
  if ((room.expiresAt ?? 0) <= nowMs) return false;
  if (room.participants?.includes(userId)) return false;
  return true;
}

function performJoinGroup(room, userId) {
  const participants = [...(room.participants ?? []), userId];
  const aliases = {
    ...(room.participantAliases ?? {}),
    [userId]: buildAlias(participants.length),
  };
  return {
    ...room,
    participants,
    participantAliases: aliases,
    participantNames: aliases,
    searching: participants.length < ANON_GROUP_MAX,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────
const FUTURE = Date.now() + 5 * 60 * 1000;
const PAST = Date.now() - 1000;

const cases = [
  // [name, fn() returning bool, expected]

  // 1v1 join
  ['1v1: empty room — can join',
    () => canJoin1v1(
      { searching: true, participants: ['u1'], expiresAt: FUTURE },
      'u2', Date.now()
    ),
    true],

  ['1v1: full room (2) — cannot join',
    () => canJoin1v1(
      { searching: false, participants: ['u1', 'u2'], expiresAt: FUTURE },
      'u3', Date.now()
    ),
    false],

  ['1v1: expired room — cannot join',
    () => canJoin1v1(
      { searching: true, participants: ['u1'], expiresAt: PAST },
      'u2', Date.now()
    ),
    false],

  ['1v1: already member — cannot rejoin',
    () => canJoin1v1(
      { searching: true, participants: ['u1'], expiresAt: FUTURE },
      'u1', Date.now()
    ),
    false],

  ['1v1: searching=false — cannot join (race condition guard)',
    () => canJoin1v1(
      { searching: false, participants: ['u1'], expiresAt: FUTURE },
      'u2', Date.now()
    ),
    false],

  // Group join
  ['Group: 1 person waiting — can join',
    () => canJoinGroup(
      { searching: true, participants: ['u1'], expiresAt: FUTURE },
      'u2', Date.now()
    ),
    true],

  ['Group: 9 people — can join (last slot)',
    () => canJoinGroup(
      { searching: true, participants: ['u1','u2','u3','u4','u5','u6','u7','u8','u9'], expiresAt: FUTURE },
      'u10', Date.now()
    ),
    true],

  ['Group: 10 people — cannot join (full)',
    () => canJoinGroup(
      { searching: true, participants: ['u1','u2','u3','u4','u5','u6','u7','u8','u9','u10'], expiresAt: FUTURE },
      'u11', Date.now()
    ),
    false],

  ['Group: 11 people somehow — cannot join (defensive)',
    () => canJoinGroup(
      { searching: false, participants: Array.from({ length: 11 }, (_, i) => `u${i}`), expiresAt: FUTURE },
      'u11', Date.now()
    ),
    false],

  ['Group: searching=false but room not full (e.g. closed manually) — cannot join',
    () => canJoinGroup(
      { searching: false, participants: ['u1', 'u2'], expiresAt: FUTURE },
      'u3', Date.now()
    ),
    false],
];

let passed = 0;
let failed = 0;

console.log('\n=== Can-Join Logic ===');
for (const [name, fn, expected] of cases) {
  const got = fn();
  const ok = got === expected;
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (!ok) {
    console.log(`      expected: ${expected}, got: ${got}`);
    failed++;
  } else {
    passed++;
  }
}

// ─── Perform-join behavior ─────────────────────────────────────────────────
console.log('\n=== Perform Join — 1v1 ===');
{
  const initial = {
    searching: true,
    participants: ['u1'],
    participantAliases: { u1: 'Anonymous 1' },
    expiresAt: FUTURE,
  };
  const after = performJoin1v1(initial, 'u2');
  const checks = [
    ['participants length 2', after.participants.length === 2],
    ['u2 added', after.participants.includes('u2')],
    ['u2 alias = Anonymous 2', after.participantAliases.u2 === 'Anonymous 2'],
    ['searching toggled to false', after.searching === false],
    ['original u1 alias preserved', after.participantAliases.u1 === 'Anonymous 1'],
  ];
  for (const [name, ok] of checks) {
    console.log(`  ${ok ? '✓' : '✗'} ${name}`);
    ok ? passed++ : failed++;
  }
}

console.log('\n=== Perform Join — Group ===');
{
  const initial = {
    searching: true,
    participants: ['u1', 'u2'],
    participantAliases: { u1: 'Anonymous 1', u2: 'Anonymous 2' },
    expiresAt: FUTURE,
  };
  const after = performJoinGroup(initial, 'u3');
  const checks = [
    ['participants length 3', after.participants.length === 3],
    ['u3 added', after.participants.includes('u3')],
    ['u3 alias = Anonymous 3', after.participantAliases.u3 === 'Anonymous 3'],
    ['searching still true (< 10)', after.searching === true],
  ];
  for (const [name, ok] of checks) {
    console.log(`  ${ok ? '✓' : '✗'} ${name}`);
    ok ? passed++ : failed++;
  }
}

console.log('\n=== Perform Join — Group fills to 10 ===');
{
  let room = {
    searching: true,
    participants: ['u1'],
    participantAliases: { u1: 'Anonymous 1' },
    expiresAt: FUTURE,
  };
  for (let i = 2; i <= 10; i++) {
    room = performJoinGroup(room, `u${i}`);
  }
  const checks = [
    ['exactly 10 participants', room.participants.length === 10],
    ['searching toggled to false when full', room.searching === false],
    ['u10 alias = Anonymous 10', room.participantAliases.u10 === 'Anonymous 10'],
    ['u1 alias still Anonymous 1', room.participantAliases.u1 === 'Anonymous 1'],
  ];
  for (const [name, ok] of checks) {
    console.log(`  ${ok ? '✓' : '✗'} ${name}`);
    ok ? passed++ : failed++;
  }

  // After 10, no further joins allowed
  const eleventh = canJoinGroup(room, 'u11', Date.now());
  const elevenCheck = eleventh === false;
  console.log(`  ${elevenCheck ? '✓' : '✗'} 11th user rejected`);
  elevenCheck ? passed++ : failed++;
}

console.log('\n=== Alias uniqueness ===');
{
  // Build a 10-person room and verify all aliases are unique
  let room = { participants: [], participantAliases: {} };
  for (let i = 1; i <= 10; i++) {
    room.searching = true;
    room.expiresAt = FUTURE;
    room = performJoinGroup(room, `u${i}`);
  }
  const aliases = Object.values(room.participantAliases);
  const unique = new Set(aliases);
  const allUnique = unique.size === aliases.length;
  console.log(`  ${allUnique ? '✓' : '✗'} all 10 aliases unique (got ${unique.size}/10)`);
  allUnique ? passed++ : failed++;

  const sequential = aliases.every((a, i) => a === `Anonymous ${i + 1}`);
  console.log(`  ${sequential ? '✓' : '✗'} aliases are sequential 1..10`);
  sequential ? passed++ : failed++;
}

console.log('');
console.log(`Result: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
