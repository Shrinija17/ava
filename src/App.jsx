import { useState } from 'react';
import Bubble from './components/Bubble';
import ChatPanel from './components/ChatPanel';

export default function App() {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggle = async () => {
    const next = !isExpanded;
    setIsExpanded(next);
    await window.ava?.togglePanel(next);
  };

  if (!isExpanded) {
    return <Bubble onClick={toggle} />;
  }

  return <ChatPanel onClose={toggle} />;
}
