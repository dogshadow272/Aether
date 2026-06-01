"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import BookNode from "./BookNode";
import QuoteNode from "./QuoteNode";
import SearchModal from "./SearchModal";
import ReviewModal from "./ReviewModal";
import AreaNode from "./AreaNode";
import NoteNode from "./NoteNode";
import TelemetryDashboard from "./TelemetryDashboard";

// Parallax Interactive Starfield Background
function StarfieldBackground({ pan, scale }) {
  const canvasRef = useRef(null);
  const starsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    // Initialize animated stars
    const count = 150;
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 4000,
        y: (Math.random() - 0.5) * 4000,
        size: Math.random() * 1.5 + 0.6,
        depth: Math.random() * 0.75 + 0.15, // parallax depth
        color: Math.random() > 0.8 ? (Math.random() > 0.5 ? "#00aaff" : "#a855f7") : "#ffffff",
        pulseSpeed: Math.random() * 0.02 + 0.005,
        angle: Math.random() * Math.PI * 2,
      });
    }
    starsRef.current = stars;

    let animationFrameId;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw subtle shifting nebula gas glow
      const time = Date.now() * 0.0002;
      const gradient = ctx.createRadialGradient(
        canvas.width / 2 + Math.cos(time) * 120,
        canvas.height / 2 + Math.sin(time * 0.8) * 120,
        0,
        canvas.width / 2,
        canvas.height / 2,
        Math.max(canvas.width, canvas.height) * 0.7
      );
      gradient.addColorStop(0, "rgba(168, 85, 247, 0.07)");
      gradient.addColorStop(0.5, "rgba(0, 170, 255, 0.05)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw projected stars
      const stars = starsRef.current;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      stars.forEach((star) => {
        star.angle += star.pulseSpeed;
        const pulse = 0.5 + 0.5 * Math.sin(star.angle);

        const x = cx + (star.x * scale) + (pan.x * star.depth);
        const y = cy + (star.y * scale) + (pan.y * star.depth);

        if (x >= -50 && x <= canvas.width + 50 && y >= -50 && y <= canvas.height + 50) {
          ctx.beginPath();
          ctx.arc(x, y, star.size * scale * (0.8 + star.depth * 0.4), 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          ctx.globalAlpha = pulse * (0.2 + star.depth * 0.8);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1.0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [pan.x, pan.y, scale]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
}

// Floating Viewport Radar / Minimap
function Minimap({ books, notes, areas, pan, scale, setPan }) {
  const minimapRef = useRef(null);

  const getCanvasBounds = () => {
    let minX = -1000;
    let maxX = 2000;
    let minY = -1000;
    let maxY = 2000;

    const allItems = [
      ...books.map(b => ({ x: b.x_pos, y: b.y_pos, w: 192, h: 300 })),
      ...notes.map(n => ({ x: n.x_pos, y: n.y_pos, w: n.width || 220, h: n.height || 150 })),
      ...areas.map(a => ({ x: a.x_pos, y: a.y_pos, w: a.width || 200, h: a.height || 200 }))
    ];

    if (allItems.length > 0) {
      minX = Math.min(...allItems.map(i => i.x)) - 400;
      maxX = Math.max(...allItems.map(i => i.x + i.w)) + 400;
      minY = Math.min(...allItems.map(i => i.y)) - 400;
      maxY = Math.max(...allItems.map(i => i.y + i.h)) + 400;
    }

    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  };

  const bounds = getCanvasBounds();
  const mapWidth = 160;
  const mapHeight = 120;

  const toMinimapX = (canvasX) => ((canvasX - bounds.minX) / bounds.width) * mapWidth;
  const toMinimapY = (canvasY) => ((canvasY - bounds.minY) / bounds.height) * mapHeight;

  const handleMinimapClick = (e) => {
    if (!minimapRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const targetCanvasX = bounds.minX + (clickX / mapWidth) * bounds.width;
    const targetCanvasY = bounds.minY + (clickY / mapHeight) * bounds.height;

    const cx = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
    const cy = typeof window !== "undefined" ? window.innerHeight / 2 : 400;
    setPan({
      x: cx - targetCanvasX * scale,
      y: cy - targetCanvasY * scale,
    });
  };

  const viewportLeft = -pan.x / scale;
  const viewportTop = -pan.y / scale;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth / scale : 1000 / scale;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight / scale : 800 / scale;

  const vpX = Math.max(toMinimapX(viewportLeft), 0);
  const vpY = Math.max(toMinimapY(viewportTop), 0);
  const vpW = Math.min((viewportWidth / bounds.width) * mapWidth, mapWidth);
  const vpH = Math.min((viewportHeight / bounds.height) * mapHeight, mapHeight);

  return (
    <div
      ref={minimapRef}
      onClick={handleMinimapClick}
      className="absolute bottom-6 right-6 w-[160px] h-[120px] z-10 border border-white/10 rounded-lg bg-[#0a0a0af0] backdrop-blur-md overflow-hidden cursor-crosshair select-none flex flex-col hover:border-white/20 transition-colors"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-1 border-b border-white/5 bg-white/5 hud-text text-[7px] text-white font-bold tracking-widest flex items-center justify-between">
        <span>RADAR // CANVAS</span>
        <span className="text-[#00aaff]/60">MAP</span>
      </div>
      <div className="relative flex-1 bg-black/50">
        {areas.map((a) => (
          <div
            key={a.id}
            className="absolute bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-sm"
            style={{
              left: toMinimapX(a.x_pos),
              top: toMinimapY(a.y_pos),
              width: Math.max(((a.width || 200) / bounds.width) * mapWidth, 4),
              height: Math.max(((a.height || 200) / bounds.height) * mapHeight, 4),
            }}
          />
        ))}

        {books.map((b) => (
          <div
            key={b.id}
            className="absolute bg-[#00aaff]/50 rounded-sm border border-[#00aaff]/80"
            style={{
              left: toMinimapX(b.x_pos),
              top: toMinimapY(b.y_pos),
              width: Math.max((192 / bounds.width) * mapWidth, 3),
              height: Math.max((300 / bounds.height) * mapHeight, 4),
            }}
          />
        ))}

        {notes.map((n) => (
          <div
            key={n.id}
            className="absolute bg-white/30 rounded-sm border border-white/50"
            style={{
              left: toMinimapX(n.x_pos),
              top: toMinimapY(n.y_pos),
              width: Math.max(((n.width || 220) / bounds.width) * mapWidth, 3),
              height: Math.max(((n.height || 150) / bounds.height) * mapHeight, 3),
            }}
          />
        ))}

        {/* Viewport Frame */}
        <div
          className="absolute border border-[#00aaff] bg-[#00aaff]/5 pointer-events-none rounded opacity-80"
          style={{
            left: vpX,
            top: vpY,
            width: Math.max(vpW, 6),
            height: Math.max(vpH, 5),
            boxShadow: "0 0 6px rgba(0, 170, 255, 0.3)",
          }}
        />
      </div>
    </div>
  );
}

// Cubic Bezier Curve Helper
const getBezierPath = (x1, y1, x2, y2) => {
  const dx = (x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
};

export default function Canvas() {
  const [books, setBooks] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [areas, setAreas] = useState([]);
  const [notes, setNotes] = useState([]);
  const [links, setLinks] = useState([]);
  const [editingLinkId, setEditingLinkId] = useState(null);
  const [presets, setPresets] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [currentPresentationIndex, setCurrentPresentationIndex] = useState(0);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isFocusing, setIsFocusing] = useState(false);
  const [showIndex, setShowIndex] = useState(false);
  const [canvasFilter, setCanvasFilter] = useState("");
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [teleportHighlightNodeId, setTeleportHighlightNodeId] = useState(null);
  
  const panRef = useRef(pan);
  const scaleRef = useRef(scale);
  const presetsRef = useRef(presets);

  useEffect(() => {
    panRef.current = pan;
    scaleRef.current = scale;
    presetsRef.current = presets;
  }, [pan, scale, presets]);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [tempBox, setTempBox] = useState(null);
  const [activeDialog, setActiveDialog] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [pendingPlacement, setPendingPlacement] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const [connectionSource, setConnectionSource] = useState(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState({ x: 0, y: 0 });
  const [focusNode, setFocusNode] = useState(null); // { id: string, type: 'book' | 'note' | 'quote' }
  const [selectedNodes, setSelectedNodes] = useState([]); // Array of { id, type }
  const [tempLassoBox, setTempLassoBox] = useState(null); // { x, y, w, h }
  const [showTelemetryDashboard, setShowTelemetryDashboard] = useState(false);

  const handleToggleFocus = (id, type, shouldZoom = false) => {
    setFocusNode((prev) => {
      const isAlreadyFocused = prev && prev.id === id && prev.type === type;
      if (isAlreadyFocused) {
        return null;
      }
      if (shouldZoom) {
        setTimeout(() => centerOnNode(id, type), 50);
      }
      return { id, type };
    });
  };

  const handleBulkDelete = async () => {
    if (selectedNodes.length === 0) return;
    if (!confirm(`Are you sure you want to delete all ${selectedNodes.length} selected items?`)) return;

    const booksToDelete = selectedNodes.filter(n => n.type === "book");
    const notesToDelete = selectedNodes.filter(n => n.type === "note");
    const areasToDelete = selectedNodes.filter(n => n.type === "area");
    const quotesToDelete = selectedNodes.filter(n => n.type === "quote");

    setSelectedNodes([]);

    const promises = [
      ...booksToDelete.map(b => fetch(`/api/books?id=${b.id}`, { method: "DELETE" })),
      ...notesToDelete.map(n => fetch(`/api/notes?id=${n.id}`, { method: "DELETE" })),
      ...areasToDelete.map(a => fetch(`/api/areas?id=${a.id}`, { method: "DELETE" })),
      ...quotesToDelete.map(q => fetch(`/api/quotes?id=${q.id}`, { method: "DELETE" })),
    ];

    try {
      await Promise.all(promises);
      fetchBooks();
      fetchAreas();
      fetchNotes();
      
      const deletedIds = new Set(selectedNodes.map(n => n.id));
      const linksToDelete = links.filter(l => deletedIds.has(l.source_id) || deletedIds.has(l.target_id));
      await Promise.all(linksToDelete.map(l => fetch(`/api/links?id=${l.id}`, { method: "DELETE" })));
      fetchLinks();
    } catch (err) {
      console.error("Bulk delete failed:", err);
    }
  };

  const handleBulkColor = async (colorVal) => {
    const notesToColor = selectedNodes.filter(n => n.type === "note");
    const areasToColor = selectedNodes.filter(n => n.type === "area");

    setNotes(prev => prev.map(n => notesToColor.some(sel => sel.id === n.id) ? { ...n, color: colorVal } : n));
    setAreas(prev => prev.map(a => areasToColor.some(sel => sel.id === a.id) ? { ...a, color: colorVal } : a));

    const promises = [
      ...notesToColor.map(sel => {
        const note = notesRef.current.find(n => n.id === sel.id);
        return fetch("/api/notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...note, color: colorVal })
        });
      }),
      ...areasToColor.map(sel => {
        const area = areasRef.current.find(a => a.id === sel.id);
        return fetch("/api/areas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...area, color: colorVal })
        });
      })
    ];

    try {
      await Promise.all(promises);
    } catch (err) {
      console.error("Bulk color update failed:", err);
    }
  };

  const handleBulkArrangeGrid = async () => {
    const booksToArrange = selectedNodes.filter(n => n.type === "book");
    const notesToArrange = selectedNodes.filter(n => n.type === "note");
    const totalToArrange = [...booksToArrange, ...notesToArrange];

    if (totalToArrange.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;

    totalToArrange.forEach(sel => {
      const item = sel.type === "book"
        ? booksRef.current.find(b => b.id === sel.id)
        : notesRef.current.find(n => n.id === sel.id);
      if (item) {
        if (item.x_pos < minX) minX = item.x_pos;
        if (item.y_pos < minY) minY = item.y_pos;
      }
    });

    if (minX === Infinity || minY === Infinity) {
      minX = 100;
      minY = 100;
    }

    const cols = Math.ceil(Math.sqrt(totalToArrange.length));
    const hSpacing = 260;
    const vSpacing = 380;
    const promises = [];

    totalToArrange.forEach((sel, index) => {
      const r = Math.floor(index / cols);
      const c = index % cols;
      const targetX = Math.round((minX + c * hSpacing) / 20) * 20;
      const targetY = Math.round((minY + r * vSpacing) / 20) * 20;

      if (sel.type === "book") {
        const book = booksRef.current.find(b => b.id === sel.id);
        if (book) {
          const updatedBook = { ...book, x_pos: targetX, y_pos: targetY };
          setBooks(prev => prev.map(b => b.id === book.id ? updatedBook : b));
          promises.push(
            fetch("/api/books", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updatedBook)
            })
          );
        }
      } else {
        const note = notesRef.current.find(n => n.id === sel.id);
        if (note) {
          const updatedNote = { ...note, x_pos: targetX, y_pos: targetY };
          setNotes(prev => prev.map(n => n.id === note.id ? updatedNote : n));
          promises.push(
            fetch("/api/notes", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updatedNote)
            })
          );
        }
      }
    });

    try {
      await Promise.all(promises);
    } catch (err) {
      console.error("Bulk grid arrange failed:", err);
    }
  };

  const handleBulkCreateZone = async () => {
    const booksInSelection = selectedNodes.filter(n => n.type === "book");
    const notesInSelection = selectedNodes.filter(n => n.type === "note");
    const totalSelected = [...booksInSelection, ...notesInSelection];

    if (totalSelected.length === 0) return;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    totalSelected.forEach(sel => {
      const item = sel.type === "book"
        ? booksRef.current.find(b => b.id === sel.id)
        : notesRef.current.find(n => n.id === sel.id);
      if (item) {
        const w = sel.type === "book" ? 192 : (item.width || 220);
        const h = sel.type === "book" ? (item.cover_url ? 320 : 160) : (item.height || 150);

        if (item.x_pos < minX) minX = item.x_pos;
        if (item.y_pos < minY) minY = item.y_pos;
        if (item.x_pos + w > maxX) maxX = item.x_pos + w;
        if (item.y_pos + h > maxY) maxY = item.y_pos + h;
      }
    });

    if (minX === Infinity || minY === Infinity) return;

    const padding = 40;
    const zoneX = Math.round((minX - padding) / 20) * 20;
    const zoneY = Math.round((minY - padding) / 20) * 20;
    const zoneW = Math.round((maxX - minX + padding * 2) / 20) * 20;
    const zoneH = Math.round((maxY - minY + padding * 2) / 20) * 20;

    const name = prompt("ENTER CATEGORY ZONE NAME / DESIGNATION:");
    if (!name || !name.trim()) return;

    try {
      const res = await fetch("/api/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim().toUpperCase(),
          x_pos: zoneX,
          y_pos: zoneY,
          width: zoneW,
          height: zoneH,
          color: "rgba(0, 170, 255, 0.08)"
        })
      });
      const data = await res.json();
      setAreas(prev => [...prev, data]);
      setSelectedNodes(prev => [...prev, { id: data.id, type: "area" }]);
    } catch (err) {
      console.error("Bulk create zone failed:", err);
    }
  };

  const handleBulkExport = () => {
    const selectedBooks = selectedNodes.filter(n => n.type === "book");
    const selectedNotes = selectedNodes.filter(n => n.type === "note");

    if (selectedBooks.length === 0 && selectedNotes.length === 0) return;

    let md = `# AETHER WORKSPACE EXPORT — CONSOLIDATED TELEMETRY\n`;
    md += `Export Date: ${new Date().toLocaleDateString()} | Active Selected Modules: ${selectedNodes.length}\n\n---\n\n`;

    if (selectedBooks.length > 0) {
      md += `## II. REVIEWED MODULES // BOOKS\n\n`;
      selectedBooks.forEach(sel => {
        const book = booksRef.current.find(b => b.id === sel.id);
        if (!book) return;

        const ratingStars = "★".repeat(book.rating) + "☆".repeat(5 - book.rating);
        md += `### ${book.title.toUpperCase()}\n`;
        md += `**Author:** ${book.author || "Unknown"}\n`;
        md += `**Rating:** ${ratingStars} (${book.rating}/5)\n`;
        md += `**Status:** ${book.status}\n\n`;

        const cleanReview = (book.review || "")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n")
          .replace(/<[^>]+>/g, "");
        
        md += `#### REVIEW LOG:\n${cleanReview || "No review content recorded."}\n\n`;

        const bookQuotes = quotesRef.current.filter(q => q.book_id === book.id);
        if (bookQuotes.length > 0) {
          md += `#### SATELLITE CITATIONS:\n`;
          bookQuotes.forEach(q => {
            md += `> ${q.quote}\n\n`;
          });
        }
        md += `\n---\n\n`;
      });
    }

    if (selectedNotes.length > 0) {
      md += `## III. SYSTEM MEMOS // NOTES\n\n`;
      selectedNotes.forEach(sel => {
        const note = notesRef.current.find(n => n.id === sel.id);
        if (!note) return;

        const cleanContent = (note.content || "")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n")
          .replace(/<[^>]+>/g, "");

        md += `### NOTE [${note.id.substring(0, 8).toUpperCase()}]\n`;
        md += `${cleanContent}\n\n`;
        md += `\n---\n\n`;
      });
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `aether_bulk_export_${new Date().toISOString().slice(0,10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const focusedCluster = useMemo(() => {
    if (!focusNode) return null;
    const nodeIds = new Set();
    const linkIds = new Set();
    const quoteIds = new Set();

    nodeIds.add(focusNode.id);
    
    if (focusNode.type === "area") {
      const area = areas.find(a => a.id === focusNode.id);
      if (area) {
        const ax1 = area.x_pos;
        const ay1 = area.y_pos;
        const ax2 = area.x_pos + (area.width || 200);
        const ay2 = area.y_pos + (area.height || 200);

        // Find books inside the area boundaries
        const areaBooks = books.filter(b => b.x_pos >= ax1 && b.x_pos <= ax2 && b.y_pos >= ay1 && b.y_pos <= ay2);
        areaBooks.forEach(b => nodeIds.add(b.id));

        // Find notes inside the area boundaries
        const areaNotes = notes.filter(n => n.x_pos >= ax1 && n.x_pos <= ax2 && n.y_pos >= ay1 && n.y_pos <= ay2);
        areaNotes.forEach(n => nodeIds.add(n.id));

        // Find satellite quotes of books inside the area
        quotes.forEach(q => {
          if (areaBooks.some(b => b.id === q.book_id)) {
            quoteIds.add(q.id);
          }
        });

        // Find links that are connected to any of the nodes inside this area
        links.forEach(link => {
          const isSourceInArea = nodeIds.has(link.source_id);
          const isTargetInArea = nodeIds.has(link.target_id);
          if (isSourceInArea || isTargetInArea) {
            linkIds.add(link.id);
            nodeIds.add(link.source_id);
            nodeIds.add(link.target_id);
          }
        });
      }
    } else if (focusNode.type === "quote") {
      quoteIds.add(focusNode.id);
      const q = quotes.find((quote) => quote.id === focusNode.id);
      if (q) nodeIds.add(q.book_id);
    } else if (focusNode.type === "book") {
      quotes.forEach((quote) => {
        if (quote.book_id === focusNode.id) {
          quoteIds.add(quote.id);
        }
      });
    }

    if (focusNode.type === "book" || focusNode.type === "note") {
      links.forEach((link) => {
        const isSourceFocus = link.source_id === focusNode.id && link.source_type === focusNode.type;
        const isTargetFocus = link.target_id === focusNode.id && link.target_type === focusNode.type;
        if (isSourceFocus || isTargetFocus) {
          linkIds.add(link.id);
          nodeIds.add(link.source_id);
          nodeIds.add(link.target_id);
        }
      });
    }

    return { nodeIds, linkIds, quoteIds };
  }, [focusNode, links, quotes, books, notes, areas]);

  const graphMetrics = useMemo(() => {
    // Build a list of all nodes
    const allNodes = [
      ...books.map(b => ({ id: b.id, title: b.title, type: "book", node: b })),
      ...notes.map(n => ({ id: n.id, title: n.content.replace(/<[^>]*>/g, '').substring(0, 20) || `Note ${n.id.slice(0, 4)}`, type: "note", node: n }))
    ];

    if (allNodes.length === 0) {
      return { orphans: [], hubs: [], componentsCount: 0 };
    }

    // Build adjacency list for undirected graph traversal
    const adj = {};
    allNodes.forEach(n => { adj[n.id] = []; });
    
    links.forEach(l => {
      if (adj[l.source_id] && adj[l.target_id]) {
        adj[l.source_id].push(l.target_id);
        adj[l.target_id].push(l.source_id);
      }
    });

    const orphans = [];
    const hubs = [];

    allNodes.forEach(n => {
      const connections = adj[n.id].length;
      if (connections === 0) {
        orphans.push(n);
      } else if (connections >= 3) {
        hubs.push(n);
      }
    });

    // Calculate component count using BFS/DFS
    const visited = new Set();
    let componentsCount = 0;

    allNodes.forEach(n => {
      if (!visited.has(n.id)) {
        componentsCount++;
        // BFS traversal
        const queue = [n.id];
        visited.add(n.id);
        while (queue.length > 0) {
          const curr = queue.shift();
          const neighbors = adj[curr] || [];
          neighbors.forEach(neigh => {
            if (!visited.has(neigh)) {
              visited.add(neigh);
              queue.push(neigh);
            }
          });
        }
      }
    });

    return { orphans, hubs, componentsCount };
  }, [books, notes, links]);
  const connectionSourceRef = useRef(connectionSource);
  const dragRef = useRef(null);
  const canvasRef = useRef(null);
  const booksRef = useRef(books);
  const quotesRef = useRef(quotes);
  const areasRef = useRef(areas);
  const notesRef = useRef(notes);
  const linksRef = useRef(links);
  const selectedNodesRef = useRef(selectedNodes);

  useEffect(() => {
    connectionSourceRef.current = connectionSource;
    booksRef.current = books;
    quotesRef.current = quotes;
    areasRef.current = areas;
    notesRef.current = notes;
    linksRef.current = links;
    selectedNodesRef.current = selectedNodes;
  }, [connectionSource, books, quotes, areas, notes, links, selectedNodes]);

  async function fetchBooks() {
    try {
      const res = await fetch("/api/books");
      const data = await res.json();
      setBooks(data);
      const allQuotes = data.flatMap((b) => b.quotes || []);
      setQuotes(allQuotes);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchAreas() {
    try {
      const res = await fetch("/api/areas");
      const data = await res.json();
      setAreas(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchNotes() {
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchLinks() {
    try {
      const res = await fetch("/api/links");
      const data = await res.json();
      setLinks(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchPresets() {
    try {
      const res = await fetch("/api/presets");
      const data = await res.json();
      setPresets(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    fetchBooks();
    fetchAreas();
    fetchNotes();
    fetchLinks();
    fetchPresets();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const createPreset = async () => {
    const name = prompt("ENTER VIEWPORT TELEMETRY DESIGNATION:");
    if (!name || !name.trim()) return;

    try {
      const res = await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          pan_x: panRef.current.x,
          pan_y: panRef.current.y,
          scale: scaleRef.current
        }),
      });
      const data = await res.json();
      setPresets((prev) => [data, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const deletePreset = async (id, e) => {
    e.stopPropagation();
    if (!confirm("DELETE THIS VIEWPORT PRESET?")) return;

    try {
      await fetch(`/api/presets?id=${id}`, { method: "DELETE" });
      setPresets((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const jumpToSlide = (index) => {
    if (presetsRef.current.length === 0) return;
    const targetIdx = (index + presetsRef.current.length) % presetsRef.current.length;
    setCurrentPresentationIndex(targetIdx);
    
    const preset = presetsRef.current[targetIdx];
    setIsFocusing(true);
    setPan({ x: preset.pan_x, y: preset.pan_y });
    setScale(preset.scale);
    setTimeout(() => setIsFocusing(false), 450);
  };

  const centerOnNode = (nodeId, nodeType) => {
    let node;
    let w = 220;
    let h = 150;
    if (nodeType === "book") {
      node = books.find(b => b.id === nodeId);
      if (!node) return;
      w = 192;
      h = node.cover_url ? 320 : 160;
    } else if (nodeType === "note") {
      node = notes.find(n => n.id === nodeId);
      if (!node) return;
      w = node.width || 220;
      h = node.height || 150;
    } else if (nodeType === "area") {
      node = areas.find(a => a.id === nodeId);
      if (!node) return;
      w = node.width || 200;
      h = node.height || 200;
    } else {
      return;
    }

    const targetScale = nodeType === "area" && typeof window !== "undefined"
      ? Math.max(0.4, Math.min(1, Math.min((window.innerWidth * 0.8) / w, (window.innerHeight * 0.8) / h)))
      : 1;
    const widthFactor = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
    const heightFactor = typeof window !== "undefined" ? window.innerHeight / 2 : 400;
    
    const targetPanX = widthFactor - (node.x_pos + w / 2) * targetScale;
    const targetPanY = heightFactor - (node.y_pos + h / 2) * targetScale;

    setIsFocusing(true);
    setPan({ x: targetPanX, y: targetPanY });
    setScale(targetScale);
    setTeleportHighlightNodeId(nodeId);
    
    setTimeout(() => {
      setIsFocusing(false);
    }, 450);

    setTimeout(() => {
      setTeleportHighlightNodeId(null);
    }, 2000);
  };

  const handleUpdateLinkSpeed = async (linkId, speed) => {
    try {
      const res = await fetch("/api/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: linkId, speed })
      });
      const updated = await res.json();
      setLinks(prev => prev.map(l => l.id === linkId ? updated : l));
    } catch (err) {
      console.error(err);
    }
  };

  const createLink = async (source, target) => {
    if (source.id === target.id) return;
    
    // Check if link already exists
    const exists = linksRef.current.some(l => 
      (l.source_id === source.id && l.target_id === target.id) ||
      (l.source_id === target.id && l.target_id === source.id)
    );
    if (exists) return;

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_id: source.id,
          source_type: source.type,
          target_id: target.id,
          target_type: target.type
        })
      });
      const data = await res.json();
      setLinks(prev => [...prev, data]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLink = async (linkId) => {
    try {
      await fetch(`/api/links?id=${linkId}`, { method: "DELETE" });
      setLinks(prev => prev.filter(l => l.id !== linkId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveLinkLabel = async (linkId, label) => {
    setEditingLinkId(null);
    try {
      const res = await fetch("/api/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: linkId, label })
      });
      const data = await res.json();
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, label: data.label } : l));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLinkType = async (linkId, type) => {
    try {
      const res = await fetch("/api/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: linkId, type })
      });
      const data = await res.json();
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, type: data.type } : l));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLinkArrow = async (linkId, arrow) => {
    try {
      const res = await fetch("/api/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: linkId, arrow })
      });
      const data = await res.json();
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, arrow: data.arrow } : l));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLinkShape = async (linkId, shape) => {
    try {
      const res = await fetch("/api/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: linkId, shape })
      });
      const data = await res.json();
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, shape: data.shape } : l));
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartConnection = (id, type, clientX, clientY) => {
    const center = getNodeCenter(id, type);
    setConnectionSource({ id, type, startX: clientX || 0, startY: clientY || 0 });
    setMouseCanvasPos(center);
  };

  const getNodeCenter = (id, type) => {
    if (type === "book") {
      const b = booksRef.current.find(book => book.id === id);
      if (b) return { x: b.x_pos + 96, y: b.y_pos + 150 };
    } else if (type === "note") {
      const n = notesRef.current.find(note => note.id === id);
      if (n) return { x: n.x_pos + (n.width || 220) / 2, y: n.y_pos + (n.height || 150) / 2 };
    }
    return { x: 0, y: 0 };
  };

  const getEdgeCoordinates = (node, type) => {
    let w = 220;
    let h = 150;
    if (type === "book") {
      w = 192;
      h = node.cover_url ? 320 : 160;
    } else if (type === "note") {
      w = node.width || 220;
      h = node.height || 150;
    }
    const x = node.x_pos;
    const y = node.y_pos;
    return {
      top: { x: x + w / 2, y: y, dir: "up" },
      bottom: { x: x + w / 2, y: y + h, dir: "down" },
      left: { x: x, y: y + h / 2, dir: "left" },
      right: { x: x + w, y: y + h / 2, dir: "right" },
    };
  };

  const getBestConnectionPoints = (nodeA, typeA, nodeB, typeB) => {
    const edgesA = getEdgeCoordinates(nodeA, typeA);
    const edgesB = getEdgeCoordinates(nodeB, typeB);
    
    let minDistance = Infinity;
    let bestA = edgesA.right;
    let bestB = edgesB.left;
    
    for (const keyA in edgesA) {
      for (const keyB in edgesB) {
        const ptA = edgesA[keyA];
        const ptB = edgesB[keyB];
        const dist = Math.hypot(ptA.x - ptB.x, ptA.y - ptB.y);
        if (dist < minDistance) {
          minDistance = dist;
          bestA = ptA;
          bestB = ptB;
        }
      }
    }
    return { start: bestA, end: bestB };
  };

  const getSmartBezierPath = (ptA, ptB) => {
    const { x: x1, y: y1, dir: dir1 } = ptA;
    const { x: x2, y: y2, dir: dir2 } = ptB;
    
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const strength = Math.max(25, Math.min(dist * 0.35, 100));
    
    let cpX1 = x1;
    let cpY1 = y1;
    if (dir1 === "right") cpX1 += strength;
    else if (dir1 === "left") cpX1 -= strength;
    else if (dir1 === "up") cpY1 -= strength;
    else if (dir1 === "down") cpY1 += strength;
    
    let cpX2 = x2;
    let cpY2 = y2;
    if (dir2 === "right") cpX2 += strength;
    else if (dir2 === "left") cpX2 -= strength;
    else if (dir2 === "up") cpY2 -= strength;
    else if (dir2 === "down") cpY2 += strength;
    
    return `M ${x1} ${y1} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x2} ${y2}`;
  };

  const getOppositeDir = (dir) => {
    if (dir === "left") return "right";
    if (dir === "right") return "left";
    if (dir === "up") return "down";
    return "up";
  };

  const getAllHashtags = () => {
    const hashtagRegex = /#[a-zA-Z0-9_\-]+/g;
    const tags = new Set();
    const isHexColor = (str) => /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(str);

    notes.forEach((n) => {
      const text = n.content ? n.content.replace(/<[^>]*>/g, " ") : "";
      const matches = text.match(hashtagRegex);
      if (matches) {
        matches.forEach((m) => {
          if (!isHexColor(m)) tags.add(m.toLowerCase());
        });
      }
    });

    books.forEach((b) => {
      const text = `${b.title} ${b.author || ""} ${b.review ? b.review.replace(/<[^>]*>/g, " ") : ""}`;
      const matches = text.match(hashtagRegex);
      if (matches) {
        matches.forEach((m) => {
          if (!isHexColor(m)) tags.add(m.toLowerCase());
        });
      }
    });

    quotes.forEach((q) => {
      const matches = q.quote ? q.quote.match(hashtagRegex) : null;
      if (matches) {
        matches.forEach((m) => {
          if (!isHexColor(m)) tags.add(m.toLowerCase());
        });
      }
    });

    return Array.from(tags).sort();
  };

  const hashtags = getAllHashtags();

  const getBookMatch = (b) => {
    if (!canvasFilter) return true;
    const f = canvasFilter.toLowerCase();
    return (
      b.title.toLowerCase().includes(f) ||
      (b.author && b.author.toLowerCase().includes(f)) ||
      (b.review && b.review.toLowerCase().includes(f))
    );
  };

  const getNoteMatch = (n) => {
    if (!canvasFilter) return true;
    return n.content.toLowerCase().includes(canvasFilter.toLowerCase());
  };

  const getQuoteMatch = (q) => {
    if (!canvasFilter) return true;
    return q.quote.toLowerCase().includes(canvasFilter.toLowerCase());
  };

  const getAreaMatch = (a) => {
    if (!canvasFilter) return true;
    return a.name.toLowerCase().includes(canvasFilter.toLowerCase());
  };

  const getNodeMatch = (id, type) => {
    if (type === "book") {
      const b = books.find(book => book.id === id);
      return b ? getBookMatch(b) : false;
    } else if (type === "note") {
      const n = notes.find(note => note.id === id);
      return n ? getNoteMatch(n) : false;
    }
    return false;
  };

  const handleAddBook = async (bookData) => {
    try {
      let x_pos, y_pos;
      if (pendingPlacement) {
        x_pos = pendingPlacement.x;
        y_pos = pendingPlacement.y;
        setPendingPlacement(null);
      } else {
        const widthFactor = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
        const heightFactor = typeof window !== "undefined" ? window.innerHeight / 2 : 400;
        x_pos = (widthFactor - pan.x) / scale - 96;
        y_pos = (heightFactor - pan.y) / scale - 150;
      }

      if (snapToGrid) {
        x_pos = Math.round(x_pos / 20) * 20;
        y_pos = Math.round(y_pos / 20) * 20;
      }

      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...bookData, x_pos, y_pos }),
      });
      const newBook = await res.json();
      setBooks((prev) => [...prev, newBook]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBook = useCallback(async (updatedBook) => {
    try {
      const res = await fetch("/api/books", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedBook),
      });
      const data = await res.json();
      setBooks((prev) => prev.map((b) => (b.id === data.id ? data : b)));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleExtractQuote = async (bookId, text) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;

    const x_pos = book.x_pos + 250 + Math.random() * 50;
    const y_pos = book.y_pos + Math.random() * 100;

    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book_id: bookId, quote: text, x_pos, y_pos }),
      });
      const newQuote = await res.json();
      setQuotes((prev) => [...prev, newQuote]);
    } catch (err) {
      console.error(err);
    }
  };

  const createArea = async (areaData) => {
    try {
      const res = await fetch("/api/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(areaData),
      });
      const data = await res.json();
      setAreas((prev) => [...prev, data]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateArea = async (id, updates) => {
    try {
      const area = areasRef.current.find((a) => a.id === id);
      if (!area) return;
      
      const updatedFields = typeof updates === "string" ? { name: updates } : updates;
      const updatedArea = { ...area, ...updatedFields };

      const res = await fetch("/api/areas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedArea),
      });
      const data = await res.json();
      setAreas((prev) => prev.map((a) => (a.id === id ? data : a)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleArrangeAreaNodes = async (areaId) => {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;

    // Get all books and notes inside this area
    const containedBooks = books.filter(b => 
      b.x_pos >= area.x_pos &&
      b.x_pos <= area.x_pos + area.width &&
      b.y_pos >= area.y_pos &&
      b.y_pos <= area.y_pos + area.height
    );

    const containedNotes = notes.filter(n => 
      n.x_pos >= area.x_pos &&
      n.x_pos <= area.x_pos + area.width &&
      n.y_pos >= area.y_pos &&
      n.y_pos <= area.y_pos + area.height
    );

    const totalNodes = containedBooks.length + containedNotes.length;
    if (totalNodes === 0) return;

    // Layout configuration
    const padding = 40;
    const startX = area.x_pos + padding;
    const startY = area.y_pos + 60; // leave space for header
    
    // Grid calculations
    const columns = Math.ceil(Math.sqrt(totalNodes));
    const gapX = 240; 
    const gapY = 360; 

    let maxColX = area.x_pos + area.width;
    let maxRowY = area.y_pos + area.height;

    // We will place them in order: Books first, then Notes
    const itemsToArrange = [
      ...containedBooks.map(b => ({ id: b.id, type: "book", width: 192, height: b.cover_url ? 320 : 160, originalObj: b })),
      ...containedNotes.map(n => ({ id: n.id, type: "note", width: n.width || 220, height: n.height || 150, originalObj: n }))
    ];

    setIsFocusing(true);

    try {
      for (let i = 0; i < itemsToArrange.length; i++) {
        const col = i % columns;
        const row = Math.floor(i / columns);

        const targetX_pos = startX + col * gapX;
        const targetY_pos = startY + row * gapY;

        // Snap to 20px grid
        const snappedX = Math.round(targetX_pos / 20) * 20;
        const snappedY = Math.round(targetY_pos / 20) * 20;

        const item = itemsToArrange[i];
        
        // Track bounding box of organized elements
        const rightSide = snappedX + item.width;
        const bottomSide = snappedY + item.height;
        if (rightSide > maxColX) maxColX = rightSide;
        if (bottomSide > maxRowY) maxRowY = bottomSide;

        if (item.type === "book") {
          const nextBook = { ...item.originalObj, x_pos: snappedX, y_pos: snappedY };
          await handleUpdateBook(nextBook);
        } else {
          await handleEditNote(item.id, { x_pos: snappedX, y_pos: snappedY });
        }
      }

      // Auto-resize Area bounding box to wrap elements with padding
      const targetAreaWidth = Math.round((maxColX - area.x_pos + padding) / 20) * 20;
      const targetAreaHeight = Math.round((maxRowY - area.y_pos + padding) / 20) * 20;

      await handleUpdateArea(area.id, { width: targetAreaWidth, height: targetAreaHeight });
    } catch (err) {
      console.error("Failed to auto-arrange area nodes:", err);
    } finally {
      setTimeout(() => setIsFocusing(false), 450);
    }
  };

  const handleArrangeTimeline = async () => {
    if (books.length === 0) return;

    // 1. Sort books chronologically by created_at (ascending)
    const sortedBooks = [...books].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const horizontalSpacing = 420; // safe spacing horizontally to allow satellite quotes space
    const timelineY = 400; // timeline horizontal baseline

    setIsFocusing(true);

    try {
      // Align books along baseline
      for (let i = 0; i < sortedBooks.length; i++) {
        const book = sortedBooks[i];
        const targetX = 100 + i * horizontalSpacing;
        const targetY = timelineY;

        // Snap to grid
        const snappedX = Math.round(targetX / 20) * 20;
        const snappedY = Math.round(targetY / 20) * 20;

        const nextBook = { ...book, x_pos: snappedX, y_pos: snappedY };
        await handleUpdateBook(nextBook);

        // Position quotes in orbit around this book node
        const bookQuotes = quotes.filter(q => q.book_id === book.id);
        for (let qIdx = 0; qIdx < bookQuotes.length; qIdx++) {
          const quote = bookQuotes[qIdx];
          
          // Constellation coordinates relative to book card
          let qX = snappedX;
          let qY = snappedY;

          // Distribute in nice directions (alternating)
          if (qIdx === 0) {
            // Above
            qX = snappedX + 96 - 40;
            qY = snappedY - 140;
          } else if (qIdx === 1) {
            // Below
            qX = snappedX + 96 - 40;
            qY = snappedY + (book.cover_url ? 320 : 160) + 80;
          } else if (qIdx === 2) {
            // Left
            qX = snappedX - 160;
            qY = snappedY + 100;
          } else if (qIdx === 3) {
            // Right
            qX = snappedX + 192 + 80;
            qY = snappedY + 100;
          } else {
            // Diagonal orbits for additional quotes
            const angle = (qIdx * 45 * Math.PI) / 180;
            qX = snappedX + 96 - 40 + Math.cos(angle) * 260;
            qY = snappedY + 100 + Math.sin(angle) * 260;
          }

          // Snap quote to grid
          const snappedQuoteX = Math.round(qX / 20) * 20;
          const snappedQuoteY = Math.round(qY / 20) * 20;

          // Call API to save quote coordinates
          await fetch("/api/quotes", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: quote.id, x_pos: snappedQuoteX, y_pos: snappedQuoteY })
          });

          // Sync local state
          setQuotes(prev => prev.map(item => item.id === quote.id ? { ...item, x_pos: snappedQuoteX, y_pos: snappedQuoteY } : item));
        }
      }
    } catch (err) {
      console.error("Failed to auto-arrange timeline coordinates:", err);
    } finally {
      setTimeout(() => setIsFocusing(false), 450);
    }
  };

  const handleDeleteArea = (areaId) => {
    setActiveDialog({ type: "confirm-delete-area", areaId });
  };

  const handleDeleteBook = (bookId) => {
    setActiveDialog({ type: "confirm-delete-book", bookId });
  };

  const handleDeleteQuote = async (quoteId) => {
    try {
      await fetch(`/api/quotes?id=${quoteId}`, { method: "DELETE" });
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNote = async (customX = null, customY = null) => {
    let x_pos = customX;
    let y_pos = customY;
    if (x_pos === null || y_pos === null) {
      if (pendingPlacement) {
        x_pos = pendingPlacement.x;
        y_pos = pendingPlacement.y;
        setPendingPlacement(null);
      } else {
        const currentPan = panRef.current;
        const currentScale = scaleRef.current;
        const widthFactor = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
        const heightFactor = typeof window !== "undefined" ? window.innerHeight / 2 : 400;
        x_pos = (widthFactor - currentPan.x) / currentScale - 110;
        y_pos = (heightFactor - currentPan.y) / currentScale - 75;
      }
    }

    if (snapToGrid) {
      x_pos = Math.round(x_pos / 20) * 20;
      y_pos = Math.round(y_pos / 20) * 20;
    }
    
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x_pos, y_pos }),
      });
      const data = await res.json();
      setNotes((prev) => [...prev, data]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = (noteId) => {
    setActiveDialog({ type: "confirm-delete-note", noteId });
  };

  const handleEditNote = async (id, updates) => {
    try {
      const note = notesRef.current.find((n) => n.id === id);
      if (!note) return;
      
      const updatedFields = typeof updates === "string" ? { content: updates } : updates;
      const updatedNote = { ...note, ...updatedFields };

      const res = await fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedNote),
      });
      const data = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === id ? data : n)));
    } catch (err) {
      console.error(err);
    }
  };

  // Focus transition navigator
  const focusOnNode = useCallback((x, y, itemWidth = 200, itemHeight = 150) => {
    setIsFocusing(true);
    const cx = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
    const cy = typeof window !== "undefined" ? window.innerHeight / 2 : 400;
    const targetScale = 0.95;

    const newPanX = cx - (x + itemWidth / 2) * targetScale;
    const newPanY = cy - (y + itemHeight / 2) * targetScale;

    setPan({ x: newPanX, y: newPanY });
    setScale(targetScale);

    setTimeout(() => {
      setIsFocusing(false);
    }, 450);
  }, []);

  const handleBackupWorkspace = async () => {
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Backup failed");
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `aether_board_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Failed to export workspace backup.");
    }
  };

  const handleRestoreWorkspace = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("RESTORE OPERATION WILL OVERWRITE ALL CURRENT BOARD CONTENT. Continue?")) {
      e.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Restore failed");
      }

      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(`Workspace restore failed: ${err.message}`);
    } finally {
      e.target.value = "";
    }
  };

  // Tidy Layout: auto-arrange canvas nodes in space
  const handleTidyCanvas = async () => {
    // 1. Identify which items are inside which category zone (Area)
    const areaContentMap = {}; // areaId -> { books: [], quotes: [], notes: [] }
    const containedBookIds = new Set();
    const containedQuoteIds = new Set();
    const containedNoteIds = new Set();

    areas.forEach((area) => {
      const ax1 = area.x_pos;
      const ay1 = area.y_pos;
      const ax2 = area.x_pos + (area.width || 200);
      const ay2 = area.y_pos + (area.height || 200);

      const areaBooks = books.filter((b) => b.x_pos >= ax1 && b.x_pos <= ax2 && b.y_pos >= ay1 && b.y_pos <= ay2);
      const areaQuotes = quotes.filter((q) => q.x_pos >= ax1 && q.x_pos <= ax2 && q.y_pos >= ay1 && q.y_pos <= ay2);
      const areaNotes = notes.filter((n) => n.x_pos >= ax1 && n.x_pos <= ax2 && n.y_pos >= ay1 && n.y_pos <= ay2);

      areaContentMap[area.id] = { books: areaBooks, quotes: areaQuotes, notes: areaNotes };
      
      areaBooks.forEach(b => containedBookIds.add(b.id));
      areaQuotes.forEach(q => containedQuoteIds.add(q.id));
      areaNotes.forEach(n => containedNoteIds.add(n.id));
    });

    const updatedBooks = [];
    const updatedQuotes = [];
    const updatedNotes = [];
    const updatedAreas = [];

    // 2. Tidy items inside their respective category zones
    areas.forEach((area) => {
      const content = areaContentMap[area.id];
      const itemsToTidy = [
        ...content.books.map(b => ({ ...b, type: "book" })),
        ...content.notes.map(n => ({ ...n, type: "note" })),
        ...content.quotes.map(q => ({ ...q, type: "quote" }))
      ];

      if (itemsToTidy.length > 0) {
        let currX = area.x_pos + 20;
        let currY = area.y_pos + 50;
        let maxRowHeight = 0;
        const areaWidth = area.width || 200;

        itemsToTidy.forEach((item) => {
          let w = 200;
          let h = 150;

          if (item.type === "book") {
            w = 192;
            h = 300;
          } else if (item.type === "note") {
            w = item.width || 220;
            h = item.height || 150;
          } else if (item.type === "quote") {
            w = 200;
            h = 100;
          }

          // Check for row wrapping
          if (currX + w > area.x_pos + areaWidth - 20 && currX > area.x_pos + 20) {
            currX = area.x_pos + 20;
            currY += maxRowHeight + 20;
            maxRowHeight = 0;
          }

          const tidiedItem = {
            ...item,
            x_pos: currX,
            y_pos: currY
          };

          if (item.type === "book") {
            updatedBooks.push(tidiedItem);
          } else if (item.type === "note") {
            updatedNotes.push(tidiedItem);
          } else if (item.type === "quote") {
            updatedQuotes.push(tidiedItem);
          }

          currX += w + 20;
          maxRowHeight = Math.max(maxRowHeight, h);
        });

        // Auto-expand area height if content overflows
        const neededHeight = (currY + maxRowHeight + 20) - area.y_pos;
        if (neededHeight > (area.height || 200)) {
          updatedAreas.push({ ...area, height: neededHeight });
        } else {
          updatedAreas.push(area);
        }
      } else {
        updatedAreas.push(area);
      }
    });

    // 3. Tidy remaining "free" items (those not inside any zone)
    const freeBooks = books.filter(b => !containedBookIds.has(b.id));
    const freeQuotes = quotes.filter(q => !containedQuoteIds.has(q.id));
    const freeNotes = notes.filter(n => !containedNoteIds.has(n.id));

    // A. Tidy free books
    let startBookX = 100;
    let startBookY = 150;
    const bookSpacing = 320;
    const tidiedFreeBooks = freeBooks.map((book, index) => ({
      ...book,
      x_pos: startBookX + index * bookSpacing,
      y_pos: startBookY + (index % 2 === 0 ? 0 : 30),
    }));
    updatedBooks.push(...tidiedFreeBooks);

    // B. Tidy free quotes near their parent books (wherever the parent book is, free or zoned)
    const allTidiedBooks = [...updatedBooks];
    freeQuotes.forEach((quote) => {
      const parentBook = allTidiedBooks.find((b) => b.id === quote.book_id) || books.find((b) => b.id === quote.book_id);
      if (parentBook) {
        const bookQuotesTidiedCount = updatedQuotes.filter(q => q.book_id === parentBook.id).length;
        updatedQuotes.push({
          ...quote,
          x_pos: parentBook.x_pos + 230 + (bookQuotesTidiedCount % 2) * 50,
          y_pos: parentBook.y_pos - 60 + bookQuotesTidiedCount * 120,
        });
      } else {
        updatedQuotes.push(quote);
      }
    });

    // C. Tidy free notes in a grid
    let startNoteX = -320;
    let startNoteY = 100;
    const noteSpacingX = 260;
    const noteSpacingY = 220;
    const tidiedFreeNotes = freeNotes.map((note, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      return {
        ...note,
        x_pos: startNoteX + col * noteSpacingX,
        y_pos: startNoteY + row * noteSpacingY,
      };
    });
    updatedNotes.push(...tidiedFreeNotes);

    // 4. Update React state
    setBooks(updatedBooks);
    setQuotes(updatedQuotes);
    setNotes(updatedNotes);
    setAreas(updatedAreas);

    // 5. Persist all updates to SQLite
    try {
      await Promise.all([
        ...updatedBooks.map(b =>
          fetch("/api/books", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(b),
          })
        ),
        ...updatedQuotes.map(q =>
          fetch("/api/quotes", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(q),
          })
        ),
        ...updatedNotes.map(n =>
          fetch("/api/notes", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(n),
          })
        ),
        ...updatedAreas.map(a =>
          fetch("/api/areas", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(a),
          })
        )
      ]);
    } catch (err) {
      console.error("Failed to persist tidy coordinates:", err);
    }
  };

  const handleCanvasContextMenu = (e) => {
    // If clicking inside cards, handles, or buttons, ignore
    if (
      e.target.closest(".aero-panel") || 
      e.target.closest(".connector-handle") || 
      e.target.closest("button") || 
      e.target.closest("input") || 
      e.target.closest("dialog") ||
      e.target.closest(".rich-content")
    ) {
      return;
    }
    e.preventDefault();
    
    // Calculate client mouse position
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Calculate coordinates on the canvas workspace
    const canvasX = (clickX - pan.x) / scale;
    const canvasY = (clickY - pan.y) / scale;
    
    setContextMenu({
      x: clickX,
      y: clickY,
      canvasX,
      canvasY
    });
  };

  // Pointer drag/pan handlers
  const handleCanvasPointerDown = (e) => {
    setContextMenu(null);
    if (focusNode) setFocusNode(null);
    
    const rect = canvasRef.current.getBoundingClientRect();
    const startX = (e.clientX - rect.left - pan.x) / scale;
    const startY = (e.clientY - rect.top - pan.y) / scale;

    // Shift-click/drag starts lasso selection
    if (e.shiftKey) {
      dragRef.current = {
        type: "lasso",
        startX,
        startY,
      };
      setTempLassoBox({ x: startX, y: startY, w: 0, h: 0 });
      return;
    }

    // Normal click clears selection
    setSelectedNodes([]);

    if (isDrawingMode) {
      dragRef.current = {
        type: "drawing",
        startX,
        startY,
      };
      setTempBox({ x: startX, y: startY, w: 0, h: 0 });
      return;
    }
    dragRef.current = { type: "pan" };
  };

  const handleItemDragStart = useCallback((id, type, clientX, clientY, targetEl, pointerId) => {
    const items = type === "book" ? booksRef.current : (type === "quote" ? quotesRef.current : (type === "area" || type === "area-resize" ? areasRef.current : notesRef.current));
    const item = items.find((i) => i.id === id);
    if (!item) return;

    let containedItems = null;
    if (type === "area") {
      const area = item;
      const ax1 = area.x_pos;
      const ay1 = area.y_pos;
      const ax2 = area.x_pos + (area.width || 200);
      const ay2 = area.y_pos + (area.height || 200);

      // Identify books, quotes, notes inside this zone at drag start
      const containedBooks = booksRef.current
        .filter((b) => b.x_pos >= ax1 && b.x_pos <= ax2 && b.y_pos >= ay1 && b.y_pos <= ay2)
        .map((b) => ({ id: b.id, startX: b.x_pos, startY: b.y_pos }));

      const containedQuotes = quotesRef.current
        .filter((q) => q.x_pos >= ax1 && q.x_pos <= ax2 && q.y_pos >= ay1 && q.y_pos <= ay2)
        .map((q) => ({ id: q.id, startX: q.x_pos, startY: q.y_pos }));

      const containedNotes = notesRef.current
        .filter((n) => n.x_pos >= ax1 && n.x_pos <= ax2 && n.y_pos >= ay1 && n.y_pos <= ay2)
        .map((n) => ({ id: n.id, startX: n.x_pos, startY: n.y_pos }));

      containedItems = { books: containedBooks, quotes: containedQuotes, notes: containedNotes };
    }

    // Check if item is in selection for relative group dragging
    const isSelected = selectedNodesRef.current.some((n) => n.id === id && n.type === type);
    let groupItems = null;
    if (isSelected) {
      groupItems = selectedNodesRef.current.map((node) => {
        const list = node.type === "book" ? booksRef.current : (node.type === "quote" ? quotesRef.current : (node.type === "area" ? areasRef.current : notesRef.current));
        const itemObj = list.find((i) => i.id === node.id);
        return {
          id: node.id,
          type: node.type,
          startX: itemObj ? itemObj.x_pos : 0,
          startY: itemObj ? itemObj.y_pos : 0,
          startWidth: itemObj ? (itemObj.width || 0) : 0,
          startHeight: itemObj ? (itemObj.height || 0) : 0,
        };
      });
    }

    dragRef.current = {
      type,
      id,
      startMouseX: clientX,
      startMouseY: clientY,
      startItemX: item.x_pos,
      startItemY: item.y_pos,
      startWidth: item.width || 0,
      startHeight: item.height || 0,
      hasMoved: false,
      pointerId,
      targetEl,
      containedItems,
      groupItems,
    };
  }, []);

  const handlePointerMove = (e) => {
    if (connectionSourceRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - panRef.current.x) / scaleRef.current;
      const currentY = (e.clientY - rect.top - panRef.current.y) / scaleRef.current;
      setMouseCanvasPos({ x: currentX, y: currentY });
    }

    const drag = dragRef.current;
    if (!drag) return;

    if (drag.type === "pan") {
      setPan((prev) => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
    } else if (drag.type === "lasso") {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - pan.x) / scale;
      const currentY = (e.clientY - rect.top - pan.y) / scale;
      
      const x = Math.min(drag.startX, currentX);
      const y = Math.min(drag.startY, currentY);
      const w = Math.abs(drag.startX - currentX);
      const h = Math.abs(drag.startY - currentY);
      
      setTempLassoBox({ x, y, w, h });
    } else if (drag.type === "drawing") {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - pan.x) / scale;
      const currentY = (e.clientY - rect.top - pan.y) / scale;
      
      const x = Math.min(drag.startX, currentX);
      const y = Math.min(drag.startY, currentY);
      const w = Math.abs(drag.startX - currentX);
      const h = Math.abs(drag.startY - currentY);
      
      setTempBox({ x, y, w, h });
    } else {
      const deltaX = (e.clientX - drag.startMouseX) / scale;
      const deltaY = (e.clientY - drag.startMouseY) / scale;

      if (!drag.hasMoved && Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) return;

      if (!drag.hasMoved) {
        if (drag.targetEl && typeof drag.targetEl.setPointerCapture === "function") {
          try {
            drag.targetEl.setPointerCapture(drag.pointerId);
          } catch (err) {}
        }
      }

      drag.hasMoved = true;

      // Relative group drag support
      if (drag.groupItems) {
        setBooks((prev) =>
          prev.map((b) => {
            const match = drag.groupItems.find((gi) => gi.id === b.id && gi.type === "book");
            if (!match) return b;
            let itemX = match.startX + deltaX;
            let itemY = match.startY + deltaY;
            if (snapToGrid) {
              itemX = Math.round(itemX / 20) * 20;
              itemY = Math.round(itemY / 20) * 20;
            }
            return { ...b, x_pos: itemX, y_pos: itemY };
          })
        );
        setNotes((prev) =>
          prev.map((n) => {
            const match = drag.groupItems.find((gi) => gi.id === n.id && gi.type === "note");
            if (!match) return n;
            let itemX = match.startX + deltaX;
            let itemY = match.startY + deltaY;
            if (snapToGrid) {
              itemX = Math.round(itemX / 20) * 20;
              itemY = Math.round(itemY / 20) * 20;
            }
            return { ...n, x_pos: itemX, y_pos: itemY };
          })
        );
        setAreas((prev) =>
          prev.map((a) => {
            const match = drag.groupItems.find((gi) => gi.id === a.id && gi.type === "area");
            if (!match) return a;
            let itemX = match.startX + deltaX;
            let itemY = match.startY + deltaY;
            if (snapToGrid) {
              itemX = Math.round(itemX / 20) * 20;
              itemY = Math.round(itemY / 20) * 20;
            }
            return { ...a, x_pos: itemX, y_pos: itemY };
          })
        );
        setQuotes((prev) =>
          prev.map((q) => {
            const match = drag.groupItems.find((gi) => gi.id === q.id && gi.type === "quote");
            if (!match) return q;
            let itemX = match.startX + deltaX;
            let itemY = match.startY + deltaY;
            if (snapToGrid) {
              itemX = Math.round(itemX / 20) * 20;
              itemY = Math.round(itemY / 20) * 20;
            }
            return { ...q, x_pos: itemX, y_pos: itemY };
          })
        );
        return;
      }

      let newX = drag.startItemX + deltaX;
      let newY = drag.startItemY + deltaY;

      if (snapToGrid) {
        newX = Math.round(newX / 20) * 20;
        newY = Math.round(newY / 20) * 20;
      }

      if (drag.type === "book") {
        setBooks((prev) =>
          prev.map((b) => (b.id === drag.id ? { ...b, x_pos: newX, y_pos: newY } : b))
        );
      } else if (drag.type === "quote") {
        setQuotes((prev) =>
          prev.map((q) => (q.id === drag.id ? { ...q, x_pos: newX, y_pos: newY } : q))
        );
      } else if (drag.type === "area") {
        setAreas((prev) =>
          prev.map((a) => (a.id === drag.id ? { ...a, x_pos: newX, y_pos: newY } : a))
        );
        // Shift grouped items in sync
        if (drag.containedItems) {
          const { books: cBooks, quotes: cQuotes, notes: cNotes } = drag.containedItems;
          if (cBooks && cBooks.length > 0) {
            setBooks((prev) =>
              prev.map((b) => {
                const match = cBooks.find((cb) => cb.id === b.id);
                if (!match) return b;
                let itemX = match.startX + deltaX;
                let itemY = match.startY + deltaY;
                if (snapToGrid) {
                  itemX = Math.round(itemX / 20) * 20;
                  itemY = Math.round(itemY / 20) * 20;
                }
                return { ...b, x_pos: itemX, y_pos: itemY };
              })
            );
          }
          if (cQuotes && cQuotes.length > 0) {
            setQuotes((prev) =>
              prev.map((q) => {
                const match = cQuotes.find((cq) => cq.id === q.id);
                if (!match) return q;
                let itemX = match.startX + deltaX;
                let itemY = match.startY + deltaY;
                if (snapToGrid) {
                  itemX = Math.round(itemX / 20) * 20;
                  itemY = Math.round(itemY / 20) * 20;
                }
                return { ...q, x_pos: itemX, y_pos: itemY };
              })
            );
          }
          if (cNotes && cNotes.length > 0) {
            setNotes((prev) =>
              prev.map((n) => {
                const match = cNotes.find((cn) => cn.id === n.id);
                if (!match) return n;
                let itemX = match.startX + deltaX;
                let itemY = match.startY + deltaY;
                if (snapToGrid) {
                  itemX = Math.round(itemX / 20) * 20;
                  itemY = Math.round(itemY / 20) * 20;
                }
                return { ...n, x_pos: itemX, y_pos: itemY };
              })
            );
          }
        }
      } else if (drag.type === "area-resize") {
        let newW = Math.max(drag.startWidth + deltaX, 100);
        let newH = Math.max(drag.startHeight + deltaY, 100);
        if (snapToGrid) {
          newW = Math.round(newW / 20) * 20;
          newH = Math.round(newH / 20) * 20;
        }
        setAreas((prev) =>
          prev.map((a) => (a.id === drag.id ? { ...a, width: newW, height: newH } : a))
        );
      } else if (drag.type === "note-resize") {
        let newW = Math.max(drag.startWidth + deltaX, 120);
        let newH = Math.max(drag.startHeight + deltaY, 80);
        if (snapToGrid) {
          newW = Math.round(newW / 20) * 20;
          newH = Math.round(newH / 20) * 20;
        }
        setNotes((prev) =>
          prev.map((n) => (n.id === drag.id ? { ...n, width: newW, height: newH } : n))
        );
      } else if (drag.type === "note") {
        setNotes((prev) =>
          prev.map((n) => (n.id === drag.id ? { ...n, x_pos: newX, y_pos: newY } : n))
        );
      }
    }
  };

  const handlePointerUp = (e) => {
    if (connectionSourceRef.current) {
      const startX = connectionSourceRef.current.startX || 0;
      const startY = connectionSourceRef.current.startY || 0;
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      
      const targetEl = e.target.closest("[data-node-id]");
      if (targetEl) {
        const targetId = targetEl.getAttribute("data-node-id");
        const targetType = targetEl.getAttribute("data-node-type");
        if (targetId && targetId !== connectionSourceRef.current.id) {
          createLink(connectionSourceRef.current, { id: targetId, type: targetType });
          setConnectionSource(null);
          dragRef.current = null;
          return;
        }
      }
      
      if (dist > 10) {
        setConnectionSource(null);
      }
    }

    const drag = dragRef.current;
    if (!drag) return;

    if (drag.targetEl && typeof drag.targetEl.releasePointerCapture === "function") {
      try {
        drag.targetEl.releasePointerCapture(drag.pointerId);
      } catch (err) {}
    }

    // Persist group dragging coordinate changes
    if (drag.groupItems && drag.hasMoved) {
      drag.groupItems.forEach((item) => {
        if (item.type === "book") {
          const book = booksRef.current.find((b) => b.id === item.id);
          if (book) {
            fetch("/api/books", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(book),
            });
          }
        } else if (item.type === "note") {
          const note = notesRef.current.find((n) => n.id === item.id);
          if (note) {
            fetch("/api/notes", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(note),
            });
          }
        } else if (item.type === "area") {
          const area = areasRef.current.find((a) => a.id === item.id);
          if (area) {
            fetch("/api/areas", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(area),
            });
          }
        } else if (item.type === "quote") {
          const quote = quotesRef.current.find((q) => q.id === item.id);
          if (quote) {
            fetch("/api/quotes", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(quote),
            });
          }
        }
      });
      dragRef.current = null;
      return;
    }

    if (drag.type === "lasso") {
      if (tempLassoBox && tempLassoBox.w > 5 && tempLassoBox.h > 5) {
        const lx1 = tempLassoBox.x;
        const ly1 = tempLassoBox.y;
        const lx2 = tempLassoBox.x + tempLassoBox.w;
        const ly2 = tempLassoBox.y + tempLassoBox.h;

        const newSelected = [];

        booksRef.current.forEach((b) => {
          const w = 192;
          const h = b.cover_url ? 320 : 160;
          const intersects = !(b.x_pos + w < lx1 || b.x_pos > lx2 || b.y_pos + h < ly1 || b.y_pos > ly2);
          if (intersects) newSelected.push({ id: b.id, type: "book" });
        });

        notesRef.current.forEach((n) => {
          const w = n.width || 220;
          const h = n.height || 150;
          const intersects = !(n.x_pos + w < lx1 || n.x_pos > lx2 || n.y_pos + h < ly1 || n.y_pos > ly2);
          if (intersects) newSelected.push({ id: n.id, type: "note" });
        });

        areasRef.current.forEach((a) => {
          const w = a.width || 200;
          const h = a.height || 200;
          const intersects = !(a.x_pos + w < lx1 || a.x_pos > lx2 || a.y_pos + h < ly1 || a.y_pos > ly2);
          if (intersects) newSelected.push({ id: a.id, type: "area" });
        });

        quotesRef.current.forEach((q) => {
          const w = 140;
          const h = 80;
          const intersects = !(q.x_pos + w < lx1 || q.x_pos > lx2 || q.y_pos + h < ly1 || q.y_pos > ly2);
          if (intersects) newSelected.push({ id: q.id, type: "quote" });
        });

        setSelectedNodes(newSelected);
      } else {
        setSelectedNodes([]);
      }
      setTempLassoBox(null);
    } else if (drag.type === "drawing") {
      if (tempBox && tempBox.w > 20 && tempBox.h > 20) {
        setActiveDialog({ type: "create-zone", tempBox });
      } else {
        setTempBox(null);
        setIsDrawingMode(false);
      }
    } else if (drag.type === "book") {
      if (drag.hasMoved) {
        const book = booksRef.current.find((b) => b.id === drag.id);
        if (book) {
          fetch("/api/books", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(book),
          });
        }
      } else {
        // Handle click on book node
        if (e.shiftKey) {
          const isSelected = selectedNodesRef.current.some((n) => n.id === drag.id && n.type === "book");
          setSelectedNodes((prev) =>
            isSelected
              ? prev.filter((n) => !(n.id === drag.id && n.type === "book"))
              : [...prev, { id: drag.id, type: "book" }]
          );
        } else {
          setSelectedNodes([]);
          if (connectionSourceRef.current) {
            createLink(connectionSourceRef.current, { id: drag.id, type: "book" });
            setConnectionSource(null);
          } else {
            const book = booksRef.current.find((b) => b.id === drag.id);
            if (book) {
              setSelectedBook(book);
            }
          }
        }
      }
    } else if (drag.type === "quote") {
      if (drag.hasMoved) {
        const quote = quotesRef.current.find((q) => q.id === drag.id);
        if (quote) {
          fetch("/api/quotes", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(quote),
          });
        }
      } else {
        if (e.shiftKey) {
          const isSelected = selectedNodesRef.current.some((n) => n.id === drag.id && n.type === "quote");
          setSelectedNodes((prev) =>
            isSelected
              ? prev.filter((n) => !(n.id === drag.id && n.type === "quote"))
              : [...prev, { id: drag.id, type: "quote" }]
          );
        } else {
          setSelectedNodes([]);
        }
      }
    } else if (drag.type === "area" || drag.type === "area-resize") {
      if (drag.hasMoved) {
        const area = areasRef.current.find((a) => a.id === drag.id);
        if (area) {
          fetch("/api/areas", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(area),
          });
        }

        // Persist new coordinates of all grouped elements
        if (drag.type === "area" && drag.containedItems) {
          const { books: cBooks, quotes: cQuotes, notes: cNotes } = drag.containedItems;
          
          cBooks.forEach((cb) => {
            const b = booksRef.current.find((book) => book.id === cb.id);
            if (b) {
              fetch("/api/books", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(b),
              });
            }
          });

          cQuotes.forEach((cq) => {
            const q = quotesRef.current.find((quote) => quote.id === cq.id);
            if (q) {
              fetch("/api/quotes", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(q),
              });
            }
          });

          cNotes.forEach((cn) => {
            const n = notesRef.current.find((note) => note.id === cn.id);
            if (n) {
              fetch("/api/notes", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(n),
              });
            }
          });
        }
      } else {
        if (e.shiftKey && drag.type === "area") {
          const isSelected = selectedNodesRef.current.some((n) => n.id === drag.id && n.type === "area");
          setSelectedNodes((prev) =>
            isSelected
              ? prev.filter((n) => !(n.id === drag.id && n.type === "area"))
              : [...prev, { id: drag.id, type: "area" }]
          );
        } else {
          setSelectedNodes([]);
        }
      }
    } else if (drag.type === "note" || drag.type === "note-resize") {
      if (drag.type === "note") {
        if (drag.hasMoved) {
          const note = notesRef.current.find((n) => n.id === drag.id);
          if (note) {
            fetch("/api/notes", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(note),
            });
          }
        } else {
          if (e.shiftKey) {
            const isSelected = selectedNodesRef.current.some((n) => n.id === drag.id && n.type === "note");
            setSelectedNodes((prev) =>
              isSelected
                ? prev.filter((n) => !(n.id === drag.id && n.type === "note"))
                : [...prev, { id: drag.id, type: "note" }]
            );
          } else {
            setSelectedNodes([]);
            if (connectionSourceRef.current) {
              createLink(connectionSourceRef.current, { id: drag.id, type: "note" });
              setConnectionSource(null);
            }
          }
        }
      }
    }

    dragRef.current = null;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable);
      
      if (isPresentationMode) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          jumpToSlide(currentPresentationIndex - 1);
        } else if (e.key === "ArrowRight" || e.key === " ") {
          e.preventDefault();
          jumpToSlide(currentPresentationIndex + 1);
        } else if (e.key === "Escape") {
          e.preventDefault();
          setIsPresentationMode(false);
        }
        return;
      }

      if (e.key === "Escape") {
        if (connectionSourceRef.current) {
          setConnectionSource(null);
        }
        setSelectedNodes([]);
      }

      if (!isTyping) {
        if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          handleCreateNote();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPresentationMode, currentPresentationIndex, presets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelEvent = (e) => {
      // Allow default browser scrolling for scrollable containers, note editors, and modals
      if (
        e.target.closest(".overflow-y-auto") ||
        e.target.closest("[contenteditable]") ||
        e.target.closest(".aero-panel") ||
        e.target.closest(".fixed")
      ) {
        return;
      }

      e.preventDefault();
      
      const zoomIntensity = 0.08;
      const delta = -e.deltaY;
      const zoomFactor = Math.exp(delta * 0.002 * zoomIntensity);
      
      setScale((prevScale) => {
        const nextScale = Math.min(Math.max(prevScale * zoomFactor, 0.15), 3);
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        setPan((prevPan) => {
          const canvasMouseX = (mouseX - prevPan.x) / prevScale;
          const canvasMouseY = (mouseY - prevPan.y) / prevScale;
          return {
            x: mouseX - canvasMouseX * nextScale,
            y: mouseY - canvasMouseY * nextScale,
          };
        });
        
        return nextScale;
      });
    };

    canvas.addEventListener("wheel", handleWheelEvent, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheelEvent);
    };
  }, []);

  const handleBookClick = useCallback((book) => {
    setSelectedBook(book);
  }, []);

  return (
    <div
      className="relative w-screen h-screen select-none overflow-hidden"
      ref={canvasRef}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={handleCanvasContextMenu}
      style={{ cursor: "grab" }}
    >
      {/* Static deep space stars */}
      <div className="space-bg pointer-events-none" />

      {/* Animated parallax canvas stars */}
      <StarfieldBackground pan={pan} scale={scale} />

      <div
        className={`absolute top-6 left-6 z-10 p-4 aero-panel w-64 max-h-[85vh] overflow-y-auto transition-all duration-300 ${
          isPresentationMode ? "opacity-0 -translate-x-full pointer-events-none" : ""
        }`}
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <h1 className="text-xl font-bold tracking-widest text-white mb-1">AETHER_OS</h1>
        <p className="hud-text">CMD+K // SEARCH</p>
        <p className="hud-text mt-1 text-[10px] opacity-50">
          COORD: {Math.round(-pan.x)}, {Math.round(-pan.y)} | ZOOM: {Math.round(scale * 100)}%
        </p>

        <button
          id="hud-add-zone-btn"
          type="button"
          onClick={() => setIsDrawingMode((prev) => !prev)}
          className={`aero-button text-[10px] py-1 px-3 mt-3 w-full transition-all ${
            isDrawingMode
              ? "bg-[#00aaff] text-black font-semibold shadow-[0_0_10px_rgba(0,170,255,0.5)]"
              : "secondary text-white"
          }`}
        >
          {isDrawingMode ? "CANCEL DRAW" : "ADD CATEGORY ZONE"}
        </button>

        <button
          id="hud-add-note-btn"
          type="button"
          onClick={handleCreateNote}
          className="aero-button secondary text-[10px] py-1 px-3 mt-2 w-full transition-all text-white"
        >
          ADD NOTE (PRESS N)
        </button>

        {/* Tidy Auto-Layout */}
        <button
          id="hud-tidy-canvas-btn"
          type="button"
          onClick={handleTidyCanvas}
          className="aero-button bg-[#00aaff]/15 hover:bg-[#00aaff]/30 border border-[#00aaff]/30 text-[#00aaff] text-[10px] py-1 px-3 mt-2 w-full transition-all font-semibold"
        >
          TIDY CANVAS
        </button>

        <button
          id="hud-telemetry-dashboard-btn"
          type="button"
          onClick={() => setShowTelemetryDashboard(true)}
          className="aero-button bg-purple-500/15 hover:bg-purple-500/30 border border-purple-500/30 text-purple-400 text-[10px] py-1 px-3 mt-2 w-full transition-all font-semibold flex items-center justify-center gap-1.5"
        >
          <span>📊</span> TELEMETRY DASHBOARD
        </button>
        
        {/* Line & Grid toggles */}
        <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/10">
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-[9px] hud-text select-none">
              <input
                type="checkbox"
                checked={showTimeline}
                onChange={(e) => setShowTimeline(e.target.checked)}
                className="rounded border-white/20 bg-black/40 accent-[#00aaff] w-3 h-3"
              />
              TIMELINE
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-[9px] hud-text select-none">
              <input
                type="checkbox"
                checked={showConnections}
                onChange={(e) => setShowConnections(e.target.checked)}
                className="rounded border-white/20 bg-black/40 accent-[#00aaff] w-3 h-3"
              />
              CONNECTIONS
            </label>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-[9px] hud-text select-none">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="rounded border-white/20 bg-black/40 accent-[#00aaff] w-3 h-3"
              />
              SHOW GRID
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-[9px] hud-text select-none">
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
                className="rounded border-white/20 bg-black/40 accent-[#00aaff] w-3 h-3"
              />
              SNAP TO GRID
            </label>
          </div>
        </div>

        {/* Canvas Search Filter */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-[9px] hud-text font-bold text-white mb-2">TELEMETRY FILTER</div>
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="FILTER MODULE DESIGNATION..."
              value={canvasFilter}
              onChange={(e) => setCanvasFilter(e.target.value)}
              className="aero-input py-1.5 pl-2.5 pr-6 text-[9px] font-mono tracking-wider bg-black/60 text-white rounded w-full uppercase"
            />
            {canvasFilter && (
              <button
                type="button"
                onClick={() => setCanvasFilter("")}
                className="absolute right-2 text-white/40 hover:text-white text-[9px] leading-none"
              >
                ✕
              </button>
            )}
          </div>
        </div>        {/* Workspace Telemetry Dashboard */}
        {(() => {
          const totalBooks = books.length;
          if (totalBooks === 0 && notes.length === 0 && links.length === 0 && areas.length === 0) return null;

          const completed = books.filter(b => b.status === "Completed").length;
          const reading = books.filter(b => b.status === "Reading").length;
          const toRead = books.filter(b => b.status === "To Read").length;
          
          const rated = books.filter(b => b.rating > 0);
          const avgRating = rated.length > 0 ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1) : "—";
          
          const supportLnk = links.filter(l => l.type === "support").length;
          const contrastLnk = links.filter(l => l.type === "contrast").length;
          const questionLnk = links.filter(l => l.type === "question").length;
          const defaultLnk = links.filter(l => l.type === "default" || !l.type).length;

          return (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-[9px] hud-text font-bold text-white mb-2">WORKSPACE TELEMETRY</div>
              
              {/* Progress bar for books */}
              {totalBooks > 0 && (
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden flex mb-2">
                  {completed > 0 && (
                    <div 
                      className="h-full bg-[#22c55e] transition-all duration-700" 
                      style={{ width: `${(completed / totalBooks) * 100}%` }}
                      title={`Completed: ${completed}`}
                    />
                  )}
                  {reading > 0 && (
                    <div 
                      className="h-full bg-[#00aaff] transition-all duration-700" 
                      style={{ width: `${(reading / totalBooks) * 100}%` }}
                      title={`Reading: ${reading}`}
                    />
                  )}
                  {toRead > 0 && (
                    <div 
                      className="h-full bg-white/15 transition-all duration-700" 
                      style={{ width: `${(toRead / totalBooks) * 100}%` }}
                      title={`To Read: ${toRead}`}
                    />
                  )}
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[8px] text-gray-400">
                <div className="bg-white/5 rounded p-1.5">
                  <div className="text-white font-bold text-[8px] uppercase tracking-wider mb-1">Modules</div>
                  <div className="flex justify-between"><span>Books:</span><span className="text-[#00aaff]">{totalBooks}</span></div>
                  <div className="flex justify-between"><span>Notes:</span><span className="text-[#00aaff]">{notes.length}</span></div>
                  <div className="flex justify-between"><span>Quotes:</span><span className="text-[#00aaff]">{quotes.length}</span></div>
                  <div className="flex justify-between"><span>Zones:</span><span className="text-[#22c55e]">{areas.length}</span></div>
                </div>
                <div className="bg-white/5 rounded p-1.5">
                  <div className="text-white font-bold text-[8px] uppercase tracking-wider mb-1">Relations</div>
                  <div className="flex justify-between"><span>Support:</span><span className="text-[#22c55e]">{supportLnk}</span></div>
                  <div className="flex justify-between"><span>Contrast:</span><span className="text-[#ef4444]">{contrastLnk}</span></div>
                  <div className="flex justify-between"><span>Question:</span><span className="text-[#eab308]">{questionLnk}</span></div>
                  <div className="flex justify-between"><span>Default:</span><span className="text-[#00aaff]">{defaultLnk}</span></div>
                </div>
              </div>

              {/* Summary telemetry row */}
              <div className="flex justify-between items-center mt-2 text-[8px] hud-text opacity-40 font-mono">
                <span>AVG RATING: {avgRating} ★</span>
                <span>TOTAL PATHS: {links.length}</span>
              </div>
            </div>
          );
        })()}

        {/* Topology Analytics & Navigation Console */}
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
          <div className="text-[9px] hud-text font-bold text-white mb-1">TOPOLOGY ANALYTICS</div>
          
          <div className="grid grid-cols-2 gap-1.5 font-mono text-[8px] text-gray-400">
            <div className="bg-white/5 rounded p-1.5 font-mono">
              <div className="text-white font-bold text-[8px] uppercase tracking-wider mb-1">Network Stats</div>
              <div className="flex justify-between"><span>Hubs (&gt;=3):</span><span className="text-[#a855f7]">{graphMetrics.hubs.length}</span></div>
              <div className="flex justify-between"><span>Orphans (0):</span><span className="text-[#f97316]">{graphMetrics.orphans.length}</span></div>
              <div className="flex justify-between"><span>Clusters:</span><span className="text-white">{graphMetrics.componentsCount}</span></div>
            </div>
            
            <div className="bg-white/5 rounded p-1.5 flex flex-col justify-between font-mono">
              <div className="text-white font-bold text-[8px] uppercase tracking-wider mb-1">Status</div>
              <div className="text-[7px] text-gray-500 uppercase tracking-tight leading-tight">
                {graphMetrics.orphans.length > 0 
                  ? `${graphMetrics.orphans.length} isolated nodes detected. click finder below.` 
                  : "all modules connected to network topology."}
              </div>
            </div>
          </div>

          {/* Hub Finder List */}
          {graphMetrics.hubs.length > 0 && (
            <div className="bg-white/5 rounded p-1.5 flex flex-col gap-1 max-h-24 overflow-y-auto">
              <div className="text-white font-bold text-[7px] uppercase tracking-wider font-mono">Hub Teleporters (Focus Hub)</div>
              <div className="flex flex-col gap-1">
                {graphMetrics.hubs.map(h => (
                  <button
                    key={`hub-teleport-${h.id}`}
                    type="button"
                    onClick={() => centerOnNode(h.id, h.type)}
                    className="text-left font-mono text-[7px] text-[#00aaff] hover:text-[#a855f7] bg-white/5 hover:bg-white/10 px-1 py-0.5 rounded flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate max-w-[120px]">{h.title}</span>
                    <span className="text-[6px] text-gray-500 uppercase tracking-tighter">({h.type}) ⌖</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Orphan Finder List */}
          {graphMetrics.orphans.length > 0 && (
            <div className="bg-white/5 rounded p-1.5 flex flex-col gap-1 max-h-24 overflow-y-auto">
              <div className="text-white font-bold text-[7px] uppercase tracking-wider font-mono">Orphan Finder (Needs Links)</div>
              <div className="flex flex-col gap-1">
                {graphMetrics.orphans.map(o => (
                  <button
                    key={`orphan-teleport-${o.id}`}
                    type="button"
                    onClick={() => centerOnNode(o.id, o.type)}
                    className="text-left font-mono text-[7px] text-[#f97316] hover:text-[#00aaff] bg-white/5 hover:bg-white/10 px-1 py-0.5 rounded flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate max-w-[120px]">{o.title}</span>
                    <span className="text-[6px] text-gray-500 uppercase tracking-tighter">({o.type}) ⌖</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Workspace Backup & Recovery Console */}
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
          <div className="text-[9px] hud-text font-bold text-white mb-1">WORKSPACE CONSOLE</div>
          <div className="flex gap-2">
            <button
              id="hud-backup-btn"
              type="button"
              onClick={handleBackupWorkspace}
              className="aero-button secondary text-[8px] py-1 px-2 flex-1 transition-all text-white font-semibold"
            >
              BACKUP BOARD
            </button>
            <button
              id="hud-restore-btn"
              type="button"
              onClick={() => document.getElementById("hud-restore-input").click()}
              className="aero-button secondary text-[8px] py-1 px-2 flex-1 transition-all text-white font-semibold"
            >
              RESTORE BOARD
            </button>
          </div>
          <button
            id="hud-arrange-timeline-btn"
            type="button"
            onClick={handleArrangeTimeline}
            className="aero-button secondary text-[8px] py-1 px-2 transition-all text-[#00aaff] border-[#00aaff]/30 font-semibold hover:bg-[#00aaff]/10 w-full"
          >
            ORGANIZE CHRONO-TIMELINE
          </button>
          <input
            id="hud-restore-input"
            type="file"
            accept=".json"
            onChange={handleRestoreWorkspace}
            style={{ display: "none" }}
          />
        </div>

        {/* Viewport Presets / Bookmarks Console */}
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="text-[9px] hud-text font-bold text-white uppercase">VIEWPORT BOOKMARKS</div>
            <div className="flex gap-1.5 items-center">
              {presets.length > 0 && (
                <button
                  id="hud-present-btn"
                  type="button"
                  onClick={() => {
                    setCurrentPresentationIndex(0);
                    setIsPresentationMode(true);
                    // Jump to first slide
                    setIsFocusing(true);
                    setPan({ x: presets[0].pan_x, y: presets[0].pan_y });
                    setScale(presets[0].scale);
                    setTimeout(() => setIsFocusing(false), 450);
                  }}
                  className="text-[#22c55e] hover:text-white transition-colors text-[8px] font-mono tracking-wider font-semibold border border-[#22c55e]/30 px-1 py-0.5 rounded bg-[#22c55e]/5"
                  title="Present Storyboard Slideshow"
                >
                  ▶ PLAY
                </button>
              )}
              <button
                id="hud-save-preset-btn"
                type="button"
                onClick={createPreset}
                className="text-[#00aaff] hover:text-white transition-colors text-[8px] font-mono tracking-wider font-semibold border border-[#00aaff]/30 px-1 py-0.5 rounded bg-[#00aaff]/5"
              >
                + ADD PRESET
              </button>
            </div>
          </div>
          {presets.length > 0 ? (
            <div className="max-h-24 overflow-y-auto space-y-1 pr-1 font-mono text-[8px] uppercase tracking-wider text-gray-400">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex justify-between items-center bg-white/5 p-1 rounded hover:bg-[#00aaff]/10 transition-colors cursor-pointer"
                  onClick={() => {
                    setIsFocusing(true);
                    setPan({ x: preset.pan_x, y: preset.pan_y });
                    setScale(preset.scale);
                    setTimeout(() => setIsFocusing(false), 450);
                  }}
                >
                  <span className="truncate max-w-[120px] text-white">📍 {preset.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 text-[6px]">({Math.round(preset.scale * 100)}%)</span>
                    <button
                      type="button"
                      onClick={(e) => deletePreset(preset.id, e)}
                      className="text-white/40 hover:text-red-400 transition-colors px-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-600 text-center py-1 text-[8px] font-mono">NO BOOKMARKS SAVED</div>
          )}
        </div>

        {/* Board Hashtags Console */}
        {hashtags.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
            <div className="text-[9px] hud-text font-bold text-white uppercase">BOARD HASHTAGS</div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {hashtags.map((tag) => {
                const isSelected = canvasFilter.toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setCanvasFilter("");
                      } else {
                        setCanvasFilter(tag);
                      }
                    }}
                    className={`text-[8px] font-mono tracking-wider px-2 py-0.5 rounded-full border transition-all ${
                      isSelected
                        ? "bg-[#00aaff] text-black border-[#00aaff] font-bold shadow-[0_0_8px_rgba(0,170,255,0.4)]"
                        : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:border-[#00aaff]/35"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Collapsible Workspace Index */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => setShowIndex((prev) => !prev)}
            className="flex items-center justify-between w-full text-[9px] hud-text font-bold text-white hover:text-[#00aaff] transition-colors"
          >
            <span>WORKSPACE INDEX ({books.length + notes.length + areas.length})</span>
            <span>{showIndex ? "▲" : "▼"}</span>
          </button>
          
          {showIndex && (
            <div className="max-h-40 overflow-y-auto mt-2 space-y-1.5 pr-1 font-mono text-[9px] uppercase tracking-wider text-gray-400">
              {books.map((b) => (
                <div 
                  key={b.id} 
                  className="flex justify-between items-center bg-white/5 p-1 rounded hover:bg-white/10 transition-colors font-sans cursor-pointer"
                  onClick={() => focusOnNode(b.x_pos, b.y_pos, 192, 300)}
                >
                  <span className="truncate max-w-[120px] text-white">📖 {b.title}</span>
                  <span className="text-[#00aaff] text-[8px] font-mono opacity-50">FOCUS</span>
                </div>
              ))}
              {notes.map((n, i) => (
                <div 
                  key={n.id} 
                  className="flex justify-between items-center bg-white/5 p-1 rounded hover:bg-white/10 transition-colors font-sans cursor-pointer"
                  onClick={() => focusOnNode(n.x_pos, n.y_pos, n.width || 220, n.height || 150)}
                >
                  <span className="truncate max-w-[120px]">📝 Note #{i+1}</span>
                  <span className="text-[#00aaff] text-[8px] font-mono opacity-50">FOCUS</span>
                </div>
              ))}
              {areas.map((a) => (
                <div 
                  key={a.id} 
                  className="flex justify-between items-center bg-white/5 p-1 rounded hover:bg-white/10 transition-colors font-sans cursor-pointer"
                  onClick={() => focusOnNode(a.x_pos, a.y_pos, a.width || 200, a.height || 200)}
                >
                  <span className="truncate max-w-[120px] text-[#22c55e]">⏹ {a.name}</span>
                  <span className="text-[#00aaff] text-[8px] font-mono opacity-50">FOCUS</span>
                </div>
              ))}
              {books.length === 0 && notes.length === 0 && areas.length === 0 && (
                <div className="text-gray-600 text-center py-2">EMPTY WORKSPACE</div>
              )}
            </div>
          )}
        </div>

        {/* System Help Trigger */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => setShowShortcutsHelp(true)}
            className="aero-button secondary text-[8px] py-1.5 px-2.5 w-full transition-all text-white font-semibold flex items-center justify-center gap-1.5 hover:border-purple-500/30"
          >
            <span>⌨️</span> SYSTEM SHORTCUTS REF
          </button>
        </div>
      </div>

      <div
        className={`absolute top-0 left-0 w-full h-full origin-top-left ${isFocusing ? "focus-transition" : ""}`}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
      >
        {/* Grid Background */}
        {showGrid && (
          <div
            className="absolute aero-grid pointer-events-none"
            style={{
              left: -100000,
              top: -100000,
              width: 200000,
              height: 200000,
              zIndex: -5,
            }}
          />
        )}

        {/* Areas Layer */}
        {areas.map((area) => {
          const isMatched = getAreaMatch(area) && (focusedCluster ? focusedCluster.nodeIds.has(area.id) : true);
          const ax1 = area.x_pos;
          const ay1 = area.y_pos;
          const ax2 = area.x_pos + (area.width || 200);
          const ay2 = area.y_pos + (area.height || 200);
          const areaBooks = books.filter(b => b.x_pos >= ax1 && b.x_pos <= ax2 && b.y_pos >= ay1 && b.y_pos <= ay2);
          const booksCount = areaBooks.length;
          const completedCount = areaBooks.filter(b => b.status === "Completed").length;

          return (
            <div
              key={area.id}
              className="transition-all duration-300"
              style={{
                opacity: isMatched ? 1 : 0.15,
                pointerEvents: isMatched ? "auto" : "none",
              }}
            >
              <AreaNode
                area={area}
                booksCount={booksCount}
                completedCount={completedCount}
                onDragStart={handleItemDragStart}
                onResizeStart={handleItemDragStart}
                onDelete={handleDeleteArea}
                onRename={handleUpdateArea}
                onArrangeNodes={handleArrangeAreaNodes}
                isFocused={focusNode && focusNode.id === area.id && focusNode.type === "area"}
                onToggleFocus={(zoom) => handleToggleFocus(area.id, "area", zoom)}
                isHighlighted={teleportHighlightNodeId === area.id}
                isSelected={selectedNodes.some((n) => n.id === area.id && n.type === "area")}
              />
            </div>
          );
        })}

        {/* Notes Layer */}
        {notes.map((note) => {
          const isMatched = getNoteMatch(note) && (focusedCluster ? focusedCluster.nodeIds.has(note.id) : true);
          return (
            <div
              key={note.id}
              className="transition-all duration-300"
              style={{
                opacity: isMatched ? 1 : 0.15,
                pointerEvents: isMatched ? "auto" : "none",
              }}
            >
              <NoteNode
                note={note}
                onDragStart={handleItemDragStart}
                onResizeStart={handleItemDragStart}
                onDelete={handleDeleteNote}
                onEdit={handleEditNote}
                onStartConnection={handleStartConnection}
                isFocused={focusNode && focusNode.id === note.id && focusNode.type === "note"}
                onToggleFocus={(zoom) => handleToggleFocus(note.id, "note", zoom)}
                isHighlighted={teleportHighlightNodeId === note.id}
                isSelected={selectedNodes.some((n) => n.id === note.id && n.type === "note")}
              />
            </div>
          );
        })}

        {tempBox && (
          <div
            className="absolute border border-dashed border-[#00aaff] bg-[#00aaff]/10 pointer-events-none rounded-lg"
            style={{
              left: tempBox.x,
              top: tempBox.y,
              width: tempBox.w,
              height: tempBox.h,
              borderWidth: "1px",
              borderStyle: "dashed",
              zIndex: 1,
            }}
          />
        )}

        {tempLassoBox && (
          <div
            className="absolute border border-dashed border-purple-500 bg-purple-500/10 pointer-events-none rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.15)]"
            style={{
              left: tempLassoBox.x,
              top: tempLassoBox.y,
              width: tempLassoBox.w,
              height: tempLassoBox.h,
              borderWidth: "1.5px",
              borderStyle: "dashed",
              zIndex: 999,
            }}
          />
        )}

        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
          <defs>
            {/* arrow-default */}
            <marker id="arrow-default" markerWidth="8" markerHeight="6" refX="7.5" refY="3" orient="auto-start-reverse" markerUnits="strokeWidth">
              <path d="M0,0.5 L7.5,3 L0,5.5 Z" fill="rgba(0, 170, 255, 0.85)" />
            </marker>
            {/* arrow-support */}
            <marker id="arrow-support" markerWidth="8" markerHeight="6" refX="7.5" refY="3" orient="auto-start-reverse" markerUnits="strokeWidth">
              <path d="M0,0.5 L7.5,3 L0,5.5 Z" fill="rgba(34, 197, 94, 0.85)" />
            </marker>
            {/* arrow-contrast */}
            <marker id="arrow-contrast" markerWidth="8" markerHeight="6" refX="7.5" refY="3" orient="auto-start-reverse" markerUnits="strokeWidth">
              <path d="M0,0.5 L7.5,3 L0,5.5 Z" fill="rgba(239, 68, 68, 0.85)" />
            </marker>
            {/* arrow-question */}
            <marker id="arrow-question" markerWidth="8" markerHeight="6" refX="7.5" refY="3" orient="auto-start-reverse" markerUnits="strokeWidth">
              <path d="M0,0.5 L7.5,3 L0,5.5 Z" fill="rgba(234, 179, 8, 0.85)" />
            </marker>
          </defs>
          {/* Glowing timeline curved paths */}
          {showTimeline && books.map((book, i) => {
            if (i < books.length - 1) {
              const nextBook = books[i + 1];
              const x1 = book.x_pos + 96;
              const y1 = book.y_pos + 150;
              const x2 = nextBook.x_pos + 96;
              const y2 = nextBook.y_pos + 150;
              const pathData = getBezierPath(x1, y1, x2, y2);
              const isMatched = (getBookMatch(book) || getBookMatch(nextBook)) && (focusedCluster ? (focusedCluster.nodeIds.has(book.id) && focusedCluster.nodeIds.has(nextBook.id)) : true);
              return (
                <path
                  key={`line-${book.id}`}
                  d={pathData}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="1.5"
                  className="flow-line-timeline"
                  style={{ opacity: isMatched ? 1 : 0.15, transition: "opacity 0.3s" }}
                />
              );
            }
            return null;
          })}

          {/* Glowing quote connection curves */}
          {showConnections && quotes.map((quote) => {
            const book = books.find((b) => b.id === quote.book_id);
            if (!book) return null;
            const x1 = book.x_pos + 96;
            const y1 = book.y_pos + 150;
            const x2 = quote.x_pos + 40;
            const y2 = quote.y_pos + 30;
            const pathData = getBezierPath(x1, y1, x2, y2);
            const isMatched = (getQuoteMatch(quote) || getBookMatch(book)) && (focusedCluster ? (focusedCluster.nodeIds.has(book.id) || focusedCluster.quoteIds.has(quote.id)) : true);
            return (
              <path
                key={`link-${quote.id}`}
                d={pathData}
                fill="none"
                stroke="rgba(0, 170, 255, 0.35)"
                strokeWidth="1.5"
                className="flow-line"
                style={{ opacity: isMatched ? 1 : 0.15, transition: "opacity 0.3s" }}
              />
            );
          })}

          {/* Custom knowledge graph connection lines */}
          {links.map((link) => {
            const sourceNode = link.source_type === "book" 
              ? books.find(b => b.id === link.source_id)
              : notes.find(n => n.id === link.source_id);
            const targetNode = link.target_type === "book"
              ? books.find(b => b.id === link.target_id)
              : notes.find(n => n.id === link.target_id);

            if (!sourceNode || !targetNode) return null;

            const { start, end } = getBestConnectionPoints(sourceNode, link.source_type, targetNode, link.target_type);
            const pathData = link.shape === "straight"
              ? `M ${start.x} ${start.y} L ${end.x} ${end.y}`
              : getSmartBezierPath(start, end);
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            const isMatched = (getNodeMatch(link.source_id, link.source_type) || getNodeMatch(link.target_id, link.target_type)) && (focusedCluster ? focusedCluster.linkIds.has(link.id) : true);

            const getLinkColor = (type) => {
              switch (type) {
                case "support": return "rgba(34, 197, 94, 0.55)";
                case "contrast": return "rgba(239, 68, 68, 0.55)";
                case "question": return "rgba(234, 179, 8, 0.55)";
                default: return "rgba(0, 170, 255, 0.45)";
              }
            };

            const getLinkDashArray = (type) => {
              switch (type) {
                case "contrast": return "5, 5";
                case "question": return "2, 3";
                default: return "none";
              }
            };

            const getStyleHex = (type) => {
              switch (type) {
                case "support": return "#22c55e";
                case "contrast": return "#ef4444";
                case "question": return "#eab308";
                default: return "#00aaff";
              }
            };

            const getStyleBg = (type) => {
              switch (type) {
                case "support": return "rgba(34, 197, 94, 0.12)";
                case "contrast": return "rgba(239, 68, 68, 0.12)";
                case "question": return "rgba(234, 179, 8, 0.12)";
                default: return "rgba(0, 170, 255, 0.12)";
              }
            };

            const arrowMode = link.arrow || "none";
            const linkStyle = link.type || "default";
            const hasStartArrow = arrowMode === "both";
            const hasEndArrow = arrowMode === "forward" || arrowMode === "both";

            return (
              <g 
                key={link.id} 
                className="group/link"
                style={{ 
                  opacity: isMatched ? 1 : 0.15, 
                  pointerEvents: isMatched ? "auto" : "none",
                  transition: "opacity 0.3s"
                }}
              >
                <path
                  d={pathData}
                  fill="none"
                  stroke={getLinkColor(link.type)}
                  strokeWidth="1.5"
                  strokeDasharray={getLinkDashArray(link.type)}
                  markerStart={hasStartArrow ? `url(#arrow-${linkStyle})` : undefined}
                  markerEnd={hasEndArrow ? `url(#arrow-${linkStyle})` : undefined}
                  className={`transition-all hover:stroke-2 cursor-pointer ${
                    link.type === "contrast" 
                      ? "link-path-dashed" 
                      : (link.type === "question" 
                          ? "link-path-dotted" 
                          : "link-path-solid")
                  } ${
                    link.speed === "fast" 
                      ? "link-speed-fast" 
                      : (link.speed === "slow" 
                          ? "link-speed-slow" 
                          : (link.speed === "pause" 
                              ? "link-speed-pause" 
                              : "link-speed-normal"))
                  }`}
                  style={{ pointerEvents: "auto" }}
                />
                
                <foreignObject
                  x={midX - 150}
                  y={midY - 14}
                  width={300}
                  height={28}
                  style={{ pointerEvents: "none" }}
                >
                  <div className="flex items-center justify-center gap-1.5 w-full h-full">
                    {/* Delete button (only on hover) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLink(link.id);
                      }}
                      className="w-4 h-4 rounded-full bg-red-950/90 border border-red-500/50 hover:bg-red-800 text-white text-[8px] font-bold flex items-center justify-center cursor-pointer pointer-events-auto shadow-[0_0_8px_rgba(239,68,68,0.3)] opacity-0 group-hover/link:opacity-100 transition-opacity"
                      title="Delete connection"
                    >
                      ✕
                    </button>
 
                    {/* Color style dots selector (only on hover) */}
                    <div className="flex items-center gap-0.5 bg-black/85 border border-white/10 rounded-full px-1.5 py-0.5 pointer-events-auto opacity-0 group-hover/link:opacity-100 transition-opacity">
                      {[
                        { val: "default", color: "#00aaff", label: "Associate (Cyan)" },
                        { val: "support", color: "#22c55e", label: "Support (Green)" },
                        { val: "contrast", color: "#ef4444", label: "Contrast (Red)" },
                        { val: "question", color: "#eab308", label: "Question (Yellow)" }
                      ].map((style) => (
                        <button
                          key={style.val}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateLinkType(link.id, style.val);
                          }}
                          className={`w-1.5 h-1.5 rounded-full border transition-transform hover:scale-125 ${
                            (link.type || "default") === style.val ? "border-white scale-110" : "border-white/20"
                          }`}
                          style={{ backgroundColor: style.color }}
                          title={style.label}
                        />
                      ))}
                    </div>

                    {/* Arrowhead toggle (only on hover) */}
                    <div className="flex items-center bg-black/85 border border-white/10 rounded-full px-2 py-0.5 pointer-events-auto opacity-0 group-hover/link:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentArrow = link.arrow || "none";
                          const nextArrow = currentArrow === "none" ? "forward" : currentArrow === "forward" ? "both" : "none";
                          handleUpdateLinkArrow(link.id, nextArrow);
                        }}
                        className="text-[8px] font-mono text-white/80 hover:text-white flex items-center gap-1 select-none cursor-pointer"
                        title={`Arrow: ${link.arrow || "none"} (Click to cycle)`}
                      >
                        <span 
                          className="text-[10px] leading-none font-bold transition-colors"
                          style={{ color: getStyleHex(link.type) }}
                        >
                          {(link.arrow || "none") === "none" ? "—" : (link.arrow === "forward" ? "→" : "↔")}
                        </span>
                        <span className="text-[7px] text-white/40 uppercase tracking-tight">
                          {link.arrow || "none"}
                        </span>
                      </button>
                    </div>

                    {/* Flow speed toggle (only on hover) */}
                    <div className="flex items-center bg-black/85 border border-white/10 rounded-full px-2 py-0.5 pointer-events-auto opacity-0 group-hover/link:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentSpeed = link.speed || "normal";
                          const nextSpeed = currentSpeed === "normal" ? "fast" : currentSpeed === "fast" ? "slow" : currentSpeed === "slow" ? "pause" : "normal";
                          handleUpdateLinkSpeed(link.id, nextSpeed);
                        }}
                        className="text-[8px] font-mono text-white/80 hover:text-white flex items-center gap-1 select-none cursor-pointer"
                        title={`Flow: ${link.speed || "normal"} (Click to cycle)`}
                      >
                        <span 
                          className="text-[10px] leading-none font-bold transition-colors"
                          style={{ color: getStyleHex(link.type) }}
                        >
                          {(link.speed || "normal") === "normal" ? "▶" : ((link.speed === "fast") ? "▶▶" : ((link.speed === "slow") ? "▷" : "⏸"))}
                        </span>
                        <span className="text-[7px] text-white/40 uppercase tracking-tight">
                          {link.speed || "normal"}
                        </span>
                      </button>
                    </div>

                    {/* Shape toggle (only on hover) */}
                    <div className="flex items-center bg-black/85 border border-white/10 rounded-full px-2 py-0.5 pointer-events-auto opacity-0 group-hover/link:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentShape = link.shape || "curved";
                          const nextShape = currentShape === "curved" ? "straight" : "curved";
                          handleUpdateLinkShape(link.id, nextShape);
                        }}
                        className="text-[8px] font-mono text-white/80 hover:text-white flex items-center gap-1 select-none cursor-pointer"
                        title={`Shape: ${link.shape || "curved"} (Click to cycle)`}
                      >
                        <span 
                          className="text-[10px] leading-none font-bold transition-colors font-sans"
                          style={{ color: getStyleHex(link.type) }}
                        >
                          {(link.shape || "curved") === "curved" ? "~" : "|"}
                        </span>
                        <span className="text-[7px] text-white/40 uppercase tracking-tight font-mono">
                          {link.shape || "curved"}
                        </span>
                      </button>
                    </div>
 
                    {/* Label Input/Text */}
                    <div className="pointer-events-auto">
                      {editingLinkId === link.id ? (
                        <input
                          type="text"
                          defaultValue={link.label || ""}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveLinkLabel(link.id, e.currentTarget.value);
                            } else if (e.key === "Escape") {
                              setEditingLinkId(null);
                            }
                          }}
                          onBlur={(e) => {
                            handleSaveLinkLabel(link.id, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-black/90 border border-[#00aaff] text-[#00aaff] text-[9px] font-mono px-1 py-0.5 rounded outline-none w-24 text-center"
                        />
                      ) : (
                        <div
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingLinkId(link.id);
                          }}
                          className="px-2 py-0.5 rounded font-mono text-[8px] tracking-wider uppercase cursor-pointer border select-none transition-all"
                          style={{
                            backgroundColor: link.label ? getStyleBg(link.type) : "rgba(0,0,0,0.5)",
                            borderColor: link.label ? `${getStyleHex(link.type)}55` : "rgba(255,255,255,0.1)",
                            color: link.label ? getStyleHex(link.type) : "rgba(255,255,255,0.3)"
                          }}
                          title={link.label ? "Double-click to edit label" : "Double-click to add label"}
                        >
                          {link.label || "+ LABEL"}
                        </div>
                      )}
                    </div>
                  </div>
                </foreignObject>
              </g>
            );
          })}

          {/* Active drawing connection preview line */}
          {connectionSource && (() => {
            const sourceNode = connectionSource.type === "book"
              ? books.find(b => b.id === connectionSource.id)
              : notes.find(n => n.id === connectionSource.id);
            if (!sourceNode) return null;

            const edges = getEdgeCoordinates(sourceNode, connectionSource.type);
            let minDistance = Infinity;
            let bestEdge = edges.right;
            for (const key in edges) {
              const pt = edges[key];
              const dist = Math.hypot(pt.x - mouseCanvasPos.x, pt.y - mouseCanvasPos.y);
              if (dist < minDistance) {
                minDistance = dist;
                bestEdge = pt;
              }
            }

            const startPoint = bestEdge;
            const endPoint = { x: mouseCanvasPos.x, y: mouseCanvasPos.y, dir: getOppositeDir(bestEdge.dir) };
            const pathData = getSmartBezierPath(startPoint, endPoint);

            return (
              <path
                d={pathData}
                fill="none"
                stroke="rgba(0, 170, 255, 0.6)"
                strokeWidth="2"
                strokeDasharray="4, 4"
                className="pointer-events-none"
              />
            );
          })()}
        </svg>

        {quotes.map((quote) => {
          const isMatched = getQuoteMatch(quote) && (focusedCluster ? focusedCluster.quoteIds.has(quote.id) : true);
          return (
            <div
              key={quote.id}
              className="transition-all duration-300"
              style={{
                opacity: isMatched ? 1 : 0.15,
                pointerEvents: isMatched ? "auto" : "none",
              }}
            >
              <QuoteNode
                quote={quote}
                onDragStart={handleItemDragStart}
                onDelete={handleDeleteQuote}
                isSelected={selectedNodes.some((n) => n.id === quote.id && n.type === "quote")}
              />
            </div>
          );
        })}

        {books.map((book) => {
          const isMatched = getBookMatch(book) && (focusedCluster ? focusedCluster.nodeIds.has(book.id) : true);
          return (
            <div
              key={book.id}
              className="transition-all duration-300"
              style={{
                opacity: isMatched ? 1 : 0.15,
                pointerEvents: isMatched ? "auto" : "none",
              }}
            >
              <BookNode
                book={book}
                onClick={handleBookClick}
                onDragStart={handleItemDragStart}
                onStartConnection={handleStartConnection}
                isFocused={focusNode && focusNode.id === book.id && focusNode.type === "book"}
                onToggleFocus={(zoom) => handleToggleFocus(book.id, "book", zoom)}
                isHighlighted={teleportHighlightNodeId === book.id}
                isSelected={selectedNodes.some((n) => n.id === book.id && n.type === "book")}
              />
            </div>
          );
        })}
      </div>

      {connectionSource && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 bg-black/85 border border-[#00aaff]/40 rounded-full shadow-[0_0_15px_rgba(0,170,255,0.25)] backdrop-blur-md">
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#00aaff] animate-pulse">
            LINK MODE ACTIVE // SELECT TARGET MODULE TO CONNECT
          </span>
          <button
            type="button"
            onClick={() => setConnectionSource(null)}
            className="text-[9px] font-mono text-white/50 hover:text-white border border-white/20 rounded px-1.5 py-0.5 leading-none transition-colors"
          >
            CANCEL (ESC)
          </button>
        </div>
      )}

      {focusNode && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 bg-black/85 border border-purple-500/40 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.25)] backdrop-blur-md">
          <span className="text-[10px] font-mono font-bold tracking-widest text-purple-400 animate-pulse">
            FOCUS MODE ACTIVE // RELATIONSHIP CLUSTER FILTER ENABLED
          </span>
          <button
            type="button"
            onClick={() => setFocusNode(null)}
            className="text-[9px] font-mono text-white/50 hover:text-white border border-white/20 rounded px-1.5 py-0.5 leading-none transition-colors"
          >
            RESET FOCUS
          </button>
        </div>
      )}

      <SearchModal
        isOpen={showSearchModal}
        onOpen={() => setShowSearchModal(true)}
        onClose={() => setShowSearchModal(false)}
        onAddBook={handleAddBook}
        onAddNote={handleCreateNote}
        onTidyCanvas={handleTidyCanvas}
        onToggleTimeline={() => setShowTimeline((prev) => !prev)}
        onToggleConnections={() => setShowConnections((prev) => !prev)}
        onResetViewport={() => { setPan({ x: 0, y: 0 }); setScale(1); }}
        onEnterDrawMode={() => setIsDrawingMode((prev) => !prev)}
        onZoomIn={() => setScale((prev) => Math.min(prev + 0.15, 3))}
        onZoomOut={() => setScale((prev) => Math.max(prev - 0.15, 0.15))}
      />

      {showTelemetryDashboard && (
        <TelemetryDashboard
          books={books}
          notes={notes}
          areas={areas}
          links={links}
          quotes={quotes}
          onClose={() => setShowTelemetryDashboard(false)}
          onTeleport={centerOnNode}
        />
      )}

      {selectedNodes.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 flex flex-col md:flex-row items-center gap-4 px-5 py-3 bg-[#0a0a0af5] border border-white/10 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl pointer-events-auto">
          {/* Status Label */}
          <div className="flex flex-col font-mono text-[9px] tracking-widest text-[#00aaff] border-r border-white/10 pr-4">
            <span className="font-bold">SELECTOR MATRIX ACTIVE</span>
            <span className="text-white/40 mt-0.5">[{selectedNodes.length} MODULES DETECTED]</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[9px] font-mono">
            {/* Color Palette Selector for notes/areas */}
            <div className="flex gap-1 items-center bg-black/40 px-2 py-1 rounded border border-white/5 h-6">
              <span className="text-white/40 mr-1.5">COLOR:</span>
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
                  onClick={() => handleBulkColor(theme.val)}
                  className="w-3.5 h-3.5 rounded-full border border-white/20 transition-transform hover:scale-125 cursor-pointer"
                  style={{ backgroundColor: theme.hex }}
                  title={`Apply ${theme.label} theme`}
                />
              ))}
            </div>

            {/* Grid Align Action */}
            <button
              type="button"
              onClick={handleBulkArrangeGrid}
              className="px-2.5 py-1.5 bg-white/5 border border-white/10 hover:border-[#00aaff] hover:bg-white/10 text-white rounded transition-all cursor-pointer flex items-center gap-1"
              title="Arrange selected books & notes in a grid"
            >
              <span>田</span> GRID_ALIGN
            </button>

            {/* Group into Zone Action */}
            <button
              type="button"
              onClick={handleBulkCreateZone}
              className="px-2.5 py-1.5 bg-white/5 border border-white/10 hover:border-green-500 hover:bg-white/10 text-white rounded transition-all cursor-pointer flex items-center gap-1"
              title="Create a new Category Zone around the selection"
            >
              <span>⏹</span> GROUP_ZONE
            </button>

            {/* Export Selection Action */}
            <button
              type="button"
              onClick={handleBulkExport}
              className="px-2.5 py-1.5 bg-white/5 border border-white/10 hover:border-[#a855f7] hover:bg-white/10 text-white rounded transition-all cursor-pointer flex items-center gap-1"
              title="Export selected notes & reviews to a unified Markdown document"
            >
              <span>↓</span> EXPORT_COMPILATION
            </button>

            {/* Delete Action */}
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-2.5 py-1.5 bg-red-950/40 border border-red-900/50 hover:border-red-500 hover:bg-red-900/40 text-red-400 rounded transition-all cursor-pointer flex items-center gap-1"
              title="Delete all selected items"
            >
              <span>✕</span> DELETE
            </button>

            <div className="h-4 w-px bg-white/10 mx-1" />

            {/* Clear Selection Action */}
            <button
              type="button"
              onClick={() => setSelectedNodes([])}
              className="px-2 py-1.5 text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              CLEAR
            </button>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed z-50 p-1.5 aero-panel bg-[#0a0a0af8] border border-white/10 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl pointer-events-auto"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-0.5 text-[10px] font-mono tracking-wider w-44">
            <button
              type="button"
              onClick={() => {
                handleCreateNote(contextMenu.canvasX, contextMenu.canvasY);
                setContextMenu(null);
              }}
              className="text-left text-gray-300 hover:text-[#00aaff] hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>+ CREATE NOTE</span>
              <span className="text-[7px] text-gray-500 font-bold">N</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingPlacement({ x: contextMenu.canvasX, y: contextMenu.canvasY });
                setShowSearchModal(true);
                setContextMenu(null);
              }}
              className="text-left text-gray-300 hover:text-[#00aaff] hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>+ CREATE BOOK</span>
              <span className="text-[7px] text-gray-500 font-bold">CMD+K</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDrawingMode(true);
                setContextMenu(null);
              }}
              className="text-left text-gray-300 hover:text-[#22c55e] hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>+ CREATE ZONE</span>
              <span className="text-[7px] text-gray-500 font-bold">DRAG</span>
            </button>
            <div className="h-px bg-white/10 my-0.5 mx-1" />
            <button
              type="button"
              onClick={() => {
                handleArrangeTimeline();
                setContextMenu(null);
              }}
              className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>ALIGN TIMELINE</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleTidyCanvas();
                setContextMenu(null);
              }}
              className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>TIDY WORKSPACE</span>
            </button>
            <div className="h-px bg-white/10 my-0.5 mx-1" />
            <button
              type="button"
              onClick={() => {
                setSnapToGrid((prev) => !prev);
                setContextMenu(null);
              }}
              className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>SNAP TO GRID</span>
              <span className="text-[7px] text-gray-500 font-bold">{snapToGrid ? "ON" : "OFF"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowGrid((prev) => !prev);
                setContextMenu(null);
              }}
              className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>SHOW GRID</span>
              <span className="text-[7px] text-gray-500 font-bold">{showGrid ? "ON" : "OFF"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPan({ x: 0, y: 0 });
                setScale(1);
                setContextMenu(null);
              }}
              className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>RESET VIEWPORT</span>
            </button>
          </div>
        </div>
      )}

      {showShortcutsHelp && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onClick={() => setShowShortcutsHelp(false)}
        >
          <div 
            className="aero-panel w-full max-w-lg mx-4 bg-[#0a0a0af5] border border-white/10 p-5 text-white flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="aero-header justify-between bg-white/5 border-b border-white/5 pb-2 mb-3">
              <div className="hud-text text-white flex items-center gap-2">
                <span>⌨️ SYSTEM_REFERENCE // CHEATSHEET</span>
              </div>
              <button 
                type="button" 
                onClick={() => setShowShortcutsHelp(false)}
                className="text-white/40 hover:text-white transition-colors text-xs leading-none p-1"
              >
                ✕
              </button>
            </div>

            {/* Scrollable cheatsheet content */}
            <div className="overflow-y-auto pr-1 text-xs space-y-4 leading-relaxed font-sans">
              
              {/* Category 1: Navigation */}
              <div>
                <h4 className="text-[#00aaff] font-semibold font-mono tracking-wider text-[10px] uppercase mb-1.5 border-b border-white/5 pb-1">
                  1. Camera & Navigation
                </h4>
                <div className="space-y-1.5 text-gray-300 font-mono text-[10px]">
                  <div className="flex justify-between items-center"><span className="text-gray-400">Pan Workspace</span><span className="text-white">Drag Empty Canvas</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400">Zoom Camera</span><span className="text-white">Mouse Scroll wheel</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400">Reset Viewport</span><span className="text-white">HOME button in Sidebar</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400">Snap View to Node</span><span className="text-white">Click FOCUS in Workspace Index</span></div>
                </div>
              </div>

              {/* Category 2: Gestures */}
              <div>
                <h4 className="text-[#22c55e] font-semibold font-mono tracking-wider text-[10px] uppercase mb-1.5 border-b border-white/5 pb-1">
                  2. Board Editing Gestures
                </h4>
                <div className="space-y-1.5 text-gray-300 font-mono text-[10px]">
                  <div className="flex justify-between items-center"><span className="text-gray-400">Move Modules</span><span className="text-white">Drag Book / Note Header</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400">Resize Note card</span><span className="text-white">Drag bottom-right corner (↘)</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400">Grid Snapping</span><span className="text-white">Toggled via SNAP TO GRID checkbox</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400">Spawn Zone (Area)</span><span className="text-white">Drag-draw box (Drawing Mode ON)</span></div>
                </div>
              </div>

              {/* Category 3: Mind-Map Connections */}
              <div>
                <h4 className="text-[#a855f7] font-semibold font-mono tracking-wider text-[10px] uppercase mb-1.5 border-b border-white/5 pb-1">
                  3. Connections & Edge Routing
                </h4>
                <div className="space-y-1.5 text-gray-300 font-mono text-[10px]">
                  <div className="flex justify-between items-center"><span className="text-gray-400">Create Connection</span><span className="text-white">Drag from card boundary connector dot</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400">Midpoint Controls HUD</span><span className="text-white">Hover cursor over link path line</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400">Classify Relation</span><span className="text-white">Click midpoint HUD style dot</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400">Toggle Arrowhead</span><span className="text-white">Click Arrow cycle button (— / ➡ / ↔)</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400">Modify Text Label</span><span className="text-white">Double-click label badge (Esc to abort)</span></div>
                </div>
              </div>

              {/* Category 4: Focus & Presentation Modes */}
              <div>
                <h4 className="text-[#eab308] font-semibold font-mono tracking-wider text-[10px] uppercase mb-1.5 border-b border-white/5 pb-1">
                  4. Advanced Modes & Filtering
                </h4>
                <div className="space-y-1.5 text-gray-300 font-mono text-[10px]">
                  <div className="flex justify-between items-center"><span className="text-gray-400">Command Console</span><span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] border border-white/10 text-white font-mono">Cmd/Ctrl + K</kbd></span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400">Isolate Node / Area</span><span className="text-white">Click Eye icon (👁) in Node/Area header</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400">Hashtag Filtering</span><span className="text-white">Click Tag in Sidebar hashtags cloud</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400">Slideshow Navigation</span><span className="text-white">Space / ➡ (Next), ⬅ (Prev), Esc (Exit)</span></div>
                </div>
              </div>

              {/* Category 5: Local File Sync */}
              <div>
                <h4 className="text-[#ef4444] font-semibold font-mono tracking-wider text-[10px] uppercase mb-1.5 border-b border-white/5 pb-1">
                  5. Local Notes Sync Engine
                </h4>
                <p className="text-[9px] text-gray-400 mb-1 leading-normal font-sans normal-case">
                  All board modifications are compiled to Obsidian-friendly Markdown files in real-time:
                </p>
                <div className="space-y-1.5 text-gray-300 font-mono text-[10px]">
                  <div className="flex justify-between items-center"><span className="text-gray-400">Book Reviews</span><span className="text-white">./reviews/*.md</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400">Index Notes</span><span className="text-white">./notes/*.md</span></div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="border-t border-white/5 mt-4 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShortcutsHelp(false)}
                className="aero-button secondary text-[9px] font-mono tracking-widest font-bold py-1.5 px-4 text-white hover:border-[#00aaff]/50"
              >
                CLOSE REFERENCE
              </button>
            </div>

          </div>
        </div>
      )}

      {selectedBook && (
        <ReviewModal
          book={selectedBook}
          quotes={quotes.filter((q) => q.book_id === selectedBook.id)}
          onClose={() => setSelectedBook(null)}
          onSave={handleUpdateBook}
          onExtractQuote={handleExtractQuote}
          onDelete={handleDeleteBook}
        />
      )}

      {/* Floating Workspace Minimap */}
      <div className={`transition-all duration-300 ${isPresentationMode ? "opacity-0 translate-y-full pointer-events-none" : ""}`}>
        <Minimap
          books={books}
          notes={notes}
          areas={areas}
          pan={pan}
          scale={scale}
          setPan={setPan}
        />
      </div>

      {activeDialog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md" 
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="aero-panel w-full max-w-sm mx-4 bg-[#0a0a0a] p-5 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="hud-text text-[#00aaff] mb-4 uppercase tracking-widest border-b border-white/10 pb-2">
              {activeDialog.type === "create-zone" && "System // Create Zone"}
              {activeDialog.type === "confirm-delete-book" && "System // Decommission Book"}
              {activeDialog.type === "confirm-delete-area" && "System // Decommission Zone"}
              {activeDialog.type === "confirm-delete-note" && "System // Decommission Note"}
            </div>
            
            {activeDialog.type === "create-zone" && (
              <div className="space-y-4">
                <p className="text-xs text-gray-300">Enter designation name for the new categorization zone:</p>
                <input
                  id="dialog-zone-name-input"
                  type="text"
                  defaultValue="NEW ZONE"
                  className="aero-input py-1.5 text-xs font-mono uppercase tracking-wider"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const name = e.target.value.trim() || "NEW ZONE";
                      createArea({
                        name,
                        x_pos: activeDialog.tempBox.x,
                        y_pos: activeDialog.tempBox.y,
                        width: activeDialog.tempBox.w,
                        height: activeDialog.tempBox.h,
                      });
                      setTempBox(null);
                      setIsDrawingMode(false);
                      setActiveDialog(null);
                    }
                    if (e.key === "Escape") {
                      setTempBox(null);
                      setIsDrawingMode(false);
                      setActiveDialog(null);
                    }
                  }}
                />
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTempBox(null);
                      setIsDrawingMode(false);
                      setActiveDialog(null);
                    }}
                    className="aero-button secondary text-[10px] py-1 px-3"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("dialog-zone-name-input");
                      const name = input ? input.value.trim() : "NEW ZONE";
                      createArea({
                        name,
                        x_pos: activeDialog.tempBox.x,
                        y_pos: activeDialog.tempBox.y,
                        width: activeDialog.tempBox.w,
                        height: activeDialog.tempBox.h,
                      });
                      setTempBox(null);
                      setIsDrawingMode(false);
                      setActiveDialog(null);
                    }}
                    className="aero-button bg-[#00aaff] text-black text-[10px] py-1 px-3 font-semibold"
                  >
                    CREATE
                  </button>
                </div>
              </div>
            )}

            {(activeDialog.type === "confirm-delete-book" || activeDialog.type === "confirm-delete-area" || activeDialog.type === "confirm-delete-note") && (
              <div className="space-y-4">
                <p className="text-xs text-gray-300 leading-relaxed">
                  {activeDialog.type === "confirm-delete-book"
                    ? "Are you sure you want to decommission this book module? All associated quote fragments will be permanently purged."
                    : activeDialog.type === "confirm-delete-note"
                    ? "Are you sure you want to decommission this index card note?"
                    : "Are you sure you want to decommission this categorization zone?"}
                </p>
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveDialog(null)}
                    className="aero-button secondary text-[10px] py-1 px-3"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (activeDialog.type === "confirm-delete-book") {
                        try {
                          await fetch(`/api/books?id=${activeDialog.bookId}`, { method: "DELETE" });
                          setBooks((prev) => prev.filter((b) => b.id !== activeDialog.bookId));
                          setQuotes((prev) => prev.filter((q) => q.book_id !== activeDialog.bookId));
                          setSelectedBook(null);
                        } catch (err) {
                          console.error(err);
                        }
                      } else if (activeDialog.type === "confirm-delete-note") {
                        try {
                          await fetch(`/api/notes?id=${activeDialog.noteId}`, { method: "DELETE" });
                          setNotes((prev) => prev.filter((n) => n.id !== activeDialog.noteId));
                        } catch (err) {
                          console.error(err);
                        }
                      } else {
                        try {
                          await fetch(`/api/areas?id=${activeDialog.areaId}`, { method: "DELETE" });
                          setAreas((prev) => prev.filter((a) => a.id !== activeDialog.areaId));
                        } catch (err) {
                          console.error(err);
                        }
                      }
                      setActiveDialog(null);
                    }}
                    className="aero-button bg-red-900/80 text-white hover:bg-red-800 text-[10px] py-1 px-3 font-semibold"
                  >
                    DECOMMISSION
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {isPresentationMode && presets.length > 0 && (() => {
        const currentPreset = presets[currentPresentationIndex];
        return (
          <div
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-30 aero-panel bg-black/90 text-white flex items-center gap-5 px-6 py-3 border border-[#00aaff]/40 shadow-[0_0_25px_rgba(0,170,255,0.35)] rounded-xl backdrop-blur-xl pointer-events-auto"
            onPointerDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => jumpToSlide(currentPresentationIndex - 1)}
                className="aero-button secondary text-xs py-1 px-3 border border-white/10 hover:border-[#00aaff]/50"
              >
                ◀ PREV
              </button>
              
              <div className="flex flex-col items-center px-4 border-l border-r border-white/10 min-w-[200px]">
                <span className="text-[#00aaff] font-mono text-[10px] font-bold tracking-widest uppercase">
                  PRESENTATION MODE
                </span>
                <span className="text-white text-xs font-semibold tracking-wide truncate max-w-[180px] mt-0.5">
                  {currentPreset?.name || "UNNAMED VIEWPORT"}
                </span>
                <span className="text-gray-500 font-mono text-[8px] mt-0.5">
                  STEP {currentPresentationIndex + 1} OF {presets.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => jumpToSlide(currentPresentationIndex + 1)}
                className="aero-button secondary text-xs py-1 px-3 border border-white/10 hover:border-[#00aaff]/50"
              >
                NEXT ▶
              </button>
            </div>
            
            <button
              type="button"
              onClick={() => setIsPresentationMode(false)}
              className="aero-button bg-red-950/40 text-red-400 hover:bg-red-900/60 border border-red-500/30 text-[10px] py-1 px-3 transition-all"
            >
              EXIT
            </button>
          </div>
        );
      })()}
    </div>
  );
}
