const { execSync } = require('child_process');

// Get the accessibility tree of the frontmost application
// This gives us actual UI elements (buttons, text fields, links, etc.)
// Much more precise than screenshots for interaction
function getAccessibilityTree(maxDepth = 3) {
  try {
    // Use AppleScript + System Events to get UI element hierarchy
    const script = `
      tell application "System Events"
        set frontApp to first application process whose frontmost is true
        set appName to name of frontApp
        set windowInfo to ""

        try
          set frontWindow to front window of frontApp
          set windowTitle to name of frontWindow
          set windowInfo to "Window: " & windowTitle & return

          -- Get UI elements up to depth ${maxDepth}
          set uiTree to my getElements(frontWindow, 0, ${maxDepth})
          set windowInfo to windowInfo & uiTree
        on error errMsg
          set windowInfo to "Could not access window: " & errMsg
        end try

        return "App: " & appName & return & windowInfo
      end tell

      on getElements(parentElement, depth, maxDepth)
        if depth >= maxDepth then return ""
        set indent to ""
        repeat depth times
          set indent to indent & "  "
        end repeat

        set result to ""
        try
          set uiElements to UI elements of parentElement
          repeat with elem in uiElements
            try
              set elemRole to role of elem
              set elemTitle to ""
              try
                set elemTitle to title of elem
              end try
              set elemValue to ""
              try
                set elemValue to value of elem
                if elemValue is missing value then set elemValue to ""
                if (count of elemValue) > 100 then set elemValue to text 1 thru 100 of elemValue & "..."
              end try
              set elemDesc to ""
              try
                set elemDesc to description of elem
              end try

              set elemPos to ""
              try
                set elemPos to position of elem as text
              end try
              set elemSize to ""
              try
                set elemSize to size of elem as text
              end try

              set line to indent & elemRole
              if elemTitle is not "" then set line to line & " \\\"" & elemTitle & "\\\""
              if elemDesc is not "" then set line to line & " [" & elemDesc & "]"
              if elemValue is not "" then set line to line & " = " & elemValue
              if elemPos is not "" then set line to line & " @" & elemPos
              if elemSize is not "" then set line to line & " sz:" & elemSize

              set result to result & line & return

              -- Recurse into children
              set childResult to my getElements(elem, depth + 1, maxDepth)
              set result to result & childResult
            end try
          end repeat
        end try
        return result
      end getElements
    `;

    const output = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      encoding: 'utf-8',
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    });

    return { success: true, tree: output.trim().slice(0, 15000) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Find a specific UI element by role and/or title
function findUIElement(role, title) {
  try {
    const titleFilter = title
      ? `whose title is "${title.replace(/"/g, '\\"')}"`
      : '';

    const script = `
      tell application "System Events"
        set frontApp to first application process whose frontmost is true
        tell front window of frontApp
          set matches to every ${role || 'UI element'} ${titleFilter}
          set results to ""
          repeat with m in matches
            try
              set mTitle to title of m
              set mPos to position of m
              set mSize to size of m
              set results to results & mTitle & " @" & (item 1 of mPos as text) & "," & (item 2 of mPos as text) & " sz:" & (item 1 of mSize as text) & "x" & (item 2 of mSize as text) & return
            end try
          end repeat
          return results
        end tell
      end tell
    `;

    const output = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      encoding: 'utf-8',
      timeout: 5000,
    });

    return { success: true, elements: output.trim() };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Click a specific UI element by role and title (more reliable than coordinates)
function clickUIElement(role, title) {
  try {
    const script = `
      tell application "System Events"
        set frontApp to first application process whose frontmost is true
        tell front window of frontApp
          click (first ${role || 'button'} whose title is "${title.replace(/"/g, '\\"')}")
        end tell
      end tell
    `;

    execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, { timeout: 5000 });
    return { success: true, action: 'click_element', role, title };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Set value of a UI element (text fields, etc.)
function setUIElementValue(role, title, value) {
  try {
    const script = `
      tell application "System Events"
        set frontApp to first application process whose frontmost is true
        tell front window of frontApp
          set value of (first ${role || 'text field'} whose title is "${title.replace(/"/g, '\\"')}") to "${value.replace(/"/g, '\\"')}"
        end tell
      end tell
    `;

    execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, { timeout: 5000 });
    return { success: true, action: 'set_element_value', role, title, value };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { getAccessibilityTree, findUIElement, clickUIElement, setUIElementValue };
