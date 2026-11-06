import { readFileSync } from "node:fs";

const files = [
  "README.md",
  "README.pt-BR.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "AGENTS.md",
  ".env.example",
  "docs/architecture/README.md",
  "docs/architecture/delivery-gates.md",
  "docs/stacks/README.md",
  "docs/roadmap/README.md",
  "docs/harness/README.md",
  "docs/git-conventions.md",
];
let failed = false;
for (const file of files) {
  try {
    if (!readFileSync(file, "utf8").trim()) throw new Error("empty file");
  } catch (error) {
    console.error(`${file}: ${error.message}`);
    failed = true;
  }
}
if (failed) process.exitCode = 1;
else console.log("Required project documents exist and are non-empty.");
