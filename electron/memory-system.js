const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const DAILY_DIR = path.join(MEMORY_DIR, 'daily');

function ensureDirs() {
  fs.mkdirSync(DAILY_DIR, { recursive: true });
}

function todayFile() {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return path.join(DAILY_DIR, `${date}.md`);
}

// Read the core memory file
function readMemory() {
  ensureDirs();
  const memFile = path.join(MEMORY_DIR, 'MEMORY.md');
  try {
    return fs.readFileSync(memFile, 'utf-8');
  } catch {
    return '';
  }
}

// Read the soul/personality file
function readSoul() {
  try {
    return fs.readFileSync(path.join(MEMORY_DIR, 'SOUL.md'), 'utf-8');
  } catch {
    return '';
  }
}

// Read heartbeat config
function readHeartbeat() {
  try {
    return fs.readFileSync(path.join(MEMORY_DIR, 'HEARTBEAT.md'), 'utf-8');
  } catch {
    return '';
  }
}

// Read today's daily log
function readDailyLog() {
  ensureDirs();
  const file = todayFile();
  try {
    return fs.readFileSync(file, 'utf-8');
  } catch {
    return '';
  }
}

// Append to today's daily log
function appendDailyLog(entry) {
  ensureDirs();
  const file = todayFile();
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  const line = `\n[${timestamp}] ${entry}\n`;
  fs.appendFileSync(file, line);
  return { success: true, file };
}

// Save/update a section in MEMORY.md
function saveToMemory(section, content) {
  ensureDirs();
  const memFile = path.join(MEMORY_DIR, 'MEMORY.md');
  let existing = '';
  try {
    existing = fs.readFileSync(memFile, 'utf-8');
  } catch {}

  const sectionHeader = `## ${section}`;
  const lines = existing.split('\n');
  let inSection = false;
  let sectionStart = -1;
  let sectionEnd = lines.length;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === sectionHeader) {
      inSection = true;
      sectionStart = i;
      continue;
    }
    if (inSection && lines[i].startsWith('## ')) {
      sectionEnd = i;
      break;
    }
  }

  if (sectionStart === -1) {
    // Section doesn't exist — append it
    const newContent = existing.trimEnd() + `\n\n${sectionHeader}\n- ${content}\n`;
    fs.writeFileSync(memFile, newContent);
  } else {
    // Append to existing section
    lines.splice(sectionEnd, 0, `- ${content}`);
    fs.writeFileSync(memFile, lines.join('\n'));
  }

  return { success: true, section, content };
}

// Search across all memory files
function searchMemory(query) {
  ensureDirs();
  const q = query.toLowerCase();
  const results = [];

  // Search MEMORY.md
  const mem = readMemory();
  if (mem.toLowerCase().includes(q)) {
    const matches = mem.split('\n').filter(l => l.toLowerCase().includes(q));
    results.push({ file: 'MEMORY.md', matches });
  }

  // Search daily logs
  try {
    const dailyFiles = fs.readdirSync(DAILY_DIR).filter(f => f.endsWith('.md')).sort().reverse().slice(0, 7);
    for (const f of dailyFiles) {
      const content = fs.readFileSync(path.join(DAILY_DIR, f), 'utf-8');
      if (content.toLowerCase().includes(q)) {
        const matches = content.split('\n').filter(l => l.toLowerCase().includes(q));
        results.push({ file: `daily/${f}`, matches });
      }
    }
  } catch {}

  return results;
}

// Get full context for the agent (injected into system prompt)
function getAgentContext() {
  const memory = readMemory();
  const soul = readSoul();
  const daily = readDailyLog();
  return { memory, soul, daily };
}

module.exports = {
  readMemory,
  readSoul,
  readHeartbeat,
  readDailyLog,
  appendDailyLog,
  saveToMemory,
  searchMemory,
  getAgentContext,
};
