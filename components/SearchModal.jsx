"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Sparkles, Terminal, FileText, LayoutGrid, Eye, HelpCircle, Compass, RefreshCw, ZoomIn, ZoomOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SearchModal({
  onAddBook,
  onAddNote,
  onTidyCanvas,
  onToggleTimeline,
  onToggleConnections,
  onResetViewport,
  onEnterDrawMode,
  onZoomIn,
  onZoomOut,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // System actions list
  const getSystemCommands = () => [
    {
      id: "cmd-add-note",
      title: "ADD INDEX CARD NOTE",
      subtitle: "SPAWNS A NEW EDITABLE MEMO BLOCK ON CANVAS",
      icon: <FileText size={16} className="text-[#00aaff]" />,
      action: () => onAddNote(),
      hotkey: "N",
    },
    {
      id: "cmd-draw-zone",
      title: "CREATE CATEGORY ZONE",
      subtitle: "ENTER DRAW MODE TO MAP FICTION/NON-FICTION SECTORS",
      icon: <LayoutGrid size={16} className="text-[#22c55e]" />,
      action: () => onEnterDrawMode(),
      hotkey: "DRAG",
    },
    {
      id: "cmd-tidy-canvas",
      title: "TIDY WORKSPACE LAYOUT",
      subtitle: "ALIGN BOOKS CHRONOLOGICALLY & SATELLITES IN ARCS",
      icon: <Sparkles size={16} className="text-[#a855f7]" />,
      action: () => onTidyCanvas(),
      hotkey: "ALIGN",
    },
    {
      id: "cmd-reset-viewport",
      title: "RESET WORKSPACE VIEWPORT",
      subtitle: "CENTER CAMERA PAN & RESET SCALE TO 100%",
      icon: <Compass size={16} className="text-[#ef4444]" />,
      action: () => onResetViewport(),
      hotkey: "HOME",
    },
    {
      id: "cmd-zoom-in",
      title: "ZOOM IN CANVAS",
      subtitle: "SCALE UP SCREEN MATRIX DETAILS",
      icon: <ZoomIn size={16} className="text-[#eab308]" />,
      action: () => onZoomIn(),
      hotkey: "SCROLL",
    },
    {
      id: "cmd-zoom-out",
      title: "ZOOM OUT CANVAS",
      subtitle: "SCALE DOWN TO VIEW COMPREHENSIVE CANVAS",
      icon: <ZoomOut size={16} className="text-[#eab308]" />,
      action: () => onZoomOut(),
      hotkey: "SCROLL",
    },
    {
      id: "cmd-toggle-timeline",
      title: "TOGGLE CHRONOLOGICAL TIMELINE",
      subtitle: "HIDE OR SHOW CONNECTING DASHED GRID LINES",
      icon: <Eye size={16} className="text-gray-400" />,
      action: () => onToggleTimeline(),
      hotkey: "HUD",
    },
    {
      id: "cmd-toggle-links",
      title: "TOGGLE QUOTE SATELLITE LINKS",
      subtitle: "HIDE OR SHOW FLUID BEZIER STREAM GLOWS",
      icon: <Eye size={16} className="text-gray-400" />,
      action: () => onToggleConnections(),
      hotkey: "HUD",
    },
  ];

  // Shortcut keybind (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const isKPressed = e.key && (e.key.toLowerCase() === "k" || e.code === "KeyK");
      if ((e.metaKey || e.ctrlKey) && isKPressed) {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen((prev) => {
          const next = !prev;
          if (next) {
            setQuery("");
            setResults([]);
            setSelectedIndex(0);
          }
          return next;
        });
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown, true);
  }, []);

  // Autofocus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const searchBooks = async (searchQuery) => {
    const term = searchQuery.trim();
    if (!term || loading) return;

    setLoading(true);
    setResults([]);
    setSelectedIndex(0);

    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(term)}&limit=8`
      );
      const data = await res.json();
      const books = data.docs.map((doc) => ({
        id: doc.key,
        title: doc.title,
        author: doc.author_name ? doc.author_name[0] : "Unknown Author",
        cover_url: doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
          : "",
        isBook: true,
      }));
      setResults(books);
    } catch (err) {
      console.error("Open Library Query failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleActionTrigger = (item) => {
    if (item.isBook) {
      onAddBook(item);
    } else if (item.action) {
      item.action();
    }
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  // Filter commands or books depending on query
  const getDisplayItems = () => {
    const systemCommands = getSystemCommands();
    if (!query) {
      return systemCommands;
    }

    if (query.startsWith(">")) {
      const filter = query.substring(1).trim().toUpperCase();
      if (!filter) return systemCommands;
      return systemCommands.filter((cmd) => cmd.title.includes(filter) || cmd.subtitle.includes(filter));
    }

    // Otherwise, we are showing book search results
    // We add an option to query the Open Library database at the top if no results are fetched yet
    if (results.length === 0) {
      return [
        {
          id: "cmd-search-api",
          title: `QUERY DATABASE FOR: "${query.toUpperCase()}"`,
          subtitle: "FETCH MATCHING BOOK MODULES FROM OPEN LIBRARY",
          icon: <RefreshCw size={16} className="text-[#00aaff] animate-spin" />,
          action: () => searchBooks(query),
          isTrigger: true,
        },
        ...systemCommands.filter((cmd) => cmd.title.includes(query.toUpperCase())),
      ];
    }

    return results;
  };

  const displayItems = getDisplayItems();

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % displayItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (displayItems[selectedIndex]) {
        const item = displayItems[selectedIndex];
        if (item.isTrigger) {
          item.action();
        } else {
          handleActionTrigger(item);
        }
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={() => setIsOpen(false)}
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="aero-panel w-full max-w-xl mx-4 bg-[#0a0a0af5] border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="aero-header justify-between bg-white/5 border-b border-white/5">
              <div className="hud-text text-white flex items-center gap-2">
                <Terminal size={14} className="text-[#00aaff]" />
                <span>COMMAND_CENTER // OS</span>
              </div>
              <div className="hud-text text-[8px] opacity-40">ESC TO ABORT</div>
            </div>

            {/* Input Bar */}
            <div className="p-4 border-b border-white/5 bg-black/40">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-[#00aaff] opacity-70" size={16} />
                <input
                  ref={inputRef}
                  id="search-db-input"
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setResults([]);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type > for system commands or search for a book cover..."
                  className="aero-input pl-9 pr-4 py-2 text-xs font-mono tracking-wider bg-black/80 border border-white/10 text-white rounded outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* List Body */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {loading && (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-500 font-mono text-[9px] uppercase tracking-widest">
                  <Loader2 className="animate-spin text-[#00aaff]" size={24} />
                  <span>FETCHING REMOTE DATA STREAMS...</span>
                </div>
              )}

              {!loading && displayItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2.5 rounded-md cursor-pointer border transition-all ${
                      isSelected
                        ? "bg-[#00aaff]/10 border-[#00aaff]/40 shadow-[0_0_8px_rgba(0,170,255,0.15)]"
                        : "bg-transparent border-transparent hover:bg-white/5"
                    }`}
                    onClick={() => {
                      if (item.isTrigger) {
                        item.action();
                      } else {
                        handleActionTrigger(item);
                      }
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Icon / Cover */}
                      {item.isBook ? (
                        item.cover_url ? (
                          <img src={item.cover_url} alt={item.title} className="w-7 h-10 object-cover rounded shadow border border-white/10" />
                        ) : (
                          <div className="w-7 h-10 bg-white/10 flex items-center justify-center text-[7px] text-gray-400 rounded">
                            NO COVER
                          </div>
                        )
                      ) : (
                        <div className={`p-1.5 rounded bg-black/40 border border-white/5 ${isSelected ? "border-[#00aaff]/20" : ""}`}>
                          {item.icon || <HelpCircle size={14} className="text-gray-400" />}
                        </div>
                      )}

                      {/* Labels */}
                      <div className="min-w-0 font-sans">
                        <div className={`text-xs font-semibold truncate ${isSelected ? "text-[#00aaff]" : "text-white"}`}>
                          {item.title}
                        </div>
                        <div className="text-[9px] text-gray-400 font-mono uppercase tracking-wider truncate mt-0.5">
                          {item.subtitle || item.author}
                        </div>
                      </div>
                    </div>

                    {/* Hotkey tag / action flag */}
                    {!item.isBook && item.hotkey && (
                      <span className="font-mono text-[8px] bg-white/5 text-gray-400 border border-white/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {item.hotkey}
                      </span>
                    )}
                  </div>
                );
              })}

              {!loading && displayItems.length === 0 && (
                <div className="text-center text-gray-600 font-mono text-[9px] uppercase py-10 tracking-widest">
                  NO MATCHES FOUND IN OS DIRECTORY
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
