/**
 * Install/launch on a USB-connected physical Android device only.
 * Never falls back to an emulator.
 *
 * Expo `--device` matches adb `model:<name>` (e.g. A142), NOT the serial.
 *
 * Usage: npm run android:device
 */
import { execSync, spawnSync } from "child_process";

const run = (cmd, opts = {}) => {
  try {
    return execSync(cmd, {
      encoding: "utf8",
      stdio: opts.stdio ?? ["ignore", "pipe", "pipe"],
      ...opts,
    });
  } catch (error) {
    if (opts.allowFail) return "";
    throw error;
  }
};

/** @returns {{ serial: string, expoName: string }[]} */
const listPhysicalDevices = () => {
  const out = run("adb devices -l", { allowFail: true });
  return out
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("List of devices"))
    .filter((line) => /\sdevice(\s|$)/.test(line))
    .filter((line) => !/emulator-\d+/i.test(line))
    .map((line) => {
      const serial = line.split(/\s+/)[0];
      const modelMatch = line.match(/\bmodel:(\S+)/);
      // Expo resolveFromNameAsync matches this `name` field (model), not serial.
      const expoName = modelMatch?.[1] || `Device ${serial}`;
      return { serial, expoName };
    })
    .filter((d) => d.serial);
};

const physical = listPhysicalDevices();

if (!physical.length) {
  console.error(`
No USB physical device detected by adb.

On the phone:
  1. Enable Developer options → USB debugging
  2. Plug in the cable (use a data cable, not charge-only)
  3. Accept the "Allow USB debugging?" prompt
  4. If needed: revoke USB debugging authorizations, unplug/replug

Then verify:
  adb devices -l
  → should show your phone as "device" with model:...

Do NOT leave an emulator as the only target — this script refuses emulators.
`);
  process.exit(1);
}

const { serial, expoName } = physical[0];
if (physical.length > 1) {
  console.log(`Multiple physical devices found; using first: ${expoName} (${serial})`);
  console.log(
    `Others: ${physical
      .slice(1)
      .map((d) => `${d.expoName} (${d.serial})`)
      .join(", ")}`,
  );
} else {
  console.log(`Using physical device: ${expoName} (serial ${serial})`);
}

process.env.ANDROID_SERIAL = serial;

for (const port of [8081, 8000]) {
  try {
    run(`adb -s ${serial} reverse tcp:${port} tcp:${port}`);
    console.log(`adb reverse tcp:${port} → device`);
  } catch (error) {
    console.warn(`adb reverse ${port} failed:`, error?.message || error);
  }
}

console.log(`Building & installing on ${expoName} (no emulator)...\n`);

const result = spawnSync("npx", ["expo", "run:android", "--device", expoName], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    ANDROID_SERIAL: serial,
    // USB adb reverse maps the phone's 127.0.0.1:8081 to this PC.
    // Expo's LAN address (often a virtual adapter) is not reachable from the phone.
    REACT_NATIVE_PACKAGER_HOSTNAME: "127.0.0.1",
  },
});

process.exit(result.status ?? 1);
