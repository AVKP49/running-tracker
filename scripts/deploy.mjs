import { execFileSync } from 'node:child_process';
import { mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const run = (command, args, cwd) => execFileSync(command, args, { cwd, stdio: 'inherit' });
run('npm', ['run', 'build']);
run('node', ['tests/smoke.mjs']);
run('node', ['--experimental-strip-types', 'tests/tile-health.mjs']);
const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
const folder = mkdtempSync(join(tmpdir(), 'running-tracker-pages-'));
try {
  cpSync('dist', folder, { recursive: true });
  writeFileSync(join(folder, '.nojekyll'), '');
  run('git', ['init', '-b', 'gh-pages'], folder);
  run('git', ['add', '.'], folder);
  run('git', ['commit', '-m', 'Publish Running Tracker'], folder);
  run('git', ['remote', 'add', 'origin', remote], folder);
  // gh-pages is generated output only; source history remains on main.
  run('git', ['push', '--force', 'origin', 'gh-pages'], folder);
} finally { rmSync(folder, { recursive: true, force: true }); }
