"""Read-only live macOS smoke check through Safari's W3C WebDriver endpoint."""
import json
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

DRIVER = 'http://127.0.0.1:4444'
ORIGIN = 'https://voidline-afterhours.pipedcactus1.chatgpt.site'
ELEMENT = 'element-6066-11e4-a52e-4f73-bacf-4a6e4f8f7d76'


def request(method, path, data=None):
    body = None if data is None else json.dumps(data).encode()
    req = Request(DRIVER + path, data=body, method=method, headers={'Content-Type': 'application/json'})
    try:
        with urlopen(req, timeout=90) as response:
            return json.load(response)['value']
    except HTTPError as error:
        details = json.loads(error.read())['value']
        raise RuntimeError(details.get('error', '') + ' ' + details.get('message', '')) from error


def wait(check, timeout=35):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        try:
            if result := check():
                return result
        except (ConnectionError, URLError):
            pass
        time.sleep(0.2)
    raise TimeoutError('Condition took longer than ' + str(timeout) + ' seconds')


wait(lambda: request('GET', '/status'), timeout=20)
session = request('POST', '/session', {'capabilities': {'alwaysMatch': {'browserName': 'safari'}}})
print('Safari', session['capabilities'].get('browserVersion'), flush=True)
base = '/session/' + session['sessionId']


def navigate(path):
    request('POST', base + '/url', {'url': ORIGIN + path})


def js(expression):
    return request('POST', base + '/execute/sync', {'script': 'return (' + expression + ')', 'args': []})


def click(selector):
    element = request('POST', base + '/element', {'using': 'css selector', 'value': selector})
    request('POST', base + '/element/' + element[ELEMENT] + '/click', {})


try:
    navigate('/chats')
    wait(lambda: js("Boolean(document.querySelector('form input[type=password]'))"))
    assert js("document.body.innerText.includes('Create account') && document.body.innerText.includes('Log in')")
    print('PASS guest account form rendered', flush=True)

    navigate('/art-review.html?item=gift-copium-cartridge')
    wait(lambda: js("Boolean(document.querySelector('#ar-dialog')?.open)"))
    state_expr = """({title:document.querySelector('#ar-title')?.textContent,
      status:document.querySelector('#ar-status')?.textContent, button:document.querySelector('#ar-play')?.textContent,
      svg:!!document.querySelector('#ar-stage svg [data-part="cartridge-smoke-ring"]'),
      reduce:matchMedia('(prefers-reduced-motion: reduce)').matches, hidden:document.hidden,
      url:location.href})"""
    wait(lambda: js("document.querySelector('#ar-status').textContent !== 'Loading detail…'"))
    state = js(state_expr)
    print('Initial preview:',state,flush=True)
    if state['button']=='Retry artwork':
        click('#ar-play')
    wait(lambda: js("!!document.querySelector('#ar-stage svg [data-part=\"cartridge-smoke-ring\"]')"))
    if js("document.querySelector('#ar-reduce').checked && !document.querySelector('#ar-reduce').disabled"):
        click('#ar-close')
        click('#ar-reduce')
        click('[data-art-open="gift-copium-cartridge"]')
    wait(lambda: js("document.querySelector('#ar-status').textContent === 'Resting artwork'"))
    assert js("document.querySelector('#ar-title').textContent === 'Copium Cartridge'")
    click('#ar-play')
    wait(lambda: js("document.querySelector('#ar-status').textContent === 'Playing once'"), timeout=10)
    wait(lambda: js("document.querySelector('#ar-status').textContent === 'Preview complete.' && document.querySelector('#ar-frame').value === '100'"))
    print('PASS original gift played to 100% in Safari', flush=True)
    click('#ar-close')
    click('#ar-reduce')
    click('[data-art-open="gift-copium-cartridge"]')
    wait(lambda: js("document.querySelector('#ar-dialog').open && document.querySelector('#ar-status').textContent.includes('Reduced motion is on')"))
    assert js("document.querySelector('#ar-play').disabled && document.querySelector('#ar-frame').disabled && !!document.querySelector('#ar-stage svg')")
    print('PASS reduced motion displays the static artwork', flush=True)

    navigate('/install.html')
    wait(lambda: js("document.querySelector('#vm-title')?.textContent === 'Install VOIDLINE'"))
    assert js("document.querySelector('.vm-other-devices').innerText.includes('Add to Dock') && !!document.querySelector('link[rel=manifest]')")
    print('PASS Mac install page contains Safari Add to Dock instructions and a web manifest', flush=True)
except Exception:
    print('Final page:',js("({url:location.href,hidden:document.hidden,body:document.body.innerText.slice(-1200),parts:document.querySelectorAll('#ar-stage [data-part]').length})"),flush=True)
    raise
finally:
    request('DELETE', base)
