/* Checks the daily routine.

   The midday slot is drawn at random but must be stable for the day — a plan
   that re-rolls on every visit would change the task under the learner's
   hands. And on a games day the slot only counts as done once both games are
   finished, not the first. */
const { loadApp } = require('./harness.js');
const { api: g } = loadApp('noonPlanFor, NOON_GAMES, ROUTINE_ITEMS, MORNING_PLAN, localDateKey, dayNoise');

let bad = 0;
const check = (label, cond, detail) => {
  console.log('  ' + (cond ? 'ok   ' : 'FAIL ') + label + (detail ? '  (' + detail + ')' : ''));
  if (!cond) bad++;
};

console.log('\n=== the midday draw is fixed for the day');
const key = '2026-09-01';
const first = JSON.stringify(g.noonPlanFor(key));
let stable = true;
for (let i = 0; i < 500; i++) if (JSON.stringify(g.noonPlanFor(key)) !== first) stable = false;
check('the same date always gives the same plan', stable);
check('a different date can give a different plan',
      new Set(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06']
        .map((d) => g.noonPlanFor(d).mode)).size === 2);

console.log('\n=== over a year, reading and games are both common');
let reading = 0, games = 0;
const gameCounts = {};
for (let d = 0; d < 365; d++) {
  const date = new Date(2026, 0, 1 + d);
  const k = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  const plan = g.noonPlanFor(k);
  if (plan.mode === 'reading') { reading++; continue; }
  games++;
  if (plan.games.length !== 2) { console.error('FAIL: not two games on ' + k); bad++; }
  if (plan.games[0].label === plan.games[1].label) { console.error('FAIL: same game twice on ' + k); bad++; }
  plan.games.forEach((x) => { gameCounts[x.label] = (gameCounts[x.label] || 0) + 1; });
}
console.log('  reading days ' + reading + ', game days ' + games);
check('the split is roughly even', Math.abs(reading - games) < 80, reading + ' vs ' + games);
console.log('  each game appears:');
Object.keys(gameCounts).sort().forEach((k) => console.log('     ' + k + '  ' + gameCounts[k]));
check('every game gets used', Object.keys(gameCounts).length === g.NOON_GAMES.length);
const counts = Object.values(gameCounts);
check('no game dominates', Math.max.apply(null, counts) < Math.min.apply(null, counts) * 2,
      Math.min.apply(null, counts) + '-' + Math.max.apply(null, counts));

console.log('\n=== the midday tick waits for both games');
/* mirrors markRoutineDone in the app */
function mark(state, dayKey, slot) {
  const today = state[dayKey] || {};
  if (today[slot]) return state;
  if (slot === 'noon') {
    const plan = g.noonPlanFor(dayKey);
    const need = plan.mode === 'games' ? plan.games.length : 1;
    const done = (today.noonCount || 0) + 1;
    return { ...state, [dayKey]: done >= need
      ? { ...today, noonCount: done, noon: true }
      : { ...today, noonCount: done } };
  }
  return { ...state, [dayKey]: { ...today, [slot]: true } };
}
const week = ['2026-09-01','2026-09-02','2026-09-03','2026-09-04','2026-09-05','2026-09-06','2026-09-07'];
const gameDay = week.find((d) => g.noonPlanFor(d).mode === 'games');
const readDay = week.find((d) => g.noonPlanFor(d).mode === 'reading');
let st = {};
st = mark(st, gameDay, 'noon');
check('one game is not enough', !st[gameDay].noon, 'count ' + st[gameDay].noonCount);
st = mark(st, gameDay, 'noon');
check('two games complete it', !!st[gameDay].noon);
st = mark(st, gameDay, 'noon');
check('a third finish changes nothing', st[gameDay].noonCount === 2);
const st2 = mark({}, readDay, 'noon');
check('a reading day completes in one', !!st2[readDay].noon);

console.log('\n=== the routine itself');
console.log('  ' + g.ROUTINE_ITEMS.map((r) => r.label + ': ' + r.target.screen).join('   |   '));
check('the morning is the new drill', g.ROUTINE_ITEMS[0].target.screen === 'morning');
check('the morning is ' + (g.MORNING_PLAN.choice + g.MORNING_PLAN.typed) + ' questions',
      g.MORNING_PLAN.choice === 20 && g.MORNING_PLAN.typed === 10);
check('the evening is unchanged', g.ROUTINE_ITEMS[2].target.screen === 'builder');

console.log(bad ? '\n' + bad + ' CHECK(S) FAILED' : '\nALL ROUTINE CHECKS PASSED');
process.exit(bad ? 1 : 0);
