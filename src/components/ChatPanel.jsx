import { useState, useRef, useEffect } from 'react';

export default function ChatPanel({ onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hey! I'm Ava. What are you working on?" },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');

    // Placeholder — will be replaced with Gemini API
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: "I can see you're typing! Gemini integration coming soon." },
      ]);
    }, 600);
  };

  return (
    <div className="w-full h-full flex flex-col glass-panel rounded-2xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-white/10"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="text-white font-semibold text-sm">Ava</span>
          <span className="text-white/40 text-xs">always watching</span>
        </div>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white transition-colors cursor-pointer"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto message-scroll p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white rounded-br-md'
                  : 'bg-white/10 text-white/90 rounded-bl-md'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask Ava anything..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5
              text-white text-sm placeholder-white/30
              focus:outline-none focus:border-violet-500/50 transition-colors"
          />
          <button
            onClick={send}
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
