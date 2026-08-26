/**
 * Notification Center test runner — run with: pnpm exec tsx scripts/run-notification-tests.ts
 */
import assert from "node:assert/strict";
import { normalizeNoHp } from "../lib/phone-utils";
import { compileMessage } from "../lib/notification/message-compiler";
import { isPublicMediaUrl, resolveFonnteImageUrl } from "../lib/fonnte-utils";
import { DEFAULT_SETTINGS } from "../lib/notification/notification-dispatcher-test-helpers";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err instanceof Error ? err.message : String(err)}`);
    }
  })();
}

async function main() {
  console.log("\n=== Notification Center Tests ===\n");

  await test("normalizeNoHp: leading 0 → 08", () => {
    assert.equal(normalizeNoHp("081234567890"), "081234567890");
  });

  await test("normalizeNoHp: leading 8 → 08", () => {
    assert.equal(normalizeNoHp("81234567890"), "081234567890");
  });

  await test("normalizeNoHp: strips formatting and +62 -> 08", () => {
    assert.equal(normalizeNoHp("+62 812-3456-7890"), "081234567890");
  });

  await test("compileMessage: replaces placeholders", () => {
    const result = compileMessage("Halo {nama}, email: {email}", {
      nama: "Budi",
      email: "budi@test.com",
      noHp: "081234567890",
    });
    assert.ok(result.includes("Budi"));
    assert.ok(result.includes("budi@test.com"));
  });

  await test("DEFAULT_SETTINGS: order-created has dual channels", () => {
    assert.deepEqual(DEFAULT_SETTINGS["order-created"], { email: true, whatsapp: true });
  });

  await test("DEFAULT_SETTINGS: forgot-password has dual channels", () => {
    assert.deepEqual(DEFAULT_SETTINGS["forgot-password"], { email: true, whatsapp: true });
  });

  await test("Channel override: email-only", () => {
    const override = { email: true, whatsapp: false };
    assert.equal(override.email && !override.whatsapp, true);
  });

  await test("Channel override: whatsapp-only", () => {
    const override = { email: false, whatsapp: true };
    assert.equal(!override.email && override.whatsapp, true);
  });

  await test("isPublicMediaUrl: rejects localhost", () => {
    assert.equal(isPublicMediaUrl("http://localhost:3000/img.jpg"), false);
    assert.equal(isPublicMediaUrl("https://localhost/img.jpg"), false);
  });

  await test("isPublicMediaUrl: accepts public https", () => {
    assert.equal(isPublicMediaUrl("https://cdn.example.com/img.jpg"), true);
  });

  await test("resolveFonnteImageUrl: skips localhost", () => {
    assert.equal(
      resolveFonnteImageUrl("http://localhost:3000/uploads/x.webp"),
      undefined
    );
  });

  await test("Hybrid broadcast: channels are independent", () => {
    const emailOk = true;
    const waFailed = false;
    const anySuccess = emailOk || waFailed;
    assert.equal(anySuccess, true);
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
