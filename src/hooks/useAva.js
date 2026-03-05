import { useState, useRef, useCallback, useEffect } from 'react';
import { GeminiLive } from '../services/gemini-live';

export function useAva() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hey! I'm Ava. Tap the mic to talk or chat to type." },
  ]);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceState, setVoiceState] = useState('idle'); // idle, connecting, listening, speaking
  const [screenCapture, setScreenCapture] = useState(false);
  const [loading, setLoading] = useState(false);
  const liveRef = useRef(null);

  const toggleVoice = useCallback(async () => {
    if (voiceActive) {
      liveRef.current?.disconnect();
      liveRef.current = null;
      setVoiceActive(false);
      setVoiceState('idle');
      setScreenCapture(false);
      return;
    }

    setVoiceState('connecting');

    const live = new GeminiLive({
      onText: (text) => {
        setMessages((prev) => [...prev, { role: 'assistant', text }]);
      },
      onTranscript: (text) => {
        setMessages((prev) => [...prev, { role: 'user', text }]);
      },
      onAudioState: (state) => {
        setVoiceState(state === 'speaking' ? 'speaking' : 'listening');
      },
      onToolCall: (name, args, result) => {
        setMessages((prev) => [
          ...prev,
          { role: 'system', text: `${name}(${JSON.stringify(args).slice(0, 80)}) ${result.success ? '- done' : '- failed'}` },
        ]);
      },
      onStateChange: (state) => {
        if (state === 'connected') {
          setVoiceState('listening');
          setVoiceActive(true);
        } else if (state === 'error' || state === 'disconnected') {
          setVoiceState('idle');
          setVoiceActive(false);
          setScreenCapture(false);
        }
      },
    });

    try {
      await live.connect();
      await live.startMic();
      live.startScreenCapture(3000);
      setScreenCapture(true);
      liveRef.current = live;
      live.sendText('[SYSTEM] Load your context. Call get_context to read your memories and personality, then greet the user.');
    } catch (err) {
      console.error('Voice connection failed:', err);
      setVoiceState('idle');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: "Couldn't start voice mode. Check mic permissions." },
      ]);
    }
  }, [voiceActive]);

  const sendText = useCallback(async (text) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);

    if (voiceActive && liveRef.current) {
      liveRef.current.sendText(text);
    } else {
      setLoading(true);
      const response = await window.ava.chat(text);
      setMessages((prev) => [...prev, { role: 'assistant', text: response.text }]);
      setLoading(false);
    }
  }, [voiceActive]);

  const sendFile = useCallback(async (filePath) => {
    const file = await window.ava.readFileForChat(filePath);
    if (file.type === 'error') {
      setMessages((prev) => [...prev, { role: 'system', text: `Failed to read file: ${file.error}` }]);
      return;
    }

    if (file.type === 'image') {
      // Show image in chat
      setMessages((prev) => [...prev, { role: 'user', text: `[Shared image: ${file.name}]`, image: `data:${file.mime};base64,${file.data}` }]);

      if (voiceActive && liveRef.current) {
        // Send image to Gemini Live as inline data
        liveRef.current.sendImage(file.mime, file.data);
        liveRef.current.sendText(`I just shared an image called "${file.name}". Please look at it and tell me what you see.`);
      } else {
        setLoading(true);
        const response = await window.ava.chat(`[User shared an image: ${file.name}. Describe what you see or help with it.]`);
        setMessages((prev) => [...prev, { role: 'assistant', text: response.text }]);
        setLoading(false);
      }
    } else {
      // Text file
      const preview = file.content.slice(0, 200) + (file.content.length > 200 ? '...' : '');
      setMessages((prev) => [...prev, { role: 'user', text: `[Shared file: ${file.name}]\n${preview}` }]);

      const prompt = `The user shared a file called "${file.name}" (${file.ext}). Here's its content:\n\n${file.content}\n\nAcknowledge you received it and briefly summarize what it contains.`;

      if (voiceActive && liveRef.current) {
        liveRef.current.sendText(prompt);
      } else {
        setLoading(true);
        const response = await window.ava.chat(prompt);
        setMessages((prev) => [...prev, { role: 'assistant', text: response.text }]);
        setLoading(false);
      }
    }
  }, [voiceActive]);

  // Heartbeat listener
  useEffect(() => {
    const handler = (context) => {
      if (liveRef.current && voiceActive) {
        liveRef.current.sendText(
          `[HEARTBEAT] Time: ${context.time}. Check your HEARTBEAT.md checklist and memory for any reminders or tasks due. If something needs attention, speak up briefly.`
        );
      }
    };
    window.ava?.onHeartbeat(handler);
  }, [voiceActive]);

  // Cleanup
  useEffect(() => {
    return () => {
      liveRef.current?.disconnect();
    };
  }, []);

  return {
    messages,
    voiceActive,
    voiceState,
    screenCapture,
    loading,
    toggleVoice,
    sendText,
    sendFile,
  };
}
