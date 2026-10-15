import { motion } from 'framer-motion';
import { SpeakerHigh, SpeakerSlash } from 'phosphor-react';
import { useVoiceNarration } from '../context/VoiceNarrationContext';

const VOICE_ENABLED_HINT = 'الصوت شغال يا بطل. أنا معاك في كل خطوة.';

export default function GlobalVoiceToggleButton() {
  const { enabled, setEnabled, stop, speak, speechSupported, preferredProfile, setPreferredProfile } = useVoiceNarration();

  const PROFILE_ORDER = ['child', 'male', 'female', 'auto'];
  const PROFILE_LABELS = {
    male: 'راجل',
    child: 'طفل',
    female: 'ست',
    auto: 'تلقائي'
  };

  const handleToggle = () => {
    if (!speechSupported) return;
    if (enabled) {
      stop();
      setEnabled(false);
      return;
    }

    setEnabled(true);
    window.setTimeout(() => {
      speak(VOICE_ENABLED_HINT, { channel: 'assistant-reply', profile: 'child' });
    }, 120);
  };

  const cycleProfile = (event) => {
    event.preventDefault();
    const currentIndex = PROFILE_ORDER.indexOf(preferredProfile) !== -1 ? PROFILE_ORDER.indexOf(preferredProfile) : 0;
    const next = PROFILE_ORDER[(currentIndex + 1) % PROFILE_ORDER.length];
    setPreferredProfile(next);
    speak(`تم اختيار صوت ${PROFILE_LABELS[next]}`, { channel: 'assistant-reply', profile: 'child' });
  };

  return (
    <div className="fixed top-5 left-4 md:left-6 z-[13000]">
      <motion.button
        type="button"
        onClick={handleToggle}
        onContextMenu={cycleProfile}
        whileHover={{ scale: speechSupported ? 1.06 : 1 }}
        whileTap={{ scale: speechSupported ? 0.94 : 1 }}
        data-no-voice-interaction="true"
        disabled={!speechSupported}
        className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-black shadow-xl transition ${enabled
          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-white/70'
          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          } ${!speechSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={!speechSupported ? 'المتصفح لا يدعم الصوت' : enabled ? 'إيقاف/تغيير الصوت (زر يمين)' : 'تشغيل/تغيير الصوت (زر يمين)'}
      >
        {enabled ? <SpeakerHigh size={18} weight="fill" /> : <SpeakerSlash size={18} weight="fill" />}
        <span>{enabled ? `الصوت شغال (${PROFILE_LABELS[preferredProfile] || ''})` : 'الصوت مقفول'}</span>
      </motion.button>
    </div>
  );
}



