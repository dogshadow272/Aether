"use client";
import { useRef, memo } from "react";
import { Link, Eye, Film } from "lucide-react";

function MovieNode({ movie, onDragStart, onStartConnection, isFocused, onToggleFocus, isHighlighted, isSelected, isPinned }) {
  const handlePointerDown = (e) => {
    if (e.button === 2) return;
    if (e.shiftKey) return;
    if (isPinned) return;
    // If clicking a handle, don't drag
    if (e.target.closest(".connector-handle")) return;
    e.stopPropagation();
    onDragStart(movie.id, "movie", e.clientX, e.clientY, e.currentTarget, e.pointerId);
  };

  return (
    <div
      data-node-id={movie.id}
      data-node-type="movie"
      className={`absolute aero-panel w-48 group transition-shadow duration-300 ${
        isPinned ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      } ${
        isHighlighted ? "ring-2 ring-purple-500 border-purple-500! z-selected" : ""
      } ${
        isSelected ? "ring-2 ring-[#00aaff] shadow-[0_0_15px_rgba(0,170,255,0.4)] border-[#00aaff]! z-selected" : ""
      }`}
      style={{
        left: movie.x_pos,
        top: movie.y_pos,
        touchAction: "none",
        zIndex: isSelected || isHighlighted ? 150 : 50 + (movie.z_index || 0),
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={(e) => {
        if (e.target.closest("button")) return;
        e.stopPropagation();
        if (onToggleFocus) onToggleFocus(movie.id, "movie", true);
      }}
    >
      {/* Connection Handles */}
      {onStartConnection && (
        <>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartConnection(movie.id, "movie", e.clientX, e.clientY);
            }}
            className="connector-handle absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#00aaff] border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 cursor-crosshair shadow-[0_0_6px_rgba(0,170,255,0.45)] z-30 pointer-events-auto"
            title="Drag to connect"
          />
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartConnection(movie.id, "movie", e.clientX, e.clientY);
            }}
            className="connector-handle absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-[#00aaff] border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 cursor-crosshair shadow-[0_0_6px_rgba(0,170,255,0.45)] z-30 pointer-events-auto"
            title="Drag to connect"
          />
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartConnection(movie.id, "movie", e.clientX, e.clientY);
            }}
            className="connector-handle absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#00aaff] border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 cursor-crosshair shadow-[0_0_6px_rgba(0,170,255,0.45)] z-30 pointer-events-auto"
            title="Drag to connect"
          />
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartConnection(movie.id, "movie", e.clientX, e.clientY);
            }}
            className="connector-handle absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#00aaff] border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 cursor-crosshair shadow-[0_0_6px_rgba(0,170,255,0.45)] z-30 pointer-events-auto"
            title="Drag to connect"
          />
        </>
      )}
      <div className="aero-header flex justify-between items-center">
        <div className="hud-text truncate text-[10px] flex items-center gap-1 font-mono">
          <Film size={10} className="text-[#00aaff]" />
          <span>IMDB // {movie.id.substring(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {onStartConnection && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStartConnection(movie.id, "movie");
              }}
              className="text-white/40 hover:text-[#00aaff] transition-colors p-0.5 flex items-center justify-center"
              title="Connect node"
            >
              <Link size={10} />
            </button>
          )}
          {onToggleFocus && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFocus(movie.id, "movie", false);
              }}
              className={`transition-colors p-0.5 mr-1 flex items-center justify-center ${
                isFocused ? "text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.7)] scale-110" : "text-white/40 hover:text-purple-400"
              }`}
              title={isFocused ? "Exit Focus Mode" : "Focus on this node & connections"}
            >
              <Eye size={10} />
            </button>
          )}
        </div>
      </div>
      <div className="p-3 relative group">
        {movie.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={movie.cover_url}
            alt={movie.title}
            className="w-full h-auto rounded border border-white/10 transition-transform group-hover:scale-105"
            draggable={false}
          />
        ) : (
          <div className="w-full aspect-[2/3] bg-black/40 border border-white/10 rounded flex items-center justify-center text-center text-gray-500 text-sm">
            No Poster
          </div>
        )}

        <h3 className="mt-2 text-sm font-semibold text-white break-words">
          {movie.title} {movie.year ? `(${movie.year})` : ""}
        </h3>

        {/* Rating Stars */}
        {movie.rating > 0 && (
          <div className="flex gap-0.5 mt-1 text-[#00aaff] text-xs">
            {"★".repeat(movie.rating)}
            {"☆".repeat(5 - movie.rating)}
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-5 right-5 bg-black/60 border border-white/20 text-white text-[9px] uppercase px-2 py-0.5 rounded backdrop-blur-md font-mono">
          {movie.status}
        </div>
      </div>
    </div>
  );
}

export default memo(MovieNode);
