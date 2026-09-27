/* Checks the "first sign-in or forgotten password" link.

   The important property is not that it works but that it keeps quiet: an
   unknown address must be answered exactly like a known one, otherwise the
   login screen becomes a way for a stranger to test who has an account. */
const fs = require('fs'), vm = require('vm'), path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let bad = 0;
const check = (label, cond, detail) => {
  console.log('  ' + (cond ? 'ok   ' : 'FAIL ') + label + (detail ? '  (' + detail + ')' : ''));
  if (!cond) bad++;
};

console.log('\n=== the reset handler, as written in the file');
const fn = html.match(/const resetPassword = \(\) => \{[\s\S]*?\n    \};/);
check('the handler exists', !!fn);
const body = fn ? fn[0] : '';
check('it calls sendPasswordResetEmail', body.includes('sendPasswordResetEmail'));
check('it refuses to fire with an empty address', body.includes('if (!address)'));
check('an unknown address is treated as success', body.includes('auth/user-not-found') && body.includes('setSent(true)'));
check('it never prints the address back', !/setError\([^)]*address/.test(body));

console.log('\n=== the button');
check('is labelled for first-time users too', html.includes('התחברות ראשונה או שכחתי סיסמה'));
check('is type=button, so it cannot submit the form',
      /type: "button", onClick: resetPassword/.test(html));
check('is disabled while a request is in flight', /onClick: resetPassword, disabled: busy/.test(html));
check('the confirmation mentions the spam folder', html.includes('תיקיית הספאם'));

console.log('\n=== behaviour under the two outcomes');
/* Replays the handler with a stubbed Firebase to confirm both paths end the
   same way from the outside. */
function run(errorCode) {
  const state = { sent: false, error: null, busy: false };
  const sandbox = {
    console,
    setSent: (v) => { state.sent = v; },
    setError: (v) => { state.error = v; },
    setBusy: (v) => { state.busy = v; },
    email: 'someone@example.com',
    authMessage: () => 'generic failure',
    firebase: { auth: () => ({
      sendPasswordResetEmail: () => (errorCode
        ? Promise.reject({ code: errorCode })
        : Promise.resolve()),
    }) },
  };
  vm.createContext(sandbox);
  vm.runInContext(body.replace('const resetPassword', 'var resetPassword') + '\nresetPassword();', sandbox);
  return new Promise((res) => setTimeout(() => res(state), 10));
}

Promise.all([run(null), run('auth/user-not-found'), run('auth/network-request-failed')])
  .then(([known, unknown, offline]) => {
    console.log('  known address    -> sent=' + known.sent + ' error=' + known.error);
    console.log('  unknown address  -> sent=' + unknown.sent + ' error=' + unknown.error);
    console.log('  network failure  -> sent=' + offline.sent + ' error=' + offline.error);
    check('known and unknown look identical',
          known.sent === unknown.sent && known.error === unknown.error);
    check('a real failure is still reported', offline.error !== null && offline.sent === false);
    check('the button is released afterwards', !known.busy && !unknown.busy && !offline.busy);
    console.log(bad ? '\n' + bad + ' CHECK(S) FAILED' : '\nALL RESET CHECKS PASSED');
    process.exit(bad ? 1 : 0);
  });
