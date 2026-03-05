export default function BubbleMenu({ voiceActive, voiceState, screenCapture, onMic, onChat, onClose }) {
  const isListening = voiceState === 'listening';
  const isSpeaking = voiceState === 'speaking';

  const gradient = voiceActive
    ? isSpeaking
      ? 'from-pink-500 to-red-500'
      : 'from-green-400 to-emerald-600'
    : 'from-violet-500 to-indigo-600';

  const animation = voiceActive
    ? isSpeaking ? 'animate-pulse' : 'bubble-breathe'
    : 'bubble-breathe';

  return (
    <div className="w-full h-full flex items-end justify-center pb-1" style={{ WebkitAppRegion: 'no-drag' }}>
      <div className="flex items-center gap-2">
        {/* Mic button */}
        <button
          onClick={onMic}
          className={`w-[46px] h-[46px] rounded-full flex items-center justify-center
            transition-all duration-200 cursor-pointer
            ${voiceActive
              ? 'bg-red-500 hover:bg-red-400 voice-pulse'
              : 'bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20'
            }`}
          title={voiceActive ? 'Stop voice' : 'Start voice'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </button>

        {/* Main bubble (click to close menu) */}
        <button
          onClick={onClose}
          className={`w-[54px] h-[54px] rounded-full bg-gradient-to-br ${gradient}
            flex items-center justify-center cursor-pointer
            transition-all duration-300 ${animation} relative`}
        >
          {voiceActive && isSpeaking ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M2 12h2M6 8v8M10 5v14M14 8v8M18 10v4M22 12h0" />
            </svg>
          ) : voiceActive ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          ) : (
            <span className="text-white text-lg font-bold">A</span>
          )}
          {screenCapture && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
          )}
        </button>

        {/* Chat button */}
        <button
          onClick={onChat}
          className="w-[46px] h-[46px] rounded-full bg-white/15 hover:bg-white/25
            backdrop-blur-sm border border-white/20
            flex items-center justify-center transition-all duration-200 cursor-pointer"
          title="Open chat"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* Voice state label */}
      {voiceActive && (
        <span className="absolute bottom-[-14px] left-1/2 -translate-x-1/2 text-[10px] text-white/50 whitespace-nowrap">
          {isSpeaking ? 'speaking' : 'listening'}
        </span>
      )}
    </div>
  );
}
