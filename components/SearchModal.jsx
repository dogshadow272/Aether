"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Sparkles, Terminal, FileText, LayoutGrid, Eye, HelpCircle, Compass, RefreshCw, ZoomIn, ZoomOut, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SearchModal({
  isOpen: controlledIsOpen,
  onOpen: controlledOnOpen,
  onClose: controlledOnClose,
  onAddBook,
  onAddMovie,
  onAddNote,
  onToggleConnections,
  onResetViewport,
  onEnterDrawMode,
  onZoomIn,
  onZoomOut,
  books = [],
  movies = [],
  notes = [],
  areas = [],
  pdfs = [],
  quotes = [],
  images = [],
  onTeleport
}) {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : localIsOpen;
  const setIsOpen = (val) => {
    if (val) {
      if (controlledOnOpen) controlledOnOpen();
    } else {
      if (controlledOnClose) controlledOnClose();
    }
    setLocalIsOpen(val);
  };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const apiBooks = data.docs.map((doc) => ({
        id: doc.key,
        title: doc.title,
        author: doc.author_name ? doc.author_name[0] : "Unknown Author",
        cover_url: doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
          : "",
        isBook: true,
      }));
      setResults(apiBooks);
    } catch (err) {
      console.error("Open Library Query failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const searchMovies = async (searchQuery) => {
    const term = searchQuery.trim();
    if (!term || loading) return;

    setLoading(true);
    setResults([]);
    setSelectedIndex(0);

    try {
      const res = await fetch(
        `/api/movies/search?q=${encodeURIComponent(term)}`
      );
      const data = await res.json();
      const apiMovies = data.map((item) => ({
        ...item,
        isMovie: true,
      }));
      setResults(apiMovies);
    } catch (err) {
      console.error("IMDb Query failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleActionTrigger = (item) => {
    if (item.isLocal) {
      if (onTeleport) onTeleport(item.id, item.type);
    } else if (item.isBook) {
      onAddBook(item);
    } else if (item.isMovie) {
      onAddMovie(item);
    } else if (item.action) {
      item.action();
    }
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  // Filter commands, local nodes, or books depending on query
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

    // Filter local nodes matching query
    const term = query.toLowerCase();
    
    const localBooks = books
      .filter(b => (b.title && b.title.toLowerCase().includes(term)) || (b.author && b.author.toLowerCase().includes(term)))
      .map(b => ({
        id: b.id,
        title: b.title.toUpperCase(),
        subtitle: `BOOK BY ${b.author ? b.author.toUpperCase() : "UNKNOWN"} [ON CANVAS]`,
        type: "book",
        isLocal: true,
        cover_url: b.cover_url,
        hotkey: "JUMP"
      }));

    const localMovies = movies
      .filter(m => (m.title && m.title.toLowerCase().includes(term)) || (m.director && m.director.toLowerCase().includes(term)))
      .map(m => ({
        id: m.id,
        title: m.title.toUpperCase(),
        subtitle: `MOVIE BY ${m.director ? m.director.toUpperCase() : "UNKNOWN"} [ON CANVAS]`,
        type: "movie",
        isLocal: true,
        cover_url: m.cover_url,
        hotkey: "JUMP"
      }));

    const localNotes = notes
      .filter(n => n.content && n.content.toLowerCase().includes(term))
      .map(n => {
        const cleanContent = n.content.replace(/<[^>]*>/g, "").trim();
        return {
          id: n.id,
          title: cleanContent.length > 45 ? cleanContent.substring(0, 45).toUpperCase() + "..." : cleanContent.toUpperCase() || "EMPTY INDEX CARD",
          subtitle: "INDEX CARD NOTE [ON CANVAS]",
          type: "note",
          isLocal: true,
          icon: <FileText size={16} className="text-[#00aaff]" />,
          hotkey: "JUMP"
        };
      });

    const localAreas = areas
      .filter(a => a.name && a.name.toLowerCase().includes(term))
      .map(a => ({
        id: a.id,
        title: a.name.toUpperCase(),
        subtitle: "CATEGORY ZONE BOUNDARY [ON CANVAS]",
        type: "area",
        isLocal: true,
        icon: <LayoutGrid size={16} className="text-[#22c55e]" />,
        hotkey: "JUMP"
      }));

    const localPdfs = pdfs
      .filter(p => p.name && p.name.toLowerCase().includes(term))
      .map(p => ({
        id: p.id,
        title: p.name.toUpperCase(),
        subtitle: "RESEARCH REFERENCE PDF [ON CANVAS]",
        type: "pdf",
        isLocal: true,
        icon: <FileText size={16} className="text-[#a855f7]" />,
        hotkey: "JUMP"
      }));

    const localImages = images
      .filter(img => img.name && img.name.toLowerCase().includes(term))
      .map(img => ({
        id: img.id,
        title: img.name.toUpperCase(),
        subtitle: "IMPORTED WORKSPACE IMAGE [ON CANVAS]",
        type: "image",
        isLocal: true,
        icon: <Target size={16} className="text-[#00e1ff]" />,
        hotkey: "JUMP"
      }));

    const localQuotes = quotes
      .filter(q => q.quote && q.quote.toLowerCase().includes(term))
      .map(q => ({
        id: q.id,
        title: q.quote.length > 40 ? `“${q.quote.substring(0, 40).toUpperCase()}...”` : `“${q.quote.toUpperCase()}”`,
        subtitle: "QUOTE FRAGMENT [ON CANVAS]",
        type: "quote",
        isLocal: true,
        icon: <HelpCircle size={16} className="text-yellow-400" />,
        hotkey: "JUMP"
      }));

    const localMatches = [...localBooks, ...localMovies, ...localNotes, ...localAreas, ...localPdfs, ...localImages, ...localQuotes];

    // If we haven't fetched remote results, we show local matches first, 
    // then options to search Open Library or IMDb, then matching system commands
    if (results.length === 0) {
      const display = [...localMatches];
      
      // Open Library search option
      display.push({
        id: "cmd-search-api",
        title: `QUERY OPEN LIBRARY FOR: "${query.toUpperCase()}"`,
        subtitle: "SEARCH REMOTE ARCHIVE DATABASE FOR COVERS TO ADD",
        icon: <RefreshCw size={16} className="text-[#00aaff]" />,
        action: () => searchBooks(query),
        isTrigger: true,
        hotkey: "API"
      });

      // IMDb Movie search option
      display.push({
        id: "cmd-search-imdb",
        title: `QUERY IMDB FOR: "${query.toUpperCase()}"`,
        subtitle: "SEARCH REMOTE MOVIE DATABASE FOR POSTERS TO ADD",
        icon: <Sparkles size={16} className="text-yellow-400" />,
        action: () => searchMovies(query),
        isTrigger: true,
        hotkey: "IMDB"
      });

      // Filtered system commands
      const matchingCmds = systemCommands.filter((cmd) => cmd.title.includes(query.toUpperCase()));
      display.push(...matchingCmds);
      
      return display;
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
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
                  placeholder="Type > for system commands or search for a local node or remote cover..."
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
                      {item.cover_url || item.isBook ? (
                        item.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
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
                    {item.hotkey && (
                      <span className={`font-mono text-[8px] border px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        item.hotkey === "JUMP" 
                          ? "bg-[#00aaff]/15 text-[#00aaff] border-[#00aaff]/35" 
                          : "bg-white/5 text-gray-400 border-white/10"
                      }`}>
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
