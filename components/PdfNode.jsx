"use client";
import { useState, useRef, useEffect, useCallback, memo } from "react";
import { FileText, Link, Trash2, Clipboard, ChevronUp, ChevronDown, Check } from "lucide-react";

function PdfNode({
  pdf,
  onDragStart,
  onResizeStart,
  onDelete,
  onSpawnNote,
  onStartConnection,
  onToggleFocus,
  linkedNotes,
  onLocateNote,
  canvasScale,
  isFocused,
  onInteract,
  isHighlighted,
  isSelected,
  isPinned
}) {
  const [isClipboardOpen, setIsClipboardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("clipboard"); // "clipboard" or "highlights"
  const [highlights, setHighlights] = useState([]);
  const [clipboardText, setClipboardText] = useState("");
  const [justSpawned, setJustSpawned] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(1);
  
  const iframeRef = useRef(null);

  const fetchHighlights = useCallback(async () => {
    try {
      const res = await fetch(`/api/pdfs/highlights?pdf_id=${pdf.id}`);
      if (res.ok) {
        const data = await res.json();
        setHighlights(data);
      }
    } catch (err) {
      console.error("Failed to load highlights in PdfNode:", err);
    }
  }, [pdf.id]);

  useEffect(() => {
    let active = true;
    // Defer fetch to next frame to avoid synchronous setState-in-effect lint error
    const rafId = requestAnimationFrame(() => {
      if (active) {
        fetchHighlights();
      }
    });
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, [fetchHighlights]);

  // Listen to message events from the iframe to update state
  useEffect(() => {
    const handleIframeMessage = (e) => {
      if (e.data && e.data.type === "PDF_LOADED" && e.data.pdfId === pdf.id) {
        setNumPages(e.data.numPages);
      } else if (e.data && e.data.type === "PDF_INTERACT" && e.data.pdfId === pdf.id) {
        if (onInteract) {
          // Only trigger zoom alignment if the scale is too small (< 0.5) to read
          onInteract(pdf.id, "pdf", canvasScale < 0.5);
        }
      } else if (e.data && e.data.type === "HIGHLIGHT_MUTATED" && e.data.pdfId === pdf.id) {
        fetchHighlights();
      }
    };
    window.addEventListener("message", handleIframeMessage);
    return () => {
      window.removeEventListener("message", handleIframeMessage);
    };
  }, [pdf.id, onInteract, canvasScale, fetchHighlights]);

  // Propagate page changes to the iframe
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: "PAGE_CHANGE",
        page: pageNumber
      }, "*");
    }
  }, [pageNumber]);

  // Propagate card resizing to the iframe
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: "RESIZE"
      }, "*");
    }
  }, [pdf.width, pdf.height]);

  const handlePointerDownDrag = (e) => {
    if (e.shiftKey) return;
    if (isPinned) return;
    if (e.target.closest("button") || e.target.closest("textarea") || e.target.closest("canvas") || e.target.closest(".textLayer") || e.target.closest("input")) return;
    e.stopPropagation();
    onDragStart(pdf.id, "pdf", e.clientX, e.clientY, e.currentTarget.parentElement, e.pointerId);
  };

  const handlePointerDownResize = (e) => {
    e.stopPropagation();
    onResizeStart(pdf.id, "pdf-resize", e.clientX, e.clientY, e.currentTarget.parentElement, e.pointerId);
  };

  const handleSpawnClick = () => {
    if (!clipboardText.trim()) return;
    if (onSpawnNote) {
      onSpawnNote(pdf.id, clipboardText.trim());
      setClipboardText("");
      setJustSpawned(true);
      setTimeout(() => setJustSpawned(false), 2000);
    }
  };

  const handleDeleteHighlight = async (id) => {
    try {
      const res = await fetch(`/api/pdfs/highlights?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setHighlights(prev => prev.filter(h => h.id !== id));
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: "RELOAD_HIGHLIGHTS"
          }, "*");
        }
      }
    } catch (err) {
      console.error("Failed to delete highlight:", err);
    }
  };

  return (
    <div
      data-node-id={pdf.id}
      data-node-type="pdf"
      className={`absolute border rounded-lg flex flex-col pointer-events-auto bg-[#050505e0] border-white/10 backdrop-blur-xl group transition-all duration-300 ${
        isHighlighted ? "ring-2 ring-purple-500 border-purple-500! z-40" : ""
      } ${
        isSelected ? "ring-2 ring-[#00aaff] shadow-[0_0_15px_rgba(0,170,255,0.4)] border-[#00aaff]! z-40" : ""
      }`}
      style={{
        left: pdf.x_pos,
        top: pdf.y_pos,
        width: pdf.width || 450,
        height: pdf.height || 600,
        minWidth: 300,
        minHeight: 400,
        touchAction: "none",
        zIndex: 5,
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
              onStartConnection(pdf.id, "pdf", e.clientX, e.clientY);
            }}
            className="connector-handle absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#00aaff] border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 cursor-crosshair shadow-[0_0_6px_rgba(0,170,255,0.45)] z-30 pointer-events-auto"
            title="Drag to connect"
          />
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartConnection(pdf.id, "pdf", e.clientX, e.clientY);
            }}
            className="connector-handle absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-[#00aaff] border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 cursor-crosshair shadow-[0_0_6px_rgba(0,170,255,0.45)] z-30 pointer-events-auto"
            title="Drag to connect"
          />
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartConnection(pdf.id, "pdf", e.clientX, e.clientY);
            }}
            className="connector-handle absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#00aaff] border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 cursor-crosshair shadow-[0_0_6px_rgba(0,170,255,0.45)] z-30 pointer-events-auto"
            title="Drag to connect"
          />
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartConnection(pdf.id, "pdf", e.clientX, e.clientY);
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
        onDoubleClick={(e) => {
          if (e.target.closest("button")) return;
          e.stopPropagation();
          if (onToggleFocus) onToggleFocus(pdf.id, "pdf", true);
        }}
      >
        <div className="hud-text text-white font-semibold truncate flex items-center gap-1.5 max-w-[45%]">
          {isPinned && <span className="text-[9px]" title="Position Locked">📌</span>}
          <FileText size={12} className="text-[#00aaff] shrink-0" />
          <span title={pdf.name} className="truncate">{pdf.name}</span>
        </div>
        
        {/* Page navigation widget */}
        <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 z-20 shrink-0 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPageNumber(prev => Math.max(1, prev - 1));
            }}
            className="text-white/40 hover:text-white transition-colors cursor-pointer text-[8px] leading-none"
            title="Previous Page"
          >
            ◀
          </button>
          <input
            type="number"
            value={pageNumber}
            min={1}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val > 0) {
                setPageNumber(val);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-8 bg-transparent text-white border-none text-center font-mono text-[9px] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            title="Current Page"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPageNumber(prev => prev + 1);
            }}
            className="text-white/40 hover:text-white transition-colors cursor-pointer text-[8px] leading-none"
            title="Next Page"
          >
            ▶
          </button>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Connection Link button */}
          {onStartConnection && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStartConnection(pdf.id, "pdf");
              }}
              className="text-white/40 hover:text-[#00aaff] transition-colors p-1 flex items-center justify-center cursor-pointer"
              title="Connect node"
            >
              <Link size={11} />
            </button>
          )}

          {/* Extractor toggle button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsClipboardOpen((prev) => !prev);
            }}
            className={`transition-colors p-1 flex items-center justify-center cursor-pointer ${
              isClipboardOpen ? "text-[#a855f7]" : "text-white/40 hover:text-[#a855f7]"
            }`}
            title="Toggle Quote Extractor & Highlights"
          >
            <Clipboard size={11} />
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(pdf.id);
            }}
            className="text-white/40 hover:text-white transition-colors text-xs leading-none p-1"
            title="Remove document from canvas"
          >
            ✕
          </button>
        </div>
      </div>

      {/* PDF Viewer Iframe Body */}
      <div 
        className="flex-1 bg-black relative"
        onPointerDown={(e) => {
          if (e.shiftKey) return;
          e.stopPropagation();
        }}
      >
        <iframe
          ref={iframeRef}
          src={`/pdf-viewer.html?file=/uploads/${pdf.filename}&pdfId=${pdf.id}&page=${pageNumber}`}
          className="w-full h-full border-none select-text"
          title={pdf.name}
        />
        
        {/* Interaction Overlay only when zoomed out far to guide focus */}
        {(canvasScale < 0.5 && !isFocused) && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              if (onInteract) onInteract(pdf.id, "pdf", true);
            }}
            className="absolute inset-0 bg-black/40 hover:bg-black/20 backdrop-blur-[1px] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 z-10"
            title="Click to Zoom & Interact"
          >
            <div className="bg-black/85 border border-white/20 px-3 py-1.5 rounded-lg text-white font-mono text-[10px] tracking-wider shadow-lg flex items-center gap-1.5 animate-pulse">
              <span>⌕</span> CLICK TO ZOOM & EXTRACT QUOTES
            </div>
          </div>
        )}
      </div>

      {/* Quote Extractor & Highlights Drawer */}
      {isClipboardOpen && (
        <div className="border-t border-white/5 bg-black/80 p-3 font-mono text-[9px] flex flex-col gap-2 relative">
          <div className="flex justify-between items-center border-b border-white/5 pb-1.5 select-none">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("clipboard")}
                className={`text-[9px] uppercase tracking-wider font-bold transition-colors cursor-pointer ${
                  activeTab === "clipboard" ? "text-[#a855f7]" : "text-white/40 hover:text-white"
                }`}
              >
                CLIPBOARD
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("highlights")}
                className={`text-[9px] uppercase tracking-wider font-bold transition-colors cursor-pointer ${
                  activeTab === "highlights" ? "text-[#a855f7]" : "text-white/40 hover:text-white"
                }`}
              >
                HIGHLIGHTS ({highlights.length})
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsClipboardOpen(false)}
              className="text-white/40 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>

          {activeTab === "clipboard" ? (
            <>
              <textarea
                value={clipboardText}
                onChange={(e) => setClipboardText(e.target.value)}
                placeholder="Paste text selected from the document above... then click Spawn Note to drop a linked card."
                className="w-full h-16 bg-black/80 border border-white/10 text-white p-1.5 rounded outline-none resize-none font-sans text-xs focus:border-[#a855f7]"
              />
              <div className="text-[7px] text-white/30 mb-0.5 select-none font-sans">
                PRO-TIP: SELECT TEXT IN PDF AND PRESS 1, 2 OR 3 TO HIGHLIGHT (0/BACKSPACE TO DELETE).
              </div>
              {clipboardText.trim() && (
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", clipboardText.trim());
                    e.dataTransfer.setData("application/x-pdf-source-id", pdf.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  className="bg-[#a855f7]/20 hover:bg-[#a855f7]/30 border border-[#a855f7]/50 text-white py-1.5 rounded cursor-grab active:cursor-grabbing text-[9px] select-none text-center font-bold tracking-widest transition-all animate-pulse flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                  title="Drag this quote anywhere on the canvas to spawn a note card!"
                >
                  <span>✥</span> DRAG QUOTE TO CANVAS
                </div>
              )}
              <button
                type="button"
                onClick={handleSpawnClick}
                disabled={!clipboardText.trim()}
                className={`py-1 rounded text-center font-bold tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  justSpawned
                    ? "bg-green-500 text-black shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                    : clipboardText.trim()
                    ? "bg-[#a855f7] text-white hover:bg-[#a855f7]/95"
                    : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                }`}
              >
                {justSpawned ? (
                  <>
                    <Check size={10} /> LINKED NOTE CREATED
                  </>
                ) : (
                  "SPAWN LINKED INDEX NOTE"
                )}
              </button>

              {linkedNotes && linkedNotes.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-1.5">
                  <span className="text-white/40 select-none uppercase tracking-wider text-[8px] font-bold">SPAWNED QUOTE CARDS ({linkedNotes.length}):</span>
                  <div className="max-h-24 overflow-y-auto flex flex-col gap-1 pr-1 font-sans">
                    {linkedNotes.map((note) => {
                      const cleanText = note.content.replace(/<[^>]*>/g, "").trim() || "Empty note...";
                      return (
                        <button
                          key={note.id}
                          type="button"
                          onClick={() => onLocateNote && onLocateNote(note.id)}
                          className="text-left bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 hover:text-white px-2 py-1.5 rounded text-[10px] truncate transition-colors cursor-pointer flex justify-between items-center gap-1.5"
                        >
                          <span className="truncate">{cleanText}</span>
                          <span className="text-[7px] text-[#00aaff] font-mono shrink-0">LOCATE ⌖</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1 select-none">
              {Object.keys(highlights.reduce((acc, h) => {
                const page = h.page_number;
                if (!acc[page]) acc[page] = [];
                acc[page].push(h);
                return acc;
              }, {})).length === 0 ? (
                <div className="text-white/30 text-center py-4 select-none">
                  NO HIGHLIGHTS YET
                  <div className="text-[7px] mt-1 uppercase font-sans">Select text inside PDF and press 1 (purple), 2 (cyan), or 3 (green)</div>
                </div>
              ) : (
                Object.keys(highlights.reduce((acc, h) => {
                  const page = h.page_number;
                  if (!acc[page]) acc[page] = [];
                  acc[page].push(h);
                  return acc;
                }, {}))
                  .map(Number)
                  .sort((a, b) => a - b)
                  .map((page) => {
                    const pageHighlights = highlights.filter(h => h.page_number === page);
                    return (
                      <div key={page} className="flex flex-col gap-1">
                        <div className="text-[#00aaff] font-bold text-[8px] uppercase tracking-wider select-none border-b border-white/5 pb-0.5 mt-1">
                          PAGE {page}
                        </div>
                        <div className="flex flex-col gap-1.5 font-sans">
                          {pageHighlights.map((h) => {
                            let colorBorder = "border-l-2 border-l-[#a855f7] bg-[#a855f7]/5";
                            if (h.color === "cyan") colorBorder = "border-l-2 border-l-[#00aaff] bg-[#00aaff]/5";
                            else if (h.color === "green") colorBorder = "border-l-2 border-l-[#22c55e] bg-[#22c55e]/5";
                            return (
                              <div
                                key={h.id}
                                className={`flex flex-col gap-1.5 p-2 rounded border border-white/5 transition-all hover:border-white/10 ${colorBorder}`}
                              >
                                <div className="text-white/90 text-[10px] leading-relaxed font-sans select-text break-words">
                                  &ldquo;{h.text}&rdquo;
                                </div>
                                <div className="flex justify-between items-center gap-1 font-mono text-[8px]">
                                  <span className="text-[7px] text-white/30 uppercase font-sans">
                                    {h.color}
                                  </span>
                                  <div className="flex gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setPageNumber(h.page_number)}
                                      className="bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-1.5 py-0.5 rounded text-[7px] font-bold transition-colors cursor-pointer flex items-center gap-0.5"
                                      title="Jump to page"
                                    >
                                      JUMP ⌖
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onSpawnNote && onSpawnNote(pdf.id, h.text)}
                                      className="bg-[#a855f7]/20 hover:bg-[#a855f7]/30 text-white border border-[#a855f7]/40 px-1.5 py-0.5 rounded text-[7px] font-bold transition-all cursor-pointer flex items-center gap-0.5"
                                      title="Spawn index note from highlight"
                                    >
                                      SPAWN ✥
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteHighlight(h.id)}
                                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded text-[7px] font-bold transition-colors cursor-pointer"
                                      title="Delete highlight"
                                    >
                                      DELETE ✕
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </div>
      )}

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

export default memo(PdfNode);
