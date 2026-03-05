export default function Bubble({ voiceActive, voiceState, screenCapture, onToggleMenu }) {
  const isListening = voiceState === 'listening';
  const isSpeaking = voiceState === 'speaking';
  const isConnecting = voiceState === 'connecting';

  // Dynamic bubble style based on state
  const gradient = voiceActive
    ? isSpeaking
      ? 'from-pink-500 to-red-500'
      : 'from-green-400 to-emerald-600'
    : 'from-violet-500 to-indigo-600';

  const animation = voiceActive
    ? isSpeaking
      ? 'animate-pulse'
      : isListening
        ? 'bubble-breathe'
        : ''
    : 'bubble-breathe';

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <button
        onClick={onToggleMenu}
        className={`w-[60px] h-[60px] rounded-full
          bg-gradient-to-br ${gradient}
          flex items-center justify-center cursor-pointer
          transition-all duration-300 ${animation}`}
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        {isConnecting ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="animate-spin">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : voiceActive ? (
          /* Mic/wave icon when voice is active */
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            {isSpeaking ? (
              /* Sound wave icon */
              <>
                <path d="M2 12h2M6 8v8M10 5v14M14 8v8M18 10v4M22 12h0" />
              </>
            ) : (
              /* Mic icon */
              <>
                <rect x="9" y="2" width="6" height="11" rx="3" />
                <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </>
            )}
          </svg>
        ) : (
          /* Default lightbulb icon */
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a7 7 0 0 1 7 7c0 3-1.5 5.5-4 7v2H9v-2c-2.5-1.5-4-4-4-7a7 7 0 0 1 7-7z" />
            <path d="M9 22h6" />
            <path d="M10 18h4" />
          </svg>
        )}
      </button>

      {/* Screen capture indicator */}
      {screenCapture && (
        <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-green-400 animate-pulse border-2 border-black/50" />
      )}

      {/* Voice state label */}
      {voiceActive && (
        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/60 whitespace-nowrap">
          {isConnecting ? 'connecting' : isSpeaking ? 'speaking' : 'listening'}
        </span>
      )}
    </div>
  );
}
