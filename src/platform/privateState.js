// What «المعلم الذكي» keeps for the person using this tab (2026-11-13): the
// lesson conversations, typed answers and help cards, and whether they agreed
// to send questions to the model. All of it belongs to one account (or to the
// visitor) and is cleared when that changes: signing out, signing in as
// someone else, a session that ended, or another tab switching the account.
//
// Learning progress, achievements and certificates are kept per student
// elsewhere (guestProfile.js, the server) and are never touched here.
//
// No browser globals at import time, so tests can run this file in Node.

export const PRIVATE_PREFIXES = ["lamis.chat.", "lamis.tutor."];
// The visitor's tab id for help counters on the server; a new person gets a new one.
export const PRIVATE_KEYS = ["lamis.helpTab"];
const OWNER_KEY = "lamis.private.owner";

let current; // "u:<id>" | "guest" | undefined (not known yet)
let gen = 0;
let consent = false;
const resets = new Set();
const pending = new Set();
const consentListeners = new Set();

function storage() {
  try {
    return globalThis.sessionStorage || null;
  } catch {
    return null;
  }
}

export const identityOf = (user) => (user?.id ? `u:${user.id}` : "guest");
/** The person this tab belongs to now ("guest" until known). */
export const identity = () => current || "guest";
export const generation = () => gen;
/** Whether something started at generation `g` may still be shown. */
export const isCurrent = (g) => g === gen;

/** A storage key that belongs to this person, e.g. chat per lesson. */
export const privateKey = (prefix, ...parts) => [prefix.replace(/\.$/, ""), "v2", identity(), ...parts].join(".");

/** Run `fn` whenever the private state is cleared. Returns an unsubscribe. */
export function registerReset(fn) {
  resets.add(fn);
  return () => resets.delete(fn);
}

/** An AbortController for a request that must stop when the person changes. */
export function track() {
  const controller = new AbortController();
  pending.add(controller);
  return { signal: controller.signal, done: () => pending.delete(controller), generation: gen };
}

export function getConsent() {
  return consent;
}
/** The server's answer about consent for this session (never a guess). */
export function setConsent(value) {
  const next = value === true;
  if (next === consent) return;
  consent = next;
  for (const fn of consentListeners) fn(consent);
}
export function onConsent(fn) {
  consentListeners.add(fn);
  return () => consentListeners.delete(fn);
}

function clearStorage(s) {
  if (!s) return;
  const doomed = [];
  for (let i = 0; i < s.length; i += 1) {
    const k = s.key(i);
    if (k && (PRIVATE_PREFIXES.some((p) => k.startsWith(p)) || PRIVATE_KEYS.includes(k))) doomed.push(k);
  }
  for (const k of doomed) s.removeItem(k);
}

/** Clear everything private: stored chats, memory, consent, pending requests. */
export function resetPrivateState() {
  gen += 1;
  for (const c of pending) c.abort();
  pending.clear();
  setConsent(false);
  for (const fn of [...resets]) {
    try {
      fn();
    } catch {}
  }
  const s = storage();
  try {
    clearStorage(s);
    s?.setItem(OWNER_KEY, identity());
  } catch {}
}

/**
 * Tell this module who uses the tab (from the session). Returns true when it
 * changed and the private state was cleared. The first call also clears what
 * a previous person left in this tab's storage (e.g. before a reload).
 */
export function setIdentity(user) {
  const next = identityOf(user);
  if (current === undefined) {
    current = next;
    let owner = null;
    try {
      owner = storage()?.getItem(OWNER_KEY) ?? null;
    } catch {}
    if (owner !== next) resetPrivateState();
    return false;
  }
  if (next === current) return false;
  current = next;
  resetPrivateState();
  return true;
}

/** Tests only: start again as if the page had just opened. */
export function _resetForTests() {
  current = undefined;
  gen = 0;
  consent = false;
  resets.clear();
  pending.clear();
  consentListeners.clear();
}
