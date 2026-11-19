import type { DatabaseSync } from "node:sqlite";
import { checkCrewChannel, type CrewChannel } from "../crew-channel.ts";
import { ensureCrewChannelsSchema } from "./channels-schema.ts";

type Row = { data: string };

// A damaged row is skipped, never trusted and never fatal.
function fromRow(row: Row): CrewChannel | null {
  try {
    const checked = checkCrewChannel(JSON.parse(row.data));
    return checked.ok ? checked.channel : null;
  } catch {
    return null;
  }
}

export function listChannels(db: DatabaseSync): CrewChannel[] {
  ensureCrewChannelsSchema(db);
  const rows = db
    .prepare("SELECT data FROM crew_channels ORDER BY updated_at, id")
    .all() as Row[];
  return rows.map(fromRow).filter((c): c is CrewChannel => c !== null);
}

export function getChannel(db: DatabaseSync, id: string): CrewChannel | null {
  ensureCrewChannelsSchema(db);
  const row = db.prepare("SELECT data FROM crew_channels WHERE id = ?").get(id);
  return row ? fromRow(row as Row) : null;
}

/** Creates or replaces a channel; its messages stay. */
export function saveChannel(
  db: DatabaseSync,
  channel: CrewChannel,
  now: number,
): CrewChannel {
  ensureCrewChannelsSchema(db);
  db.prepare(
    "INSERT INTO crew_channels (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
  ).run(channel.id, JSON.stringify(channel), now);
  return channel;
}

/** Deletes a channel with its messages and turns. False when absent. */
export function deleteChannel(db: DatabaseSync, id: string): boolean {
  ensureCrewChannelsSchema(db);
  const result = db.prepare("DELETE FROM crew_channels WHERE id = ?").run(id);
  return Number(result.changes) > 0;
}
