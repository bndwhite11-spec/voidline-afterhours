// Maintained browser serialization for WebAuthn. Authentication and challenge
// verification remain on the server; the browser never assigns privileges.
import {startRegistration, startAuthentication, browserSupportsWebAuthn} from '@simplewebauthn/browser';

const api=Object.freeze({
  supported:()=>browserSupportsWebAuthn(),
  register:optionsJSON=>startRegistration({optionsJSON}),
  authenticate:optionsJSON=>startAuthentication({optionsJSON}),
});
if(typeof window!=='undefined')window.VoidPasskeysClient=api;
export default api;
