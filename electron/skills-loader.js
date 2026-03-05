const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');

function loadAllSkills() {
  const skills = [];
  try {
    const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const skillFile = path.join(SKILLS_DIR, dir.name, 'SKILL.md');
        if (fs.existsSync(skillFile)) {
          const content = fs.readFileSync(skillFile, 'utf-8');
          const name = dir.name;
          // Parse frontmatter-style trigger
          const triggerMatch = content.match(/trigger:\s*(.+)/i);
          const trigger = triggerMatch ? triggerMatch[1].trim() : '';
          skills.push({ name, trigger, content });
        }
      }
    }
  } catch {}
  return skills;
}

// Find relevant skills based on user message or context
function findRelevantSkills(query) {
  const skills = loadAllSkills();
  if (!query) return skills;

  const q = query.toLowerCase();
  return skills.filter(s => {
    const triggerWords = s.trigger.toLowerCase().split(/[,|]/);
    return triggerWords.some(tw => q.includes(tw.trim())) ||
           s.name.toLowerCase().includes(q) ||
           s.content.toLowerCase().includes(q);
  });
}

// Get all skill names for the system prompt
function getSkillSummaries() {
  const skills = loadAllSkills();
  return skills.map(s => `- ${s.name}: ${s.trigger || s.content.split('\n')[0]}`).join('\n');
}

// Get full skill content by name
function getSkillContent(name) {
  const skillFile = path.join(SKILLS_DIR, name, 'SKILL.md');
  try {
    return fs.readFileSync(skillFile, 'utf-8');
  } catch {
    return null;
  }
}

module.exports = { loadAllSkills, findRelevantSkills, getSkillSummaries, getSkillContent };
