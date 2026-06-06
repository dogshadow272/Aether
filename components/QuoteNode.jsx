"use client";
import { memo } from "react";

function QuoteNode({ quote, onDragStart, onDelete, isSelected, isPinned }) {
  const handlePointerDown = (e) => {
    if (e.button === 2) return;
    if (e.shiftKey) return;
    if (isPinned) return;
    e.stopPropagation();
    onDragStart(quote.id, "quote", e.clientX, e.clientY, e.currentTarget, e.pointerId);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(quote.id);
  };

  return (
    <div
      data-node-id={quote.id}
      data-node-type="quote"
      className={`absolute max-w-xs aero-panel p-3 text-white text-sm italic font-sans border-l-2 border-l-[#00aaff] ${
        isPinned ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      } ${
        isSelected ? "ring-2 ring-[#00aaff] shadow-[0_0_15px_rgba(0,170,255,0.4)] border-[#00aaff]! z-selected" : ""
      }`}
      style={{ 
        left: quote.x_pos, 
        top: quote.y_pos,
        touchAction: "none",
        zIndex: isSelected ? 150 : 30 + (quote.z_index || 0),
      }}
      onPointerDown={handlePointerDown}
    >
      <div className="flex justify-between items-start gap-4 mb-2">
        <div className="hud-text opacity-50 flex items-center gap-1">
          {isPinned && <span className="text-[9px]" title="Position Locked">📌</span>}
          <span>Quote Fragment</span>
        </div>
        <button
          id={`delete-quote-btn-${quote.id}`}
          type="button"
          onClick={handleDelete}
          className="text-white/40 hover:text-white transition-colors text-xs leading-none"
        >
          ✕
        </button>
      </div>
      &ldquo;{quote.quote}&rdquo;
    </div>
  );
}

export default memo(QuoteNode);
