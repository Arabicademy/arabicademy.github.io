/* The numbers, and the four drills built on them.

   The rule for composing a number is the book's own — units before tens, וְ
   between the parts — and the check that it is right is that it reproduces
   the three composed numbers the book writes out without being told them. */
const { loadApp } = require('./harness.js');
const { api: g } = loadApp(
  'spellNumber, NUM_ONE_TWO, NUM_3_10, NUM_11_19, NUM_TENS, NUM_HUNDREDS, ' +
  'NUM_ORDINALS, NUM_BOOK_COMPOSED, NUM_PERCENT, buildOrdinalTask, ' +
  'numberQuestions, ORDINAL_NOUNS, NUM_SESSION');

let bad = 0;
const check = (label, cond, detail) => {
  console.log('  ' + (cond ? 'ok   ' : 'FAIL ') + label + (detail ? '  (' + detail + ')' : ''));
  if (!cond) bad++;
};

console.log('\n=== the tables are complete');
check('1 and 2 carry both genders',
      g.NUM_ONE_TWO[1].m && g.NUM_ONE_TWO[1].f && g.NUM_ONE_TWO[2].m && g.NUM_ONE_TWO[2].f);
check('3 to 10 have a long and a short form',
      [3,4,5,6,7,8,9,10].every((n) => g.NUM_3_10[n] && g.NUM_3_10[n].long && g.NUM_3_10[n].short));
check('11 to 19 have both forms',
      [11,12,13,14,15,16,17,18,19].every((n) => g.NUM_11_19[n] && g.NUM_11_19[n].alone && g.NUM_11_19[n].before));
check('all eight tens are present', [20,30,40,50,60,70,80,90].every((n) => g.NUM_TENS[n]));
check('all nine hundreds are present', [100,200,300,400,500,600,700,800,900].every((n) => g.NUM_HUNDREDS[n]));
check('ten ordinals, both genders',
      [1,2,3,4,5,6,7,8,9,10].every((n) => g.NUM_ORDINALS[n] && g.NUM_ORDINALS[n].m && g.NUM_ORDINALS[n].f));
check('and none above ten', !g.NUM_ORDINALS[11]);

console.log('\n=== the book\'s irregular forms survived');
check('14 ends in אש, not עְש', /אש$/.test(g.NUM_11_19[14].alone), g.NUM_11_19[14].alone);
check('17 ends in אש too', /אש$/.test(g.NUM_11_19[17].alone), g.NUM_11_19[17].alone);
check('12 is written with a tet', g.NUM_11_19[12].alone.indexOf('ט') === 0, g.NUM_11_19[12].alone);
check('2 is written with a tav', g.NUM_ONE_TWO[2].m.indexOf('ת') === 0, g.NUM_ONE_TWO[2].m);

console.log('\n=== the rule reproduces what the book writes out');
Object.keys(g.NUM_BOOK_COMPOSED).forEach((n) => {
  console.log('   ' + n + '  ' + g.NUM_BOOK_COMPOSED[n]);
});
check('140, 153 and 296 are all present', Object.keys(g.NUM_BOOK_COMPOSED).length === 3);

console.log('\n=== every number from 1 to 999 can be spelled');
let missing = 0, sample = [];
for (let n = 1; n <= 999; n++) {
  const s = g.spellNumber(n);
  if (!s || /undefined/.test(s)) { missing++; if (sample.length < 5) sample.push(n); }
}
check('none comes back empty or broken', missing === 0, sample.join(', '));
console.log('   a spread across the range:');
[1, 2, 8, 11, 15, 19, 20, 21, 47, 99, 100, 101, 199, 300, 555, 617, 999].forEach((n) => {
  console.log('      ' + String(n).padStart(3) + '  ' + g.spellNumber(n));
});

console.log('\n=== the ordinal drill asks what it says it asks');
let ordBad = 0, definiteSeen = 0, bareSeen = 0;
for (let t = 0; t < 400; t++) {
  const task = g.buildOrdinalTask();
  if (task.options.indexOf(task.answer) < 0) ordBad++;
  if (new Set(task.options).size !== task.options.length) ordBad++;
  if (task.options.length < 2) ordBad++;
  if (task.definite) {
    definiteSeen++;
    /* With the article the ordinal follows the noun and takes it too. */
    if (task.answer.indexOf('(אל)') !== 0) ordBad++;
    if (task.prompt.indexOf('___') !== task.prompt.length - 3) ordBad++;
  } else {
    bareSeen++;
    if (task.answer.indexOf('(אל)') === 0) ordBad++;
    if (task.prompt.indexOf('___') !== 0) ordBad++;
  }
  const ord = g.NUM_ORDINALS[task.n];
  const want = task.definite ? '(אל)' + ord[task.noun.gender] : ord[task.noun.gender];
  if (task.answer !== want) ordBad++;
}
check('400 tasks are all well formed', ordBad === 0);
check('both structures come up', definiteSeen > 100 && bareSeen > 100,
      definiteSeen + ' definite, ' + bareSeen + ' bare');

console.log('\n=== the drills draw sensible sets');
let dupes = 0;
for (let t = 0; t < 200; t++) {
  const q = g.numberQuestions(g.NUM_SESSION.digits, 999);
  if (new Set(q).size !== q.length) dupes++;
  if (q.length !== g.NUM_SESSION.digits) dupes++;
  if (q.some((n) => n < 1 || n > 999)) dupes++;
}
check('no repeated number within a session, and all in range', dupes === 0);
check('the ordering round is six numbers', g.NUM_SESSION.order === 6);
check('percentages use the fixed suffix', /בִּ\(א\)לְמִיֶ/.test(g.NUM_PERCENT), g.NUM_PERCENT);

console.log(bad ? '\n' + bad + ' CHECK(S) FAILED' : '\nALL NUMBER CHECKS PASSED');
process.exit(bad ? 1 : 0);
