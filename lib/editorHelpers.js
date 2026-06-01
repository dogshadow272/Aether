/**
 * Utility functions for text editors and markdown formatting.
 */

/**
 * Toggles wrapping characters around the current selection.
 */
export const toggleWrap = (value, start, end, prefix, suffix = prefix) => {
  const selectedText = value.substring(start, end);
  const beforeText = value.substring(0, start);
  const afterText = value.substring(end);

  const hasPrefix = value.substring(start - prefix.length, start) === prefix;
  const hasSuffix = value.substring(end, end + suffix.length) === suffix;

  if (hasPrefix && hasSuffix) {
    // Already wrapped externally, strip it
    return {
      text: value.substring(0, start - prefix.length) + selectedText + value.substring(end + suffix.length),
      newStart: start - prefix.length,
      newEnd: end - prefix.length
    };
  }

  const isInternalWrapped = selectedText.startsWith(prefix) && selectedText.endsWith(suffix);
  if (isInternalWrapped && selectedText.length > (prefix.length + suffix.length)) {
    // Wrapped internally, strip it
    const unwrapped = selectedText.substring(prefix.length, selectedText.length - suffix.length);
    return {
      text: beforeText + unwrapped + afterText,
      newStart: start,
      newEnd: start + unwrapped.length
    };
  }

  // Not wrapped, wrap it
  return {
    text: beforeText + prefix + selectedText + suffix + afterText,
    newStart: start + prefix.length,
    newEnd: end + prefix.length
  };
};

/**
 * Toggles list item prefixes for all lines overlapping with selection.
 */
export const toggleLinePrefix = (value, start, end, prefixRegex, prefixGenerator) => {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  let lineEnd = value.indexOf("\n", end);
  if (lineEnd === -1) lineEnd = value.length;

  const targetText = value.substring(lineStart, lineEnd);
  const lines = targetText.split("\n");

  const nonSeparators = lines.filter((line) => line.trim() !== "");
  const allPrefixed = nonSeparators.length > 0 && nonSeparators.every((line) => prefixRegex.test(line));

  let totalOffsetChange = 0;
  let firstLineOffsetChange = 0;

  const formattedLines = lines.map((line, idx) => {
    let newLine = line;
    let change = 0;

    if (allPrefixed) {
      // Remove prefix
      const match = line.match(prefixRegex);
      if (match) {
        change = -match[0].length;
        newLine = line.substring(match[0].length);
      }
    } else {
      // Add prefix
      if (!prefixRegex.test(line)) {
        const actualPrefix = typeof prefixGenerator === "function" ? prefixGenerator(idx + 1) : prefixGenerator;
        change = actualPrefix.length;
        newLine = actualPrefix + line;
      }
    }

    if (idx === 0) {
      firstLineOffsetChange = change;
    }
    totalOffsetChange += change;
    return newLine;
  });

  const formattedText = formattedLines.join("\n");
  return {
    text: value.substring(0, lineStart) + formattedText + value.substring(lineEnd),
    newStart: Math.max(lineStart, start + firstLineOffsetChange),
    newEnd: Math.max(lineStart, end + totalOffsetChange)
  };
};

/**
 * Handles Tab (indent) and Shift+Tab (outdent) for selection blocks or single lines.
 */
export const handleTabIndent = (value, start, end, isShift) => {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  let lineEnd = value.indexOf("\n", end);
  if (lineEnd === -1) lineEnd = value.length;

  const targetText = value.substring(lineStart, lineEnd);
  const lines = targetText.split("\n");

  const isMultiLine = lines.length > 1;
  const isSelection = start !== end;
  
  const currentLine = value.substring(lineStart, start);
  const isListLine = /^\s*([-\*•]|\d+\.|-\s+\[[ xX]\])/.test(currentLine);

  if (isMultiLine || isSelection || isListLine) {
    let totalOffsetChange = 0;
    let firstLineOffsetChange = 0;

    const formattedLines = lines.map((line, idx) => {
      let change = 0;
      let newLine = line;
      if (isShift) {
        if (line.startsWith("\t")) {
          change = -1;
          newLine = line.substring(1);
        } else if (line.startsWith("  ")) {
          change = -2;
          newLine = line.substring(2);
        } else if (line.startsWith(" ")) {
          change = -1;
          newLine = line.substring(1);
        }
      } else {
        change = 2;
        newLine = "  " + line;
      }

      if (idx === 0) {
        firstLineOffsetChange = change;
      }
      totalOffsetChange += change;
      return newLine;
    });

    const formattedText = formattedLines.join("\n");
    return {
      text: value.substring(0, lineStart) + formattedText + value.substring(lineEnd),
      newStart: Math.max(lineStart, start + firstLineOffsetChange),
      newEnd: Math.max(lineStart, end + totalOffsetChange)
    };
  } else {
    if (isShift) return null;
    return {
      text: value.substring(0, start) + "  " + value.substring(end),
      newStart: start + 2,
      newEnd: start + 2
    };
  }
};

/**
 * Handles Enter key on list lines (continuation or list exit).
 */
export const handleSmartEnter = (value, start, end) => {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const currentLine = value.substring(lineStart, start);

  // 1. Checkbox list: e.g. "- [ ] " or "- [x] "
  const checkboxMatch = currentLine.match(/^(\s*-\s+\[[ xX]\]\s*)(.*)/);
  if (checkboxMatch) {
    const prefix = checkboxMatch[1];
    const rest = checkboxMatch[2];
    if (rest.trim() === "") {
      // Exit list: delete the bullet prefix from current line
      return {
        text: value.substring(0, lineStart) + value.substring(start),
        newStart: lineStart,
        newEnd: lineStart
      };
    } else {
      // Continue list: reset task state to empty [ ]
      // Ensure the continued prefix has a trailing space
      const cleanPrefix = prefix.replace(/\[[xX]\]/, "[ ]");
      const normalizedPrefix = cleanPrefix.endsWith(" ") ? cleanPrefix : cleanPrefix + " ";
      return {
        text: value.substring(0, start) + "\n" + normalizedPrefix + value.substring(end),
        newStart: start + normalizedPrefix.length + 1,
        newEnd: start + normalizedPrefix.length + 1
      };
    }
  }

  // 2. Bullet list: e.g. "- " or "* " or "• "
  const bulletMatch = currentLine.match(/^(\s*[-*•]\s+)(.*)/);
  if (bulletMatch) {
    const prefix = bulletMatch[1];
    const rest = bulletMatch[2];
    if (rest.trim() === "") {
      // Exit list
      return {
        text: value.substring(0, lineStart) + value.substring(start),
        newStart: lineStart,
        newEnd: lineStart
      };
    } else {
      // Continue list
      return {
        text: value.substring(0, start) + "\n" + prefix + value.substring(end),
        newStart: start + prefix.length + 1,
        newEnd: start + prefix.length + 1
      };
    }
  }

  // 3. Numbered list: e.g. "1. " or "2. "
  const numberedMatch = currentLine.match(/^(\s*)(\d+)(\.\s+)(.*)/);
  if (numberedMatch) {
    const indent = numberedMatch[1];
    const num = parseInt(numberedMatch[2], 10);
    const suffix = numberedMatch[3];
    const rest = numberedMatch[4];
    if (rest.trim() === "") {
      // Exit list
      return {
        text: value.substring(0, lineStart) + value.substring(start),
        newStart: lineStart,
        newEnd: lineStart
      };
    } else {
      // Continue list (increment number)
      const nextPrefix = `${indent}${num + 1}${suffix}`;
      return {
        text: value.substring(0, start) + "\n" + nextPrefix + value.substring(end),
        newStart: start + nextPrefix.length + 1,
        newEnd: start + nextPrefix.length + 1
      };
    }
  }

  return null;
};

/**
 * Main onKeyDown keydown controller for textareas.
 * Maps shortcuts to their formatting helpers.
 */
export const handleEditorKeyDown = (e, value, setValue, extraActions = {}) => {
  const textarea = e.target;
  const { selectionStart, selectionEnd } = textarea;
  const isMetaOrCtrl = e.metaKey || e.ctrlKey;
  let result = null;

  // 1. Bold (Cmd/Ctrl + B)
  if (isMetaOrCtrl && e.key.toLowerCase() === "b") {
    e.preventDefault();
    result = toggleWrap(value, selectionStart, selectionEnd, "**");
  }
  // 2. Italic (Cmd/Ctrl + I)
  else if (isMetaOrCtrl && e.key.toLowerCase() === "i") {
    e.preventDefault();
    result = toggleWrap(value, selectionStart, selectionEnd, "*");
  }
  // 3. Underline (Cmd/Ctrl + U)
  else if (isMetaOrCtrl && e.key.toLowerCase() === "u") {
    e.preventDefault();
    result = toggleWrap(value, selectionStart, selectionEnd, "<u>", "</u>");
  }
  // 4. Strikethrough (Cmd/Ctrl + Shift + X)
  else if (isMetaOrCtrl && e.shiftKey && e.key.toLowerCase() === "x") {
    e.preventDefault();
    result = toggleWrap(value, selectionStart, selectionEnd, "~~");
  }
  // 5. Inline Code / Code Block (Cmd/Ctrl + Shift + C)
  else if (isMetaOrCtrl && e.shiftKey && e.key.toLowerCase() === "c") {
    e.preventDefault();
    result = toggleWrap(value, selectionStart, selectionEnd, "`");
  }
  // 6. Bullet List (Cmd/Ctrl + Shift + 8)
  else if (isMetaOrCtrl && e.shiftKey && e.key === "8") {
    e.preventDefault();
    result = toggleLinePrefix(value, selectionStart, selectionEnd, /^\s*[-*•]\s+/, "- ");
  }
  // 7. Numbered List (Cmd/Ctrl + Shift + 7)
  else if (isMetaOrCtrl && e.shiftKey && e.key === "7") {
    e.preventDefault();
    result = toggleLinePrefix(value, selectionStart, selectionEnd, /^\s*\d+\.\s+/, (num) => `${num}. `);
  }
  // 8. Checkbox List (Cmd/Ctrl + Shift + 9)
  else if (isMetaOrCtrl && e.shiftKey && e.key === "9") {
    e.preventDefault();
    result = toggleLinePrefix(value, selectionStart, selectionEnd, /^\s*-\s+\[[ xX]\]\s*/, "- [ ] ");
  }
  // 9. Tab (Indent / Outdent)
  else if (e.key === "Tab") {
    e.preventDefault();
    result = handleTabIndent(value, selectionStart, selectionEnd, e.shiftKey);
  }
  // 10. Enter (Smart lists)
  else if (e.key === "Enter" && !e.shiftKey) {
    result = handleSmartEnter(value, selectionStart, selectionEnd);
    if (result) {
      e.preventDefault();
    }
  }
  // 11. Save / Submit note (Cmd/Ctrl + Enter)
  else if (isMetaOrCtrl && e.key === "Enter") {
    if (typeof extraActions.onSave === "function") {
      e.preventDefault();
      extraActions.onSave();
    }
  }

  // If a formatter ran, update the text and cursor position
  if (result) {
    setValue(result.text);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.newStart, result.newEnd);
    }, 0);
    return true;
  }

  return false;
};

/**
 * Focuses the cursor at the start of a block element, resolved to a text node if possible.
 */
const focusStartOfBlock = (blockElement) => {
  const selection = window.getSelection();
  const range = document.createRange();
  
  let node = blockElement;
  while (node && node.firstChild) {
    node = node.firstChild;
  }
  
  if (node && node.nodeType === Node.TEXT_NODE) {
    range.setStart(node, 0);
  } else {
    range.setStart(blockElement, 0);
  }
  
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
};

/**
 * Upgraded keydown handler for contentEditable WYSIWYG editor.
 * Implements Notion/Evernote style behavior for splits, lists, and markdown parsing.
 */
export const handleContentEditableKeyDown = (e, onUpdate) => {
  const editor = e.currentTarget || e.target;
  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const isModifier = isMac ? e.metaKey : e.ctrlKey;

  // 1. Bold, Italic, Underline keyboard shortcuts
  if (isModifier) {
    if (e.key === "b" || e.key === "B") {
      e.preventDefault();
      document.execCommand("bold", false, null);
      onUpdate(editor.innerHTML);
      return true;
    }
    if (e.key === "i" || e.key === "I") {
      e.preventDefault();
      document.execCommand("italic", false, null);
      onUpdate(editor.innerHTML);
      return true;
    }
    if (e.key === "u" || e.key === "U") {
      e.preventDefault();
      document.execCommand("underline", false, null);
      onUpdate(editor.innerHTML);
      return true;
    }
  }

  // 2. Markdown Auto-parsing on Space keypress
  if (e.key === " ") {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const node = range.startContainer;

      if (node.nodeType === Node.TEXT_NODE) {
        const textBeforeCursor = node.textContent.substring(0, range.startOffset);
        const trimmedText = textBeforeCursor.trim();

        let prefixLength = 0;
        let cmdType = null;
        let blockType = null;
        let htmlToInsert = null;

        if (trimmedText === "#") {
          prefixLength = textBeforeCursor.length;
          cmdType = "formatBlock";
          blockType = "H1";
        } else if (trimmedText === "##") {
          prefixLength = textBeforeCursor.length;
          cmdType = "formatBlock";
          blockType = "H2";
        } else if (trimmedText === "###") {
          prefixLength = textBeforeCursor.length;
          cmdType = "formatBlock";
          blockType = "H3";
        } else if (trimmedText === ">") {
          prefixLength = textBeforeCursor.length;
          cmdType = "formatBlock";
          blockType = "BLOCKQUOTE";
        } else if (trimmedText === "---") {
          prefixLength = textBeforeCursor.length;
          cmdType = "insertHorizontalRule";
        } else if (trimmedText === "-" || trimmedText === "*") {
          prefixLength = textBeforeCursor.length;
          cmdType = "insertUnorderedList";
        } else if (/^\d+\.$/.test(trimmedText)) {
          prefixLength = textBeforeCursor.length;
          cmdType = "insertOrderedList";
        } else if (trimmedText === "- [ ]" || trimmedText === "-[]") {
          prefixLength = textBeforeCursor.length;
          cmdType = "insertHTML";
          htmlToInsert = '<div class="flex items-start gap-2 my-1"><input type="checkbox" class="w-3.5 h-3.5 mt-1 accent-[#00aaff] cursor-pointer" /><span>&nbsp;</span></div>';
        } else if (trimmedText === "- [x]" || trimmedText === "-[x]" || trimmedText === "- [X]" || trimmedText === "-[X]") {
          prefixLength = textBeforeCursor.length;
          cmdType = "insertHTML";
          htmlToInsert = '<div class="flex items-start gap-2 my-1"><input type="checkbox" checked="checked" class="w-3.5 h-3.5 mt-1 accent-[#00aaff] cursor-pointer" /><span>&nbsp;</span></div>';
        }

        if (cmdType) {
          e.preventDefault();

          // Programmatically delete the markdown trigger characters (e.g. "##")
          const deleteRange = document.createRange();
          deleteRange.setStart(node, range.startOffset - prefixLength);
          deleteRange.setEnd(node, range.startOffset);
          selection.removeAllRanges();
          selection.addRange(deleteRange);
          document.execCommand("delete", false, null);

          // Execute rich text formatting conversion
          if (cmdType === "formatBlock") {
            document.execCommand("formatBlock", false, blockType);
          } else if (cmdType === "insertUnorderedList") {
            document.execCommand("insertUnorderedList", false, null);
          } else if (cmdType === "insertOrderedList") {
            document.execCommand("insertOrderedList", false, null);
          } else if (cmdType === "insertHorizontalRule") {
            document.execCommand("insertHorizontalRule", false, null);
          } else if (cmdType === "insertHTML") {
            document.execCommand("insertHTML", false, htmlToInsert);
          }

          onUpdate(editor.innerHTML);
          return true;
        }
      }
    }
  }

  // 3. Enter Key handling (Heading splits and Custom Checkbox splits)
  if (e.key === "Enter" && !e.shiftKey) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const startNode = range.startContainer;
      
      // Find the direct child of the editor that contains the cursor
      let block = startNode;
      while (block && block.parentNode !== editor) {
        block = block.parentNode;
      }

      if (block) {
        const tagName = block.tagName;
        
        // A. Heading Split (H1, H2, H3, BLOCKQUOTE)
        if (tagName === "H1" || tagName === "H2" || tagName === "H3" || tagName === "BLOCKQUOTE") {
          e.preventDefault();
          
          // Split the block content at the caret
          const splitRange = document.createRange();
          splitRange.setStart(startNode, range.startOffset);
          splitRange.setEndAfter(block.lastChild || block);
          
          const frag = splitRange.extractContents();
          
          // Create new default text block (div)
          const newBlock = document.createElement("div");
          
          // Check if extracted fragment has actual content, otherwise insert <br>
          if (frag.textContent.trim() === "") {
            newBlock.appendChild(document.createElement("br"));
          } else {
            newBlock.appendChild(frag);
          }
          
          // Insert the new block immediately after the heading
          if (block.nextSibling) {
            editor.insertBefore(newBlock, block.nextSibling);
          } else {
            editor.appendChild(newBlock);
          }
          
          // Focus at the start of the new block
          focusStartOfBlock(newBlock);
          
          onUpdate(editor.innerHTML);
          return true;
        }
        
        // B. Custom Checkbox Block Split/Exit
        const checkboxInput = block.querySelector('input[type="checkbox"]');
        if (checkboxInput) {
          e.preventDefault();
          
          const spanElement = block.querySelector("span");
          const spanText = spanElement ? spanElement.textContent.replace(/\u00A0/g, " ").trim() : "";
          
          if (!spanElement || spanText === "") {
            // Exit Checkbox List: replace the block with a standard <div>
            const newBlock = document.createElement("div");
            newBlock.appendChild(document.createElement("br"));
            editor.replaceChild(newBlock, block);
            
            // Focus new block
            focusStartOfBlock(newBlock);
          } else {
            // Split Checkbox Block:
            // Extract the fragment from the caret to the end of the span
            const splitRange = document.createRange();
            splitRange.setStart(startNode, range.startOffset);
            if (spanElement.lastChild) {
              splitRange.setEndAfter(spanElement.lastChild);
            } else {
              splitRange.setEndAfter(spanElement);
            }
            
            const frag = splitRange.extractContents();
            
            // Create a new checkbox container
            const newBlock = document.createElement("div");
            newBlock.className = "flex items-start gap-2 my-1";
            
            const newCheckbox = document.createElement("input");
            newCheckbox.type = "checkbox";
            newCheckbox.className = "w-3.5 h-3.5 mt-1 accent-[#00aaff] cursor-pointer";
            
            const newSpan = document.createElement("span");
            if (frag.textContent.trim() === "" && frag.childNodes.length === 0) {
              newSpan.innerHTML = "&nbsp;";
            } else {
              newSpan.appendChild(frag);
            }
            
            newBlock.appendChild(newCheckbox);
            newBlock.appendChild(newSpan);
            
            // Insert the new checkbox block
            if (block.nextSibling) {
              editor.insertBefore(newBlock, block.nextSibling);
            } else {
              editor.appendChild(newBlock);
            }
            
            // Focus at the start of the new span
            focusStartOfBlock(newSpan);
          }
          
          onUpdate(editor.innerHTML);
          return true;
        }
      }
    }
  }

  // 4. Backspace Key handling (Exit checkbox block on empty backspace)
  if (e.key === "Backspace") {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const startNode = range.startContainer;
      
      // Find the direct child of the editor that contains the cursor
      let block = startNode;
      while (block && block.parentNode !== editor) {
        block = block.parentNode;
      }

      if (block) {
        const checkboxInput = block.querySelector('input[type="checkbox"]');
        if (checkboxInput) {
          const spanElement = block.querySelector("span");
          
          // Check if cursor is at the very beginning of the checkbox text span
          const isAtStart = range.startOffset === 0 && 
            (startNode === spanElement || startNode.parentNode === spanElement || (spanElement && spanElement.firstChild === startNode));
            
          if (isAtStart) {
            e.preventDefault();
            
            // Convert checkbox block to a standard div, keeping the text content
            const newBlock = document.createElement("div");
            if (spanElement) {
              // Copy over the contents of the span
              while (spanElement.firstChild) {
                newBlock.appendChild(spanElement.firstChild);
              }
            }
            if (newBlock.childNodes.length === 0) {
              newBlock.appendChild(document.createElement("br"));
            }
            
            editor.replaceChild(newBlock, block);
            
            // Focus the new block at start
            focusStartOfBlock(newBlock);
            
            onUpdate(editor.innerHTML);
            return true;
          }
        }
      }
    }
  }

  return false;
};
