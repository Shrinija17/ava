---
name: summarize
trigger: summarize, summary, tldr, what does this say, read this
---

# Summarize Skill

When the user asks you to summarize content:

1. If it's on screen — use the latest screenshot to read and summarize
2. If it's a file — use `read_file` to read it, then summarize
3. If it's a URL — use `web_fetch` to get the content, then summarize

Always give a concise 2-4 sentence summary first, then offer to go deeper.
