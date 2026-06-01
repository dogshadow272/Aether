"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import BookNode from "./BookNode";
import QuoteNode from "./QuoteNode";
import SearchModal from "./SearchModal";
import ReviewModal from "./ReviewModal";
import AreaNode from "./AreaNode";
import NoteNode from "./NoteNode";

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
  
  const panRef = useRef(pan);
  panRef.current = pan;
  const scaleRef = useRef(scale);
  const presetsRef = useRef(presets);
  presetsRef.current = presets;
  scaleRef.current = scale;
  const [showTimeline, setShowTimeline] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [tempBox, setTempBox] = useState(null);
  const [activeDialog, setActiveDialog] = useState(null);

  // Custom connection drawing states
  const [connectionSource, setConnectionSource] = useState(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState({ x: 0, y: 0 });
  const [focusNode, setFocusNode] = useState(null); // { id: string, type: 'book' | 'note' | 'quote' }

  const handleToggleFocus = (id, type) => {
    setFocusNode((prev) => {
      if (prev && prev.id === id && prev.type === type) {
        return null;
      }
      return { id, type };
    });
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
  const connectionSourceRef = useRef(connectionSource);
  connectionSourceRef.current = connectionSource;

  const dragRef = useRef(null);

  const canvasRef = useRef(null);
  const booksRef = useRef(books);
  booksRef.current = books;
  const quotesRef = useRef(quotes);
  quotesRef.current = quotes;
  const areasRef = useRef(areas);
  areasRef.current = areas;
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const linksRef = useRef(links);
  linksRef.current = links;

  useEffect(() => {
    fetchBooks();
    fetchAreas();
    fetchNotes();
    fetchLinks();
    fetchPresets();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await fetch("/api/books");
      const data = await res.json();
      setBooks(data);
      const allQuotes = data.flatMap((b) => b.quotes || []);
      setQuotes(allQuotes);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAreas = async () => {
    try {
      const res = await fetch("/api/areas");
      const data = await res.json();
      setAreas(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLinks = async () => {
    try {
      const res = await fetch("/api/links");
      const data = await res.json();
      setLinks(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPresets = async () => {
    try {
      const res = await fetch("/api/presets");
      const data = await res.json();
      setPresets(data);
    } catch (err) {
      console.error(err);
    }
  };

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
      const b = booksRef.current.find(book => book.id === id);
      return b ? getBookMatch(b) : false;
    } else if (type === "note") {
      const n = notesRef.current.find(note => note.id === id);
      return n ? getNoteMatch(n) : false;
    }
    return false;
  };

  const handleAddBook = async (bookData) => {
    try {
      const widthFactor = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
      const heightFactor = typeof window !== "undefined" ? window.innerHeight / 2 : 400;
      const x_pos = (widthFactor - pan.x) / scale - 96;
      const y_pos = (heightFactor - pan.y) / scale - 150;

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

  const handleCreateNote = async () => {
    const currentPan = panRef.current;
    const currentScale = scaleRef.current;
    const widthFactor = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
    const heightFactor = typeof window !== "undefined" ? window.innerHeight / 2 : 400;
    const x_pos = (widthFactor - currentPan.x) / currentScale - 110;
    const y_pos = (heightFactor - currentPan.y) / currentScale - 75;
    
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

  // Pointer drag/pan handlers
  const handleCanvasPointerDown = (e) => {
    if (focusNode) setFocusNode(null);
    if (isDrawingMode) {
      const rect = canvasRef.current.getBoundingClientRect();
      const startX = (e.clientX - rect.left - pan.x) / scale;
      const startY = (e.clientY - rect.top - pan.y) / scale;
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

    if (drag.type === "drawing") {
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
          if (connectionSourceRef.current) {
            createLink(connectionSourceRef.current, { id: drag.id, type: "note" });
            setConnectionSource(null);
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
        </div>

        {/* Reading Stats Dashboard */}
        {books.length > 0 && (() => {
          const toRead = books.filter(b => b.status === "To Read").length;
          const reading = books.filter(b => b.status === "Reading").length;
          const completed = books.filter(b => b.status === "Completed").length;
          const total = books.length;
          const rated = books.filter(b => b.rating > 0);
          const avgRating = rated.length > 0 ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1) : "—";
          return (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-[9px] hud-text font-bold text-white mb-2">LIBRARY TELEMETRY</div>
              
              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden flex mb-2">
                {completed > 0 && (
                  <div 
                    className="h-full bg-[#22c55e] transition-all duration-700" 
                    style={{ width: `${(completed / total) * 100}%` }}
                    title={`Completed: ${completed}`}
                  />
                )}
                {reading > 0 && (
                  <div 
                    className="h-full bg-[#00aaff] transition-all duration-700" 
                    style={{ width: `${(reading / total) * 100}%` }}
                    title={`Reading: ${reading}`}
                  />
                )}
                {toRead > 0 && (
                  <div 
                    className="h-full bg-white/15 transition-all duration-700" 
                    style={{ width: `${(toRead / total) * 100}%` }}
                    title={`To Read: ${toRead}`}
                  />
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-1 text-center">
                <div className="bg-white/5 rounded px-1 py-1">
                  <div className="text-[10px] font-bold text-[#22c55e]">{completed}</div>
                  <div className="text-[7px] hud-text opacity-50">DONE</div>
                </div>
                <div className="bg-white/5 rounded px-1 py-1">
                  <div className="text-[10px] font-bold text-[#00aaff]">{reading}</div>
                  <div className="text-[7px] hud-text opacity-50">ACTIVE</div>
                </div>
                <div className="bg-white/5 rounded px-1 py-1">
                  <div className="text-[10px] font-bold text-gray-400">{toRead}</div>
                  <div className="text-[7px] hud-text opacity-50">QUEUE</div>
                </div>
              </div>

              {/* Average rating */}
              <div className="flex justify-between items-center mt-1.5 text-[8px] hud-text opacity-40">
                <span>AVG RATING: {avgRating}</span>
                <span>MODULES: {total}</span>
              </div>
            </div>
          );
        })()}

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
                isFocused={focusNode && focusNode.id === area.id && focusNode.type === "area"}
                onToggleFocus={() => handleToggleFocus(area.id, "area")}
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
                onToggleFocus={() => handleToggleFocus(note.id, "note")}
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
            const pathData = getSmartBezierPath(start, end);
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
                  className="transition-all hover:stroke-2 cursor-pointer"
                  style={{ pointerEvents: "auto" }}
                />
                
                <foreignObject
                  x={midX - 120}
                  y={midY - 14}
                  width={240}
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
                onToggleFocus={() => handleToggleFocus(book.id, "book")}
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
