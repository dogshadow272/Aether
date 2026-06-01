import { useState, useRef, useEffect, useCallback } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Link, Eye } from "lucide-react";
import { handleContentEditableKeyDown } from "../lib/editorHelpers";

const renderMarkdown = (text) => {
  if (!text) return "";
  
  // 1. Escape HTML entities to prevent XSS, but preserve formatting tags like <u> and </u>
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html
    .replace(/&lt;u&gt;/g, "<u>")
    .replace(/&lt;\/u&gt;/g, "</u>");

  // 2. Inline styling
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/__(.*?)__/g, "<u>$1</u>");
  html = html.replace(/~~(.*?)~~/g, "<del class='opacity-50'>$1</del>");
  html = html.replace(/`(.*?)`/g, "<code class='bg-white/10 px-1 py-0.5 rounded text-[10px] font-mono text-[#00aaff]'>$1</code>");

  // 3. Block list parser
  const lines = html.split("\n");
  const formattedLines = lines.map((line) => {
    // Checkbox checked
    const checkboxCheckedMatch = line.match(/^(\s*)-\s+\[[xX]\]\s*(.*)$/);
    if (checkboxCheckedMatch) {
      const indent = checkboxCheckedMatch[1].length * 8;
      return `<div class="flex items-start gap-1.5 my-0.5" style="margin-left: ${indent}px">
        <input type="checkbox" checked disabled class="mt-0.5 pointer-events-none accent-[#00aaff]" />
        <span class="line-through opacity-50 font-normal">${checkboxCheckedMatch[2]}</span>
      </div>`;
    }

    // Checkbox unchecked
    const checkboxUncheckedMatch = line.match(/^(\s*)-\s+\[ \]\s*(.*)$/);
    if (checkboxUncheckedMatch) {
      const indent = checkboxUncheckedMatch[1].length * 8;
      return `<div class="flex items-start gap-1.5 my-0.5" style="margin-left: ${indent}px">
        <input type="checkbox" disabled class="mt-0.5 pointer-events-none opacity-60" />
        <span class="opacity-80 font-normal">${checkboxUncheckedMatch[2]}</span>
      </div>`;
    }

    // Bullet List
    const bulletMatch = line.match(/^(\s*)[-*•]\s+(.*)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length * 8;
      return `<div class="flex items-start gap-1.5 my-0.5" style="margin-left: ${indent}px">
        <span class="text-[#00aaff]">•</span>
        <span>${bulletMatch[2]}</span>
      </div>`;
    }

    // Numbered List
    const numberedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      const indent = numberedMatch[1].length * 8;
      return `<div class="flex items-start gap-1.5 my-0.5" style="margin-left: ${indent}px">
        <span class="text-gray-500 font-mono text-[10px] mt-0.5">${numberedMatch[2]}.</span>
        <span>${numberedMatch[3]}</span>
      </div>`;
    }

    if (line.trim() === "") {
      return '<div class="h-2"></div>';
    }

    return `<div>${line}</div>`;
  });

  return formattedLines.join("");
};

// Render note content: check if it's HTML, otherwise parse as Markdown for backwards compatibility
const renderNoteContent = (content) => {
  if (!content) return "";
  const isHTML = /<[a-z][\s\S]*>/i.test(content);
  if (isHTML) {
    return content;
  }
  return renderMarkdown(content);
};

const getColorClass = (rgba) => {
  if (!rgba) return "theme-glow-blue";
  if (rgba.includes("168, 85, 247") || rgba.includes("a855f7")) return "theme-glow-purple";
  if (rgba.includes("34, 197, 94") || rgba.includes("22c55e")) return "theme-glow-green";
  if (rgba.includes("239, 68, 68") || rgba.includes("ef4444")) return "theme-glow-red";
  if (rgba.includes("249, 115, 22") || rgba.includes("eab308") || rgba.includes("234, 179, 8")) return "theme-glow-yellow";
  return "theme-glow-blue";
};

export default function NoteNode({ note, onDragStart, onResizeStart, onDelete, onEdit, onStartConnection, isFocused, onToggleFocus, isHighlighted }) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [prevNoteContent, setPrevNoteContent] = useState(note.content);
  const editorRef = useRef(null);
  const cardRef = useRef(null);

  if (note.content !== prevNoteContent) {
    setPrevNoteContent(note.content);
    if (!isEditing) {
      setContent(note.content);
    }
  }

  const handlePointerDownResize = (e) => {
    e.stopPropagation();
    onResizeStart(note.id, "note-resize", e.clientX, e.clientY, cardRef.current, e.pointerId);
  };

  const handleEditSubmit = useCallback(() => {
    setIsEditing(false);
    if (content !== note.content) {
      onEdit(note.id, { content });
    }
  }, [content, note.content, note.id, onEdit]);

  // Set innerHTML once when active editing starts to prevent cursor jumping
  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.innerHTML = note.content || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // Debounced auto-save to database while typing
  useEffect(() => {
    if (!isEditing) return;
    const delay = 500;
    const timer = setTimeout(() => {
      if (content !== note.content) {
        onEdit(note.id, { content });
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [content, note.id, note.content, onEdit, isEditing]);

  // Auto-save and close editing mode when clicking outside Note card
  useEffect(() => {
    if (!isEditing) return;
    const handleWindowClick = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        handleEditSubmit();
      }
    };
    window.addEventListener("pointerdown", handleWindowClick);
    return () => window.removeEventListener("pointerdown", handleWindowClick);
  }, [isEditing, handleEditSubmit]);

  const handlePointerDownDrag = (e) => {
    if (e.target.closest("button") || e.target.closest("[contenteditable]")) return;
    e.stopPropagation();
    onDragStart(note.id, "note", e.clientX, e.clientY, cardRef.current, e.pointerId);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        // Move caret to end
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, 100);
  };



  // Click handler to toggle checkbox statuses inside note rich text
  const handleEditorClick = (e) => {
    if (e.target.tagName === "INPUT" && e.target.type === "checkbox") {
      if (e.target.checked) {
        e.target.setAttribute("checked", "checked");
      } else {
        e.target.removeAttribute("checked");
      }
      if (editorRef.current) {
        setContent(editorRef.current.innerHTML);
      }
    }
  };

  // Keyboard shortcut & auto-parse interceptors inside notes
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsEditing(false);
      setContent(note.content);
      return;
    }

    const handled = handleContentEditableKeyDown(e, (newHTML) => {
      setContent(newHTML);
    });
    if (handled) return;
  };

  return (
    <div
      ref={cardRef}
      data-node-id={note.id}
      data-node-type="note"
      className={`absolute border rounded-lg flex flex-col pointer-events-auto aero-panel group transition-shadow duration-300 ${getColorClass(note.color)} ${
        isHighlighted ? "animate-pulse ring-4 ring-[#a855f7]/60 shadow-[0_0_20px_rgba(168,85,247,0.5)] border-[#a855f7]! z-40" : ""
      }`}
      style={{
        left: note.x_pos,
        top: note.y_pos,
        width: note.width || 220,
        height: note.height || 150,
        minWidth: 120,
        minHeight: 80,
        backgroundColor: note.color || "rgba(255, 255, 255, 0.08)",
        zIndex: 10,
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Miro-style Connection Handles */}
      {onStartConnection && (
        <>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartConnection(note.id, "note", e.clientX, e.clientY);
            }}
            className="connector-handle absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#00aaff] border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 cursor-crosshair shadow-[0_0_6px_rgba(0,170,255,0.45)] z-30 pointer-events-auto"
            title="Drag to connect"
          />
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartConnection(note.id, "note", e.clientX, e.clientY);
            }}
            className="connector-handle absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-[#00aaff] border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 cursor-crosshair shadow-[0_0_6px_rgba(0,170,255,0.45)] z-30 pointer-events-auto"
            title="Drag to connect"
          />
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartConnection(note.id, "note", e.clientX, e.clientY);
            }}
            className="connector-handle absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#00aaff] border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 cursor-crosshair shadow-[0_0_6px_rgba(0,170,255,0.45)] z-30 pointer-events-auto"
            title="Drag to connect"
          />
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartConnection(note.id, "note", e.clientX, e.clientY);
            }}
            className="connector-handle absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#00aaff] border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 cursor-crosshair shadow-[0_0_6px_rgba(0,170,255,0.45)] z-30 pointer-events-auto"
            title="Drag to connect"
          />
        </>
      )}
      {/* Header (Drag area) */}
      <div 
        className="px-3 py-1.5 border-b border-white/5 bg-white/5 flex items-center justify-between cursor-grab active:cursor-grabbing rounded-t-lg select-none"
        onPointerDown={handlePointerDownDrag}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (onToggleFocus) onToggleFocus(true);
        }}
        style={{ touchAction: "none" }}
      >
        <div className="hud-text text-white font-semibold flex items-center gap-2">
          <span>INDEX_CARD // NOTE</span>
          
          {/* Color palette selector */}
          <div className="flex gap-1 items-center bg-black/40 px-1.5 py-0.5 rounded border border-white/5 ml-1">
            {[
              { val: "rgba(0, 170, 255, 0.08)", hex: "#00aaff", label: "Blue" },
              { val: "rgba(168, 85, 247, 0.08)", hex: "#a855f7", label: "Purple" },
              { val: "rgba(34, 197, 94, 0.08)", hex: "#22c55e", label: "Green" },
              { val: "rgba(239, 68, 68, 0.08)", hex: "#ef4444", label: "Red" },
              { val: "rgba(234, 179, 8, 0.08)", hex: "#eab308", label: "Yellow" }
            ].map((theme) => (
              <button
                key={theme.val}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(note.id, { color: theme.val });
                }}
                className={`w-2 h-2 rounded-full border transition-transform hover:scale-125 ${
                  (note.color || "rgba(255, 255, 255, 0.08)") === theme.val ? "border-white scale-110" : "border-white/20"
                }`}
                style={{ backgroundColor: theme.hex }}
                title={theme.label}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleEditSubmit();
              }}
              className="text-[#00aaff] hover:text-white transition-colors text-[9px] font-mono font-bold leading-none p-1 border border-[#00aaff]/30 rounded bg-[#00aaff]/10 px-1.5"
              title="Save & Close"
            >
              DONE
            </button>
          )}
          {onStartConnection && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStartConnection(note.id, "note");
              }}
              className="text-white/40 hover:text-[#00aaff] transition-colors p-1 flex items-center justify-center"
              title="Connect node"
            >
              <Link size={12} />
            </button>
          )}
          {onToggleFocus && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFocus();
              }}
              className={`transition-colors p-1 flex items-center justify-center ${
                isFocused ? "text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.7)] scale-110" : "text-white/40 hover:text-purple-400"
              }`}
              title={isFocused ? "Exit Focus Mode" : "Focus on this node & connections"}
            >
              <Eye size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
            className="text-white/40 hover:text-white transition-colors text-xs leading-none p-1"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Mini Inline formatting toolbar when editing */}
      {isEditing && (
        <div className="flex items-center gap-1.5 px-3 py-1 border-b border-white/5 bg-black/20 select-none">
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              document.execCommand("bold", false, null);
              if (editorRef.current) setContent(editorRef.current.innerHTML);
            }}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            title="Bold"
          >
            <Bold size={12} />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              document.execCommand("italic", false, null);
              if (editorRef.current) setContent(editorRef.current.innerHTML);
            }}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            title="Italic"
          >
            <Italic size={12} />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              document.execCommand("underline", false, null);
              if (editorRef.current) setContent(editorRef.current.innerHTML);
            }}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            title="Underline"
          >
            <Underline size={12} />
          </button>
          
          <div className="w-px h-3.5 bg-white/10 mx-1" />
  
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              document.execCommand("insertUnorderedList", false, null);
              if (editorRef.current) setContent(editorRef.current.innerHTML);
            }}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            title="Bullet List"
          >
            <List size={12} />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              document.execCommand("insertOrderedList", false, null);
              if (editorRef.current) setContent(editorRef.current.innerHTML);
            }}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            title="Numbered List"
          >
            <ListOrdered size={12} />
          </button>

          <div className="w-px h-3.5 bg-white/10 mx-1" />

          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              const newWrap = note.wrap_text === 0 ? 1 : 0;
              onEdit(note.id, { wrap_text: newWrap });
            }}
            className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold leading-normal transition-all border ${
              note.wrap_text !== 0
                ? "bg-[#00aaff]/15 border-[#00aaff]/30 text-[#00aaff]"
                : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
            }`}
            title="Toggle Text Wrap"
          >
            {note.wrap_text !== 0 ? "WRAP ON" : "WRAP OFF"}
          </button>
        </div>
      )}

      {/* Note Content */}
      <div className="flex-1 p-3 flex flex-col min-h-0">
        {isEditing ? (
          <div
            ref={editorRef}
            contentEditable
            id="review-text-area"
            className="flex-1 w-full bg-black/30 border border-white/5 text-white text-[11px] p-2 rounded outline-none overflow-y-auto leading-relaxed"
            style={{
              fontFamily: "var(--font-sans)",
              whiteSpace: note.wrap_text === 0 ? "pre" : "pre-wrap",
              wordBreak: note.wrap_text === 0 ? "normal" : "break-word",
              overflowX: note.wrap_text === 0 ? "auto" : "hidden",
              overflowY: "auto",
            }}
            placeholder="Type note content... Use Cmd+B/I/U to format, or trigger '# ' (H1) and '- ' (list)."
            onInput={(e) => {
              setContent(e.currentTarget.innerHTML);
            }}
            onKeyDown={handleKeyDown}
            onClick={handleEditorClick}
          />
        ) : (
          <div
            onDoubleClick={handleDoubleClick}
            className="flex-1 text-white text-xs font-sans leading-relaxed overflow-y-auto cursor-text select-text pr-1 rich-content"
            style={{
              whiteSpace: note.wrap_text === 0 ? "pre" : "pre-wrap",
              wordBreak: note.wrap_text === 0 ? "normal" : "break-word",
              overflowX: note.wrap_text === 0 ? "auto" : "hidden",
              overflowY: "auto",
            }}
            title="Double-click to edit note"
            dangerouslySetInnerHTML={{ __html: renderNoteContent(note.content) }}
          />
        )}
      </div>

      {/* Resize handle in bottom-right corner */}
      <div
        className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-center justify-center text-white/30 hover:text-white transition-colors"
        onPointerDown={handlePointerDownResize}
        style={{ touchAction: "none" }}
      >
        <span className="text-[10px] select-none pointer-events-none font-bold">↘</span>
      </div>
    </div>
  );
}
