/* Parses the single-file app and runs its whole script in a sandbox, with
   stand-ins for React, Firebase and the DOM. Catches syntax errors and
   anything that throws at module level — the faults that turn the page blank
   and that a browser here cannot reveal, since the CDN is unreachable. */
const fs = require('fs'), vm = require('vm'), path = require('path');

function loadApp(extraExports) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = html.indexOf('"use strict";');
  const end = html.lastIndexOf('\n</script>\n</body>');
  if (start < 0 || end < 0) throw new Error('could not find the app script');
  const anchor = 'ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(ArabicLearningApp, null));';
  let body = html.slice(start, end);
  if (extraExports) {
    if (body.indexOf(anchor) < 0) throw new Error('render anchor not found');
    body = body.replace(anchor, 'globalThis.__api = { ' + extraExports + ' };\n' + anchor);
  }

  const sandbox = {
    console, Date, Math, JSON, Set, Map, Array, Object, String, Number, Boolean,
    RegExp, Error, Promise, setTimeout, clearTimeout, setInterval, clearInterval,
    isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
    React: {
      createElement: () => ({}),
      useState: (v) => [typeof v === 'function' ? v() : v, () => {}],
      useEffect() {}, useMemo: (f) => f(), useRef: (v) => ({ current: v }),
      useCallback: (f) => f, Fragment: 'F',
    },
    ReactDOM: { createRoot: () => ({ render() {} }) },
    firebase: {
      auth: () => ({ onAuthStateChanged: () => () => {}, signOut: () => Promise.resolve() }),
      firestore: () => ({ collection: () => ({ doc: () => ({
        get: () => Promise.resolve({ exists: false }), set: () => Promise.resolve() }) }) }),
    },
    document: {
      getElementById: () => ({ style: {}, innerHTML: '' }),
      createElement: () => ({ style: {} }),
      body: { style: {} }, addEventListener() {}, removeEventListener() {},
      hidden: false,
    },
  };
  sandbox.window = sandbox;
  sandbox.ZL_FIREBASE_READY = true;
  sandbox.localStorage = { getItem: () => null, setItem() {} };
  sandbox.addEventListener = () => {};
  sandbox.removeEventListener = () => {};
  sandbox.showBootError = (t, e) => { throw new Error('boot error: ' + t + ' ' + (e && e.message)); };
  vm.createContext(sandbox);
  vm.runInContext('try {\n' + body, sandbox, { filename: 'app.js' });
  return { api: sandbox.__api, chars: body.length };
}

module.exports = { loadApp };

if (require.main === module) {
  try {
    const { chars } = loadApp();
    console.log('OK  parsed ' + chars + ' chars');
  } catch (e) {
    console.error('FAILED: ' + e.message);
    if (e.stack) console.error(e.stack.split('\n').slice(0, 6).join('\n'));
    process.exit(1);
  }
}
