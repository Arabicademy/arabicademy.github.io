/* Every card whose Hebrew could be written a second, equally correct way.

   Hebrew tolerates both a full and a defective spelling for a great many
   words — רשיון and רישיון, חנות and חנויות, מעונין and מעוניין. Marking one
   wrong because the card happens to store the other is testing orthography,
   not vocabulary, and it is the single most annoying way for this app to be
   wrong.

   This walks the whole store and reports every card that holds a word from a
   known variant family but does not accept its twin. */
const { loadApp } = require('./harness.js');
const { api: g } = loadApp('DEFAULT_VOCAB, acceptableAnswers, normAnswer, SPELLING_VARIANTS');

/* The yod that Hebrew writes or drops. A word of the shape C-i-C-ayon or
   C-i-C-a takes an extra yod in plene spelling. */
const FAMILIES = [
  ['רשיון', 'רישיון'], ['רשיונות', 'רישיונות'],
  /* a yod Hebrew writes once or twice */
  ['מדויק', 'מדוייק'], ['מדויקת', 'מדוייקת'], ['מדויקים', 'מדוייקים'], ['מדויקות', 'מדוייקות'],
  ['מצוין', 'מצויין'], ['מצוינת', 'מצויינת'], ['מצוינים', 'מצויינים'],
  ['ראויה', 'ראוייה'], ['רצויה', 'רצוייה'], ['גלויה', 'גלוייה'],
  ['בנויה', 'בנוייה'], ['עשויה', 'עשוייה'], ['מצויה', 'מצוייה'],
  ['עתון', 'עיתון'], ['עתונים', 'עיתונים'],
  ['ענין', 'עניין'], ['ענינים', 'עניינים'],
  ['מעונין', 'מעוניין'], ['בנין', 'בניין'], ['בנינים', 'בניינים'],
  ['דירה', 'דירה'],
  ['תכנית', 'תוכנית'], ['תכניות', 'תוכניות'],
  ['מזג אויר', 'מזג אוויר'],
  ['אויר', 'אוויר'],
  ['שנוי', 'שינוי'], ['שנויים', 'שינויים'],
  ['גליון', 'גיליון'],
  ['כוון', 'כיוון'], ['כוונים', 'כיוונים'],
  ['זכרון', 'זיכרון'],
  ['בטחון', 'ביטחון'],
  ['פתרון', 'פיתרון'],
  ['סדור', 'סידור'], ['סדורים', 'סידורים'],
  ['תאור', 'תיאור'],
  ['ארגון', 'אירגון'],
  ['משרד', 'משרד'],
  ['צהרים', 'צהריים'],
  ['ערבים', 'ערביים'],
  ['מים', 'מים'],
  ['שמים', 'שמיים'],
  ['אופנים', 'אופניים'],
  ['מכנסים', 'מכנסיים'],
  ['משקפים', 'משקפיים'],
  ['נעלים', 'נעליים'],
];

let flagged = 0;
const rows = [];
g.DEFAULT_VOCAB.forEach((w) => {
  const back = String(w.back || '');
  FAMILIES.forEach(([a, b]) => {
    if (a === b) return;
    const usesA = back.includes(a) && !back.includes(b);
    const usesB = back.includes(b) && !back.includes(a);
    if (!usesA && !usesB) return;
    const other = usesA ? back.split(a).join(b) : back.split(b).join(a);
    const accepted = g.acceptableAnswers(back);
    if (!accepted.has(g.normAnswer(other))) {
      rows.push('   ' + w.front.padEnd(22) + '"' + back + '"   would reject   "' + other + '"');
      flagged++;
    }
  });
});

console.log('\ncards that would fail a correct alternative spelling: ' + flagged);
rows.forEach((r) => console.log(r));

console.log('\nvariant pairs the app knows: ' + (g.SPELLING_VARIANTS || []).length);
if (flagged) {
  console.log('\nadd the missing pairs to SPELLING_VARIANTS and to accepted_spellings');
  process.exit(1);
}
console.log('no card can fail on a spelling preference');

/* Answers Emanuel reported as marked wrong (21.10). Each one is typed here
   against the card it was given for, through the same path the app uses. */
console.log('\n=== answers that were once marked wrong');
{
  const { api: q } = loadApp('DEFAULT_VOCAB, SENTENCES, acceptableAnswers, normAnswer, allMeanings, buildQuestion, withProgressFields, buildDeck');
  const card = (id) => q.DEFAULT_VOCAB.find((x) => x.id === id);
  const takes = (id, typed) => {
    const ok = new Set();
    q.allMeanings(card(id)).forEach((m) => q.acceptableAnswers(m).forEach((k) => ok.add(k)));
    return ok.has(q.normAnswer(typed));
  };
  const cases = [
    [714, 'היתה'], [714, 'הייתה'],
    [658, 'אחיות רפואיות'], [658, 'אחיות רפואייות'], [658, 'אחיות (רפואיות)'], [658, 'אחיות‏ רפואיות'],
    [584, 'כיף'], [1102, 'איחור'], [1103, 'איחורים'],
    [998, 'קצת'], [999, 'קצת'], [1081, 'אש'],
    [1096, 'סטודנט'], [1096, 'מבקש'], [17, 'מבקש'], [17, 'סטודנט'],
    [1018, 'מזמינים'], [1040, 'מוזמן'],
    [960, 'בהיר'], [960, 'פתוח'],
    [49, 'כיסא'], [49, 'כסא'], [103, 'כיסאות'], [103, 'כסאות'],
  ];
  let miss = 0;
  cases.forEach(([id, t]) => {
    const r = takes(id, t);
    if (!r) miss++;
    console.log('  ' + (r ? 'ok   ' : 'FAIL ') + id + ' ' + card(id).front + '  ←  ' + t);
  });
  /* A second meaning must never come back as a wrong option. */
  const banks = { vocab: q.withProgressFields(q.DEFAULT_VOCAB), letters: [], sentences: [], idioms: [], meeting: 15 };
  const deck = q.buildDeck('vocab', banks);
  const talib = deck.find((d) => d.id === 1096);
  let clash = 0;
  for (let i = 0; i < 400; i++) {
    const qq = q.buildQuestion(deck, talib, 'ar2he');
    if (qq.options.filter((o) => o === 'סטודנט' || o === 'מבקש').length > 1) clash++;
  }
  console.log('  ' + (clash ? 'FAIL ' : 'ok   ') + 'טַאלֶבּ never offers its other meaning as a wrong option' + (clash ? '  (' + clash + ' of 400)' : ''));
  if (miss || clash) { console.log('\nREPORTED ANSWERS STILL FAIL'); process.exit(1); }
  console.log('every reported answer is accepted');
}
