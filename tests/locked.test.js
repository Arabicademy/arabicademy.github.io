/* The lock.

   corrections.json holds every form Emanuel has approved. This test compares
   the store against it and fails if anything has moved — a vowel, a letter, a
   shadda, a translation. It exists because the same words were re-read and
   re-corrected more than once, and that is not going to happen again.

   A meeting only appears here once its words have been through verification;
   locked_meetings_words says which those are. Cards from a meeting not yet
   verified are ignored, so work in progress does not trip the lock.

   If this test fails, the store is wrong, not the ledger. The only way a
   locked form changes is Emanuel saying so — and then the ledger is edited
   first and the store brought into line with it. */
const fs = require('fs'), path = require('path');
const { loadApp } = require('./harness.js');
const { api: g } = loadApp('DEFAULT_VOCAB, SENTENCES, itemMeeting, acceptableAnswers, normAnswer');

const ledgerPath = path.join(__dirname, '..', 'corrections.json');
if (!fs.existsSync(ledgerPath)) {
  console.log('no corrections.json — nothing is locked yet');
  process.exit(0);
}
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

let bad = 0;
const fail = (msg) => { console.error('  FAIL ' + msg); bad++; };

console.log('\n=== words');
const lockedMeetings = ledger.locked_meetings_words || [];
console.log('  locked meetings: ' + (lockedMeetings.join(', ') || 'none'));
const byId = new Map(g.DEFAULT_VOCAB.map((w) => [w.id, w]));
let checked = 0, missing = 0;
(ledger.words || []).forEach((rec) => {
  const card = byId.get(rec.id);
  if (!card) { fail('card ' + rec.id + ' (' + rec.front + ') is gone from the store'); missing++; return; }
  checked++;
  if (card.front !== rec.front) {
    fail('id ' + rec.id + ' spelling moved\n         ledger: ' + rec.front + '\n         store : ' + card.front);
  }
  if (card.back !== rec.back) {
    fail('id ' + rec.id + ' (' + rec.front + ') translation moved\n         ledger: ' + rec.back + '\n         store : ' + card.back);
  }
  if ((card.form || null) !== rec.form) {
    fail('id ' + rec.id + ' (' + rec.front + ') form moved: ' + rec.form + ' -> ' + (card.form || null));
  }
  if ((card.gender || null) !== rec.gender) {
    fail('id ' + rec.id + ' (' + rec.front + ') gender moved: ' + rec.gender + ' -> ' + (card.gender || null));
  }
});
console.log('  ' + checked + ' locked card(s) verified, ' + missing + ' missing');

/* Nothing may be added to a locked meeting without going through the ledger:
   a card that appears in a verified meeting but not in the ledger was never
   approved. */
const ledgerIds = new Set((ledger.words || []).map((r) => r.id));
const strays = g.DEFAULT_VOCAB.filter((w) =>
  lockedMeetings.includes(g.itemMeeting(w)) && !ledgerIds.has(w.id));
if (strays.length) {
  strays.forEach((w) => fail('id ' + w.id + ' (' + w.front + ') is in a locked meeting but not in the ledger'));
}

console.log('\n=== sentences');
const lockedSentences = ledger.locked_meetings_sentences || [];
console.log('  locked meetings: ' + (lockedSentences.join(', ') || 'none'));
const sById = new Map(g.SENTENCES.map((s) => [s.id, s]));
let sChecked = 0;
(ledger.sentences || []).forEach((rec) => {
  const s = sById.get(rec.id);
  if (!s) { fail('sentence ' + rec.id + ' is gone from the store'); return; }
  sChecked++;
  if (s.arabic !== rec.arabic) {
    fail('sentence ' + rec.id + ' moved\n         ledger: ' + rec.arabic + '\n         store : ' + s.arabic);
  }
  if (s.hebrew !== rec.hebrew) {
    fail('sentence ' + rec.id + ' translation moved\n         ledger: ' + rec.hebrew + '\n         store : ' + s.hebrew);
  }
});
console.log('  ' + sChecked + ' locked sentence(s) verified');

console.log('\n=== accepted spellings');
/* A typed answer must not be marked wrong over a spelling preference. Both
   halves of every pair are checked against every card that uses either. */
let spellBad = 0, pairsSeen = 0;
(ledger.accepted_spellings || []).forEach(([a, b]) => {
  g.DEFAULT_VOCAB.forEach((w) => {
    const uses = String(w.back).includes(a) || String(w.back).includes(b);
    if (!uses) return;
    pairsSeen++;
    const accepted = g.acceptableAnswers(w.back);
    [a, b].forEach((variant) => {
      const typed = String(w.back).split(a).join(variant).split(b).join(variant);
      if (!accepted.has(g.normAnswer(typed))) {
        console.error('  FAIL "' + typed + '" rejected for ' + w.front + ' = "' + w.back + '"');
        spellBad++;
      }
    });
  });
});
console.log('  ' + pairsSeen + ' card(s) touched by a spelling pair, ' + spellBad + ' rejection(s)');
bad += spellBad;

console.log(bad ? '\n' + bad + ' LOCK VIOLATION(S) — the store disagrees with corrections.json'
                : '\nTHE LOCK HOLDS — every approved form is intact');
process.exit(bad ? 1 : 0);
