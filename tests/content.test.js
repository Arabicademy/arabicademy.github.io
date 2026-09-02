/* A sweep over the content looking for faults that never throw an error but
   do teach the wrong thing: a plural card carrying its singular's meaning, a
   link that points nowhere, two cards a learner cannot tell apart, a final
   letter carrying a vowel where the construct state wants a plain one.

   Every one of these has caught a real mistake at least once. */
const { loadApp } = require('./harness.js');

const { api: g } = loadApp(
  'DEFAULT_VOCAB, ALPHABET, SENTENCES, IDIOMS, withProgressFields, buildDeck, ' +
  'buildQuestion, isAssemblable, itemMeeting, allMeanings, normAnswer, ' +
  'acceptableAnswers, TOTAL_MEETINGS');

const V = g.DEFAULT_VOCAB, S = g.SENTENCES, L = g.ALPHABET, I = g.IDIOMS;
const byId = new Map(V.map((w) => [w.id, w]));
let issues = 0;
const report = (label, list, show) => {
  const cap = show === undefined ? 8 : show;
  console.log('\n' + label + ': ' + list.length);
  list.slice(0, cap).forEach((x) => console.log('   ' + x));
  if (list.length > cap) console.log('   ... and ' + (list.length - cap) + ' more');
  issues += list.length;
};

// 1. a plural card whose Hebrew is identical to its singular's
const sameSense = [];
V.forEach((w) => {
  if (w.form !== 'רבים') return;
  (w.pair || []).forEach((p) => {
    const s = byId.get(p);
    if (s && s.form === 'יחיד' && s.back === w.back) {
      sameSense.push(w.front + '  "' + w.back + '"  (meeting ' + w.meeting + ')');
    }
  });
});
report('plural cards carrying the singular translation', sameSense);

// 2. links that point nowhere or are not mutual
const badLinks = [];
V.forEach((w) => {
  (w.pair || []).forEach((p) => {
    const o = byId.get(p);
    if (!o) badLinks.push(w.front + ' -> missing id ' + p);
    else if (!(o.pair || []).includes(w.id)) badLinks.push(w.front + ' -> ' + o.front + ' not mutual');
  });
  if (w.mate) {
    const o = byId.get(w.mate);
    if (!o) badLinks.push(w.front + ' -> missing mate');
    else if (o.mate !== w.id) badLinks.push(w.front + ' mate not mutual');
    else if (o.gender === w.gender) badLinks.push(w.front + ' mated to same gender');
  }
});
report('broken or one-way links', badLinks);

// 3. two cards a learner cannot tell apart
const byFront = new Map();
V.forEach((w) => { if (!byFront.has(w.front)) byFront.set(w.front, []); byFront.get(w.front).push(w); });
const collisions = [];
byFront.forEach((list, front) => {
  if (list.length > 1) collisions.push(front + '  ' + list.map((x) => '"' + x.back + '" (m' + x.meeting + ')').join(' / '));
});
report('same spelling, different card', collisions);

// 4. ids, meetings and required fields
const structural = [];
const seen = new Set();
V.forEach((w) => {
  if (seen.has(w.id)) structural.push('duplicate id ' + w.id);
  seen.add(w.id);
  if (!w.front || !w.back) structural.push('id ' + w.id + ' missing a side');
  if (!w.topic) structural.push(w.front + ' has no topic');
  const m = g.itemMeeting(w);
  if (m < 1 || m > g.TOTAL_MEETINGS) structural.push(w.front + ' meeting ' + m);
  if (w.form && w.form !== 'יחיד' && w.form !== 'רבים') structural.push(w.front + ' odd form ' + w.form);
});
const sIds = new Set();
S.forEach((s) => {
  if (sIds.has(s.id)) structural.push('duplicate sentence id ' + s.id);
  sIds.add(s.id);
  if (!s.hebrew || !s.arabic) structural.push('sentence ' + s.id + ' missing a side');
});
report('structural problems', structural);

// 5. multiple choice that cannot be answered
const banks = { vocab: g.withProgressFields(V), letters: g.withProgressFields(L),
                sentences: g.withProgressFields(S), idioms: g.withProgressFields(I),
                meeting: g.TOTAL_MEETINGS };
const quizFaults = [];
['vocab', 'letters', 'idioms'].forEach((kind) => {
  g.buildDeck(kind, banks).forEach((item) => {
    ['ar2he', 'he2ar'].forEach((dir) => {
      const q = g.buildQuestion(g.buildDeck(kind, banks), item, dir);
      if (q.options.indexOf(q.correctAnswer) < 0) quizFaults.push(kind + ' ' + item.front + ' missing answer');
      if (new Set(q.options).size !== q.options.length) quizFaults.push(kind + ' ' + item.front + ' duplicate option');
      if (q.options.length < 2) quizFaults.push(kind + ' ' + item.front + ' too few options');
    });
  });
});
report('unanswerable multiple-choice questions', quizFaults);

// 6. words with no typeable answer — always asked as multiple choice
const untypeable = [];
V.forEach((w) => {
  if (!g.allMeanings(w).some((m) => g.normAnswer(m).length >= 2)) {
    untypeable.push(w.front + ' -> "' + w.back + '"  (expected: always multiple choice)');
  }
});
report('words with no typeable answer', untypeable);

// 7. a final letter carrying a vowel.
//    In the construct state the book keeps the plain letter, so a final form
//    with a vowel under it is usually a slip. A few are genuine and are
//    listed to be eyeballed, not trusted.
const FINALS = 'ךםןףץ';
const isMark = (c) => /[\u0591-\u05C7\u0610-\u065F]/.test(c);
const finalWithVowel = [];
const scan = (text, where) => {
  String(text || '').split(' ').forEach((word) => {
    for (let i = 0; i < word.length - 1; i++) {
      if (FINALS.includes(word[i]) && isMark(word[i + 1])) { finalWithVowel.push(word + '   (' + where + ')'); return; }
    }
  });
};
S.forEach((s) => scan(s.arabic, 'sentence ' + s.id));
V.forEach((w) => scan(w.front, 'word ' + w.id));
report('final letters carrying a vowel — check by eye', finalWithVowel, 12);

// 8. a card whose grammatical form disagrees with its translation.
//    Hebrew has singulars that end like plurals and words that are plural by
//    nature, so shapes that cannot be judged mechanically are exclu
