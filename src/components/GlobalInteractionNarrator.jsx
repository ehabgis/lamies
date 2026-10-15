import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useVoiceNarration } from '../context/VoiceNarrationContext';

const MAX_LABEL_LENGTH = 60;
const MAX_STATUS_LENGTH = 110;
const MIN_REPEAT_GAP_MS = 650;
const HOVER_REPEAT_GAP_MS = 1200;
const INPUT_REPEAT_GAP_MS = 1300;
const STATUS_REPEAT_GAP_MS = 800;
const ROUTE_REPEAT_GAP_MS = 1800;

const INTERACTIVE_SELECTOR = [
  'button',
  'a',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  'input',
  'select',
  'textarea',
  'summary',
  'label',
  '[tabindex]:not([tabindex="-1"])',
  '[data-voice-label]',
  '[data-voice-auto]'
].join(', ');

const INPUT_SELECTOR = 'input:not([type="hidden"]), textarea, select';
const STATUS_SELECTOR = '[role="status"], [role="alert"], [aria-live], [data-voice-auto], .robot-error';

const cleanText = (value = '') => value
  .replace(/\s+/g, ' ')
  .trim();

const truncateText = (value = '', maxLength = MAX_LABEL_LENGTH) => {
  if (!value) return '';
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
};

const readElementLabel = (element) => {
  if (!element) return '';

  const explicitLabel = cleanText(
    element.getAttribute('data-voice-label')
    || element.getAttribute('aria-label')
    || element.getAttribute('title')
    || ''
  );
  if (explicitLabel) return truncateText(explicitLabel);

  if (element.matches('input, textarea, select')) {
    const inputLabel = cleanText(
      element.getAttribute('placeholder')
      || element.getAttribute('name')
      || element.id
      || ''
    );
    return truncateText(inputLabel);
  }

  const mediaLabel = cleanText(
    element.querySelector?.('img[alt]')?.getAttribute('alt')
    || ''
  );
  if (mediaLabel) return truncateText(mediaLabel);

  const textLabel = cleanText(element.textContent || '');
  if (textLabel) return truncateText(textLabel);

  return '';
};

const readStatusText = (element) => {
  if (!element) return '';
  const direct = cleanText(
    element.getAttribute('data-voice-auto')
    || element.getAttribute('aria-label')
    || ''
  );
  if (direct) return truncateText(direct, MAX_STATUS_LENGTH);

  const byText = cleanText(element.textContent || '');
  if (!byText) return '';
  return truncateText(byText, MAX_STATUS_LENGTH);
};

const readCurrentValue = (element) => {
  if (!(element instanceof HTMLElement)) return '';
  if (element.matches('select')) {
    const selected = element.options?.[element.selectedIndex]?.text || element.value || '';
    return truncateText(cleanText(String(selected || '')), 40);
  }
  return '';
};

const buildActionFeedback = (element, label) => {
  if (!label) return '';
  if (element.matches('a, [role="link"]')) return `اضغط على رابط ${label}`;
  if (element.matches('input[type="checkbox"], input[type="radio"]')) return `خيار قابل للتحديد ${label}`;
  if (element.matches(INPUT_SELECTOR)) return `حقل إدخال، اكتب هنا: ${label}`;
  return `اضغط على زر ${label}`;
};

const buildHoverFeedback = (element, label) => {
  if (!label) return '';
  if (element.matches(INPUT_SELECTOR)) return `اكتب في حقل ${label}`;
  return `مرر الفأرة على ${label}`;
};

const buildChangeFeedback = (label, value) => {
  if (value) return `تم تغيير القيمة إلى ${value}`;
  if (!label) return '';
  return `تم تغيير ${label}`;
};

const buildRouteFeedback = (heading, actions) => {
  const safeHeading = cleanText(heading || '');
  const safeActions = (actions || []).filter(Boolean);
  if (safeHeading && safeActions.length) return `أنت الآن في ${safeHeading}. يمكنك الاختيار من بين: ${safeActions.join(' أو ')}`;
  if (safeHeading) return `أنت الآن في ${safeHeading}. استكشف الصفحة للمزيد من الخيارات.`;
  if (safeActions.length) return `استكشف الصفحة الحالية. الخيارات المتاحة: ${safeActions.join(' أو ')}`;
  return '';
};

export default function GlobalInteractionNarrator() {
  const location = useLocation();
  const { enabled, speak } = useVoiceNarration();
  const lastSpokenRef = useRef({ text: '', time: 0 });
  const lastHoverRef = useRef({ key: '', time: 0 });
  const lastInputRef = useRef({ key: '', time: 0 });
  const lastStatusRef = useRef({ text: '', time: 0 });

  useEffect(() => {
    if (!enabled) return undefined;

    const speakPhrase = (phrase, channel = 'ui-action', minGapMs = MIN_REPEAT_GAP_MS, options = {}) => {
      const normalized = truncateText(cleanText(String(phrase || '')), MAX_STATUS_LENGTH);
      if (!normalized) return;

      const now = Date.now();
      if (
        lastSpokenRef.current.text === normalized
        && now - lastSpokenRef.current.time < minGapMs
      ) {
        return;
      }

      lastSpokenRef.current = { text: normalized, time: now };
      speak(normalized, {
        channel,
        profile: 'child',
        interrupt: options.interrupt === true,
        rate: options.rate ?? 1.24,
        pitch: options.pitch ?? 1.62
      });
    };

    const resolveInteractiveElement = (rawTarget) => {
      if (!(rawTarget instanceof HTMLElement)) return null;
      const interactiveElement = rawTarget.closest(INTERACTIVE_SELECTOR);
      if (!interactiveElement) return null;
      if (interactiveElement.closest('[data-no-voice-interaction="true"]')) return null;
      return interactiveElement;
    };

    const announceCurrentRoute = () => {
      const headingElement = document.querySelector('main h1, h1, [data-page-title], h2');
      const heading = readElementLabel(headingElement);
      const actions = Array.from(document.querySelectorAll('button, a, [role="button"], [role="link"]'))
        .map((element) => readElementLabel(element))
        .filter(Boolean)
        .slice(0, 3);

      const phrase = buildRouteFeedback(heading, actions);
      if (!phrase) return;
      speakPhrase(phrase, 'ui-focus', ROUTE_REPEAT_GAP_MS, {
        interrupt: true,
        rate: 1.2,
        pitch: 1.56
      });
    };

    const narrateStatusElement = (element) => {
      if (!(element instanceof HTMLElement)) return;
      if (element.closest('[data-no-voice-interaction="true"]')) return;

      const phrase = readStatusText(element);
      if (!phrase) return;

      const now = Date.now();
      if (
        lastStatusRef.current.text === phrase
        && now - lastStatusRef.current.time < STATUS_REPEAT_GAP_MS
      ) {
        return;
      }
      lastStatusRef.current = { text: phrase, time: now };
      speakPhrase(phrase, 'ui-action', STATUS_REPEAT_GAP_MS);
    };

    const onClick = (event) => {
      const interactiveElement = resolveInteractiveElement(event.target);
      if (!interactiveElement) return;

      const label = readElementLabel(interactiveElement);
      const phrase = buildActionFeedback(interactiveElement, label);
      speakPhrase(phrase, 'ui-action', MIN_REPEAT_GAP_MS);
    };

    const onPointerOver = (event) => {
      const interactiveElement = resolveInteractiveElement(event.target);
      if (!interactiveElement) return;

      const label = readElementLabel(interactiveElement);
      if (!label) return;

      const hoverKey = `${interactiveElement.tagName}:${label}`;
      const now = Date.now();
      if (
        lastHoverRef.current.key === hoverKey
        && now - lastHoverRef.current.time < HOVER_REPEAT_GAP_MS
      ) {
        return;
      }
      lastHoverRef.current = { key: hoverKey, time: now };

      speakPhrase(buildHoverFeedback(interactiveElement, label), 'ui-focus', HOVER_REPEAT_GAP_MS);
    };
    const onFocusIn = (event) => {
      const interactiveElement = resolveInteractiveElement(event.target);
      if (!interactiveElement) return;

      const label = readElementLabel(interactiveElement);
      if (!label) return;

      const phrase = interactiveElement.matches(INPUT_SELECTOR)
        ? `اكتب في حقل الإدخال: ${label}`
        : `اضغط على الزر: ${label}`;
      speakPhrase(phrase, 'ui-focus', 950);
    };
    const onInput = (event) => {
      const rawTarget = event.target;
      if (!(rawTarget instanceof HTMLElement)) return;
      if (!rawTarget.matches(INPUT_SELECTOR)) return;
      if (rawTarget.closest('[data-no-voice-interaction="true"]')) return;

      const label = readElementLabel(rawTarget) || 'عنصر غير معروف';
      const key = `${rawTarget.tagName}:${rawTarget.getAttribute('name') || rawTarget.id || label}`;
      const now = Date.now();
      if (
        lastInputRef.current.key === key
        && now - lastInputRef.current.time < INPUT_REPEAT_GAP_MS
      ) {
        return;
      }
      lastInputRef.current = { key, time: now };

      speakPhrase(`اكتب أو أدخل نصاً جديداً في ${label}`, 'ui-focus', INPUT_REPEAT_GAP_MS);
    };

    const onChange = (event) => {
      const rawTarget = event.target;
      if (!(rawTarget instanceof HTMLElement)) return;
      if (!rawTarget.matches('select, input[type="checkbox"], input[type="radio"], input, textarea')) return;
      if (rawTarget.closest('[data-no-voice-interaction="true"]')) return;

      const label = readElementLabel(rawTarget);
      const value = readCurrentValue(rawTarget);
      speakPhrase(buildChangeFeedback(label, value), 'ui-action', 900);
    };

    const onSubmit = (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.closest('[data-no-voice-interaction="true"]')) return;

      const submitButton = event.submitter instanceof HTMLElement
        ? event.submitter
        : form.querySelector('button[type="submit"], input[type="submit"]');
      const label = readElementLabel(submitButton) || 'الطلب';
      speakPhrase(`تمام يا بطل، بننذ ${label}`, 'ui-action', 850, { interrupt: true });
    };

    const statusObserver = new MutationObserver((mutations) => {
      const candidates = new Set();

      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') {
          const parent = mutation.target?.parentElement;
          if (parent?.matches(STATUS_SELECTOR)) candidates.add(parent);
          return;
        }

        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(STATUS_SELECTOR)) candidates.add(node);
          node.querySelectorAll?.(STATUS_SELECTOR).forEach((element) => candidates.add(element));
        });
      });

      candidates.forEach((element) => narrateStatusElement(element));
    });

    const routeTimer = window.setTimeout(announceCurrentRoute, 520);
    statusObserver.observe(document.body, { childList: true, subtree: true, characterData: true });

    document.addEventListener('click', onClick, true);
    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('change', onChange, true);
    document.addEventListener('submit', onSubmit, true);

    return () => {
      window.clearTimeout(routeTimer);
      statusObserver.disconnect();
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('change', onChange, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, [enabled, speak, location.pathname]);

  return null;
}


