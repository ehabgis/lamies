import { useEffect, useRef, useState } from 'react';
import { useVoiceNarration } from '../context/VoiceNarrationContext';
import { avatarPhrases } from '../data/avatarPhrases';

function pickRandom(arr = []) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function GlobalFantasyKidAvatar() {
  const { enabled, isSpeaking, speak, voicesReady } = useVoiceNarration();
  const lastSpokeAt = useRef(0);
  const [interactive] = useState(true);

  const trySpeak = (listName, opts = {}) => {
    const now = Date.now();
    if (now - lastSpokeAt.current < (opts.throttleMs || 700)) return;
    lastSpokeAt.current = now;
    const phrase = pickRandom(avatarPhrases[listName]);
    if (phrase) {
      speak(phrase, { channel: 'assistant-reply', profile: 'child', ...opts });
    }
  };

  useEffect(() => {
    // greet once when voices become ready
    if (voicesReady && enabled) {
      trySpeak('greetings', { throttleMs: 1200, pitch: 1.15, rate: 1.0, profile: 'child' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voicesReady, enabled]);

  const handleClick = () => trySpeak('click', { pitch: 1.15, rate: 1.0, profile: 'child' });
  const handleHover = () => trySpeak('hover', { pitch: 1.16, rate: 1.0, throttleMs: 1200, profile: 'child' });
  const handlePlayful = () => trySpeak('playful', { pitch: 1.14, rate: 1.0, profile: 'child' });

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="طل كرتوني حيوي متاعل"
      onClick={handleClick}
      onMouseEnter={handleHover}
      onFocus={handleHover}
      onDoubleClick={handlePlayful}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      className={`fantasy-kid-widget${isSpeaking ? ' is-speaking' : ''}${enabled ? '' : ' is-muted'}${interactive ? ' interactive' : ''}`}
    >
      <span className="fantasy-kid-aura" />
      <span className="fantasy-kid-glow-ring" />
      <span className="fantasy-kid-spark fantasy-kid-spark-1"></span>
      <span className="fantasy-kid-spark fantasy-kid-spark-2"></span>
      <span className="fantasy-kid-spark fantasy-kid-spark-3"></span>

      <div className="fantasy-kid-shell fantasy-kid-avatar">
        <svg
          viewBox="0 0 220 220"
          className="fantasy-kid-svg"
          role="img"
          aria-label="طل كرتوني مصري حيوي"
        >
          <defs>
            <linearGradient id="kidHair" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2d140f" />
              <stop offset="70%" stopColor="#3f1f18" />
              <stop offset="100%" stopColor="#5a2f24" />
            </linearGradient>
            <linearGradient id="kidFace" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffd8be" />
              <stop offset="100%" stopColor="#ffc39e" />
            </linearGradient>
            <linearGradient id="kidScarf" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff7b36" />
              <stop offset="100%" stopColor="#ff5a2e" />
            </linearGradient>
            <linearGradient id="kidRobe" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#edf0f5" />
            </linearGradient>
            <linearGradient id="kidCapGreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#36a236" />
              <stop offset="100%" stopColor="#1f7b2b" />
            </linearGradient>
            <linearGradient id="kidCapYellow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffd95b" />
              <stop offset="100%" stopColor="#e6b91f" />
            </linearGradient>
          </defs>

          <g className="fantasy-kid-cap-group">
            <path
              d="M72 48 C79 30, 97 20, 118 21 C138 22, 153 32, 160 48 C147 44, 133 42, 118 43 C103 44, 88 46, 72 52 Z"
              fill="url(#kidCapGreen)"
            />
            <path d="M86 41 L96 33 L105 40 L116 31 L126 39 L138 32 L150 40" fill="none" stroke="url(#kidCapYellow)" strokeWidth="7.2" strokeLinecap="round" strokeLinejoin="round" />
            <ellipse cx="160" cy="44" rx="5.2" ry="4.2" fill="#cf2f22" />
          </g>

          <g className="fantasy-kid-head-group">
            <ellipse cx="58" cy="99" rx="8" ry="12" fill="#ffc7a3" />
            <ellipse cx="162" cy="99" rx="8" ry="12" fill="#ffc7a3" />
            <ellipse cx="110" cy="98" rx="52" ry="55" fill="url(#kidFace)" />
            <ellipse cx="73" cy="85" rx="30" ry="26" fill="url(#kidHair)" />
            <ellipse cx="146" cy="84" rx="30" ry="25" fill="url(#kidHair)" />
            <path
              d="M64 96 C62 63, 83 45, 110 45 C137 45, 157 63, 156 97 C143 79, 128 72, 110 72 C92 72, 77 79, 64 96 Z"
              fill="url(#kidHair)"
            />
            <path
              d="M112 70 C114 55, 123 47, 136 44"
              fill="none" stroke="#63362b" strokeWidth="4.8" strokeLinecap="round" opacity="0.9"
            />

            <g className="fantasy-kid-brows-group">
              <path d="M79 86 C86 82, 95 82, 101 86" fill="none" stroke="#5a2f24" strokeWidth="3" strokeLinecap="round" />
              <path d="M119 86 C125 82, 134 82, 141 86" fill="none" stroke="#5a2f24" strokeWidth="3" strokeLinecap="round" />
            </g>

            <g className="fantasy-kid-eyes-group">
              <ellipse cx="88" cy="102" rx="10" ry="9.2" fill="#ffffff" />
              <ellipse cx="132" cy="102" rx="10" ry="9.2" fill="#ffffff" />
              <ellipse cx="88" cy="103" rx="5.1" ry="5.8" fill="#2b2a2f" />
              <ellipse cx="132" cy="103" rx="5.1" ry="5.8" fill="#2b2a2f" />
              <ellipse cx="87.2" cy="101.1" rx="1.6" ry="1.8" fill="#ffffff" opacity="0.95" />
              <ellipse cx="131.2" cy="101.1" rx="1.6" ry="1.8" fill="#ffffff" opacity="0.95" />
            </g>

            <path d="M110 106 C108 114, 108 119, 112 123" fill="none" stroke="#dfab88" strokeWidth="2.2" strokeLinecap="round" />
            <ellipse cx="79" cy="123" rx="7.2" ry="4.4" fill="#ff9a9f" opacity="0.45" />
            <ellipse cx="141" cy="123" rx="7.2" ry="4.4" fill="#ff9a9f" opacity="0.45" />

            <g className="fantasy-kid-mouth-group">
              <path
                d="M89 131 C101 142, 119 142, 131 131"
                className="fantasy-kid-upper-lip"
                fill="none"
                stroke="#ca4a58"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M94 136 C102 144, 118 144, 126 136"
                className="fantasy-kid-lower-lip"
                fill="none"
                stroke="#f06c79"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <ellipse
                cx="110" cy="136" rx="11.7" ry="5.3"
                className="fantasy-kid-mouth-open"
                fill="#8b1f40"
              />
              <g className="fantasy-kid-whistle-group">
                <ellipse cx="123.5" cy="137" rx="6.8" ry="3.8" fill="#b8bfcc" />
                <circle cx="125.6" cy="137" r="1.9" fill="#727e94" />
              </g>
            </g>
          </g>

          <g className="fantasy-kid-body-group">
            <path d="M103 146 L117 146 L121 158 L99 158 Z" fill="#ffc8a1" />
            <path d="M52 200 C55 161, 70 142, 110 140 C150 142, 165 161, 168 200 Z" fill="url(#kidRobe)" stroke="#d9dfeb" strokeWidth="2" />

            <path d="M72 156 C53 159, 39 170, 37 186 C46 195, 62 194, 81 184 C77 173, 75 164, 72 156 Z" fill="url(#kidRobe)" stroke="#d9dfeb" strokeWidth="2" />
            <path d="M145 132 C152 111, 159 92, 169 75 C177 60, 186 58, 194 63 C197 72, 194 81, 189 91 C183 106, 178 120, 174 136 Z" fill="url(#kidRobe)" stroke="#d9dfeb" strokeWidth="2" />

            <path className="fantasy-kid-hand-right" d="M184 56 C191 54, 198 59, 198 67 C198 74, 193 79, 186 78 C180 77, 175 71, 176 64 C177 60, 180 57, 184 56 Z" fill="#ffd2ae" />
            <path className="fantasy-kid-hand-left" d="M82 182 C73 184, 68 190, 69 198 C74 203, 84 203, 91 197 C92 190, 89 184, 82 182 Z" fill="#ffd2ae" />

            <g className="fantasy-kid-scarf-group">
              <path d="M84 148 C96 139, 124 139, 136 148 C134 157, 123 163, 110 163 C97 163, 86 157, 84 148 Z" fill="url(#kidScarf)" />
              <path d="M95 160 L83 200 L101 200 L111 161 Z" fill="#ff7339" />
              <path d="M121 160 L130 200 L147 200 L133 160 Z" fill="#ff6a34" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}


