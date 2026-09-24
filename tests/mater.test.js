/* Where a vowel was written with a helper letter instead of on the letter.

   "ק חולם" means a holam sits on the kof. Writing קוֹ instead inserts a vav
   that was never asked for, and the word is then wrong in a way that is easy
   to miss because it still reads roughly the same aloud.

   The same trap exists for shuruk (ו + dagesh) against kubuts, and for hiriq
   male (י) against plain hiriq. This lists every place a helper letter
   carries the vowel, so each can be checked against what was dictated.

   Not every hit is an error — Arabic long vowels are genuinely written with
   a mater, and most of these are correct. The list is for reading, not for
   automatic correction. */
const { loadApp } = require('./harness.js');
const { api: g } = loadApp('DEFAULT_VOCAB, itemMeeting');

const HOLAM = '\u05B9', SHURUK = '\u05BC', KUBUTS = '\u05BB', HIRIQ = '\u05B4';
const MARKS = /[\u0591-\u05C7\u0610-\u065F]/;

function letters(word) {
  const out = [];
  for (const ch of word) {
    if (MARKS.test(ch)) { if (out.length) out[out.length - 1].m.push(ch); }
    else out.push({ c: ch, m: [] });
  }
  return out;
}

/* A vav that carries the vowel for the consonant before it. */
const vavHolam = [], vavShuruk = [];
g.DEFAULT_VOCAB.forEach((w) => {
  const ls = letters(w.front);
  ls.forEach((L, i) => {
    if (L.c !== 'ו') return;
    const prev = ls[i - 1];
    if (!prev) return;
    const prevBare = prev.m.length === 0;
    if (L.m.includes(HOLAM) && prevBare) {
      vavHolam.push([w, w.front]);
    }
    if (L.m.includes(SHURUK) && prevBare) {
      vavShuruk.push([w, w.front]);
    }
  });
});

const show = (title, rows, cap) => {
  const uniq = [];
  const seen = new Set();
  rows.forEach(([w, f]) => {
    const k = w.id;
    if (seen.has(k)) return;
    seen.add(k);
    uniq.push('   m' + String(g.itemMeeting(w)).padStart(2) + '  ' +
              f.padEnd(24) + w.back);
  });
  console.log('\n' + title + ': ' + uniq.length);
  uniq.slice(0, cap || 40).forEach((r) => console.log(r));
  if (uniq.length > (cap || 40)) console.log('   ... and ' + (uniq.length - (cap || 40)) + ' more');
  return uniq.length;
};

const a = show('vav carrying a holam for a bare consonant before it', vavHolam);
const b = show('vav carrying a shuruk for a bare consonant before it', vavShuruk);

console.log('\ntotal: ' + (a + b) + ' card(s) where a vav carries the vowel');
console.log('(most are genuine Arabic long vowels — read the list against what was dictated)');
