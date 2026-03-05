import { useState, useCallback } from 'react';
import Bubble from './components/Bubble';
import BubbleMenu from './components/BubbleMenu';
import ChatPanel from './components/ChatPanel';
import { useAva } from './hooks/useAva';

const BUBBLE_SIZE = 70;
const MENU_WIDTH = 200;
const MENU_HEIGHT = 80;
const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 580;

export default function App() {
  // view: 'bubble' | 'menu' | 'chat'
  const [view, setView] = useState('bubble');
  const ava = useAva();

  const resizeWindow = useCallback(async (targetView) => {
    switch (targetView) {
      case 'bubble':
        await window.ava?.togglePanel(false);
        break;
      case 'menu':
        // Custom size for the menu
        await window.ava?.resizeWindow(MENU_WIDTH, MENU_HEIGHT);
        break;
      case 'chat':
        await window.ava?.togglePanel(true);
        break;
    }
    setView(targetView);
  }, []);

  const handleBubbleClick = () => resizeWindow('menu');
  const handleMenuClose = () => resizeWindow('bubble');
  const handleOpenChat = () => resizeWindow('chat');
  const handleCloseChat = () => resizeWindow(ava.voiceActive ? 'menu' : 'bubble');

  const handleMicToggle = () => {
    ava.toggleVoice();
    // Stay on menu view — don't open the full panel
  };

  if (view === 'chat') {
    return <ChatPanel ava={ava} onClose={handleCloseChat} />;
  }

  if (view === 'menu') {
    return (
      <BubbleMenu
        voiceActive={ava.voiceActive}
        voiceState={ava.voiceState}
        screenCapture={ava.screenCapture}
        onMic={handleMicToggle}
        onChat={handleOpenChat}
        onClose={handleMenuClose}
      />
    );
  }

  return (
    <Bubble
      voiceActive={ava.voiceActive}
      voiceState={ava.voiceState}
      screenCapture={ava.screenCapture}
      onToggleMenu={handleBubbleClick}
    />
  );
}
