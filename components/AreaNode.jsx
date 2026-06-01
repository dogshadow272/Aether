"use client";
import { useState, useRef, useEffect } from "react";
import { Eye, LayoutGrid } from "lucide-react";

const getColorClass = (rgba) => {
  if (!rgba) return "theme-glow-blue";
  if (rgba.includes("168, 85, 247") || rgba.includes("a855f7")) return "theme-glow-purple";
  if (rgba.includes("34, 197, 94") || rgba.includes("22c55e")) return "theme-glow-green";
  if (rgba.includes("239, 68, 68") || rgba.includes("ef4444")) return "theme-glow-red";
  if (rgba.includes("249, 115, 22") || rgba.includes("eab308") || rgba.includes("234, 179, 8")) return "theme-glow-yellow";
  return "theme-glow-blue";
};

const getColorHex = (rgba) => {
  if (!rgba) return "#00aaff";
  if (rgba.includes("168, 85, 247") || rgba.includes("a855f7")) return "#a855f7";
  if (rgba.includes("34, 197, 94") || rgba.includes("22c55e")) return "#22c55e";
  if (rgba.includes("239, 68, 68") || rgba.includes("ef4444")) return "#ef4444";
  if (rgba.includes("249, 115, 22") || rgba.includes("eab308") || rgba.includes("234, 179, 8")) return "#eab308";
  return "#00aaff";
};

export default function AreaNode({ area, onDragStart, onResizeStart, onDelete, onRename, onArrangeNodes, booksCount = 0, completedCount = 0, isFocused, onToggleFocus, isHighlighted }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(area.name);
  const inputRef = useRef(null);

  const handlePointerDownDrag = (e) => {
    if (e.target.closest("button") || e.target.closest("input")) return;
    e.stopPropagation();
    onDragStart(area.id, "area", e.clientX, e.clientY, e.currentTarget.parentElement, e.pointerId);
  };

  const handlePointerDownResize = (e) => {
    e.stopPropagation();
    onResizeStart(area.id, "area-resize", e.clientX, e.clientY, e.currentTarget.parentElement, e.pointerId);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleRenameSubmit = () => {
    setIsEditing(false);
    if (name.trim() && name !== area.name) {
      onRename(area.id, name.trim());
    } else {
      setName(area.name);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleRenameSubmit();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      setName(area.name);
    }
  };

  return (
    <div
      className={`absolute border rounded-lg flex flex-col pointer-events-auto ${getColorClass(area.color)} ${
        isHighlighted ? "animate-pulse ring-4 ring-[#a855f7]/60 shadow-[0_0_20px_rgba(168,85,247,0.5)] border-[#a855f7]! z-40" : ""
      }`}
      style={{
        left: area.x_pos,
        top: area.y_pos,
        width: area.width || 200,
        height: area.height || 200,
        borderWidth: "1px",
        borderStyle: "solid",
        backgroundColor: area.color || "rgba(0, 170, 255, 0.08)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        touchAction: "none",
        zIndex: 1,
        transition: "border-color 0.2s, box-shadow 0.2s, background-color 0.2s",
      }}
    >
      <div
        className="px-3 py-1.5 border-b border-white/5 bg-black/30 flex items-center justify-between cursor-grab active:cursor-grabbing rounded-t-lg select-none"
        onPointerDown={handlePointerDownDrag}
        onDoubleClick={(e) => {
          if (e.target.closest("input") || e.target.closest(".hud-text")) return;
          e.stopPropagation();
          if (onToggleFocus) onToggleFocus(true);
        }}
      >
        <div className="flex items-center gap-2 max-w-[80%]">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleKeyDown}
              className="bg-black/60 border border-[#00aaff]/50 text-white text-xs px-1.5 py-0.5 rounded outline-none w-24 font-mono uppercase tracking-wider"
            />
          ) : (
            <div
              onDoubleClick={handleDoubleClick}
              className="hud-text text-white font-semibold truncate cursor-text flex items-center gap-1.5"
              title="Double-click to rename"
            >
              <span>{area.name}</span>
              {booksCount > 0 && (
                <span className="text-[8px] font-mono opacity-50 font-normal normal-case">
                  ({booksCount} mods // {Math.round((completedCount / booksCount) * 100)}% done)
                </span>
              )}
            </div>
          )}

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
                  onRename(area.id, { color: theme.val });
                }}
                className={`w-2 h-2 rounded-full border transition-transform hover:scale-125 ${
                  (area.color || "rgba(0, 170, 255, 0.08)") === theme.val ? "border-white scale-110" : "border-white/20"
                }`}
                style={{ backgroundColor: theme.hex }}
                title={theme.label}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onArrangeNodes && booksCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onArrangeNodes(area.id);
              }}
              className="text-white/40 hover:text-[#00aaff] transition-colors p-1 flex items-center justify-center cursor-pointer"
              title="Organize area modules in a grid"
            >
              <LayoutGrid size={11} />
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
              title={isFocused ? "Exit Focus Mode" : "Focus on this Category Zone & modules"}
            >
              <Eye size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(area.id)}
            className="text-white/40 hover:text-white transition-colors text-xs leading-none p-1"
          >
            ✕
          </button>
        </div>
      </div>
      {booksCount > 0 && (
        <div className="h-0.5 bg-white/5 w-full relative">
          <div 
            className="absolute top-0 left-0 h-full transition-all duration-500"
            style={{ 
              width: `${(completedCount / booksCount) * 100}%`,
              backgroundColor: getColorHex(area.color),
              boxShadow: `0 0 4px ${getColorHex(area.color)}`
            }}
          />
        </div>
      )}

      {/* Description placeholder in empty state */}
      <div className="flex-1 p-4 flex items-center justify-center pointer-events-none select-none text-[10px] hud-text opacity-15 text-center">
        CATEGORIZATION ZONE
      </div>

      {/* Resize handle in bottom-right corner */}
      <div
        className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-center justify-center text-white/30 hover:text-white transition-colors"
        onPointerDown={handlePointerDownResize}
      >
        <span className="text-[10px] select-none pointer-events-none font-bold">↘</span>
      </div>
    </div>
  );
}
