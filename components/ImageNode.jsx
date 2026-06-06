"use client";
import { useState, memo } from "react";
import { ImageIcon, Link, Trash2 } from "lucide-react";

function ImageNode({
  image,
  onDragStart,
  onResizeStart,
  onDelete,
  onStartConnection,
  onToggleFocus,
  canvasScale,
  isFocused,
  onInteract,
  isHighlighted,
  isSelected,
  isPinned,
  onRename,
  isDragging
}) {
  const handlePointerDownDrag = (e) => {
    if (e.button === 2) return;
    if (e.shiftKey) return;
    if (isPinned) return;
    if (e.target.closest("button") || e.target.closest("input")) return;
    e.stopPropagation();
    onDragStart(image.id, "image", e.clientX, e.clientY, e.currentTarget.parentElement, e.pointerId);
  };

  const handlePointerDownResize = (e) => {
    e.stopPropagation();
    onResizeStart(image.id, "image-resize", e.clientX, e.clientY, e.currentTarget.parentElement, e.pointerId);
  };

  const handleDoubleClickRename = (e) => {
    e.stopPropagation();
    if (onRename) {
      const newName = prompt("ENTER NEW NAME FOR THIS IMAGE:", image.name);
      if (newName && newName.trim() && newName.trim() !== image.name) {
        onRename(image.id, newName.trim());
      }
    }
  };

  if (isDragging) {
    return (
      <div
        data-node-id={image.id}
        data-node-type="image"
        className="absolute border border-dashed border-[#00e1ff]/70 bg-[#00e1ff]/5 rounded-lg flex flex-col items-center justify-center pointer-events-none select-none"
        style={{
          left: image.x_pos,
          top: image.y_pos,
          width: image.width || 300,
          height: image.height || 300,
          touchAction: "none",
          zIndex: 1000,
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
        }}
      >
        <div className="flex flex-col items-center gap-2 text-[#00e1ff] font-mono text-[10px] uppercase tracking-wider font-bold">
          <span>🖼️ DRAG ACTIVE</span>
          <span className="text-white/60 text-[9px] lowercase font-normal">{image.name}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      data-node-id={image.id}
      data-node-type="image"
      className={`absolute border rounded-lg flex flex-col pointer-events-auto bg-[#050505e0] border-white/10 backdrop-blur-xl group transition-all duration-300 ${
        isHighlighted ? "ring-2 ring-[#00aaff] border-[#00aaff]! z-selected" : ""
      } ${
        isSelected ? "ring-2 ring-[#00aaff] shadow-[0_0_15px_rgba(0,170,255,0.4)] border-[#00aaff]! z-selected" : ""
      }`}
      style={{
        left: image.x_pos,
        top: image.y_pos,
        width: image.width || 300,
        height: image.height || 300,
        minWidth: 150,
        minHeight: 150,
        touchAction: "none",
        zIndex: isSelected || isHighlighted ? 150 : 40 + (image.z_index || 0),
        boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
      }}
    >
      {/* Miro-style Connection Handles */}
      {onStartConnection && (
        <>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartConnection(image.id, "image", e.clientX, e.clientY);
            }}
            className="connector-handle absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#00aaff] border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 cursor-crosshair shadow-[0_0_6px_rgba(0,170,255,0.45)] z-30 pointer-events-auto"
            title="Drag to connect"
          />
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartConnection(image.id, "image", e.clientX, e.clientY);
            }}
            className="connector-handle absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-[#00aaff] border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 cursor-crosshair shadow-[0_0_6px_rgba(0,170,255,0.45)] z-30 pointer-events-auto"
            title="Drag to connect"
          />
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartConnection(image.id, "image", e.clientX, e.clientY);
            }}
            className="connector-handle absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#00aaff] border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 cursor-crosshair shadow-[0_0_6px_rgba(0,170,255,0.45)] z-30 pointer-events-auto"
            title="Drag to connect"
          />
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartConnection(image.id, "image", e.clientX, e.clientY);
            }}
            className="connector-handle absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#00aaff] border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 cursor-crosshair shadow-[0_0_6px_rgba(0,170,255,0.45)] z-30 pointer-events-auto"
            title="Drag to connect"
          />
        </>
      )}

      {/* Header Bar */}
      <div
        className={`px-3 py-1.5 border-b border-white/5 bg-black/40 flex items-center justify-between rounded-t-lg select-none ${
          isPinned ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        }`}
        onPointerDown={handlePointerDownDrag}
        onDoubleClick={handleDoubleClickRename}
      >
        <div className="hud-text text-white font-semibold truncate flex items-center gap-1.5 max-w-[70%]">
          {isPinned && <span className="text-[9px]" title="Position Locked">📌</span>}
          <ImageIcon size={12} className="text-[#00aaff] shrink-0" aria-hidden="true" />
          <span title={image.name} className="truncate cursor-text" onClick={handleDoubleClickRename}>{image.name}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Connection Link button */}
          {onStartConnection && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStartConnection(image.id, "image");
              }}
              className="text-white/40 hover:text-[#00aaff] transition-colors p-1 flex items-center justify-center cursor-pointer"
              title="Connect node"
            >
              <Link size={11} />
            </button>
          )}

          {/* Delete button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(image.id);
            }}
            className="text-white/40 hover:text-white transition-colors text-xs leading-none p-1"
            title="Remove image from canvas"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Image body */}
      <div 
        className="flex-1 bg-black/20 relative overflow-hidden flex items-center justify-center rounded-b-lg"
        onPointerDown={(e) => {
          if (e.shiftKey) return;
          e.stopPropagation();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/uploads/${image.filename}`}
          alt={image.name}
          className="w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
        />

        {/* Interaction Overlay only when zoomed out far */}
        {(canvasScale < 0.5 && !isFocused) && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              if (onInteract) onInteract(true);
            }}
            className="absolute inset-0 bg-black/40 hover:bg-black/20 backdrop-blur-[1px] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 z-10"
            title="Click to Zoom & Interact"
          >
            <div className="bg-black/85 border border-white/20 px-3 py-1.5 rounded-lg text-white font-mono text-[10px] tracking-wider shadow-lg animate-pulse">
              ⌕ CLICK TO ZOOM & VIEW
            </div>
          </div>
        )}
      </div>

      {/* Resize handle in bottom-right corner */}
      <div
        className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-center justify-center text-white/30 hover:text-white transition-colors z-20"
        onPointerDown={handlePointerDownResize}
        style={{ touchAction: "none" }}
      >
        <span className="text-[10px] select-none pointer-events-none font-bold">↘</span>
      </div>
    </div>
  );
}

export default memo(ImageNode);
