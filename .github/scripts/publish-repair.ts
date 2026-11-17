import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
function run(command: string, args: string[]): string {
  return execFileSync(command, args, { encoding: 'utf8' }).trim();
}
async function main(): Promise<void> {
  const repo = required('GITHUB_REPOSITORY');
  const runId = required('GITHUB_RUN_ID');
  const base = required('PR_HEAD_REF');
  const head = required('HEAD_SHA');
  if (!/^\d+$/.test(runId) || !/^[a-f0-9]{40}$/.test(head))
    throw new Error('Invalid run metadata');
  const branch = `fix/auto-heal-${runId}`;
  const current = run('gh', [
    'api',
    `repos/${repo}/git/ref/heads/${base}`,
    '--jq',
    '.object.sha',
  ]);
  if (current !== head)
    throw new Error('PR head changed during repair; refusing stale patch');
  const changed = run('git', ['diff', '--name-only']).split('\n');
  if (
    changed.length !== 1 ||
    changed[0] !== 'src/services/reservation.service.ts'
  )
    throw new Error('Only the allowed source file may change');
  const existing = run('gh', [
    'pr',
    'list',
    '--repo',
    repo,
    '--state',
    'all',
    '--head',
    branch,
    '--json',
    'url',
    '--jq',
    '.[0].url // empty',
  ]);
  if (existing) {
    console.log(`Existing remediation PR: ${existing}`);
    return;
  }
  run('git', ['config', 'user.name', 'github-actions[bot]']);
  run('git', [
    'config',
    'user.email',
    '41898282+github-actions[bot]@users.noreply.github.com',
  ]);
  run('git', ['switch', '-c', branch]);
  run('git', ['add', 'src/services/reservation.service.ts']);
  run('git', [
    'commit',
    '-m',
    'fix: auto-heal reservation boundary from CI failure',
  ]);
  run('git', ['config', 'credential.helper', '!gh auth git-credential']);
  run('git', ['push', 'origin', `HEAD:refs/heads/${branch}`]);
  const patch = run('git', [
    'diff',
    head,
    'HEAD',
    '--',
    'src/services/reservation.service.ts',
  ]);
  const response = await readFile('artifacts/repair.json', 'utf8');
  const body = `## Automatically generated remediation

The CI test step failed on ${head}. A local qwen2.5-coder:1.5b model analyzed the Jest log, source and diff, then generated this patch. The workflow applied no hard-coded fallback.

Workflow and artifacts: https://github.com/${repo}/actions/runs/${runId}

## Automated verification

- Source-only allowlist: only src/services/reservation.service.ts changed.
- Existing tests, assertions, coverage gates and dependencies were not changed.
- npm run check, npm run build, npm test and npm run test:coverage all passed on this patch inside the auto-fix job.
- The PR targets the intentional break branch, preserving main. No auto-merge.

## Patch

\`\`\`diff
${patch}
\`\`\`

## Model diagnosis

\`\`\`json
${response}
\`\`\`

## Human-in-the-loop audit

Pending student review; not accepted or merged. Automated checks above are not human review.

- [ ] Inspect the diff and confirm the half-open boundary rule is restored.
- [ ] Confirm tests/assertions were not weakened and review the passing repair verification.
- [ ] Record reviewer, date and decision here before accepting or merging.
`;
  await writeFile('artifacts/repair-pr.md', body);
  const url = run('gh', [
    'pr',
    'create',
    '--repo',
    repo,
    '--base',
    base,
    '--head',
    branch,
    '--title',
    'fix: auto-heal reservation boundary (Lab 8)',
    '--body-file',
    'artifacts/repair-pr.md',
  ]);
  console.log(url);
  run('gh', ['workflow', 'run', 'ci.yml', '--repo', repo, '--ref', branch]);
  await writeFile('artifacts/repair-pr-url.txt', `${url}\n`);
}
void main().catch((error: unknown): void => {
  console.error(error);
  process.exitCode = 1;
});
