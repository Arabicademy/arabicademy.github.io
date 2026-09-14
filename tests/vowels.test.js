/* Looks for vowel marks that landed on the wrong letter.

   The case that prompted this: מַטַאִר, where the hiriq of the construct
   state sat on the alef instead of the resh. An alef that follows a vowelled
   consonant is already serving as the long /aa/ — a vowel of its own means
   the mark is one letter early.

   A real hamza mid-word looks the same, so the list is for eyeballing rather
   than for trusting. */
const fs = require('fs'), path = require('path');
const { loadApp } = require('./harness.js');
const { api: g } = loadApp('DEFAULT_VOCAB, SENTENCES, IDIOMS');

const SHVA = '\u05B0';
const VOWELS = new Set(['\u05B1','\u05B2','\u05B3','\u05B4','\u05B5','\u05B6','\u05B7','\u05B8','\u05B9','\u05BA','\u05BB']);
const isMark = (c) => /[\u0591-\u05C7\u0610-\u065F]/.test(c);

function letters(word) {
  const out = [];
  for (const ch of word) {
    if (isMark(ch)) { if (out.length) out[out.length - 1].marks.push(ch); }
    else out.push({ ch: ch, marks: [] });
  }
  return out;
}
function suspicious(word) {
  const ls = letters(word.replace(/[.,?!()]/g, ''));
  for (let i = 1; i < ls.length - 1; i++) {
    if (ls[i].ch !== 'א') continue;
    if (!ls[i].marks.some((m) => VOWELS.has(m))) continue;
    if (ls[i - 1].marks.some((m) => VOWELS.has(m))) return true;   // shva excluded
  }
  return false;
}

const hits = [];
g.SENTENCES.forEach((s) => s.arabic.split(' ').forEach((w) => {
  if (suspicious(w)) hits.push(w + '   (sentence ' + s.id + ')');
}));
g.DEFAULT_VOCAB.forEach((w) => { if (suspicious(w.front)) hits.push(w.front + '   (word ' + w.id + ')'); });
g.IDIOMS.forEach((it) => (it.front || '').split(' ').forEach((w) => {
  if (suspicious(w)) hits.push(w + '   (idiom ' + it.id + ')');
}));

console.log('\nvowel on an alef that already carries a long /aa/ — check by eye: ' + hits.length);
hits.forEach((h) => console.log('   ' + h));
console.log('\n(סֻאַאל and סֻאַאלַאת are a genuine hamza and belong here;');
console.log(' anything else on the list is worth opening the scan for.)');

/* Counted by distinct word, not by appearance: the same genuine hamza turns
   up in the word list and again in any sentence that uses it. */
const KNOWN = new Set(['סֻאַאל', 'סֻאַאלַאת']);
const unknown = hits
  .map((h) => h.split('   ')[0])
  .filter((w) => !KNOWN.has(w));
if (unknown.length) {
  console.log('\n' + new Set(unknown).size + ' BEYOND THE KNOWN ONES — look at those');
  process.exit(1);
}
console.log('\nNOTHING NEW FLAGGED');

/* ---- the same word entered twice ----
   A word already in the store should not be added again by a later meeting.
   Where two cards share a spelling their senses must genuinely differ —
   כִּיפ "how" against כֵּיפ "pleasure" is two words; the same spelling with
   the same translation is one word entered twice. */
const byFront = new Map();
g.DEFAULT_VOCAB.forEach((w) => {
  if (!byFront.has(w.front)) byFront.set(w.front, []);
  byFront.get(w.front).push(w);
});
const repeats = [], legit = [];
byFront.forEach((list, front) => {
  if (list.length < 2) return;
  const senses = new Set(list.map((w) => w.back));
  (senses.size === 1 ? repeats : legit).push(
    front + '   ' + list.map((w) => '"' + w.back + '" (m' + w.meeting + ')').join('  /  '));
});
console.log('\nsame spelling AND same sense — entered twice: ' + repeats.length);
repeats.forEach((r) => console.log('   ' + r));
console.log('\nsame spelling, genuinely different senses: ' + legit.length);
legit.forEach((r) => console.log('   ' + r));
if (repeats.length) {
  console.log('\n' + repeats.length + ' WORD(S) ENTERED TWICE — remove the later copy');
  process.exit(1);
}
