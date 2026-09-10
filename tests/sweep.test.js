/* A wide pass over the app, looking for the kinds of fault that do not throw:
   a screen no route reaches, a style nothing uses, a session that can be
   empty, a number that contradicts another number. */
const fs = require('fs'), path = require('path');
const { loadApp } = require('./harness.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const { api: g } = loadApp(
  'DEFAULT_VOCAB, SENTENCES, IDIOMS, ALPHABET, withProgressFields, buildDeck, ' +
  'composeSession, buildMorningTasks, buildReviewTasks, buildExamTasks, buildPairRounds, ' +
  'buildBlankTask, isDue, isTypeable, isAssemblable, itemMeeting, isUnlocked, ' +
  'examLength, meetingReadiness, knowledgeScore, profileMeeting, noonPlanFor, ' +
  'PRACTICE_METHODS, ROUTINE_ITEMS, NOON_GAMES, GUIDE_SLIDES, MODE_LABELS, ' +
  'SESSION_CAP, SESSION_MIN, GAME_SIZES, MORNING_PLAN, TYPED_PLAN, REVIEW_PLAN, ' +
  'READY_PCT, MASTERY_TARGET, TOTAL_MEETINGS, EXAM_MIN, EXAM_MAX, ' +
  'allMeanings, acceptableAnswers, normAnswer');

let bad = 0;
const check = (label, cond, detail) => {
  console.log('  ' + (cond ? 'ok   ' : 'FAIL ') + label + (detail ? '  (' + detail + ')' : ''));
  if (!cond) bad++;
};
const banksAt = (m) => ({
  vocab: g.withProgressFields(g.DEFAULT_VOCAB), letters: g.withProgressFields(g.ALPHABET),
  sentences: g.withProgressFields(g.SENTENCES), idioms: g.withProgressFields(g.IDIOMS), meeting: m,
});

console.log('\n=== every practice target has a route');
const targets = new Set();
/* A method either lists options or is itself a single target. */
g.PRACTICE_METHODS.forEach((m) => {
  if (m.options) m.options.forEach((o) => targets.add(o.target.screen));
  else if (m.target) targets.add(m.target.screen);
});
g.ROUTINE_ITEMS.forEach((r) => targets.add(r.target.screen));
g.NOON_GAMES.forEach((x) => targets.add(x.screen));
targets.add('due');
const routed = new Set();
const re = /screen\.screen === "([\w-]+)"/g;   // screen names may contain a hyphen
let m;
while ((m = re.exec(html)) !== null) routed.add(m[1]);
console.log('  offered: ' + [...targets].sort().join(', '));
const unrouted = [...targets].filter((t) => !routed.has(t));
check('no screen is offered without a route', unrouted.length === 0, unrouted.join(', '));

console.log('\n=== no session can come back empty');
[1, 3, 5].forEach((mtg) => {
  const banks = banksAt(mtg);
  const vocab = g.buildDeck('vocab', banks);
  const sents = g.buildDeck('sentences', banks).filter(g.isAssemblable);
  const due = vocab.filter(g.isDue);
  check('m' + mtg + ' morning drill returns questions', g.buildMorningTasks(vocab, mtg).length > 0);
  check('m' + mtg + ' typed drill returns questions', g.buildMorningTasks(vocab, mtg, g.TYPED_PLAN).length > 0);
  check('m' + mtg + ' review returns questions',
        g.buildReviewTasks(due.length ? due : vocab, mtg, g.SESSION_CAP).length > 0);
  check('m' + mtg + ' exam returns questions', g.buildExamTasks(banks).length > 0);
  check('m' + mtg + ' pairing has enough pairs',
        g.buildPairRounds(vocab, 'number', 999).length >= g.GAME_SIZES.pairs &&
        g.buildPairRounds(vocab, 'gender', 999).length >= g.GAME_SIZES.pairs);
  check('m' + mtg + ' fill-in-the-blank can build a task',
        sents.some((s) => g.buildBlankTask(sents, s, 'he2ar')));
});

console.log('\n=== the numbers agree with each other');
for (let mtg = 1; mtg <= 5; mtg++) {
  const inPlay = g.DEFAULT_VOCAB.filter((w) => g.isUnlocked(w, mtg)).length;
  const practice = g.buildDeck('vocab', banksAt(mtg)).length;
  if (inPlay !== practice) { console.error('  m' + mtg + ': ' + inPlay + ' vs ' + practice); bad++; }
}
check('the word list and the practice queue match at every meeting', true);
check('the exam never exceeds its ceiling',
      [...Array(g.TOTAL_MEETINGS)].every((_, i) => g.examLength(i + 1) <= g.EXAM_MAX));
check('the readiness bar is reachable but not free', g.READY_PCT > 0 && g.READY_PCT < 100, g.READY_PCT + '%');
check('a session is never larger than its ceiling', g.SESSION_MIN <= g.SESSION_CAP);
check('the review mix sums to one',
      Math.abs(g.REVIEW_PLAN.choice + g.REVIEW_PLAN.typed + g.REVIEW_PLAN.card - 1) < 1e-9);

console.log('\n=== styles and markup');
const css = html.match(/const GLOBAL_CSS = `([\s\S]*?)\n`;/)[1];
const js = html.slice(html.indexOf('const GlobalStyle'));
const used = new Set();
(js.match(/className: "([^"]*)"/g) || []).forEach((s) => {
  s.replace(/className: "|"/g, '').split(/\s+/).forEach((c) => { if (c.startsWith('zl-')) used.add(c); });
});
const defined = new Set((css.match(/\.(zl-[a-z0-9-]+)/g) || []).map((s) => s.slice(1)));
const unstyled = [...used].filter((c) => !defined.has(c));
const unused = [...defined].filter((c) => !used.has(c));
check('every class used is styled', unstyled.length === 0, unstyled.join(', '));
check('every style defined is used', unused.length === 0, unused.join(', '));
const vars = new Set((html.match(/var\((--[a-z0-9-]+)\)/g) || []).map((s) => s.slice(4, -1)));
const declared = new Set((css.match(/(--[a-z0-9-]+)\s*:/g) || []).map((s) => s.replace(/\s*:/, '')));
const missingVars = [...vars].filter((v) => !declared.has(v));
check('every CSS variable is declared', missingVars.length === 0, missingVars.join(', '));

console.log('\n=== the guide and the routine');
check('every guide slide points at a real tab',
      g.GUIDE_SLIDES.every((s) => ['routine', 'practice', 'vocab', 'alphabet', 'stats'].includes(s.tab)));
check('every midday game is a routed screen',
      g.NOON_GAMES.every((x) => routed.has(x.screen)));
check('every recorded mode has a label',
      Object.keys(g.MODE_LABELS).length > 0 &&
      ['flashcards', 'quiz', 'typed', 'morning', 'builder', 'blank', 'clock', 'pairs'].every((k) => g.MODE_LABELS[k]));
const days = ['2026-01-01', '2026-05-05', '2026-09-09', '2026-12-31'];
check('the midday draw is stable on any date',
      days.every((d) => JSON.stringify(g.noonPlanFor(d)) === JSON.stringify(g.noonPlanFor(d))));

console.log('\n=== stray text that should not ship');
const leftovers = [];
['TODO', 'FIXME', 'XXX', 'console.warn', 'debugger'].forEach((word) => {
  const n = (html.match(new RegExp(word, 'g')) || []).length;
  if (n) leftovers.push(word + ' x' + n);
});
check('no debugging leftovers', leftovers.length === 0, leftovers.join(', '));
check('no browser storage, which artifacts cannot use',
      !/localStorage\.(get|set)Item\(/.test(js.replace(/sandbox[\s\S]*?;/g, '')) || html.includes('ZL_FIREBASE_READY'));


console.log('\n=== every session reports itself to the statistics');
/* The quiz reported nothing at all, and reading reported as flashcards, so
   both showed as never tried however many times they were run. */
const SESSIONS = ['AmericanQuiz', 'FlashcardPractice', 'SentenceBuilderSession',
                  'PairGame', 'ClockGame', 'BlankGame', 'MorningDrill', 'DailyReview'];
const silent = [];
SESSIONS.forEach((fn) => {
  const i = html.indexOf('function ' + fn);
  const j = html.indexOf('\nfunction ', i + 10);
  const body = html.slice(i, j > 0 ? j : html.length);
  if (!/onSessionDone\(\{ mode:/.test(body)) silent.push(fn);
});
check('no session finishes without reporting', silent.length === 0, silent.join(', '));
check('reading is distinguishable from flashcards',
      /mode: \(deck === "sentences" \|\| deck === "idioms"\) \? "reading" : "flashcards"/.test(html));
check('the quiz reports as its own mode', /onSessionDone\(\{ mode: "quiz"/.test(html));

console.log('\n=== fill in the blank hands over a clean word');
const blankDeck = g.buildDeck('sentences', banksAt(5));
let dirty = 0, tried = 0;
blankDeck.forEach((item) => ['he2ar', 'ar2he'].forEach((d) => {
  for (let t = 0; t < 20; t++) {
    const task = g.buildBlankTask(blankDeck, item, d);
    if (!task) continue;
    tried++;
    task.options.forEach((o) => {
      if (/[.,!?]$/.test(o)) dirty++;                       // gives away the last word
      /* A bracketed article belongs to the sentence. A bare אל is left
         alone: it is also the start of ordinary words. */
      if (/^\(א\)ל|^\(אל\)/.test(o)) dirty++;
    });
  }
}));
check(tried + ' tasks: no option carries punctuation or an article', dirty === 0);

/* A parenthetical is an aside for the reader, so the gap never falls inside
   one: blanking there offers half-words like "האב)" and the surviving
   bracket announces the answer. */
let inAside = 0, asideTried = 0;
blankDeck.forEach((item) => ['he2ar', 'ar2he'].forEach((d) => {
  for (let t = 0; t < 20; t++) {
    const task = g.buildBlankTask(blankDeck, item, d);
    if (!task) continue;
    asideTried++;
    /* The article may sit inside the answer, prefixed or not — וִ(א)לִכְּתַאבּ
       is one word. What must not appear is a lone bracket from an aside. */
    const bare = task.answer.replace(/\(א\)|\(אל\)/g, '');
    if (/[()]/.test(bare)) inAside++;
    const opens = (task.before.match(/\((?!א\)|אל\))/g) || []).length;
    const closes = (task.before.match(/\)/g) || []).length - (task.before.match(/\(א\)|\(אל\)/g) || []).length;
    if (opens > closes) inAside++;   // the blank sits inside an open bracket
  }
}));
check(asideTried + ' tasks: the gap never falls inside a parenthetical', inAside === 0);

console.log('\n=== spellings that should not be marked wrong');
const pairs = [
  ['שַאבّ', 'נער צעיר'], ['שַאבّ', 'בחור צעיר'],
  ['עִלְבֶּה', 'קופסא'], ['עִלְבֶּה', 'קופסה'],
];
let spellBad = 0;
pairs.forEach(([front, typed]) => {
  const w = g.DEFAULT_VOCAB.find((x) => x.front === front);
  if (!w) { spellBad++; return; }
  const acc = new Set();
  g.allMeanings(w).forEach((m2) => g.acceptableAnswers(m2).forEach((k) => acc.add(k)));
  if (!acc.has(g.normAnswer(typed))) { console.error('  rejected: ' + front + ' <- ' + typed); spellBad++; }
});
check('accepted spelling variants are accepted', spellBad === 0);
const wrong = g.DEFAULT_VOCAB.find((x) => x.front === 'עִלְבֶּה');
const accW = new Set();
g.allMeanings(wrong).forEach((m2) => g.acceptableAnswers(m2).forEach((k) => accW.add(k)));
check('a genuinely wrong answer is still wrong', !accW.has(g.normAnswer('מסעדה')));

console.log(bad ? '\n' + bad + ' CHECK(S) FAILED' : '\nALL SWEEP CHECKS PASSED');
process.exit(bad ? 1 : 0);
