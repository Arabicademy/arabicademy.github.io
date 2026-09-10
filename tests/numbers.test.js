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


/* ---- tracking, and where numbers sit in the day ---- */
const { api: h } = loadApp(
  'numberBand, NUM_BANDS, creditBand, bandScore, numbersKnowledge, numberShare, ' +
  'buildNumberExamTasks, buildExamTasks, withProgressFields, DEFAULT_VOCAB, ' +
  'ALPHABET, SENTENCES, IDIOMS, ROUTINE_ITEMS, EVENING_NUMBERS, eveningNumberFor, ' +
  'NOON_GAMES, examCategoryMeta');

console.log('\n=== every number falls in exactly one band');
let unbanded = 0;
for (let n = 1; n <= 999; n++) {
  const band = h.numberBand(n);
  if (!h.NUM_BANDS.some((b) => b.key === band)) unbanded++;
}
check('all 999 are classified', unbanded === 0);
console.log('   ' + [3, 15, 40, 700, 47].map((n) => n + '→' + h.numberBand(n)).join('  '));

console.log('\n=== a band is credited the way a word is');
let prof = null;
for (let i = 0; i < 6; i++) prof = { numberStats: h.creditBand(prof, 'ones', true) };
check('six right answers make a band known', h.bandScore(prof.numberStats, 'ones') === 100);
prof = { numberStats: h.creditBand(prof, 'ones', false) };
check('a wrong answer sets it back', h.bandScore(prof.numberStats, 'ones') < 100,
      h.bandScore(prof.numberStats, 'ones') + '%');
check('an untouched band reads zero', h.bandScore(prof.numberStats, 'hundreds') === 0);

console.log('\n=== the exam gives numbers less room as they are learned');
let expert = null;
['ones','teens','tens','hundreds','composed','ordinals'].forEach((b) => {
  for (let i = 0; i < 8; i++) expert = { numberStats: h.creditBand(expert, b, true) };
});
const noviceShare = Math.round(h.numberShare(null) * 100);
const expertShare = Math.round(h.numberShare(expert) * 100);
console.log('   knowing none: ' + noviceShare + '%   knowing all: ' + expertShare + '%');
check('a beginner sees about a tenth', noviceShare === 10);
check('someone who knows them sees far less', expertShare <= 4);
check('the share only ever falls', noviceShare > expertShare);

const banksFive = {
  vocab: h.withProgressFields(h.DEFAULT_VOCAB), letters: h.withProgressFields(h.ALPHABET),
  sentences: h.withProgressFields(h.SENTENCES), idioms: h.withProgressFields(h.IDIOMS), meeting: 5,
};
let nq = 0, tot = 0, malformed = 0;
for (let t = 0; t < 40; t++) {
  const ts = h.buildExamTasks(banksFive, null);
  tot += ts.length;
  ts.filter((x) => x.kind === 'number').forEach((x) => {
    nq++;
    if (x.numberKind === 'ordinal') {
      if (!x.task || x.task.options.indexOf(x.task.answer) < 0) malformed++;
    } else if (!x.value || x.value < 1 || x.value > 999) malformed++;
    if (!x.band) malformed++;
  });
}
check('number questions in the exam are well formed', malformed === 0);
check('and they are about a tenth of the paper', Math.abs(nq / tot * 100 - 10) < 3,
      (nq / tot * 100).toFixed(0) + '%');
check('the category has a label', h.examCategoryMeta('number').label === 'מספרים');

console.log('\n=== numbers in the evening');
const evening = h.ROUTINE_ITEMS.find((r) => r.key === 'evening');
check('the evening still starts with sentence assembly', evening.target.screen === 'builder');
check('and carries a second part', !!evening.second);
check('the second part is drawn from the number drills', h.EVENING_NUMBERS.length === 3);
check('ordering is not among them — it is a game now',
      !h.EVENING_NUMBERS.some((x) => x.screen === 'num-order') &&
      h.NOON_GAMES.some((x) => x.screen === 'num-order'));
const day = '2026-09-10';
check('the evening draw is fixed for the day',
      JSON.stringify(h.eveningNumberFor(day)) === JSON.stringify(h.eveningNumberFor(day)));
const seen = new Set();
for (let d = 1; d <= 60; d++) seen.add(h.eveningNumberFor('2026-09-' + String(d % 28 + 1).padStart(2, '0')).label);
check('all three come up over two months', seen.size === 3, Array.from(seen).join(', '));

console.log(bad ? '\n' + bad + ' CHECK(S) FAILED' : '\nALL NUMBER CHECKS PASSED');
process.exit(bad ? 1 : 0);
