// The markdown report of a crew run, ready to paste into a PR. It carries no
// key, token or request body: only case names, verdicts and clipped replies.
const cell = (text, n = 90) =>
  String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n)
    .replace(/\|/g, "/");

export function buildCrewReport(rows, { mode, commit, node }) {
  const passed = rows.filter((row) => row.ok).length;
  return [
    "# Real model run: crew cases",
    "",
    `Date: ${new Date().toISOString()}`,
    `Mode: ${mode}`,
    `Open Bot commit: ${commit}, Node ${node}`,
    `Result: ${passed} of ${rows.length} cases passed.`,
    "",
    "The provider and model are whatever the server was configured with. A FAIL is a real failure; its reason tag says which check broke (skipped:* means an earlier case it depends on failed). Model answers are not graded for quality, only for who spoke and what the tools did.",
    "",
    "| Case | Result | Reason | ms | Detail | Reply (clipped) |",
    "| --- | --- | --- | ---: | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${cell(row.name)} | ${row.ok ? "ok" : "FAIL"} | ${cell(row.reason)} | ${row.ms} | ${cell(row.detail, 140)} | ${cell(row.reply)} |`,
    ),
    "",
  ].join("\n");
}
