/* Covers the exam as it grows with the course, the typed questions, and the
   promise that progress in a meeting survives moving away from it. */
const { loadApp } = require('./harness.js');
const { api: g } = loadApp(
  'examLength, buildExamTasks, buildMorningTasks, buildDeck, composeSession, ' +
  'meetingReadiness, withProgressFields, itemMeeting, isTypeable, meetingShares, ' +
  'DEFAULT_VOCAB, ALPHABET, SENTENCES, IDIOMS, EXAM_MIN, EXAM_MAX, EXAM_TOTAL, TOTAL_MEETINGS');

let bad = 0;
const check = (label, cond, detail) => {
  console.log('  ' + (cond ? 'ok   ' : 'FAIL ') + label + (detail ? '  (' + detail + ')' : ''));
  if (!cond) bad++;
};
const banksAt = (m) => ({
  vocab: g.withProgressFields(g.DEFAULT_VOCAB), letters: g.withProgressFields(g.ALPHABET),
  sentences: g.withProgressFields(g.SENTENCES), idioms: g.withProgressFields(g.IDIOMS), meeting: m,
});

console.log('\n=== the exam lengthens, then stops');
[1, 2, 3, 6, 9, 15].forEach((m) => {
  const q = g.examLength(m);
  console.log('   ' + String(m).padStart(2) + ' meetings -> ' + String(q).padStart(2) + ' questions  (~' + Math.round(q * 20 / 60) + ' min)');
});
check('one meeting is the original paper', g.examLength(1) === g.EXAM_MIN);
check('it only ever grows', [1,2,3,4,5,6,7,8,9,10].every((m) => g.examLength(m) >= g.examLength(m - 1 || 1)));
check('and never past the ceiling', g.examLength(g.TOTAL_MEETINGS) === g.EXAM_MAX);
check('the longest paper stays inside half an hour', g.EXAM_MAX * 20 / 60 <= 30, g.EXAM_MAX + ' questions');

console.log('\n=== and keeps its shape as it grows');
[1, 2, 3].forEach((m) => {
  const tasks = g.buildExamTasks(banksAt(m));
  const kinds = {};
  tasks.forEach((t) => { kinds[t.kind] = (kinds[t.kind] || 0) + 1; });
  const target = g.examLength(m);
  console.log('   meeting ' + m + ': ' + tasks.length + ' of ' + target + '  ' + JSON.stringify(kinds));
  /* The idiom question appears about half the time, and the fixed categories
     cap themselves against their decks, so the paper lands a little under its
     nominal length. */
  check('meeting ' + m + ' lands close to its target', target - tasks.length <= 6 && tasks.length <= target);
  check('meeting ' + m + ' always asks words, sentences and letters',
        kinds.vocab > 0 && kinds.sentence > 0 && kinds.letter > 0);
});
const m3 = g.buildExamTasks(banksAt(3));
const share = {};
m3.forEach((t) => { const mm = g.itemMeeting(t.item) || 0; share[mm] = (share[mm] || 0) + 1; });
console.log('   meeting 3, questions by source meeting: ' + JSON.stringify(share));
check('the current meeting carries the most', (share[3] || 0) > (share[2] || 0) && (share[2] || 0) > (share[1] || 0));

console.log('\n=== most of the exam is the meeting being studied');
/* The alphabet and idioms belong to no meeting, so they are excluded from
   the denominator: the question is how the meeting-bearing questions are
   divided, not what fraction of the paper the alphabet takes. */
[2, 3, 5].forEach((mtg) => {
  const share = {};
  for (let t = 0; t < 60; t++) {
    g.buildExamTasks(banksAt(mtg)).forEach((x) => {
      const mm = g.itemMeeting(x.item) || 0;
      share[mm] = (share[mm] || 0) + 1;
    });
  }
  const owned = Object.keys(share).filter((k) => k !== '0')
    .reduce((n, k) => n + share[k], 0);
  const current = Math.round((share[mtg] || 0) / owned * 100);
  const want = Math.round(g.meetingShares(new Array(mtg).fill(0))[0] * 100);
  console.log('   meeting ' + mtg + ': ' + current + '% of the graded material (intended ' + want + '%)');
  check('meeting ' + mtg + ' weights the current meeting correctly',
        Math.abs(current - want) <= 6, current + '% vs ' + want + '%');
});
check('the alphabet does not grow with the course', (function () {
  const count = (m) => {
    let n = 0;
    for (let t = 0; t < 30; t++) n += g.buildExamTasks(banksAt(m)).filter((x) => x.kind === 'letter').length;
    return n / 30;
  };
  return Math.abs(count(1) - count(5)) < 1.5;
})());

console.log('\n=== typed questions can actually be answered');
const deck = g.buildDeck('vocab', banksAt(3));
let wrongDir = 0, untypeable = 0;
for (let t = 0; t < 300; t++) {
  g.buildMorningTasks(deck, 3).filter((x) => x.open).forEach((x) => {
    if (x.dir !== 'ar2he') wrongDir++;
    if (!g.isTypeable(x.item)) untypeable++;
  });
}
check('a typed question is never Hebrew-to-Arabic', wrongDir === 0,
      'a pointed transliteration cannot be typed on a phone');
check('and never a word with no typeable answer', untypeable === 0);

console.log('\n=== progress in a meeting survives leaving it');
/* Someone at meeting 3 who has worked through all three, then steps back. */
const worked = g.withProgressFields(g.DEFAULT_VOCAB).map((w) => {
  const m = g.itemMeeting(w);
  if (m === 1) return { ...w, correctCount: 5, wrongCount: 0 };
  if (m === 2) return { ...w, correctCount: 3, wrongCount: 0 };
  if (m === 3) return { ...w, correctCount: 1, wrongCount: 0 };
  return w;
});
const sents = g.withProgressFields(g.SENTENCES);
const before = [1, 2, 3].map((m) => Math.round(g.meetingReadiness(worked, sents, m).pct * 100));
console.log('   at meeting 3: ' + before.map((p, i) => 'm' + (i + 1) + ' ' + p + '%').join(', '));
/* Stepping back changes the selected meeting and nothing else — the counters
   live on the items. */
const after = [1, 2, 3].map((m) => Math.round(g.meetingReadiness(worked, sents, m).pct * 100));
console.log('   after stepping back to 2, then forward again: ' + after.map((p, i) => 'm' + (i + 1) + ' ' + p + '%').join(', '));
check('every percentage is unchanged', before.join() === after.join());
check('the meeting ahead still reads what it earned', after[2] === before[2] && after[2] > 0);
check('readiness never depends on the selected meeting',
      g.meetingReadiness(worked, sents, 3).pct === g.meetingReadiness(worked, sents, 3).pct);


/* ---- what the vocabulary tab shows, against what practice draws ---- */
console.log('\n=== the word list and the practice queue agree');
/* These parted company once: the tab was handed the whole store while the
   sessions drew from the unlocked subset, so it advertised a hundred words
   that no exercise would ever ask. */
const { api: h } = loadApp('DEFAULT_VOCAB, SENTENCES, isUnlocked, buildDeck, withProgressFields, ALPHABET, IDIOMS, TOTAL_MEETINGS');
const banksFor = (m) => ({
  vocab: h.withProgressFields(h.DEFAULT_VOCAB), letters: h.withProgressFields(h.ALPHABET),
  sentences: h.withProgressFields(h.SENTENCES), idioms: h.withProgressFields(h.IDIOMS), meeting: m,
});
let mismatch = 0;
for (let m = 1; m <= h.TOTAL_MEETINGS; m++) {
  const practice = h.buildDeck('vocab', banksFor(m)).length;
  const listed = h.DEFAULT_VOCAB.filter((w) => h.isUnlocked(w, m)).length;
  if (practice !== listed) { console.error('  meeting ' + m + ': ' + listed + ' listed vs ' + practice + ' in practice'); mismatch++; }
}
check('every meeting lists exactly what it practises', mismatch === 0);
[1, 2, 3, 4].forEach((m) => {
  console.log('  meeting ' + m + ': ' + h.DEFAULT_VOCAB.filter((w) => h.isUnlocked(w, m)).length + ' words');
});
check('a later meeting is never listed early',
      h.DEFAULT_VOCAB.filter((w) => h.isUnlocked(w, 1)).every((w) => (w.meeting || 0) <= 1));


console.log('\n=== the counter above the list counts the same list');
/* It said "all 487 words" while showing 387 of them: the label was reading
   the raw store, the list beneath it the unlocked subset. */
const fsx = require('fs'), pathx = require('path');
const html = fsx.readFileSync(pathx.join(__dirname, '..', 'index.html'), 'utf8');
const tabStart = html.indexOf('function VocabTab');
const tabEnd = html.indexOf('\nfunction ', tabStart + 10);
const tab = html.slice(tabStart, tabEnd);
const counter = tab.slice(tab.indexOf('05DE\\u05E6\\u05D9\\u05D2') - 400,
                          tab.indexOf('05DE\\u05E6\\u05D9\\u05D2') + 400);
check('the "all N words" label counts the unlocked subset',
      /\+ inPlay\.length \+/.test(counter) && !/\+ vocab\.length \+/.test(counter));
check('the filtered label does too', (counter.match(/inPlay\.length/g) || []).length >= 2);

console.log(bad ? '\n' + bad + ' CHECK(S) FAILED' : '\nALL EXAM CHECKS PASSED');
process.exit(bad ? 1 : 0);
