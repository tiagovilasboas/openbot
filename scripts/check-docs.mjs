import { readFileSync } from 'node:fs';

const files = ['README.md', 'LICENSE', 'docs/architecture/README.md', 'docs/stacks/README.md'];
let failed = false;
for (const file of files) {
  try {
    if (!readFileSync(file, 'utf8').trim()) throw new Error('empty file');
  } catch (error) {
    console.error(`${file}: ${error.message}`);
    failed = true;
  }
}
if (failed) process.exitCode = 1;
else console.log('Required project documents exist and are non-empty.');
