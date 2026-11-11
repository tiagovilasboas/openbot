import type { DatabaseSync } from "node:sqlite";

// A step is raw SQL or a function that runs statements on the same handle.
export type MigrationStep = string | ((db: DatabaseSync) => void);

// Applies the steps a domain has not run yet. Each step and its version bump
// share one transaction, so a failing step leaves the previous version intact.
export function migrate(
  db: DatabaseSync,
  domain: string,
  steps: readonly MigrationStep[],
): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_versions (domain TEXT PRIMARY KEY, version INTEGER NOT NULL)",
  );
  const row = db
    .prepare("SELECT version FROM schema_versions WHERE domain = ?")
    .get(domain) as { version: number } | undefined;
  const current = row?.version ?? 0;
  if (current > steps.length) {
    throw new Error(
      `The "${domain}" data is at version ${current}, newer than the ${steps.length} migrations this app knows. Update Open Bot before opening this database.`,
    );
  }
  for (let index = current; index < steps.length; index += 1) {
    const step = steps[index];
    db.exec("BEGIN");
    try {
      if (typeof step === "string") db.exec(step);
      else step(db);
      db.prepare(
        "INSERT INTO schema_versions (domain, version) VALUES (?, ?) ON CONFLICT(domain) DO UPDATE SET version = excluded.version",
      ).run(domain, index + 1);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}
