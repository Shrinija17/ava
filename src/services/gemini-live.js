const WEBSOCKET_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

function float32ToInt16(float32Array) {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

function int16ToFloat32(int16Array) {
  const float32 = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32[i] = int16Array[i] / 32768;
  }
  return float32;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export class GeminiLive {
  constructor({ onText, onTranscript, onAudioState, onToolCall, onStateChange }) {
    this.ws = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.playbackContext = null;
    this.nextPlayTime = 0;
    this.onText = onText;
    this.onTranscript = onTranscript;
    this.onAudioState = onAudioState;
    this.onToolCall = onToolCall;
    this.onStateChange = onStateChange;
    this.screenCaptureInterval = null;
    this.currentResponseText = '';
  }

  async connect() {
    const apiKey = await window.ava.getApiKey();
    const url = `${WEBSOCKET_URL}?key=${apiKey}`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.sendSetup();
      };

      this.ws.onmessage = async (event) => {
        let raw = event.data;
        if (raw instanceof Blob) {
          raw = await raw.text();
        }
        const data = JSON.parse(raw);

        if (data.setupComplete) {
          this.onStateChange?.('connected');
          resolve();
          return;
        }

        this.handleMessage(data);
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        this.onStateChange?.('error');
        reject(err);
      };

      this.ws.onclose = () => {
        this.onStateChange?.('disconnected');
      };
    });
  }

  sendSetup() {
    this.ws.send(JSON.stringify({
      setup: {
        model: 'models/gemini-2.5-flash-native-audio-latest',
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }
            }
          }
        },
        tools: [{
          functionDeclarations: [
            // --- Mouse & Keyboard ---
            {
              name: 'move_mouse',
              description: 'Move the mouse cursor to screen coordinates',
              parameters: { type: 'object', properties: { x: { type: 'integer' }, y: { type: 'integer' } }, required: ['x', 'y'] }
            },
            {
              name: 'click_mouse',
              description: 'Click at coordinates or current position',
              parameters: { type: 'object', properties: { x: { type: 'integer' }, y: { type: 'integer' } } }
            },
            {
              name: 'type_text',
              description: 'Type text at cursor position in any application',
              parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] }
            },
            {
              name: 'press_key',
              description: 'Press a key or shortcut (e.g. enter, tab, command+c)',
              parameters: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] }
            },
            {
              name: 'scroll',
              description: 'Scroll up or down. Use amount 8-15 for web pages like LinkedIn/Twitter',
              parameters: { type: 'object', properties: { direction: { type: 'string', description: 'up or down' }, amount: { type: 'integer', description: 'Scroll steps (default 5, use 8-15 for web)' } }, required: ['direction'] }
            },

            // --- System ---
            {
              name: 'run_command',
              description: 'Run a shell command (zsh) and return output. Use for git, npm, python, brew, curl, etc.',
              parameters: { type: 'object', properties: { command: { type: 'string' }, timeout: { type: 'integer' } }, required: ['command'] }
            },
            {
              name: 'open_app',
              description: 'Open a macOS app (Safari, Terminal, VS Code, Finder, Spotify, etc.)',
              parameters: { type: 'object', properties: { app_name: { type: 'string' } }, required: ['app_name'] }
            },
            {
              name: 'get_active_window',
              description: 'Get the currently focused app and window title',
              parameters: { type: 'object', properties: {} }
            },

            // --- Files ---
            {
              name: 'read_file',
              description: 'Read file contents from disk',
              parameters: { type: 'object', properties: { path: { type: 'string', description: 'Absolute path (~ supported)' } }, required: ['path'] }
            },
            {
              name: 'write_file',
              description: 'Write content to a file',
              parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] }
            },
            {
              name: 'list_files',
              description: 'List files and dirs in a path',
              parameters: { type: 'object', properties: { path: { type: 'string' } } }
            },

            // --- Memory ---
            {
              name: 'save_memory',
              description: 'Save to persistent markdown memory. Sections: User, Preferences, Facts, Tasks. Persists across sessions.',
              parameters: { type: 'object', properties: { section: { type: 'string', description: 'Section name (User, Preferences, Facts, Tasks, or custom)' }, content: { type: 'string', description: 'What to remember' } }, required: ['section', 'content'] }
            },
            {
              name: 'search_memory',
              description: 'Search all memory files (MEMORY.md + daily logs) for a keyword',
              parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
            },
            {
              name: 'get_context',
              description: 'Load full agent context: MEMORY.md, SOUL.md, and today\'s daily log. Call this at the start of a session.',
              parameters: { type: 'object', properties: {} }
            },

            // --- Web ---
            {
              name: 'web_search',
              description: 'Search the internet. Returns titles, snippets, and URLs.',
              parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
            },
            {
              name: 'web_fetch',
              description: 'Fetch a URL and return its text content (HTML stripped)',
              parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
            },

            // --- Accessibility Tree (precise UI control) ---
            {
              name: 'get_accessibility_tree',
              description: 'Get the UI element tree of the frontmost app. Returns roles, titles, values, positions of all buttons, text fields, links, etc. Much more precise than screenshots for clicking specific elements.',
              parameters: { type: 'object', properties: { max_depth: { type: 'integer', description: 'Tree depth (default 3)' } } }
            },
            {
              name: 'find_ui_element',
              description: 'Find specific UI elements by role and/or title in the frontmost app',
              parameters: { type: 'object', properties: { role: { type: 'string', description: 'UI role: button, text field, link, checkbox, etc.' }, title: { type: 'string' } } }
            },
            {
              name: 'click_ui_element',
              description: 'Click a UI element by role and title (more reliable than coordinate clicking)',
              parameters: { type: 'object', properties: { role: { type: 'string', description: 'button, link, checkbox, etc.' }, title: { type: 'string' } }, required: ['title'] }
            },
            {
              name: 'set_ui_element_value',
              description: 'Set the value of a UI element (text field, etc.)',
              parameters: { type: 'object', properties: { role: { type: 'string' }, title: { type: 'string' }, value: { type: 'string' } }, required: ['title', 'value'] }
            },

            // --- Skills ---
            {
              name: 'list_skills',
              description: 'List all available skills',
              parameters: { type: 'object', properties: {} }
            },
            {
              name: 'get_skill',
              description: 'Load a skill by name to get detailed instructions for a specific task',
              parameters: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }
            }
          ]
        }],
        systemInstruction: {
          parts: [{
            text: `You are Ava, an autonomous desktop AI agent. You are NOT a chatbot. You are an AGENT with full computer control, persistent memory, web access, and the ability to see and interact with everything on screen.

CAPABILITIES:
- VISION: Screenshots every 3s + accessibility tree for precise UI element detection
- VOICE: Hear the user via mic, speak back (keep it to 1-2 sentences)
- COMPUTER CONTROL: Mouse, keyboard, scroll, click UI elements by name
- TERMINAL: Run any shell command (git, npm, python, curl, etc.)
- FILES: Read, write, list files anywhere
- WEB: Search the internet, fetch web pages
- MEMORY: Persistent markdown memory across sessions (MEMORY.md, daily logs, SOUL.md)
- APPS: Open any macOS application
- ACCESSIBILITY: Parse UI trees to find buttons, links, text fields by name — click or set values directly
- SKILLS: Loadable skill files for specialized tasks

AGENT BEHAVIOR:
1. ACTION FIRST — When asked to do something, DO IT with tools immediately. Never describe steps without executing.
2. CHAIN TOOLS — Complex tasks = multiple tool calls. Do them all. Don't pause to ask between steps.
3. AUTO-REMEMBER — When the user shares personal info, preferences, or facts, call save_memory automatically.
4. LOAD CONTEXT — Call get_context at conversation start to load your memories and personality.
5. SCREEN + ACCESSIBILITY — Use screenshots to understand context, then use get_accessibility_tree or find_ui_element for precise interaction. For clicking buttons/links, prefer click_ui_element over coordinate clicking.
6. SMART SCROLL — Web pages (LinkedIn, Twitter, etc.) need scroll amount 10-15. Don't use small amounts.
7. WEB RESEARCH — When the user asks about current events, facts, or anything you're unsure about, use web_search.
8. SKILLS — Call list_skills to see available skills. Call get_skill to load instructions for specialized tasks.
9. DICTATION — When user says "type this", use type_text with their exact words.
10. ERROR RECOVERY — If a tool fails, try an alternative (e.g., click_ui_element instead of click_mouse).
11. DAILY LOG — Important actions get logged automatically to daily files.

PERSONALITY: Warm, casual, concise. A smart friend who gets things done. Use the user's name sometimes.

USER: Shrinija | Home: /Users/shrinija | Projects: ~/Projects/`
          }]
        }
      }
    }));
  }

  handleMessage(data) {
    // Tool calls
    if (data.toolCall) {
      const calls = data.toolCall.functionCalls || [];
      for (const call of calls) {
        this.handleToolCall(call);
      }
      return;
    }

    // Server content (audio/text responses)
    if (data.serverContent) {
      const parts = data.serverContent.modelTurn?.parts || [];

      for (const part of parts) {
        if (part.text) {
          this.currentResponseText += part.text;
        }
        if (part.inlineData) {
          this.onAudioState?.('speaking');
          this.playAudioChunk(part.inlineData.data);
        }
      }

      // Turn complete — flush text
      if (data.serverContent.turnComplete) {
        if (this.currentResponseText) {
          this.onText?.(this.currentResponseText);
          this.currentResponseText = '';
        }
        this.onAudioState?.('idle');
      }
    }
  }

  async handleToolCall(call) {
    let result;
    try {
      result = await window.ava.executeControl(call.name, call.args);
    } catch (err) {
      result = { success: false, error: err.message };
    }

    // Send tool response back to Gemini
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        toolResponse: {
          functionResponses: [{
            id: call.id,
            name: call.name,
            response: result
          }]
        }
      }));
    }

    this.onToolCall?.(call.name, call.args, result);
  }

  async startMic() {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
    });

    this.audioContext = new AudioContext({ sampleRate: 16000 });
    // AudioContext can start suspended — must resume
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    source.connect(this.processor);
    // Connect to destination so onaudioprocess fires (required by spec)
    this.processor.connect(this.audioContext.destination);

    this.processor.onaudioprocess = (event) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;

      const float32 = event.inputBuffer.getChannelData(0);

      // Check if we're actually getting audio data
      let maxVal = 0;
      for (let i = 0; i < float32.length; i++) {
        const abs = Math.abs(float32[i]);
        if (abs > maxVal) maxVal = abs;
      }
      // Skip silent frames (no mic data)
      if (maxVal < 0.0001) return;

      const int16 = float32ToInt16(float32);
      const base64 = arrayBufferToBase64(int16.buffer);

      this.ws.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [{
            mimeType: 'audio/pcm;rate=16000',
            data: base64
          }]
        }
      }));
    };

    console.log('[Ava] Mic started, AudioContext state:', this.audioContext.state, 'sampleRate:', this.audioContext.sampleRate);
    console.log('[Ava] Media stream tracks:', this.mediaStream.getAudioTracks().map(t => `${t.label} (${t.readyState})`));
    this.onStateChange?.('listening');
  }

  stopMic() {
    this.processor?.disconnect();
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.audioContext?.close();
    this.processor = null;
    this.mediaStream = null;
    this.audioContext = null;
  }

  playAudioChunk(base64Data) {
    if (!this.playbackContext) {
      this.playbackContext = new AudioContext({ sampleRate: 24000 });
      this.nextPlayTime = 0;
    }

    const arrayBuffer = base64ToArrayBuffer(base64Data);
    const int16 = new Int16Array(arrayBuffer);
    const float32 = int16ToFloat32(int16);

    const buffer = this.playbackContext.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = this.playbackContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.playbackContext.destination);

    const now = this.playbackContext.currentTime;
    const startTime = Math.max(now + 0.05, this.nextPlayTime);
    source.start(startTime);
    this.nextPlayTime = startTime + buffer.duration;
  }

  startScreenCapture(intervalMs = 3000) {
    this.screenCaptureInterval = setInterval(async () => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;

      try {
        const base64Jpeg = await window.ava.captureScreen();
        this.ws.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [{
              mimeType: 'image/jpeg',
              data: base64Jpeg
            }]
          }
        }));
      } catch (err) {
        console.error('Screen capture failed:', err);
      }
    }, intervalMs);
  }

  stopScreenCapture() {
    clearInterval(this.screenCaptureInterval);
    this.screenCaptureInterval = null;
  }

  sendImage(mimeType, base64Data) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      realtimeInput: {
        mediaChunks: [{
          mimeType,
          data: base64Data
        }]
      }
    }));
  }

  sendText(text) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true
      }
    }));
  }

  disconnect() {
    this.stopMic();
    this.stopScreenCapture();
    this.playbackContext?.close();
    this.ws?.close();
    this.ws = null;
    this.playbackContext = null;
    this.nextPlayTime = 0;
  }
}
