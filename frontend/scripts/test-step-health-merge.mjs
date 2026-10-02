/**
 * Manual verification of pedometer ↔ Google Fit merge + sanitize rules.
 * Run: node scripts/test-step-health-merge.mjs
 */

const MAX_DAILY_STEPS = 100_000;
const PEDOMETER_HEALTH_DIVERGENCE_THRESHOLD = 50;
const DEFAULT_MAX_HEALTH_JUMP_ABOVE_PEDOMETER = 4_000;
const MAX_HEALTH_JUMP_ABOVE_CACHE = 15_000;
const MAX_STEPS_PER_MINUTE = 200;
const MIDNIGHT_GRACE_STEPS = 500;

const sanitizeDailySteps = (value) => {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  return Math.min(n, MAX_DAILY_STEPS);
};

const mergePedometerWithHealthSteps = (pedometerSteps, healthSteps, options) => {
  const ped = sanitizeDailySteps(pedometerSteps);
  const hc = sanitizeDailySteps(healthSteps);
  const threshold = options?.threshold ?? PEDOMETER_HEALTH_DIVERGENCE_THRESHOLD;

  if (hc <= 0) {
    return {
      steps: ped,
      corrected: false,
      source: "pedometer",
      healthSteps: hc,
      pedometerSteps: ped,
    };
  }

  const diff = Math.abs(ped - hc);
  if (diff <= threshold) {
    return {
      steps: ped,
      corrected: false,
      source: "pedometer",
      healthSteps: hc,
      pedometerSteps: ped,
    };
  }

  const adopted = Math.min(hc, MAX_DAILY_STEPS);
  return {
    steps: adopted,
    corrected: adopted < ped,
    source: "health",
    healthSteps: hc,
    pedometerSteps: ped,
  };
};

const maxPlausibleStepsSinceMidnight = (now = new Date()) => {
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const elapsedMinutes = Math.max(1, (now.getTime() - dayStart.getTime()) / 60_000);
  return Math.min(
    MAX_DAILY_STEPS,
    Math.floor(elapsedMinutes * MAX_STEPS_PER_MINUTE + MIDNIGHT_GRACE_STEPS),
  );
};

const sanitizeHealthConnectTodaySteps = (rawHealthSteps, pedometerSteps, options) => {
  const hc = sanitizeDailySteps(rawHealthSteps);
  const ped = sanitizeDailySteps(pedometerSteps);
  if (hc <= 0) return 0;

  const isToday = options?.isToday !== false;
  const now = options?.now ?? new Date();

  if (isToday) {
    const timeCap = maxPlausibleStepsSinceMidnight(now);
    if (ped < 300 && hc > 2_500 && hc > timeCap) {
      return 0;
    }
    if (hc > timeCap * 1.5 && ped < 300 && hc > ped + DEFAULT_MAX_HEALTH_JUMP_ABOVE_PEDOMETER) {
      return ped > 0 ? ped : 0;
    }
  }

  return hc;
};

/** Simulate reconcile raise path after merge. */
const wouldSyncHealthRaise = (current, next) => {
  if (next <= current) return { sync: false, reason: "no_raise" };
  const jump = next - current;
  if (jump > MAX_HEALTH_JUMP_ABOVE_CACHE) {
    return { sync: false, reason: "jump_discarded", jump };
  }
  return { sync: true, reason: "health_merge", jump };
};

let passed = 0;
let failed = 0;

const assertEq = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name}`);
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
  }
};

const assert = (name, cond, detail) => {
  if (cond) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

console.log("=== mergePedometerWithHealthSteps ===\n");

{
  const r = mergePedometerWithHealthSteps(5000, 5030);
  assertEq(
    "diff 30 ≤ 50 → pedometer",
    {
      steps: r.steps,
      source: r.source,
      corrected: r.corrected,
    },
    { steps: 5000, source: "pedometer", corrected: false },
  );
}

{
  const r = mergePedometerWithHealthSteps(5000, 5050);
  assertEq(
    "diff exactly 50 → pedometer",
    {
      steps: r.steps,
      source: r.source,
    },
    { steps: 5000, source: "pedometer" },
  );
}

{
  const r = mergePedometerWithHealthSteps(5000, 5051);
  assertEq(
    "diff 51 > 50 → Google Fit (higher)",
    {
      steps: r.steps,
      source: r.source,
      corrected: r.corrected,
    },
    { steps: 5051, source: "health", corrected: false },
  );
}

{
  const r = mergePedometerWithHealthSteps(8000, 6000);
  assertEq(
    "diff 2000 > 50 → Fit lower (correct down)",
    {
      steps: r.steps,
      source: r.source,
      corrected: r.corrected,
    },
    { steps: 6000, source: "health", corrected: true },
  );
}

{
  const r = mergePedometerWithHealthSteps(3000, 12000);
  assertEq(
    "Fit ahead by 9k → adopt Fit (old +4k block removed)",
    {
      steps: r.steps,
      source: r.source,
    },
    { steps: 12000, source: "health" },
  );
}

{
  const r = mergePedometerWithHealthSteps(4500, 0);
  assertEq(
    "Fit 0 → keep pedometer",
    {
      steps: r.steps,
      source: r.source,
    },
    { steps: 4500, source: "pedometer" },
  );
}

{
  const r = mergePedometerWithHealthSteps(1000, 100_500);
  assertEq(
    "Fit above daily cap → capped to 100k",
    {
      steps: r.steps,
      source: r.source,
    },
    { steps: 100_000, source: "health" },
  );
}

console.log("\n=== sanitizeHealthConnectTodaySteps (must not collapse Fit ahead) ===\n");

{
  // Mid-afternoon: plenty of time for 12k steps
  const now = new Date();
  now.setHours(15, 0, 0, 0);
  const out = sanitizeHealthConnectTodaySteps(12_000, 3_000, { now, isToday: true });
  assertEq("Fit 12k with ped 3k afternoon → keep Fit", out, 12_000);
}

{
  const now = new Date();
  now.setHours(15, 0, 0, 0);
  const out = sanitizeHealthConnectTodaySteps(5_080, 5_000, { now, isToday: true });
  assertEq("Fit close to ped → keep Fit raw for merge", out, 5_080);
}

{
  // Early morning dump: ped low, HC huge beyond time cap
  const now = new Date();
  now.setHours(0, 10, 0, 0);
  const out = sanitizeHealthConnectTodaySteps(8_000, 50, { now, isToday: true });
  assert("morning multi-day dump blocked", out === 0, `got ${out}`);
}

console.log("\n=== reconcile raise after merge (production path) ===\n");

{
  // Ped 5000, Fit 12000 → merge adopts 12000 → raise jump 7000 → should sync
  const merged = mergePedometerWithHealthSteps(5000, 12000);
  const sync = wouldSyncHealthRaise(5000, merged.steps);
  assert(
    "production: Fit ahead 7k syncs health_merge",
    sync.sync === true && sync.reason === "health_merge",
  );
}

{
  // Diff ≤ 50 → pedometer wins → no raise sync needed
  const merged = mergePedometerWithHealthSteps(5000, 5040);
  assertEq("close gap stays on pedometer (no Fit overwrite)", merged.source, "pedometer");
  assert("close gap: steps unchanged at 5000", merged.steps === 5000);
}

{
  // Extreme jump > 15k still discarded at reconcile
  const sync = wouldSyncHealthRaise(1000, 20_000);
  assert(
    "implausible +19k raise discarded at cache guard",
    sync.sync === false && sync.reason === "jump_discarded",
  );
}

{
  // Borderline: +15000 exactly allowed, +15001 discarded
  assert("jump exactly 15000 allowed", wouldSyncHealthRaise(1000, 16_000).sync === true);
  assert("jump 15001 discarded", wouldSyncHealthRaise(1000, 16_001).sync === false);
}

console.log("\n=== scenario matrix (user rule) ===\n");

const scenarios = [
  { ped: 2000, fit: 2040, expectSource: "pedometer", expectSteps: 2000, label: "Fit +40" },
  { ped: 2000, fit: 2050, expectSource: "pedometer", expectSteps: 2000, label: "Fit +50" },
  { ped: 2000, fit: 2051, expectSource: "health", expectSteps: 2051, label: "Fit +51" },
  { ped: 9000, fit: 8949, expectSource: "health", expectSteps: 8949, label: "Fit -51" },
  { ped: 9000, fit: 8950, expectSource: "pedometer", expectSteps: 9000, label: "Fit -50" },
  { ped: 1500, fit: 8000, expectSource: "health", expectSteps: 8000, label: "Fit far ahead" },
  { ped: 10000, fit: 2000, expectSource: "health", expectSteps: 2000, label: "Fit far behind" },
];

for (const s of scenarios) {
  const r = mergePedometerWithHealthSteps(s.ped, s.fit);
  assert(
    `${s.label}: source=${s.expectSource} steps=${s.expectSteps}`,
    r.source === s.expectSource && r.steps === s.expectSteps,
    `got source=${r.source} steps=${r.steps}`,
  );
}

console.log(`\n── Result: ${passed} passed, ${failed} failed ──`);
process.exit(failed > 0 ? 1 : 0);
