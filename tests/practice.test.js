/* Tests the machinery behind the practice modes, as opposed to the content:
   the games, the sentence decoys, the meeting split, the knowledge model and
   the morning drill. Each section covers a rule that was argued over and
   settled, so a future change that quietly breaks one is caught. */
const { loadApp } = require('./harness.js');

const { api: g } = loadApp(
  'buildPairRounds, buildBlankTask, pickDecoys, decoyCount, buildDeck, weightedOrder, ' +
  'composeSession, meetingShares, itemWeight, itemMeeting, isUnlocked, profileMeeting, ' +
  'meetingReadiness, knowledgeScore, answerCredit, netScore, progressPct, isMastered, ' +
  'scheduleNext, withProgressFields, isAssemblable, buildMorningTasks, isTypeable, ' +
  'DEFAULT_VOCAB, ALPHABET, SENTENCES, IDIOMS, GAME_SIZES, MORNING_PLAN, ' +
  'SESSION_CAP, SESSION_MIN, READY_PCT, TOTAL_MEETINGS, MASTERY_TARGET');

const DAY = 86400000;
let bad = 0;
const check = (label, cond, detail) => {
  console.log('  ' + (cond ? 'ok   ' : 'FAIL ') + label + (detail ? '  (' + detail + ')' : ''));
  if (!cond) bad++;
};
const banksAt = (m) => ({
  vocab: g.withProgressFields(g.DEFAULT_VOCAB), letters: g.withProgressFields(g.ALPHABET),
  sentences: g.withProgressFields(g.SENTENCES), idioms: g.withProgressFields(g.IDIOMS), meeting: m,
});

console.log('\n=== pairing games');
['number', 'gender'].forEach((kind) => {
  const vocab = g.buildDeck('vocab', banksAt(g.TOTAL_MEETINGS));
  const all = g.buildPairRounds(vocab, kind, 999);
  let problems = 0;
  all.forEach((r) => {
    if (!r.left || !r.right || r.left.id === r.right.id) { problems++; return; }
    if (kind === 'number') {
      if (r.left.form !== 'יחיד' || r.right.form !== 'רבים') problems++;
      if (!(r.left.pair || []).includes(r.right.id)) problems++;
    } else {
      if (r.left.gender !== 'm' || r.right.gender !== 'f') problems++;
      if (r.left.mate !== r.right.id || r.right.mate !== r.left.id) problems++;
    }
  });
  check(kind + ': ' + all.length + ' pairs, all well formed', problems === 0);
  let dupes = 0;
  for (let t = 0; t < 200; t++) {
    const round = g.buildPairRounds(vocab, kind, g.GAME_SIZES.pairs);
    const ids = round.flatMap((r) => [r.left.id, r.right.id]);
    if (new Set(ids).size !== ids.length || round.length !== g.GAME_SIZES.pairs) dupes++;
  }
  check(kind + ': 200 rounds with no repeated tile', dupes === 0);
});

console.log('\n=== fill in the blank');
const sentences = g.buildDeck('sentences', banksAt(g.TOTAL_MEETINGS));
let blankFaults = 0, built = 0;
sentences.forEach((item) => {
  ['he2ar', 'ar2he'].forEach((dir) => {
    for (let t = 0; t < 40; t++) {
      const task = g.buildBlankTask(sentences, item, dir);
      if (!task) continue;
      built++;
      if (task.options.filter((o) => o === task.answer).length !== 1) blankFaults++;
      if (new Set(task.options).size !== task.options.length) blankFaults++;
      const rebuilt = [task.before, task.answer, task.after].filter(Boolean).join(' ');
      if (rebuilt !== (dir === 'he2ar' ? item.arabic : item.hebrew)) blankFaults++;
    }
  });
});
check(built + ' tasks: answer present once, no duplicates, sentence rebuilds', blankFaults === 0);

console.log('\n=== sentence decoys');
const pool = sentences.filter(g.isAssemblable);
let decoyFaults = 0, longMax = 0, shortMax = 0;
pool.forEach((item) => {
  ['he2ar', 'ar2he'].forEach((dir) => {
    const answer = (dir === 'he2ar' ? item.arabic : item.hebrew).split(' ');
    for (let t = 0; t < 60; t++) {
      const d = g.pickDecoys(item, dir, pool, answer);
      if (d.some((x) => answer.includes(x))) decoyFaults++;
      if (new Set(d).size !== d.length) decoyFaults++;
      const cap = answer.length > 4 ? 2 : 4;
      if (d.length < 1 || d.length > cap) decoyFaults++;
      if (answer.length > 4) longMax = Math.max(longMax, d.length);
      else shortMax = Math.max(shortMax, d.length);
    }
  });
});
check('no decoy ever duplicates a needed word', decoyFaults === 0);
check('long sentences capped at two decoys', longMax <= 2, 'max ' + longMax);
check('short sentences can reach four', shortMax === 4, 'max ' + shortMax);

console.log('\n=== meetings');
[1, 2, 3].forEach((m) => {
  const v = g.buildDeck('vocab', banksAt(m));
  check('meeting ' + m + ' opens ' + v.length + ' words, none from later',
        v.every((w) => g.itemMeeting(w) <= m));
});
check('letters and idioms are never locked',
      g.buildDeck('letters', banksAt(1)).length === g.ALPHABET.length &&
      g.buildDeck('idioms', banksAt(1)).length === g.IDIOMS.length);
const one = new Set(g.buildDeck('vocab', banksAt(1)).map((d) => d._key));
const two = new Set(g.buildDeck('vocab', banksAt(2)).map((d) => d._key));
check('opening a meeting only ever adds', [...one].every((k) => two.has(k)) && two.size > one.size);
const noMeeting = { ...banksAt(2) }; delete noMeeting.meeting;
check('a missing setting shows everything rather than nothing',
      g.buildDeck('vocab', noMeeting).length === g.DEFAULT_VOCAB.length);
check('defaults to meeting 1', g.profileMeeting(null) === 1 && g.profileMeeting({ meeting: 99 }) === 1);

console.log('\n=== the split between meetings');
[1, 2, 3, 4, 5].forEach((n) => {
  const s = g.meetingShares(new Array(n).fill(0));
  const pct = s.map((x) => Math.round(x * 100));
  if (n === 2) check('two open -> 67/33', pct[0] === 67 && pct[1] === 33, pct.join('/'));
  if (n === 3) check('three open -> 57/29/14', pct.join('/') === '57/29/14', pct.join('/'));
  if (n > 1) {
    const halving = s.every((x, i) => i === 0 || Math.abs(x * 2 - s[i - 1]) < 1e-9);
    check(n + ' open: each step back is half the one before', halving);
  }
});

console.log('\n=== spacing still outranks novelty');
const at = 3;
const overdue = { id: 1, meeting: 1, correctCount: 1, wrongCount: 2, dueAt: Date.now() - 21 * DAY };
const brandNew = { id: 2, meeting: at, correctCount: 0, wrongCount: 0 };
const untouchedOld = { id: 3, meeting: 1, correctCount: 0, wrongCount: 0 };
check('a long-overdue old word beats new material',
      g.itemWeight(overdue, at) > g.itemWeight(brandNew, at),
      g.itemWeight(overdue, at).toFixed(2) + ' vs ' + g.itemWeight(brandNew, at).toFixed(2));
check('among untouched words the current meeting comes first',
      g.itemWeight(brandNew, at) > g.itemWeight(untouchedOld, at));

console.log('\n=== the session follows the queue');
const sessionFor = (due) => (due > 0 ? Math.max(g.SESSION_MIN, Math.min(g.SESSION_CAP, due)) : g.SESSION_MIN);
check('floor ' + g.SESSION_MIN + ', ceiling ' + g.SESSION_CAP,
      sessionFor(0) === g.SESSION_MIN && sessionFor(300) === g.SESSION_CAP && sessionFor(17) === 17);

console.log('\n=== what an answer is worth');
check('recall is double recognition', g.answerCredit('typed') === 2 * g.answerCredit('choice'));
check('a sentence counts as recall', g.answerCredit('sentence') === 2);
check('an unknown kind falls back to 1', g.answerCredit('whatever') === 1);
const solid = { correctCount: g.MASTERY_TARGET, wrongCount: 0 };
const slipped = { correctCount: g.MASTERY_TARGET, wrongCount: 1 };
check('one slip sets back but does not reset',
      g.progressPct(slipped) > 0 && g.progressPct(slipped) < g.progressPct(solid),
      g.progressPct(solid) + '% -> ' + g.progressPct(slipped) + '%');

console.log('\n=== the knowledge score moves');
const deck = g.withProgressFields(g.DEFAULT_VOCAB);
check('a fresh deck reads 0%', g.knowledgeScore(deck) === 0);
const known = deck.map((w) => ({ ...w, correctCount: g.MASTERY_TARGET, wrongCount: 0 }));
check('a fully known deck reads 100%', g.knowledgeScore(known) === 100);
const partial = deck.map((w) => ({ ...w, correctCount: 2, wrongCount: 0 }));
check('partial learning shows as partial',
      g.knowledgeScore(partial) > 20 && g.knowledgeScore(partial) < 50, g.knowledgeScore(partial) + '%');
check('an untouched meeting is not ready', !g.meetingReadiness(deck, [], 1).ready);

console.log('\n=== the morning drill');
const vdeck = g.buildDeck('vocab', banksAt(3));
let mFaults = 0, choice = 0, typed = 0;
for (let t = 0; t < 200; t++) {
  const tasks = g.buildMorningTasks(vdeck, 3);
  const opens = tasks.filter((x) => x.open);
  choice += tasks.length - opens.length;
  typed += opens.length;
  if (opens.some((x) => !g.isTypeable(x.item))) mFaults++;
  const keys = tasks.map((x) => x.item._key);
  if (new Set(keys).size !== keys.length) mFaults++;
}
check('no untypeable word is asked open, no word repeats', mFaults === 0);
check('the mix is ' + g.MORNING_PLAN.choice + ' choice and ' + g.MORNING_PLAN.typed + ' typed',
      Math.round(choice / 200) === g.MORNING_PLAN.choice && Math.round(typed / 200) === g.MORNING_PLAN.typed,
      (choice / 200).toFixed(1) + ' / ' + (typed / 200).toFixed(1));

console.log(bad ? '\n' + bad + ' CHECK(S) FAILED' : '\nALL PRACTICE CHECKS PASSED');
process.exit(bad ? 1 : 0);
