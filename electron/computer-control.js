const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { saveToMemory, searchMemory, appendDailyLog, getAgentContext } = require('./memory-system');
const { getAccessibilityTree, findUIElement, clickUIElement, setUIElementValue } = require('./accessibility');
const { getSkillContent, getSkillSummaries, findRelevantSkills } = require('./skills-loader');

// --- Mouse & Keyboard ---

function moveMouse(x, y) {
  execSync(`osascript -e '
    use framework "CoreGraphics"
    set pt to current application\\'s CGPointMake(${x}, ${y})
    set moveEvent to current application\\'s CGEventCreateMouseEvent(missing value, current application\\'s kCGEventMouseMoved, pt, 0)
    current application\\'s CGEventPost(current application\\'s kCGHIDEventTap, moveEvent)
  '`);
  return { success: true, action: 'move_mouse', x, y };
}

function clickMouse(x, y) {
  if (x !== undefined && y !== undefined) {
    moveMouse(x, y);
  }
  const script = x !== undefined
    ? `
      use framework "CoreGraphics"
      set pt to current application\\'s CGPointMake(${x}, ${y})
      set downEvent to current application\\'s CGEventCreateMouseEvent(missing value, current application\\'s kCGEventLeftMouseDown, pt, 0)
      set upEvent to current application\\'s CGEventCreateMouseEvent(missing value, current application\\'s kCGEventLeftMouseUp, pt, 0)
      current application\\'s CGEventPost(current application\\'s kCGHIDEventTap, downEvent)
      delay 0.05
      current application\\'s CGEventPost(current application\\'s kCGHIDEventTap, upEvent)
    `
    : `
      tell application "System Events" to click
    `;
  execSync(`osascript -e '${script}'`);
  return { success: true, action: 'click_mouse', x, y };
}

function typeText(text) {
  const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  execSync(`osascript -e 'tell application "System Events" to keystroke "${escaped}"'`);
  return { success: true, action: 'type_text', text };
}

function pressKey(key) {
  const keyMap = {
    enter: '36', return: '36', tab: '48',
    escape: '53', esc: '53', space: '49',
    delete: '51', backspace: '51',
    up: '126', down: '125', left: '123', right: '124',
  };

  const parts = key.toLowerCase().split('+').map((p) => p.trim());
  const modifiers = [];
  let mainKey = parts[parts.length - 1];

  for (let i = 0; i < parts.length - 1; i++) {
    const mod = parts[i];
    if (mod === 'command' || mod === 'cmd') modifiers.push('command down');
    else if (mod === 'shift') modifiers.push('shift down');
    else if (mod === 'option' || mod === 'alt') modifiers.push('option down');
    else if (mod === 'control' || mod === 'ctrl') modifiers.push('control down');
  }

  const modString = modifiers.length > 0 ? ` using {${modifiers.join(', ')}}` : '';
  const keyCode = keyMap[mainKey];

  let script;
  if (keyCode) {
    script = `tell application "System Events" to key code ${keyCode}${modString}`;
  } else {
    script = `tell application "System Events" to keystroke "${mainKey}"${modString}`;
  }

  execSync(`osascript -e '${script}'`);
  return { success: true, action: 'press_key', key };
}

function scroll(direction, amount = 5) {
  const pixelAmount = amount * 80;
  const delta = direction === 'up' ? pixelAmount : -pixelAmount;
  const steps = 5;
  const perStep = Math.round(delta / steps);
  const script = Array.from({ length: steps }, () =>
    `set scrollEvent to current application's CGEventCreateScrollWheelEvent2(missing value, current application's kCGScrollEventUnitPixel, 1, ${perStep}, 0, 0)
    current application's CGEventPost(current application's kCGHIDEventTap, scrollEvent)
    delay 0.03`
  ).join('\n');
  execSync(`osascript -e 'use framework "CoreGraphics"\n${script}'`);
  return { success: true, action: 'scroll', direction, amount };
}

// --- System ---

function runCommand(command, timeout = 10000) {
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      timeout,
      shell: '/bin/zsh',
      maxBuffer: 1024 * 1024,
    });
    return { success: true, action: 'run_command', output: output.trim().slice(0, 5000) };
  } catch (err) {
    return {
      success: false,
      action: 'run_command',
      error: err.stderr?.trim() || err.message,
      output: err.stdout?.trim().slice(0, 2000) || '',
    };
  }
}

function openApp(appName) {
  try {
    execSync(`open -a "${appName.replace(/"/g, '\\"')}"`);
    return { success: true, action: 'open_app', app: appName };
  } catch (err) {
    return { success: false, action: 'open_app', error: err.message };
  }
}

function getActiveWindow() {
  try {
    const script = `
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
        set windowTitle to ""
        try
          set windowTitle to name of front window of (first application process whose frontmost is true)
        end try
        return frontApp & "|" & windowTitle
      end tell
    `;
    const result = execSync(`osascript -e '${script}'`, { encoding: 'utf-8' }).trim();
    const [app, title] = result.split('|');
    return { success: true, action: 'get_active_window', app, title };
  } catch (err) {
    return { success: false, action: 'get_active_window', error: err.message };
  }
}

// --- Files ---

function readFile(filePath) {
  try {
    const resolved = filePath.startsWith('~')
      ? filePath.replace('~', process.env.HOME)
      : filePath;
    const content = fs.readFileSync(resolved, 'utf-8');
    return { success: true, action: 'read_file', content: content.slice(0, 10000) };
  } catch (err) {
    return { success: false, action: 'read_file', error: err.message };
  }
}

function writeFile(filePath, content) {
  try {
    const resolved = filePath.startsWith('~')
      ? filePath.replace('~', process.env.HOME)
      : filePath;
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content);
    return { success: true, action: 'write_file', path: resolved };
  } catch (err) {
    return { success: false, action: 'write_file', error: err.message };
  }
}

function listFiles(dirPath) {
  try {
    const resolved = (dirPath || '.').startsWith('~')
      ? dirPath.replace('~', process.env.HOME)
      : (dirPath || process.env.HOME);
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const items = entries.slice(0, 100).map(e => ({
      name: e.name,
      type: e.isDirectory() ? 'directory' : 'file'
    }));
    return { success: true, action: 'list_files', path: resolved, items };
  } catch (err) {
    return { success: false, action: 'list_files', error: err.message };
  }
}

// --- Web Search ---

function webSearch(query) {
  try {
    // Use DuckDuckGo instant answer API (no key needed)
    const encoded = encodeURIComponent(query);
    const output = execSync(
      `curl -s "https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1"`,
      { encoding: 'utf-8', timeout: 8000 }
    );
    const data = JSON.parse(output);
    const results = [];

    if (data.Abstract) {
      results.push({ title: data.Heading || 'Summary', snippet: data.Abstract, url: data.AbstractURL });
    }
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, 5)) {
        if (topic.Text) {
          results.push({ title: topic.Text.slice(0, 80), snippet: topic.Text, url: topic.FirstURL });
        }
      }
    }

    // Also do a scrape of DuckDuckGo HTML for richer results
    if (results.length < 3) {
      const htmlOutput = execSync(
        `curl -s -A "Mozilla/5.0" "https://html.duckduckgo.com/html/?q=${encoded}" | head -c 50000`,
        { encoding: 'utf-8', timeout: 8000 }
      );
      const snippetMatches = htmlOutput.matchAll(/class="result__snippet"[^>]*>(.*?)<\/a>/gs);
      const titleMatches = htmlOutput.matchAll(/class="result__a"[^>]*>(.*?)<\/a>/gs);
      const urlMatches = htmlOutput.matchAll(/class="result__url"[^>]*>(.*?)<\/a>/gs);

      const titles = [...titleMatches].map(m => m[1].replace(/<[^>]+>/g, '').trim());
      const snippets = [...snippetMatches].map(m => m[1].replace(/<[^>]+>/g, '').trim());
      const urls = [...urlMatches].map(m => m[1].replace(/<[^>]+>/g, '').trim());

      for (let i = 0; i < Math.min(5, titles.length); i++) {
        results.push({ title: titles[i], snippet: snippets[i] || '', url: urls[i] || '' });
      }
    }

    return { success: true, action: 'web_search', query, results: results.slice(0, 8) };
  } catch (err) {
    return { success: false, action: 'web_search', error: err.message };
  }
}

function webFetch(url) {
  try {
    const output = execSync(
      `curl -sL -A "Mozilla/5.0" "${url.replace(/"/g, '\\"')}" | head -c 30000`,
      { encoding: 'utf-8', timeout: 10000 }
    );
    // Strip HTML tags for cleaner text
    const text = output
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000);
    return { success: true, action: 'web_fetch', url, text };
  } catch (err) {
    return { success: false, action: 'web_fetch', error: err.message };
  }
}

// --- Main dispatcher ---

function executeControl(action, args) {
  // Log all actions to daily log
  appendDailyLog(`Tool: ${action}(${JSON.stringify(args).slice(0, 200)})`);

  switch (action) {
    // Mouse & Keyboard
    case 'move_mouse': return moveMouse(args.x, args.y);
    case 'click_mouse': return clickMouse(args.x, args.y);
    case 'type_text': return typeText(args.text);
    case 'press_key': return pressKey(args.key);
    case 'scroll': return scroll(args.direction, args.amount);

    // System
    case 'run_command': return runCommand(args.command, args.timeout);
    case 'open_app': return openApp(args.app_name);
    case 'get_active_window': return getActiveWindow();

    // Files
    case 'read_file': return readFile(args.path);
    case 'write_file': return writeFile(args.path, args.content);
    case 'list_files': return listFiles(args.path);

    // Memory (new markdown-based system)
    case 'save_memory': return saveToMemory(args.section, args.content);
    case 'search_memory': return { success: true, results: searchMemory(args.query) };
    case 'get_context': return { success: true, ...getAgentContext() };

    // Web
    case 'web_search': return webSearch(args.query);
    case 'web_fetch': return webFetch(args.url);

    // Accessibility Tree
    case 'get_accessibility_tree': return getAccessibilityTree(args.max_depth);
    case 'find_ui_element': return findUIElement(args.role, args.title);
    case 'click_ui_element': return clickUIElement(args.role, args.title);
    case 'set_ui_element_value': return setUIElementValue(args.role, args.title, args.value);

    // Skills
    case 'get_skill': return { success: true, content: getSkillContent(args.name) };
    case 'list_skills': return { success: true, skills: getSkillSummaries() };

    default: return { success: false, error: `Unknown action: ${action}` };
  }
}

module.exports = { executeControl };
