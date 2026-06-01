"use client";

export default function QuoteNode({ quote, onDragStart, onDelete }) {
  const handlePointerDown = (e) => {
    e.stopPropagation();
    onDragStart(quote.id, "quote", e.clientX, e.clientY, e.currentTarget, e.pointerId);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(quote.id);
  };

  return (
    <div
      className="absolute max-w-xs aero-panel p-3 text-white text-sm italic font-sans cursor-grab active:cursor-grabbing border-l-2 border-l-[#00aaff]"
      style={{ 
        left: quote.x_pos, 
        top: quote.y_pos,
        touchAction: "none",
        zIndex: 10,
      }}
      onPointerDown={handlePointerDown}
    >
      <div className="flex justify-between items-start gap-4 mb-2">
        <div className="hud-text opacity-50">Quote Fragment</div>
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
