import { useState, useRef, useEffect, useCallback } from 'react';

export default function ChatPanel({ ava, onClose }) {
  const { messages, voiceActive, voiceState, screenCapture, loading, toggleVoice, sendText, sendFile } = ava;
  const [input, setInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const scrollRef = useRef(null);

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer?.files;
    if (files?.length > 0) {
      const filePath = window.ava.getFilePath(files[0]);
      if (filePath) sendFile(filePath);
    }
  }, [sendFile]);

  const handleFileSelect = useCallback(async () => {
    const filePath = await window.ava.openFileDialog();
    if (filePath) sendFile(filePath);
  }, [sendFile]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    sendText(text);
  };

  const voiceStateLabel = {
    idle: '',
    connecting: 'connecting...',
    listening: 'listening',
    speaking: 'speaking',
  };

  return (
    <div className="w-full h-full flex flex-col glass-panel rounded-2xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-white/10"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center ${
            voiceState === 'speaking' ? 'animate-pulse' : ''
          }`}>
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="text-white font-semibold text-sm">Ava</span>
          {voiceActive && (
            <span className="text-violet-400 text-xs">{voiceStateLabel[voiceState]}</span>
          )}
          {!voiceActive && (
            <span className="text-white/40 text-xs">always here</span>
          )}
        </div>
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
          {screenCapture && (
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Screen capture active" />
          )}
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages — drop zone */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto message-scroll p-4 space-y-3 transition-colors ${dragOver ? 'bg-violet-500/10 border-2 border-dashed border-violet-500/40' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleFileDrop}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white rounded-br-md'
                  : msg.role === 'system'
                    ? 'bg-white/5 text-white/40 text-xs font-mono rounded-lg'
                    : 'bg-white/10 text-white/90 rounded-bl-md'
              }`}
            >
              {msg.image && (
                <img src={msg.image} alt="" className="max-w-full rounded-lg mb-1 max-h-40" />
              )}
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 px-4 py-2 rounded-2xl rounded-bl-md flex gap-1">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleVoice}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              voiceActive
                ? 'bg-red-500 hover:bg-red-400 voice-pulse'
                : 'bg-white/10 hover:bg-white/20'
            }`}
            title={voiceActive ? 'Stop voice mode' : 'Start voice mode'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </button>

          {/* File picker */}
          <button
            onClick={handleFileSelect}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20
              flex items-center justify-center transition-colors cursor-pointer"
            title="Share a file"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={voiceActive ? 'Voice active — or type...' : 'Ask Ava anything...'}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5
              text-white text-sm placeholder-white/30
              focus:outline-none focus:border-violet-500/50 transition-colors"
          />
          <button
            onClick={handleSend}
            className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500
              flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
