'use strict';

// Exercise the production account forms with actual DOM inputs and events.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '../dist/home.js'), 'utf8');
const tests = [];
const test = (name, run) => tests.push([name, run]);

async function until(predicate) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (predicate()) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.ok(predicate(), 'The account form completed its asynchronous update.');
}

async function client({ hash = '', rejections = {} } = {}) {
  const errors = [], calls = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM('<!doctype html><html><body><div id="home-root"></div></body></html>', {
    url: 'https://voidline.example/' + hash,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.setInterval = () => 0;
  window.structuredClone = structuredClone;
  window.TextEncoder = TextEncoder;
  window.fetch = async (url, options = {}) => {
    const request = { url: String(url), method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : undefined };
    calls.push(request);
    let status = 200, body;
    if (url === '/api/auth/config') body = { configured: true, matrix: { configured: false }, encryption: { available: false }, google: { configured: false }, email: { configured: false } };
    else if (url === '/api/auth/session') { status = 401; body = { error: { code: 'sign_in_required', message: 'Log in to continue.' } }; }
    else if (rejections[url]) { status = 400; body = { error: rejections[url] }; }
    else if (url === '/api/auth/login') { status = 401; body = { error: { code: 'invalid_credentials', message: 'The username or password is incorrect.' } }; }
    else throw Error('Unexpected account request: ' + url);
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  window.eval(source);
  await until(() => window.document.querySelector('[data-home-form]'));
  const document = window.document;
  const form = () => document.querySelector('[data-home-form]');
  const input = name => form().elements.namedItem(name);
  const type = (name, value, eventName = 'input') => {
    const field = input(name);
    field.value = value;
    field.dispatchEvent(new window.Event(eventName, { bubbles: true }));
    return field;
  };
  const blur = name => { input(name).focus(); input(name).blur(); };
  const register = () => document.querySelector('[data-home="auth-register"]').click();
  const feedback = name => input(name).closest('.vh-field').querySelector('.vh-field-feedback');
  return { dom, window, document, calls, errors, form, input, type, blur, register, feedback, close: () => window.close() };
}

test('new passwords move through quiet, short, weak, fair and strong feedback without replacing the input', async () => {
  const app = await client();
  try {
    app.register();
    const input = app.input('password');
    const meter = input.closest('.vh-field').querySelector('[data-password-feedback]');
    assert.ok(meter, 'Signup has a password-strength indicator.');
    assert.equal(meter.dataset.strength, 'empty');
    input.focus();
    for (const [value, expected] of [
      ['Cobalt!Riv9', 'short'],
      ['password1234', 'weak'],
      ['PASSWORD1234', 'weak'],
      ['123456789012', 'weak'],
      ['aaaaaaaaaaaaaaaaaaaa', 'weak'],
      ['midnighttea!7', 'fair'],
      ['Cobalt!River92Maple', 'strong'],
      ['small', 'short'],
      ['', 'empty'],
    ]) {
      app.type('password', value);
      assert.equal(meter.dataset.strength, expected, value || 'empty password');
      assert.equal(app.input('password'), input, 'Typing keeps the original input and its focus.');
      assert.equal(app.document.activeElement, input);
    }
  } finally { app.close(); }
});

test('short-password validation uses inline feedback and never submits credentials', async () => {
  const app = await client();
  try {
    app.register();
    app.type('username', 'test_person');
    app.type('displayName', 'Test Person');
    const field = app.type('password', 'Cobalt!Riv9');
    app.type('passwordConfirm', 'Cobalt!Riv9');
    // Programmatic values do not set JSDOM's native tooShort flag. Dispatch the
    // cancelable browser event explicitly, then exercise the actual form submit.
    const invalid = new app.window.Event('invalid', { cancelable: true });
    field.dispatchEvent(invalid);
    assert.equal(invalid.defaultPrevented, true, 'The browser validation bubble is suppressed.');
    assert.equal(field.getAttribute('aria-invalid'), 'true');
    assert.ok(field.closest('.vh-field').textContent.trim(), 'The field includes inline guidance.');
    app.form().dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(app.calls.filter(call => call.method === 'POST').length, 0);
    assert.equal(app.document.activeElement, field, 'Submission focuses the first invalid password field.');
    app.type('password', 'Cobalt!River92Maple');
    assert.notEqual(field.getAttribute('aria-invalid'), 'true', 'Editing clears the stale length error.');
  } finally { app.close(); }
});

test('confirmation gives mismatch and match feedback and never retains a stale success', async () => {
  const app = await client();
  try {
    app.register();
    app.type('password', 'Cobalt!River92Maple');
    app.type('passwordConfirm', 'Another!River92Maple');
    app.blur('passwordConfirm');
    assert.equal(app.input('passwordConfirm').getAttribute('aria-invalid'), 'true');
    assert.ok(app.feedback('passwordConfirm').classList.contains('is-error'));
    app.type('passwordConfirm', 'Cobalt!River92Maple');
    assert.notEqual(app.input('passwordConfirm').getAttribute('aria-invalid'), 'true');
    assert.ok(app.feedback('passwordConfirm').classList.contains('is-success'));
    app.type('password', 'Alder!River92Maple');
    assert.ok(!app.feedback('passwordConfirm').classList.contains('is-success'), 'A primary edit invalidates the old match.');
    assert.equal(app.input('passwordConfirm').value, 'Cobalt!River92Maple', 'Feedback preserves the entered confirmation.');
  } finally { app.close(); }
});

test('login accepts an existing password without gating it on estimated strength', async () => {
  const app = await client();
  try {
    const field = app.input('password');
    assert.ok(!field.closest('.vh-field').querySelector('.vh-password-meter, [data-password-strength]'), 'Current-password login has no new-password strength meter.');
    assert.ok(app.feedback('password'), 'Login still has an inline validation message.');
    app.type('username', 'test_person');
    app.type('password', 'short');
    app.blur('password');
    assert.equal(field.getAttribute('aria-invalid'), 'true');
    assert.ok(app.feedback('password').classList.contains('is-error'));
    assert.ok(app.feedback('password').textContent.trim());
    app.form().dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(app.calls.filter(call => call.method === 'POST').length, 0);
    assert.equal(app.document.activeElement, field);
    app.type('password', 'password1234');
    assert.notEqual(field.getAttribute('aria-invalid'), 'true');
    app.form().requestSubmit();
    await until(() => app.calls.some(call => call.url === '/api/auth/login'));
    assert.equal(app.calls.find(call => call.url === '/api/auth/login').body.password, 'password1234');
  } finally { app.close(); }
});

test('typing and autofill feedback stay local, and switching account modes resets them', async () => {
  const app = await client();
  try {
    app.register();
    const requestsBefore = app.calls.length;
    const secret = 'Cobalt!River92Maple';
    app.type('password', secret, 'change');
    const meter = app.input('password').closest('.vh-field').querySelector('[data-password-feedback]');
    assert.equal(meter.dataset.strength, 'strong', 'Autofill/change events refresh strength.');
    assert.equal(app.calls.length, requestsBefore, 'Strength checks send no requests.');
    assert.equal(app.window.localStorage.length, 0);
    assert.equal(app.window.sessionStorage.length, 0);
    for (const element of app.document.querySelectorAll('*')) {
      for (const attribute of element.attributes) assert.ok(!attribute.value.includes(secret), 'The password is never copied into an attribute.');
    }
    assert.ok(!JSON.stringify(app.window.VoidHome.state).includes(secret), 'The password is not kept in shared application state.');
    app.document.querySelector('[data-home="auth-login"]').click();
    assert.equal(app.input('password').value, '');
    app.register();
    assert.equal(app.input('password').value, '');
    assert.equal(app.input('password').closest('.vh-field').querySelector('[data-password-feedback]').dataset.strength, 'empty');
  } finally { app.close(); }
});

test('server password rejections survive focus changes and clear only when the password is edited', async () => {
  for (const [kind, code, eventName] of [
    ['register', 'weak_password', 'input'],
    ['register', 'invalid_password', 'change'],
    ['login', 'invalid_password', 'input'],
  ]) {
    const route = '/api/auth/' + kind;
    const message = 'This password was rejected by account policy.';
    const app = await client({ rejections: { [route]: { code, message } } });
    try {
      if (kind === 'register') app.register();
      app.type('username', 'test_person');
      if (kind === 'register') app.type('displayName', 'Test Person');
      const field = app.type('password', 'Cobalt!River92Maple');
      if (kind === 'register') app.type('passwordConfirm', field.value);
      const feedback = field.closest('.vh-field').querySelector('[data-password-feedback]');
      const errorText = () => feedback.querySelector('[data-password-hint]')?.textContent || feedback.textContent;
      // Submit from the button so the server response really moves focus back.
      app.form().querySelector('[type="submit"]').focus();
      app.form().requestSubmit();
      await until(() => field.getAttribute('aria-invalid') === 'true');
      assert.equal(app.document.activeElement, field);
      assert.equal(errorText(), message, kind + ': server rejection remains visible after automatic focus');
      field.blur();
      assert.equal(errorText(), message, kind + ': blur preserves server rejection');
      field.focus();
      assert.equal(errorText(), message, kind + ': refocusing preserves server rejection');
      assert.equal(field.getAttribute('aria-invalid'), 'true');
      app.form().dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(app.calls.filter(call => call.url === route).length, 1, 'An unchanged rejected password does not submit again.');
      app.type('password', 'Alder!River92Maple', eventName);
      assert.notEqual(field.getAttribute('aria-invalid'), 'true');
      assert.notEqual(errorText(), message, eventName + ' clears the stale server rejection');
      assert.equal(app.window.localStorage.length, 0);
      assert.equal(app.window.sessionStorage.length, 0);
    } finally { app.close(); }
  }
});

test('recovery and email reset also offer new-password feedback', async () => {
  for (const hash of ['', '#reset-password=' + 'a'.repeat(64)]) {
    const app = await client({ hash });
    try {
      if (!hash) app.document.querySelector('[data-home="auth-recover"]').click();
      assert.ok(app.input('password').closest('.vh-field').querySelector('[data-password-feedback]'));
      app.type('password', 'Cobalt!River92Maple');
      assert.equal(app.input('password').closest('.vh-field').querySelector('[data-password-feedback]').dataset.strength, 'strong');
    } finally { app.close(); }
  }
});

(async () => {
  let failed = 0;
  for (const [name, run] of tests) {
    try { await run(); console.log('PASS ' + name); }
    catch (error) { failed++; console.error('FAIL ' + name + '\n' + error.stack); }
  }
  console.log(`${tests.length - failed}/${tests.length} password-feedback DOM checks passed.`);
  process.exitCode = failed ? 1 : 0;
})();
