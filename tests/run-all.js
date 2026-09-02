/* Runs every suite and prints one verdict.
   From the repository root:  node tests/run-all.js
*/
const { execFileSync } = require('child_process');
const path = require('path');

const suites = [
  ['harness.js',       'the site file parses and its script runs'],
  ['content.test.js',  'vocabulary and sentences are internally consistent'],
  ['practice.test.js', 'games, decoys, meetings and scoring behave'],
  ['routine.test.js',  'the daily routine and its midday draw'],
];

let failed = 0;
suites.forEach(([file, what]) => {
  console.log('\n-- ' + file + '  --  ' + what);
  try {
    const out = execFileSync(process.execPath, [path.join(__dirname, file)], { encoding: 'utf8' });
    console.log(out.trimEnd().split('\n').slice(-3).join('\n'));
  } catch (e) {
    failed++;
    console.log((e.stdout || '').trimEnd());
    console.log((e.stderr || '').trimEnd());
    console.log('^^ ' + file + ' FAILED');
  }
});

console.log('\n' + (failed ? failed + ' SUITE(S) FAILED — see above' : 'ALL SUITES PASSED'));
process.exit(failed ? 1 : 0);
