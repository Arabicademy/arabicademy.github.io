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
