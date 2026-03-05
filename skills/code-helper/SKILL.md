---
name: code-helper
trigger: code, debug, error, fix, write code, function, script, bug, programming
---

# Code Helper Skill

When the user asks for coding help:

1. Check what's on screen (screenshot) to see the code/error
2. Use `get_accessibility_tree` to read exact text from the editor
3. Use `read_file` if they reference a specific file
4. Use `run_command` to run code, tests, or check errors
5. Use `write_file` to create or modify files
6. Use `type_text` to type code directly into their editor

Chain multiple tools to debug effectively:
- Read the file -> understand the error -> fix the code -> run tests
