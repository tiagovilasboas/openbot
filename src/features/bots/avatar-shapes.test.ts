import assert from "node:assert/strict";
import test from "node:test";

import { buildBackup } from "../backup/build-backup.ts";
import type { BackupStorage } from "../backup/backup-types.ts";
import { parseBackup } from "../backup/parse-backup.ts";
import { restoreBackup } from "../backup/restore-backup.ts";
import { BLOB_ART } from "./blob-art.ts";
import { SPECS } from "./blob-specs.ts";
import { getBotsCopy } from "./bots-copy.ts";
import {
  BOTS_STORAGE_KEY,
  parseBots,
  sanitizeBotProfile,
} from "./bot-storage.ts";
import { AVATAR_SHAPES, LEGACY_SHAPES } from "./bot-types.ts";

const NEW_SHAPES = ["star", "heart", "gear", "cat"] as const;

class MemoryStorage implements BackupStorage {
  readonly map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

const botWith = (shape: string) => ({
  id: `bot-${shape}`,
  name: `Bot ${shape}`,
  description: "d",
  avatarShape: shape,
  avatarColor: "cyan",
  skills: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

test("the four new shapes are in the shape list, once", () => {
  for (const shape of NEW_SHAPES) {
    assert.equal(AVATAR_SHAPES.filter((s) => s === shape).length, 1, shape);
  }
  assert.equal(new Set(AVATAR_SHAPES).size, AVATAR_SHAPES.length);
});

test("every shape has a spec, drawn art and a name in both languages", () => {
  for (const shape of AVATAR_SHAPES) {
    assert.ok(SPECS[shape], `${shape} has no spec`);
    assert.ok(BLOB_ART[shape].body.length > 20, `${shape} has no art`);
    for (const isPt of [true, false]) {
      assert.ok(getBotsCopy(isPt).shapes[shape], `${shape} has no name`);
    }
  }
});

test("a new shape does not reuse the id of a legacy shape", () => {
  for (const shape of NEW_SHAPES) {
    assert.ok(!Object.hasOwn(LEGACY_SHAPES, shape), shape);
  }
});

test("every shape parses through the sanitizer unchanged", () => {
  for (const shape of AVATAR_SHAPES) {
    assert.equal(sanitizeBotProfile(botWith(shape))?.avatarShape, shape);
  }
});

test("legacy and unknown shapes still resolve to a drawable shape", () => {
  for (const legacy of Object.keys(LEGACY_SHAPES)) {
    const shape = sanitizeBotProfile(botWith(legacy))?.avatarShape;
    assert.ok(shape && BLOB_ART[shape], legacy);
  }
  const unknown = sanitizeBotProfile(botWith("not-a-shape"))?.avatarShape;
  assert.ok(unknown && BLOB_ART[unknown]);
});

test("every shape survives a backup round trip", () => {
  const source = new MemoryStorage();
  source.setItem(
    BOTS_STORAGE_KEY,
    JSON.stringify(AVATAR_SHAPES.map((shape) => botWith(shape))),
  );
  const parsed = parseBackup(JSON.stringify(buildBackup(source, "pt")));
  assert.ok(parsed.ok);

  const target = new MemoryStorage();
  restoreBackup(parsed.backup, target, "replace");
  const restored = parseBots(target.getItem(BOTS_STORAGE_KEY));
  assert.deepEqual(
    restored.map((bot) => bot.avatarShape),
    [...AVATAR_SHAPES],
  );
});
