/* Checks when the guide opens.

   The failure that matters is showing it again to someone who has already
   dismissed it — most likely on a second device, where the profile has not
   loaded at the moment of sign-in. So the decision waits for the sync to
   settle rather than firing on sign-in alone. */
const fs = require('fs'), path = require('path');
const { loadApp } = require('./harness.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const { api: g } = loadApp('GUIDE_SLIDES');

let bad = 0;
const check = (label, cond, detail) => {
  console.log('  ' + (cond ? 'ok   ' : 'FAIL ') + label + (detail ? '  (' + detail + ')' : ''));
  if (!cond) bad++;
};

console.log('\n=== the slides');
console.log('  ' + g.GUIDE_SLIDES.length + ' slides: ' + g.GUIDE_SLIDES.map((s) => s.title).join(' · '));
check("seven slides", g.GUIDE_SLIDES.length === 7);
check('every slide has a title, a lead and points',
      g.GUIDE_SLIDES.every((s) => s.title && s.body && s.points && s.points.length >= 2));
check('every slide has an icon', g.GUIDE_SLIDES.every((s) => typeof s.icon === 'function'));
check('the personal area has its own slide',
      g.GUIDE_SLIDES.filter((s) => s.title.indexOf('האזור האישי') === 0).length === 1);
check('it opens with a welcome and closes with a send-off',
      g.GUIDE_SLIDES[0].title === 'ברוכים הבאים' && g.GUIDE_SLIDES[6].title === "צא לדרך");

console.log('\n=== when it opens');
/* mirrors the effect in the app */
function shouldOpen({ user, status, profile }) {
  if (!user) return false;
  if (status !== 'synced' && status !== 'error') return false;
  if (profile && profile.guideSeen) return false;
  return true;
}
const cases = [
  ['not signed in',                     { user: null, status: 'idle', profile: null }, false],
  ['signed in, still loading',          { user: 'u', status: 'loading', profile: null }, false],
  ['first sign-in, profile empty',      { user: 'u', status: 'synced', profile: null }, true],
  ['first sign-in, profile has a name', { user: 'u', status: 'synced', profile: { name: 'א' } }, true],
  ['second device, already seen',       { user: 'u', status: 'synced', profile: { guideSeen: true } }, false],
  ['cloud unreachable, never seen',     { user: 'u', status: 'error', profile: null }, true],
  ['cloud unreachable, already seen',   { user: 'u', status: 'error', profile: { guideSeen: true } }, false],
];
cases.forEach(([label, state, want]) => {
  const got = shouldOpen(state);
  check(label + ' -> ' + (want ? 'shows' : 'stays away'), got === want);
});

console.log('\n=== the wiring in the file');
check('closing marks the profile', /setProfile\(\(prev\) => \(\{ \.\.\.\(prev \|\| \{\}\), guideSeen: true \}\)\)/.test(html));
check('the account sheet can reopen it', /className: "zl-guidecard", onClick: onShowGuide/.test(html));
check('reopening closes the sheet first',
      /onShowGuide: \(\) => \{ setAccountOpen\(false\); setGuideOpen\(true\); \}/.test(html));
check('the overlay renders above the sheet',
      html.indexOf('GuideOverlay, { onClose: closeGuide }') < html.indexOf('accountOpen ? React.createElement(AccountSheet'));
check('there is a way out on every slide', html.includes('zl-guide-skip'));

console.log('\n=== a second dismissal does not undo the first');
let profile = null;
const close = () => { profile = { ...(profile || {}), guideSeen: true }; };
close();
check('marked after the first close', profile.guideSeen === true);
profile = { ...profile, name: 'עמנואל' };
check('a later profile edit keeps the flag', profile.guideSeen === true);
check('and it stays away afterwards', !shouldOpen({ user: 'u', status: 'synced', profile: profile }));


/* ---- the tour drives the app behind the card ---- */
console.log('\n=== every slide points at a tab');
const TABS = ['routine', 'practice', 'vocab', 'alphabet', 'stats'];
check('every slide names a tab', g.GUIDE_SLIDES.every((s) => TABS.indexOf(s.tab) >= 0));
g.GUIDE_SLIDES.forEach((s, i) => {
  console.log('  ' + (i + 1) + '. ' + s.title.padEnd(24) + '-> ' + s.tab + (s.account ? '  (opens ' + s.account + ')' : ''));
});
check('the practice slide points at the practice tab',
      g.GUIDE_SLIDES.find((s) => s.title === 'שיטות תרגול').tab === 'practice');
check('the statistics slide points at the statistics tab',
      g.GUIDE_SLIDES.find((s) => s.title === 'סטטיסטיקה').tab === 'stats');
check('the personal-area slides open the sheet',
      g.GUIDE_SLIDES.filter((s) => s.account).length === 2);
check('and no other slide opens it',
      g.GUIDE_SLIDES.filter((s) => s.account).every((s) => s.title.indexOf('האזור') === 0 || s.title === 'בחירת המפגש'));

console.log('\n=== the card leaves the screen visible');
check('the backdrop does not block clicks above it', /\.zl-guide-back \{[^}]*pointer-events: none/.test(html));
check('but the card itself is clickable', /\.zl-guide \{[^}]*pointer-events: auto/.test(html));
check('the card is anchored to the bottom', /\.zl-guide-back \{[^}]*align-items: flex-end/.test(html));
check('and capped so the tab stays visible', /\.zl-guide \{[^}]*max-height: 62vh/.test(html));
check('it sits above the personal-area sheet', /\.zl-guide-back \{[^}]*z-index: 1200/.test(html));
check('the sheet shrinks during the tour', html.includes('data-tour="true"] .zl-sheet { max-height:34vh'));
check('the root carries the tour flag', /"data-tour": guideOpen \? "true" : "false"/.test(html));

console.log('\n=== leaving the tour closes what it opened');
check('the sheet is closed for a slide with no account', /setAccountOpen\(!!wantAccount\)/.test(html));

console.log(bad ? '\n' + bad + ' CHECK(S) FAILED' : '\nALL GUIDE CHECKS PASSED');
process.exit(bad ? 1 : 0);
