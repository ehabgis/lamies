import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const VOICE_PROFILE_KEY = 'platform_voice_profile_v1';
const VOICE_URI_KEY = 'platform_voice_uri_v1';
const VOICE_ENABLED_KEY = 'platform_voice_enabled_v1';

export const VOICE_PROFILES = {
    auto: { id: 'auto', label: 'تلقائي' },
    child: { id: 'child', label: 'طفل' },
    male: { id: 'male', label: 'راجل' },
    female: { id: 'female', label: 'ست' }
};

const PROFILE_TUNING = {
    auto: { rate: 0.9, pitch: 0.86 },
    child: { rate: 1.0, pitch: 1.15 },
    male: { rate: 0.85, pitch: 0.75 },
    female: { rate: 0.97, pitch: 1.16 }
};

const CHANNEL_PROFILE = {
    'assistant-reply': 'child',
    'assistant-repeat': 'child',
    'map-intro': 'child',
    'map-hover': 'child',
    'map-insight': 'child',
    'quiz-question': 'child',
    'quiz-feedback': 'child',
    'ui-action': 'child',
    'ui-focus': 'child',
    'page-greeting': 'child',
    default: 'child'
};

const DEFAULT_ROUTE_PROFILE = 'child';
const ROUTE_PROFILE_RULES = [];

const FEMALE_VOICE_HINTS = [
    'female', 'woman', 'girl', 'zira', 'sara', 'mona', 'hana', 'laila', 'hoda', 'salma',
    'aria', 'ava', 'ella', 'lily', 'emma', 'olivia', 'sophia', 'bella', 'susan', 'joanna',
    'google_ar_female', 'ar_female', 'amazon_female', 'polly_female', 'tts_female'
];

const MALE_VOICE_HINTS = [
    'male', 'man', 'boy', 'hany', 'omar', 'karim', 'majed', 'maged', 'naayf', 'naif', 'hamza', 'rashid',
    'david', 'mark', 'ryan', 'andrew', 'guy', 'tony', 'christopher', 'james', 'daniel', 'michael', 'eric',
    'thomas', 'adam', 'ali', 'ahmed', 'ibrahim', 'ismail', 'rayan', 'liam', 'noah', 'oliver', 'elijah',
    'benjamin', 'lucas', 'henry', 'alexander', 'google_ar_male', 'ar_male', 'amazon_male', 'polly_male', 'tts_male'
];

const CHILD_VOICE_HINTS = ['child', 'kid', 'kids', 'young', 'junior', 'little', 'teen'];

const EGYPTIAN_SPEECH_REPLACEMENTS = [
    [/أهلاً بك/g, 'أهلا بيك'],
    [/أهلا بك/g, 'أهلا بيك'],
    [/أهلاً بكم/g, 'أهلا بيكم'],
    [/مرحباً|مرحبا|مرحبًا/g, 'أهلا'],
    [/الآن/g, 'دلوقتي'],
    [/لماذا/g, 'ليه'],
    [/هذه/g, 'دي'],
    [/هذا/g, 'ده'],
    [/يمكنك/g, 'تقدر'],
    [/يرجى/g, 'من فضلك'],
    [/ ثم /g, ' وبعد كده ']
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const normalizeLang = (value = '') => String(value || '').toLowerCase();
const hasSpeechSynthesis = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
const isArabicLanguageTag = (value = '') => normalizeLang(value).startsWith('ar');
const isArabicVoice = (voice) => isArabicLanguageTag(voice?.lang || '');
const containsAnyHint = (value = '', hints = []) => hints.some((hint) => value.includes(hint));
const getVoiceLabel = (voice) => `${voice?.name || ''} ${voice?.voiceURI || ''}`.toLowerCase();
const voiceMatchesHints = (voice, hints) => containsAnyHint(getVoiceLabel(voice), hints);
const pickFirst = (voices, predicate) => voices.find(predicate) || null;

const resolveProfileFromRoute = (pathname = '') => {
    for (const rule of ROUTE_PROFILE_RULES) {
        if (rule.test(pathname)) return rule.profile;
    }
    return DEFAULT_ROUTE_PROFILE;
};

const resolveChannelProfile = (channel) => CHANNEL_PROFILE[channel] || CHANNEL_PROFILE.default;

const getVoicesByLanguage = (voices, languageTag = 'ar', strict = false) => {
    if (!Array.isArray(voices) || !voices.length) return [];
    const normalized = normalizeLang(languageTag);
    const languageMatches = voices.filter((voice) => (voice.lang || '').toLowerCase().startsWith(normalized));
    if (languageMatches.length) return languageMatches;
    return strict ? [] : voices;
};

const pickVoiceByProfile = (voices, profile, languageTag = 'ar') => {
    const allCandidates = Array.isArray(voices) ? voices : [];
    if (!allCandidates.length) return null;

    const strictArabic = isArabicLanguageTag(languageTag);
    const candidates = getVoicesByLanguage(allCandidates, languageTag, strictArabic);
    const fallbackCandidates = strictArabic ? [] : allCandidates;

    if (profile === 'female') {
        return pickFirst(candidates, (voice) => voiceMatchesHints(voice, FEMALE_VOICE_HINTS))
            || pickFirst(fallbackCandidates, (voice) => voiceMatchesHints(voice, FEMALE_VOICE_HINTS))
            || candidates[0]
            || fallbackCandidates[0]
            || null;
    }

    if (profile === 'male') {
        return pickFirst(candidates, (voice) => voiceMatchesHints(voice, MALE_VOICE_HINTS) && !voiceMatchesHints(voice, FEMALE_VOICE_HINTS))
            || pickFirst(candidates, (voice) => !voiceMatchesHints(voice, FEMALE_VOICE_HINTS))
            || pickFirst(fallbackCandidates, (voice) => voiceMatchesHints(voice, MALE_VOICE_HINTS) && !voiceMatchesHints(voice, FEMALE_VOICE_HINTS))
            || pickFirst(fallbackCandidates, (voice) => !voiceMatchesHints(voice, FEMALE_VOICE_HINTS))
            || candidates[0]
            || fallbackCandidates[0]
            || null;
    }

    if (profile === 'child') {
        return pickFirst(
            candidates,
            (voice) => voiceMatchesHints(voice, CHILD_VOICE_HINTS) && !voiceMatchesHints(voice, FEMALE_VOICE_HINTS)
        ) || pickVoiceByProfile(candidates, 'male', languageTag) || candidates[0] || null;
    }

    return candidates[0] || fallbackCandidates[0] || null;
};

const toEgyptianSpokenText = (value = '') => {
    let output = String(value || '');
    for (const [pattern, replacement] of EGYPTIAN_SPEECH_REPLACEMENTS) {
        output = output.replace(pattern, replacement);
    }
    return output.replace(/\s+/g, ' ').trim();
};

const VoiceNarrationContext = createContext(null);

export function VoiceNarrationProvider({ children }) {
    const [enabled, setEnabledState] = useState(() => {
        if (typeof window === 'undefined') return true;
        return localStorage.getItem(VOICE_ENABLED_KEY) !== '0';
    });
    const [preferredProfile, setPreferredProfile] = useState(() => {
        if (typeof window === 'undefined') return 'child';
        const stored = localStorage.getItem(VOICE_PROFILE_KEY);
        // default to child voice for new installs, and migrate any female/auto preference
        if (!stored) return 'child';
        if (stored === 'female' || stored === 'auto') return 'child';
        return stored;
    });
    const [forcedVoiceURI, setForcedVoiceURIState] = useState(() => (
        typeof window === 'undefined'
            ? ''
            : localStorage.getItem(VOICE_URI_KEY) || ''
    ));
    const [routePathname, setRoutePathname] = useState('/');
    const [voicesReady, setVoicesReady] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const speechSupported = hasSpeechSynthesis();
    const voicesRef = useRef([]);
    const speakingCountRef = useRef(0);
    const readyAnnouncementRef = useRef(false);

    const markSpeechStart = useCallback(() => {
        speakingCountRef.current += 1;
        if (speakingCountRef.current > 0) {
            setIsSpeaking(true);
        }
    }, []);

    const markSpeechEnd = useCallback(() => {
        speakingCountRef.current = Math.max(0, speakingCountRef.current - 1);
        if (speakingCountRef.current === 0) {
            setIsSpeaking(false);
        }
    }, []);

    const resetSpeechState = useCallback(() => {
        speakingCountRef.current = 0;
        setIsSpeaking(false);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setRoutePathname(window.location?.pathname || '/');
    }, []);

    useEffect(() => {
        if (!speechSupported) return undefined;
        const synthesis = window.speechSynthesis;

        const updateVoices = () => {
            voicesRef.current = synthesis.getVoices() || [];
            setVoicesReady(voicesRef.current.length > 0);
        };

        updateVoices();

        if (typeof synthesis.addEventListener === 'function') {
            synthesis.addEventListener('voiceschanged', updateVoices);
            return () => synthesis.removeEventListener('voiceschanged', updateVoices);
        }

        const previousHandler = synthesis.onvoiceschanged;
        synthesis.onvoiceschanged = updateVoices;
        return () => {
            if (synthesis.onvoiceschanged === updateVoices) {
                synthesis.onvoiceschanged = previousHandler || null;
            }
        };
    }, [speechSupported]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(VOICE_PROFILE_KEY, preferredProfile || 'child');
    }, [preferredProfile]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(VOICE_ENABLED_KEY, enabled ? '1' : '0');
        if (!enabled && speechSupported) {
            window.speechSynthesis.cancel();
            resetSpeechState();
        }
    }, [enabled, speechSupported, resetSpeechState]);

    // migrate stored profile on first load, but do not force changes afterwards
    useEffect(() => {
        if (!VOICE_PROFILES[preferredProfile] || preferredProfile === 'female' || preferredProfile === 'auto') {
            setPreferredProfile('child');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!forcedVoiceURI) {
            localStorage.removeItem(VOICE_URI_KEY);
            return;
        }
        localStorage.setItem(VOICE_URI_KEY, forcedVoiceURI);
    }, [forcedVoiceURI]);

    useEffect(() => {
        if (!voicesReady) return;
        const bestMaleVoice = pickVoiceByProfile(voicesRef.current, 'male', 'ar');
        if (bestMaleVoice?.voiceURI && bestMaleVoice.voiceURI !== forcedVoiceURI) {
            setForcedVoiceURIState(bestMaleVoice.voiceURI);
        }
    }, [voicesReady, forcedVoiceURI]);

    const setEnabled = useCallback((nextValue) => {
        setEnabledState((current) => {
            const resolved = typeof nextValue === 'function' ? nextValue(current) : nextValue;
            return resolved !== false;
        });
    }, []);

    const setForcedVoiceURI = useCallback((nextValue) => {
        setForcedVoiceURIState((current) => {
            const resolved = typeof nextValue === 'function' ? nextValue(current) : nextValue;
            return typeof resolved === 'string' ? resolved : '';
        });
    }, []);

    const activeProfile = useMemo(
        () => resolveProfileFromRoute(routePathname),
        [routePathname]
    );

    const stop = useCallback(() => {
        if (!speechSupported) return;
        window.speechSynthesis.cancel();
        resetSpeechState();
    }, [speechSupported, resetSpeechState]);

    const resolveProfile = useCallback((profile = 'auto', channel = 'default') => {
        if (profile && profile !== 'auto' && profile !== 'default') return profile;
        if (preferredProfile && preferredProfile !== 'auto') return preferredProfile;
        const channelProfile = resolveChannelProfile(channel);
        if (channelProfile && channelProfile !== 'auto') return channelProfile;
        if (activeProfile && activeProfile !== 'auto') return activeProfile;
        return DEFAULT_ROUTE_PROFILE;
    }, [preferredProfile, activeProfile]);

    const speak = useCallback((text, optionsOrLegacy = {}, maybeOptions = {}) => {
        if (!enabled || !text || !speechSupported) return null;

        const options = (optionsOrLegacy && typeof optionsOrLegacy === 'object' && !Array.isArray(optionsOrLegacy))
            ? optionsOrLegacy
            : ((maybeOptions && typeof maybeOptions === 'object') ? maybeOptions : {});

        const {
            channel = 'default',
            profile = 'auto',
            lang = 'ar-EG',
            interrupt = true,
            onStart,
            onEnd
        } = options;

        const resolvedProfile = resolveProfile(profile, channel);
        const tuning = PROFILE_TUNING[resolvedProfile] || PROFILE_TUNING.male;
        const synthesis = window.speechSynthesis;
        const languageRoot = normalizeLang((lang || 'ar-EG').split('-')[0] || lang);
        const isArabicRequest = isArabicLanguageTag(languageRoot);

        if (interrupt) {
            synthesis.cancel();
            resetSpeechState();
        }

        const spokenText = options.rawDialect ? String(text) : toEgyptianSpokenText(text);
        const utterance = new SpeechSynthesisUtterance(spokenText);
        utterance.lang = lang;
        utterance.rate = clamp(options.rate ?? tuning.rate, 0.75, 2);
        utterance.pitch = clamp(options.pitch ?? tuning.pitch, 0.5, 2);
        utterance.volume = clamp(options.volume ?? 1, 0, 1);

        const voicePool = voicesRef.current.length ? voicesRef.current : (synthesis.getVoices() || []);
        if (voicePool.length && !voicesRef.current.length) {
            voicesRef.current = voicePool;
            setVoicesReady(true);
        }

        let selectedVoice = null;

        if (forcedVoiceURI) {
            selectedVoice = voicePool.find((voice) => voice.voiceURI === forcedVoiceURI) || null;
            if (selectedVoice && isArabicRequest && !isArabicVoice(selectedVoice)) {
                selectedVoice = null;
            }
        }

        if (!selectedVoice) {
            selectedVoice = pickVoiceByProfile(voicePool, resolvedProfile, languageRoot);
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang || lang;
            if (selectedVoice.voiceURI && selectedVoice.voiceURI !== forcedVoiceURI) {
                setForcedVoiceURIState(selectedVoice.voiceURI);
            }
        }

        if (resolvedProfile === 'child') {
            utterance.rate = clamp(Math.max(utterance.rate, 1.0), 0.75, 1.2);
            utterance.pitch = clamp(Math.max(utterance.pitch, 1.15), 0.5, 1.45);
        }

        let handledEnd = false;
        const handleSpeechEnd = (event) => {
            if (handledEnd) return;
            handledEnd = true;
            markSpeechEnd();
            if (typeof onEnd === 'function') {
                onEnd(event);
            }
        };

        utterance.onstart = (event) => {
            markSpeechStart();
            if (typeof onStart === 'function') {
                onStart(event);
            }
        };
        utterance.onend = handleSpeechEnd;
        utterance.onerror = handleSpeechEnd;

        synthesis.speak(utterance);
        return utterance;
    }, [enabled, speechSupported, resolveProfile, forcedVoiceURI, markSpeechStart, markSpeechEnd, resetSpeechState]);

    useEffect(() => {
        if (!enabled || !speechSupported) {
            readyAnnouncementRef.current = false;
            return;
        }
        if (!voicesReady) {
            readyAnnouncementRef.current = false;
            return;
        }
        if (readyAnnouncementRef.current) return;

        readyAnnouncementRef.current = true;
        const prof = preferredProfile || 'child';
        speak('الصوت الآن جاهز ويمكنك الاستماع.', {
            channel: 'assistant-reply',
            profile: prof,
            interrupt: false
        });
    }, [enabled, voicesReady, speechSupported, speak, preferredProfile]);

    const value = useMemo(() => ({
        enabled,
        setEnabled,
        preferredProfile,
        setPreferredProfile,
        forcedVoiceURI,
        setForcedVoiceURI,
        profiles: Object.values(VOICE_PROFILES),
        activeProfile,
        setRoutePathname,
        voicesReady,
        isSpeaking,
        speak,
        stop,
        resolveProfile,
        speechSupported
    }), [
        enabled,
        setEnabled,
        preferredProfile,
        setPreferredProfile,
        forcedVoiceURI,
        setForcedVoiceURI,
        activeProfile,
        setRoutePathname,
        voicesReady,
        isSpeaking,
        speak,
        stop,
        resolveProfile,
        speechSupported
    ]);

    return (
        <VoiceNarrationContext.Provider value={value}>
            {children}
        </VoiceNarrationContext.Provider>
    );
}

export function useVoiceNarration() {
    const context = useContext(VoiceNarrationContext);
    if (!context) {
        throw new Error('useVoiceNarration must be used inside VoiceNarrationProvider');
    }
    return context;
}
