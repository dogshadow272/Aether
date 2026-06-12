"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import BookNode from "./BookNode";
import MovieNode from "./MovieNode";
import QuoteNode from "./QuoteNode";
import SearchModal from "./SearchModal";
import ReviewModal from "./ReviewModal";
import AreaNode from "./AreaNode";
import NoteNode from "./NoteNode";
import PdfNode from "./PdfNode";
import ImageNode from "./ImageNode";
import { initDb, dbClient } from "@/lib/dbClient";

const getHexWithOpacity = (hex, opacity = 1) => {
  if (!hex) return `rgba(0, 170, 255, ${opacity})`;
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

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
function Minimap({ books, movies = [], notes, areas, pdfs = [], images = [], pan, scale, setPan }) {
  const minimapRef = useRef(null);

  const getCanvasBounds = () => {
    let minX = -1000;
    let maxX = 2000;
    let minY = -1000;
    let maxY = 2000;

    const allItems = [
      ...books.map(b => ({ x: b.x_pos, y: b.y_pos, w: 192, h: 300 })),
      ...movies.map(m => ({ x: m.x_pos, y: m.y_pos, w: 192, h: 300 })),
      ...notes.map(n => ({ x: n.x_pos, y: n.y_pos, w: n.width || 220, h: n.height || 150 })),
      ...areas.map(a => ({ x: a.x_pos, y: a.y_pos, w: a.width || 200, h: a.height || 200 })),
      ...pdfs.map(p => ({ x: p.x_pos, y: p.y_pos, w: p.width || 450, h: p.height || 600 })),
      ...images.map(img => ({ x: img.x_pos, y: img.y_pos, w: img.width || 300, h: img.height || 300 }))
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

        {movies.map((m) => (
          <div
            key={m.id}
            className="absolute bg-[#a855f7]/50 rounded-sm border border-[#a855f7]/80"
            style={{
              left: toMinimapX(m.x_pos),
              top: toMinimapY(m.y_pos),
              width: Math.max((192 / bounds.width) * mapWidth, 3),
              height: Math.max((300 / bounds.height) * mapHeight, 4),
            }}
          />
        ))}

        {pdfs.map((p) => (
          <div
            key={p.id}
            className="absolute bg-[#eab308]/50 rounded-sm border border-[#eab308]/80"
            style={{
              left: toMinimapX(p.x_pos),
              top: toMinimapY(p.y_pos),
              width: Math.max(((p.width || 450) / bounds.width) * mapWidth, 3),
              height: Math.max(((p.height || 600) / bounds.height) * mapHeight, 4),
            }}
          />
        ))}

        {images.map((img) => (
          <div
            key={img.id}
            className="absolute bg-[#06b6d4]/50 rounded-sm border border-[#06b6d4]/80"
            style={{
              left: toMinimapX(img.x_pos),
              top: toMinimapY(img.y_pos),
              width: Math.max(((img.width || 300) / bounds.width) * mapWidth, 3),
              height: Math.max(((img.height || 300) / bounds.height) * mapHeight, 3),
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

// Quadratic Bezier Smoothing for Freehand Drawing/Handwriting
const getSmoothSvgPath = (points) => {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${Math.round(points[0].x)} ${Math.round(points[0].y)}`;
  
  let path = `M ${Math.round(points[0].x)} ${Math.round(points[0].y)}`;
  
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    path += ` Q ${Math.round(points[i].x)} ${Math.round(points[i].y)}, ${Math.round(xc)} ${Math.round(yc)}`;
  }
  
  const lastPoint = points[points.length - 1];
  path += ` L ${Math.round(lastPoint.x)} ${Math.round(lastPoint.y)}`;
  return path;
};

export default function Canvas() {
  const [books, setBooks] = useState([]);
  const [movies, setMovies] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [areas, setAreas] = useState([]);
  const [notes, setNotes] = useState([]);
  const [links, setLinks] = useState([]);
  const [editingLinkId, setEditingLinkId] = useState(null);
  const [presets, setPresets] = useState([]);
  const [images, setImages] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [openPdfSidebarId, setOpenPdfSidebarId] = useState(null);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [currentPresentationIndex, setCurrentPresentationIndex] = useState(0);
  const [isPresentationAutoPlay, setIsPresentationAutoPlay] = useState(false);
  const [presentationInterval, setPresentationInterval] = useState(4000);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isFocusing, setIsFocusing] = useState(false);
  const [showIndex, setShowIndex] = useState(false);
  const [canvasFilter, setCanvasFilter] = useState("");
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [teleportHighlightNodeId, setTeleportHighlightNodeId] = useState(null);
  const [connectionSource, setConnectionSource] = useState(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState({ x: 0, y: 0 });
  const [focusNode, setFocusNode] = useState(null); // { id: string, type: 'book' | 'note' | 'quote' }
  const [selectedNodes, setSelectedNodes] = useState([]); // Array of { id, type }
  const [tempLassoBox, setTempLassoBox] = useState(null); // { x, y, w, h }

  const [pdfs, setPdfs] = useState([]);
  const [isDbReady, setIsDbReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState(null);
  const [newlyCreatedNoteId, setNewlyCreatedNoteId] = useState(null);
  
  const panRef = useRef(pan);
  const scaleRef = useRef(scale);
  const presetsRef = useRef(presets);
  const imagesRef = useRef(images);

  const activePointersRef = useRef(new Map());
  const isGestureActiveRef = useRef(false);
  const gestureStartDistRef = useRef(0);
  const gestureStartScaleRef = useRef(1);
  const gestureStartPanRef = useRef({ x: 0, y: 0 });
  const gestureStartCenterRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    panRef.current = pan;
    scaleRef.current = scale;
    presetsRef.current = presets;
    imagesRef.current = images;
  }, [pan, scale, presets, images]);
  const [showConnections, setShowConnections] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showDrawings, setShowDrawings] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [tempBox, setTempBox] = useState(null);
  const [activeDialog, setActiveDialog] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [pendingPlacement, setPendingPlacement] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }
  const [pinnedNodeIds, setPinnedNodeIds] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("apiron_pinned_nodes") || localStorage.getItem("aether_pinned_nodes");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });
  const pinnedNodeIdsRef = useRef(pinnedNodeIds);

  useEffect(() => {
    pinnedNodeIdsRef.current = pinnedNodeIds;
    localStorage.setItem("apiron_pinned_nodes", JSON.stringify([...pinnedNodeIds]));
  }, [pinnedNodeIds]);
  const [hoveredNode, setHoveredNode] = useState(null); // { id, type }
  const [activeLinkMenuId, setActiveLinkMenuId] = useState(null);
  const [showLinkCategoriesPanel, setShowLinkCategoriesPanel] = useState(false);
  const [showAutoLayoutMenu, setShowAutoLayoutMenu] = useState(false);
  const [showFiltersDeck, setShowFiltersDeck] = useState(false);
  const [filters, setFilters] = useState({
    showBooks: true,
    showMovies: true,
    showNotes: true,
    showPdfs: true,
    showAreas: true,
    showQuotes: true,
    showImages: true,
    statusToRead: true,
    statusReading: true,
    statusCompleted: true,
    minRating: 0,
    showOnlyOrphans: false
  });
  const [isHandwritingMode, setIsHandwritingMode] = useState(false);
  const [brushMode, setBrushMode] = useState("draw"); // 'draw' | 'erase'
  const [isLassoMode, setIsLassoMode] = useState(false);
  const [drawColor, setDrawColor] = useState("#00aaff");
  const [drawWidth, setDrawWidth] = useState(4);
  const [drawings, setDrawings] = useState([]);
  const [hoveredDrawingId, setHoveredDrawingId] = useState(null);
  const [isZooming, setIsZooming] = useState(false);
  const isZoomingRef = useRef(false);
  const zoomTimeoutRef = useRef(null);

  const triggerZoomActive = useCallback(() => {
    if (!isZoomingRef.current) {
      isZoomingRef.current = true;
      setIsZooming(true);
    }
    clearTimeout(zoomTimeoutRef.current);
    zoomTimeoutRef.current = setTimeout(() => {
      isZoomingRef.current = false;
      setIsZooming(false);
    }, 300);
  }, []);
  const [currentStroke, setCurrentStroke] = useState("");
  const isDrawingStrokeRef = useRef(false);
  const strokePointsRef = useRef([]);
  const drawingsRef = useRef([]);
  const [linkTypeConfigs, setLinkTypeConfigs] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("apiron_link_type_configs") || localStorage.getItem("aether_link_type_configs");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse link type configs:", e);
        }
      }
    }
    return {
      default: { label: "Associate", color: "#00aaff" },
      support: { label: "Support", color: "#22c55e" },
      contrast: { label: "Contrast", color: "#ef4444" },
      question: { label: "Question", color: "#eab308" }
    };
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("apiron_link_type_configs", JSON.stringify(linkTypeConfigs));
    }
  }, [linkTypeConfigs]);

  const connectionSourceRef = useRef(connectionSource);
  const dragRef = useRef(null);
  const canvasRef = useRef(null);
  const booksRef = useRef(books);
  const moviesRef = useRef(movies);
  const quotesRef = useRef(quotes);
  const areasRef = useRef(areas);
  const notesRef = useRef(notes);
  const linksRef = useRef(links);
  const selectedNodesRef = useRef(selectedNodes);
  const pdfsRef = useRef(pdfs);

  // Undo/Redo System Stacks and Helpers
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const tempSnapshotRef = useRef(null);

  const saveStateBeforeMutation = useCallback(() => {
    const snapshot = {
      books: JSON.parse(JSON.stringify(booksRef.current)),
      movies: JSON.parse(JSON.stringify(moviesRef.current)),
      quotes: JSON.parse(JSON.stringify(quotesRef.current)),
      areas: JSON.parse(JSON.stringify(areasRef.current)),
      notes: JSON.parse(JSON.stringify(notesRef.current)),
      links: JSON.parse(JSON.stringify(linksRef.current)),
      presets: JSON.parse(JSON.stringify(presetsRef.current)),
      pdfs: JSON.parse(JSON.stringify(pdfsRef.current)),
      drawings: JSON.parse(JSON.stringify(drawingsRef.current))
    };
    undoStackRef.current.push(snapshot);
    if (undoStackRef.current.length > 50) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  }, []);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const centerOnNode = useCallback((nodeId, nodeType) => {
    let node;
    let w = 220;
    let h = 150;
    if (nodeType === "book") {
      node = booksRef.current.find(b => b.id === nodeId);
      if (!node) return;
      w = 192;
      h = node.cover_url ? 320 : 160;
    } else if (nodeType === "note") {
      node = notesRef.current.find(n => n.id === nodeId);
      if (!node) return;
      w = note.width || 220;
      h = note.height || 150;
    } else if (nodeType === "area") {
      node = areasRef.current.find(a => a.id === nodeId);
      if (!node) return;
      w = node.width || 200;
      h = node.height || 200;
    } else if (nodeType === "pdf") {
      node = pdfsRef.current.find(p => p.id === nodeId);
      if (!node) return;
      w = node.width || 450;
      h = node.height || 600;
    } else if (nodeType === "image") {
      node = imagesRef.current.find(img => img.id === nodeId);
      if (!node) return;
      w = node.width || 300;
      h = node.height || 300;
    } else if (nodeType === "movie") {
      node = moviesRef.current.find(m => m.id === nodeId);
      if (!node) return;
      w = 192;
      h = 300;
    } else if (nodeType === "quote") {
      node = quotesRef.current.find(q => q.id === nodeId);
      if (!node) return;
      w = 140;
      h = 80;
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
    }, 3000);
  }, []);



  const handleToggleFocus = useCallback((id, type, shouldZoom = false) => {
    if (shouldZoom) {
      setTimeout(() => centerOnNode(id, type), 50);
    }
  }, [centerOnNode]);

  const handleNodeToggleFocus = useCallback((id, type, zoom) => {
    handleToggleFocus(id, type, zoom);
  }, [handleToggleFocus]);

  const handleNodeInteract = useCallback((id, type, zoom = true) => {
    setSelectedNodes([{ id, type }]);
    if (zoom) {
      centerOnNode(id, type);
    }
  }, [centerOnNode]);

  const pdfLinkedNotesMap = useMemo(() => {
    const map = {};
    pdfs.forEach(pdf => {
      map[pdf.id] = notes.filter(note => 
        links.some(link => 
          (link.source_id === pdf.id && link.target_id === note.id) ||
          (link.target_id === pdf.id && link.source_id === note.id)
        )
      );
    });
    return map;
  }, [notes, links, pdfs]);

  const handleLocateNote = useCallback((noteId) => {
    centerOnNode(noteId, "note");
  }, [centerOnNode]);



  const handleBulkColor = async (colorVal) => {
    saveStateBeforeMutation();
    const notesToColor = selectedNodes.filter(n => n.type === "note");
    const areasToColor = selectedNodes.filter(n => n.type === "area");

    setNotes(prev => prev.map(n => notesToColor.some(sel => sel.id === n.id) ? { ...n, color: colorVal } : n));
    setAreas(prev => prev.map(a => areasToColor.some(sel => sel.id === a.id) ? { ...a, color: colorVal } : a));
    
    const promises = [
      ...notesToColor.map(sel => {
        const note = notesRef.current.find(n => n.id === sel.id);
        if (!note) return null;
        return fetch("/api/notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...note, color: colorVal })
        });
      }),
      ...areasToColor.map(sel => {
        const area = areasRef.current.find(a => a.id === sel.id);
        if (!area) return null;
        return fetch("/api/areas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...area, color: colorVal })
        });
      })
    ].filter(Boolean);

    try {
      await Promise.all(promises);
      showToast("BATCH COLOR THEME APPLIED TO SELECTION");
    } catch (err) {
      console.error("Bulk color update failed:", err);
    }
  };

  const handleBulkArrangeGrid = async () => {
    saveStateBeforeMutation();
    const booksToArrange = selectedNodes.filter(n => n.type === "book");
    const moviesToArrange = selectedNodes.filter(n => n.type === "movie");
    const notesToArrange = selectedNodes.filter(n => n.type === "note");
    const pdfsToArrange = selectedNodes.filter(n => n.type === "pdf");
    const imagesToArrange = selectedNodes.filter(n => n.type === "image");
    const totalToArrange = [...booksToArrange, ...moviesToArrange, ...notesToArrange, ...pdfsToArrange, ...imagesToArrange];

    if (totalToArrange.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;

    totalToArrange.forEach(sel => {
      const item = sel.type === "book"
        ? booksRef.current.find(b => b.id === sel.id)
        : sel.type === "movie"
        ? moviesRef.current.find(m => m.id === sel.id)
        : sel.type === "pdf"
        ? pdfsRef.current.find(p => p.id === sel.id)
        : sel.type === "image"
        ? imagesRef.current.find(img => img.id === sel.id)
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
    const hSpacing = 280;
    const vSpacing = 380;
    const batch = { books: [], notes: [], areas: [], quotes: [], pdfs: [], images: [], movies: [], movie_quotes: [] };

    totalToArrange.forEach((sel, index) => {
      const r = Math.floor(index / cols);
      const c = index % cols;
      const targetX = Math.round((minX + c * hSpacing) / 20) * 20;
      const targetY = Math.round((minY + r * vSpacing) / 20) * 20;

      if (sel.type === "book") {
        const book = booksRef.current.find(b => b.id === sel.id);
        if (book) {
          setBooks(prev => prev.map(b => b.id === book.id ? { ...b, x_pos: targetX, y_pos: targetY } : b));
          batch.books.push({ id: book.id, x_pos: targetX, y_pos: targetY });
        }
      } else if (sel.type === "movie") {
        const movie = moviesRef.current.find(m => m.id === sel.id);
        if (movie) {
          setMovies(prev => prev.map(m => m.id === movie.id ? { ...m, x_pos: targetX, y_pos: targetY } : m));
          batch.movies.push({ id: movie.id, x_pos: targetX, y_pos: targetY });
        }
      } else if (sel.type === "note") {
        const note = notesRef.current.find(n => n.id === sel.id);
        if (note) {
          setNotes(prev => prev.map(n => n.id === note.id ? { ...n, x_pos: targetX, y_pos: targetY } : n));
          batch.notes.push({ id: note.id, x_pos: targetX, y_pos: targetY, width: note.width || 220, height: note.height || 150 });
        }
      } else if (sel.type === "pdf") {
        const pdf = pdfsRef.current.find(p => p.id === sel.id);
        if (pdf) {
          setPdfs(prev => prev.map(p => p.id === pdf.id ? { ...p, x_pos: targetX, y_pos: targetY } : p));
          batch.pdfs.push({ id: pdf.id, x_pos: targetX, y_pos: targetY, width: pdf.width || 450, height: pdf.height || 600 });
        }
      } else if (sel.type === "image") {
        const image = imagesRef.current.find(img => img.id === sel.id);
        if (image) {
          setImages(prev => prev.map(img => img.id === image.id ? { ...img, x_pos: targetX, y_pos: targetY } : img));
          batch.images.push({ id: image.id, x_pos: targetX, y_pos: targetY, width: image.width || 300, height: image.height || 300 });
        }
      }
    });

    if (isDbReady) {
      try {
        batch.movies?.forEach((m) => dbClient.run("UPDATE movies SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", m));
        batch.books?.forEach((b) => dbClient.run("UPDATE books SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", b));
        batch.notes?.forEach((n) => dbClient.run("UPDATE notes SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", n));
        batch.pdfs?.forEach((p) => dbClient.run("UPDATE pdfs SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", p));
        batch.images?.forEach((img) => dbClient.run("UPDATE images SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", img));
      } catch (err) {
        console.error("Local bulk arrange grid write error:", err);
      }
    }

    showToast("GRID LAYOUT ALIGNMENT COMPLETED");

    fetch("/api/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    }).catch((err) => console.error("Bulk grid arrange failed to sync:", err));
  };

  const handleBulkArrangeCircle = async () => {
    saveStateBeforeMutation();
    const booksToArrange = selectedNodes.filter(n => n.type === "book");
    const moviesToArrange = selectedNodes.filter(n => n.type === "movie");
    const notesToArrange = selectedNodes.filter(n => n.type === "note");
    const pdfsToArrange = selectedNodes.filter(n => n.type === "pdf");
    const imagesToArrange = selectedNodes.filter(n => n.type === "image");
    const totalToArrange = [...booksToArrange, ...moviesToArrange, ...notesToArrange, ...pdfsToArrange, ...imagesToArrange];

    if (totalToArrange.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    totalToArrange.forEach(sel => {
      const item = sel.type === "book"
        ? booksRef.current.find(b => b.id === sel.id)
        : sel.type === "movie"
        ? moviesRef.current.find(m => m.id === sel.id)
        : sel.type === "pdf"
        ? pdfsRef.current.find(p => p.id === sel.id)
        : sel.type === "image"
        ? imagesRef.current.find(img => img.id === sel.id)
        : notesRef.current.find(n => n.id === sel.id);
      if (item) {
        if (item.x_pos < minX) minX = item.x_pos;
        if (item.x_pos > maxX) maxX = item.x_pos;
        if (item.y_pos < minY) minY = item.y_pos;
        if (item.y_pos > maxY) maxY = item.y_pos;
      }
    });

    let centerX = 500;
    let centerY = 500;

    if (minX !== Infinity && maxX !== -Infinity && minY !== Infinity && maxY !== -Infinity) {
      centerX = (minX + maxX) / 2;
      centerY = (minY + maxY) / 2;
    }

    const radius = Math.max(250, totalToArrange.length * 60);
    const angleStep = (2 * Math.PI) / totalToArrange.length;
    const batch = { books: [], notes: [], areas: [], quotes: [], pdfs: [], images: [], movies: [], movie_quotes: [] };

    totalToArrange.forEach((sel, index) => {
      const angle = index * angleStep;
      const targetX = Math.round((centerX + Math.cos(angle) * radius) / 20) * 20;
      const targetY = Math.round((centerY + Math.sin(angle) * radius) / 20) * 20;

      if (sel.type === "book") {
        const book = booksRef.current.find(b => b.id === sel.id);
        if (book) {
          setBooks(prev => prev.map(b => b.id === book.id ? { ...b, x_pos: targetX, y_pos: targetY } : b));
          batch.books.push({ id: book.id, x_pos: targetX, y_pos: targetY });
        }
      } else if (sel.type === "movie") {
        const movie = moviesRef.current.find(m => m.id === sel.id);
        if (movie) {
          setMovies(prev => prev.map(m => m.id === movie.id ? { ...m, x_pos: targetX, y_pos: targetY } : m));
          batch.movies.push({ id: movie.id, x_pos: targetX, y_pos: targetY });
        }
      } else if (sel.type === "note") {
        const note = notesRef.current.find(n => n.id === sel.id);
        if (note) {
          setNotes(prev => prev.map(n => n.id === note.id ? { ...n, x_pos: targetX, y_pos: targetY } : n));
          batch.notes.push({ id: note.id, x_pos: targetX, y_pos: targetY, width: note.width || 220, height: note.height || 150 });
        }
      } else if (sel.type === "pdf") {
        const pdf = pdfsRef.current.find(p => p.id === sel.id);
        if (pdf) {
          setPdfs(prev => prev.map(p => p.id === pdf.id ? { ...p, x_pos: targetX, y_pos: targetY } : p));
          batch.pdfs.push({ id: pdf.id, x_pos: targetX, y_pos: targetY, width: pdf.width || 450, height: pdf.height || 600 });
        }
      } else if (sel.type === "image") {
        const image = imagesRef.current.find(img => img.id === sel.id);
        if (image) {
          setImages(prev => prev.map(img => img.id === image.id ? { ...img, x_pos: targetX, y_pos: targetY } : img));
          batch.images.push({ id: image.id, x_pos: targetX, y_pos: targetY, width: image.width || 300, height: image.height || 300 });
        }
      }
    });

    if (isDbReady) {
      try {
        batch.movies?.forEach((m) => dbClient.run("UPDATE movies SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", m));
        batch.books?.forEach((b) => dbClient.run("UPDATE books SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", b));
        batch.notes?.forEach((n) => dbClient.run("UPDATE notes SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", n));
        batch.pdfs?.forEach((p) => dbClient.run("UPDATE pdfs SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", p));
        batch.images?.forEach((img) => dbClient.run("UPDATE images SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", img));
      } catch (err) {
        console.error("Local bulk arrange circle write error:", err);
      }
    }

    showToast("RADIAL MIND-MAP ALIGNMENT COMPLETED");

    fetch("/api/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    }).catch((err) => console.error("Bulk circle arrange failed to sync:", err));
  };

  const handleBulkArrangeHorizontal = async () => {
    saveStateBeforeMutation();
    const booksToArrange = selectedNodes.filter(n => n.type === "book");
    const moviesToArrange = selectedNodes.filter(n => n.type === "movie");
    const notesToArrange = selectedNodes.filter(n => n.type === "note");
    const pdfsToArrange = selectedNodes.filter(n => n.type === "pdf");
    const imagesToArrange = selectedNodes.filter(n => n.type === "image");
    const totalToArrange = [...booksToArrange, ...moviesToArrange, ...notesToArrange, ...pdfsToArrange, ...imagesToArrange];

    if (totalToArrange.length === 0) return;

    let totalY = 0;
    let count = 0;
    const itemsWithCoords = [];

    totalToArrange.forEach(sel => {
      const item = sel.type === "book"
        ? booksRef.current.find(b => b.id === sel.id)
        : sel.type === "movie"
        ? moviesRef.current.find(m => m.id === sel.id)
        : sel.type === "pdf"
        ? pdfsRef.current.find(p => p.id === sel.id)
        : sel.type === "image"
        ? imagesRef.current.find(img => img.id === sel.id)
        : notesRef.current.find(n => n.id === sel.id);
      if (item) {
        totalY += item.y_pos;
        count++;
        itemsWithCoords.push({ sel, x: item.x_pos, item });
      }
    });

    if (count === 0) return;

    const baselineY = Math.round((totalY / count) / 20) * 20;
    itemsWithCoords.sort((a, b) => a.x - b.x);
    const minX = itemsWithCoords[0].x;

    const spacing = 280;
    const batch = { books: [], notes: [], areas: [], quotes: [], pdfs: [], images: [], movies: [], movie_quotes: [] };

    itemsWithCoords.forEach((entry, index) => {
      const targetX = Math.round((minX + index * spacing) / 20) * 20;
      const targetY = baselineY;

      if (entry.sel.type === "book") {
        setBooks(prev => prev.map(b => b.id === entry.item.id ? { ...b, x_pos: targetX, y_pos: targetY } : b));
        batch.books.push({ id: entry.item.id, x_pos: targetX, y_pos: targetY });
      } else if (entry.sel.type === "movie") {
        setMovies(prev => prev.map(m => m.id === entry.item.id ? { ...m, x_pos: targetX, y_pos: targetY } : m));
        batch.movies.push({ id: entry.item.id, x_pos: targetX, y_pos: targetY });
      } else if (entry.sel.type === "note") {
        setNotes(prev => prev.map(n => n.id === entry.item.id ? { ...n, x_pos: targetX, y_pos: targetY } : n));
        batch.notes.push({ id: entry.item.id, x_pos: entry.item.id, x_pos: targetX, y_pos: targetY, width: entry.item.width || 220, height: entry.item.height || 150 });
      } else if (entry.sel.type === "pdf") {
        setPdfs(prev => prev.map(p => p.id === entry.item.id ? { ...p, x_pos: targetX, y_pos: targetY } : p));
        batch.pdfs.push({ id: entry.item.id, x_pos: targetX, y_pos: targetY, width: entry.item.width || 450, height: entry.item.height || 600 });
      } else if (entry.sel.type === "image") {
        setImages(prev => prev.map(img => img.id === entry.item.id ? { ...img, x_pos: targetX, y_pos: targetY } : img));
        batch.images.push({ id: entry.item.id, x_pos: targetX, y_pos: targetY, width: entry.item.width || 300, height: entry.item.height || 300 });
      }
    });

    if (isDbReady) {
      try {
        batch.movies?.forEach((m) => dbClient.run("UPDATE movies SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", m));
        batch.books?.forEach((b) => dbClient.run("UPDATE books SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", b));
        batch.notes?.forEach((n) => dbClient.run("UPDATE notes SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", { id: n.id, x_pos: n.x_pos, y_pos: n.y_pos }));
        batch.pdfs?.forEach((p) => dbClient.run("UPDATE pdfs SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", { id: p.id, x_pos: p.x_pos, y_pos: p.y_pos }));
        batch.images?.forEach((img) => dbClient.run("UPDATE images SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", { id: img.id, x_pos: img.x_pos, y_pos: img.y_pos }));
      } catch (err) {
        console.error("Local bulk arrange horizontal write error:", err);
      }
    }

    showToast("HORIZONTAL LAYOUT ALIGNMENT COMPLETED");

    fetch("/api/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    }).catch((err) => console.error("Bulk horizontal arrange failed to sync:", err));
  };

  const handleBulkArrangeVertical = async () => {
    saveStateBeforeMutation();
    const booksToArrange = selectedNodes.filter(n => n.type === "book");
    const moviesToArrange = selectedNodes.filter(n => n.type === "movie");
    const notesToArrange = selectedNodes.filter(n => n.type === "note");
    const pdfsToArrange = selectedNodes.filter(n => n.type === "pdf");
    const imagesToArrange = selectedNodes.filter(n => n.type === "image");
    const totalToArrange = [...booksToArrange, ...moviesToArrange, ...notesToArrange, ...pdfsToArrange, ...imagesToArrange];

    if (totalToArrange.length === 0) return;

    let totalX = 0;
    let count = 0;
    const itemsWithCoords = [];

    totalToArrange.forEach(sel => {
      const item = sel.type === "book"
        ? booksRef.current.find(b => b.id === sel.id)
        : sel.type === "movie"
        ? moviesRef.current.find(m => m.id === sel.id)
        : sel.type === "pdf"
        ? pdfsRef.current.find(p => p.id === sel.id)
        : sel.type === "image"
        ? imagesRef.current.find(img => img.id === sel.id)
        : notesRef.current.find(n => n.id === sel.id);
      if (item) {
        totalX += item.x_pos;
        count++;
        itemsWithCoords.push({ sel, y: item.y_pos, item });
      }
    });

    if (count === 0) return;

    const baselineX = Math.round((totalX / count) / 20) * 20;
    itemsWithCoords.sort((a, b) => a.y - b.y);
    const minY = itemsWithCoords[0].y;

    const spacing = 240;
    const batch = { books: [], notes: [], areas: [], quotes: [], pdfs: [], images: [], movies: [], movie_quotes: [] };

    itemsWithCoords.forEach((entry, index) => {
      const targetX = baselineX;
      const targetY = Math.round((minY + index * spacing) / 20) * 20;

      if (entry.sel.type === "book") {
        setBooks(prev => prev.map(b => b.id === entry.item.id ? { ...b, x_pos: targetX, y_pos: targetY } : b));
        batch.books.push({ id: entry.item.id, x_pos: targetX, y_pos: targetY });
      } else if (entry.sel.type === "movie") {
        setMovies(prev => prev.map(m => m.id === entry.item.id ? { ...m, x_pos: targetX, y_pos: targetY } : m));
        batch.movies.push({ id: entry.item.id, x_pos: targetX, y_pos: targetY });
      } else if (entry.sel.type === "note") {
        setNotes(prev => prev.map(n => n.id === entry.item.id ? { ...n, x_pos: targetX, y_pos: targetY } : n));
        batch.notes.push({ id: entry.item.id, x_pos: targetX, y_pos: targetY, width: entry.item.width || 220, height: entry.item.height || 150 });
      } else if (entry.sel.type === "pdf") {
        setPdfs(prev => prev.map(p => p.id === entry.item.id ? { ...p, x_pos: targetX, y_pos: targetY } : p));
        batch.pdfs.push({ id: entry.item.id, x_pos: targetX, y_pos: targetY, width: entry.item.width || 450, height: entry.item.height || 600 });
      } else if (entry.sel.type === "image") {
        setImages(prev => prev.map(img => img.id === entry.item.id ? { ...img, x_pos: targetX, y_pos: targetY } : img));
        batch.images.push({ id: entry.item.id, x_pos: targetX, y_pos: targetY, width: entry.item.width || 300, height: entry.item.height || 300 });
      }
    });

    if (isDbReady) {
      try {
        batch.movies?.forEach((m) => dbClient.run("UPDATE movies SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", m));
        batch.books?.forEach((b) => dbClient.run("UPDATE books SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", b));
        batch.notes?.forEach((n) => dbClient.run("UPDATE notes SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", { id: n.id, x_pos: n.x_pos, y_pos: n.y_pos }));
        batch.pdfs?.forEach((p) => dbClient.run("UPDATE pdfs SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", { id: p.id, x_pos: p.x_pos, y_pos: p.y_pos }));
        batch.images?.forEach((img) => dbClient.run("UPDATE images SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", { id: img.id, x_pos: img.x_pos, y_pos: img.y_pos }));
      } catch (err) {
        console.error("Local bulk arrange vertical write error:", err);
      }
    }

    showToast("VERTICAL LAYOUT ALIGNMENT COMPLETED");

    fetch("/api/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    }).catch((err) => console.error("Bulk vertical arrange failed to sync:", err));
  };

  const handleBulkDelete = useCallback(async () => {
    const currentSelection = selectedNodesRef.current;
    if (currentSelection.length === 0) return;
    if (!confirm(`ARE YOU SURE YOU WANT TO DECOMMISSION THE SELECTED ${currentSelection.length} MODULE(S)?`)) return;

    saveStateBeforeMutation();

    const booksToDelete = currentSelection.filter(n => n.type === "book");
    const moviesToDelete = currentSelection.filter(n => n.type === "movie");
    const notesToDelete = currentSelection.filter(n => n.type === "note");
    const pdfsToDelete = currentSelection.filter(n => n.type === "pdf");
    const areasToDelete = currentSelection.filter(n => n.type === "area");
    const quotesToDelete = currentSelection.filter(n => n.type === "quote");
    const imagesToDelete = currentSelection.filter(n => n.type === "image");

    if (isDbReady) {
      try {
        booksToDelete.forEach(b => {
          dbClient.run("DELETE FROM books WHERE id = @id", { id: b.id });
          dbClient.run("DELETE FROM quotes WHERE book_id = @id", { id: b.id });
          dbClient.run("DELETE FROM links WHERE source_id = @id OR target_id = @id", { id: b.id });
        });
        moviesToDelete.forEach(m => {
          dbClient.run("DELETE FROM movies WHERE id = @id", { id: m.id });
          dbClient.run("DELETE FROM movie_quotes WHERE movie_id = @id", { id: m.id });
          dbClient.run("DELETE FROM links WHERE source_id = @id OR target_id = @id", { id: m.id });
        });
        notesToDelete.forEach(n => {
          dbClient.run("DELETE FROM notes WHERE id = @id", { id: n.id });
          dbClient.run("DELETE FROM links WHERE source_id = @id OR target_id = @id", { id: n.id });
        });
        pdfsToDelete.forEach(p => {
          dbClient.run("DELETE FROM pdfs WHERE id = @id", { id: p.id });
          dbClient.run("DELETE FROM links WHERE source_id = @id OR target_id = @id", { id: p.id });
        });
        areasToDelete.forEach(a => {
          dbClient.run("DELETE FROM areas WHERE id = @id", { id: a.id });
        });
        quotesToDelete.forEach(q => {
          if (q.movie_id !== undefined) {
            dbClient.run("DELETE FROM movie_quotes WHERE id = @id", { id: q.id });
          } else {
            dbClient.run("DELETE FROM quotes WHERE id = @id", { id: q.id });
          }
        });
        imagesToDelete.forEach(img => {
          dbClient.run("DELETE FROM images WHERE id = @id", { id: img.id });
          dbClient.run("DELETE FROM links WHERE source_id = @id OR target_id = @id", { id: img.id });
        });
      } catch (err) {
        console.error("Local SQLite bulk delete failed:", err);
      }
    }

    const bookIds = new Set(booksToDelete.map(n => n.id));
    const movieIds = new Set(moviesToDelete.map(n => n.id));
    const noteIds = new Set(notesToDelete.map(n => n.id));
    const pdfIds = new Set(pdfsToDelete.map(n => n.id));
    const areaIds = new Set(areasToDelete.map(n => n.id));
    const quoteIds = new Set(quotesToDelete.map(n => n.id));
    const imageIds = new Set(imagesToDelete.map(n => n.id));

    if (bookIds.size > 0) {
      setBooks(prev => prev.filter(b => !bookIds.has(b.id)));
      setQuotes(prev => prev.filter(q => !bookIds.has(q.book_id)));
    }
    if (movieIds.size > 0) {
      setMovies(prev => prev.filter(m => !movieIds.has(m.id)));
      setQuotes(prev => prev.filter(q => !movieIds.has(q.movie_id)));
    }
    if (noteIds.size > 0) {
      setNotes(prev => prev.filter(n => !noteIds.has(n.id)));
    }
    if (pdfIds.size > 0) {
      setPdfs(prev => prev.filter(p => !pdfIds.has(p.id)));
    }
    if (imageIds.size > 0) {
      setImages(prev => prev.filter(img => !imageIds.has(img.id)));
    }
    if (areaIds.size > 0) {
      setAreas(prev => prev.filter(a => !areaIds.has(a.id)));
    }
    if (quoteIds.size > 0) {
      setQuotes(prev => prev.filter(q => !quoteIds.has(q.id)));
    }

    const allDeletedIds = new Set([...bookIds, ...movieIds, ...noteIds, ...pdfIds, ...areaIds, ...quoteIds, ...imageIds]);
    setLinks(prev => prev.filter(l => !allDeletedIds.has(l.source_id) && !allDeletedIds.has(l.target_id)));

    setSelectedNodes([]);
    showToast(`DECOMMISSIONED ${allDeletedIds.size} SELECTION MODULES`);

    // Sync in background (gracefully logging failures)
    booksToDelete.forEach(b => {
      fetch(`/api/books?id=${b.id}`, { method: "DELETE" }).catch(err => console.error(err));
    });
    moviesToDelete.forEach(m => {
      fetch(`/api/movies?id=${m.id}`, { method: "DELETE" }).catch(err => console.error(err));
    });
    notesToDelete.forEach(n => {
      fetch(`/api/notes?id=${n.id}`, { method: "DELETE" }).catch(err => console.error(err));
    });
    pdfsToDelete.forEach(p => {
      fetch(`/api/pdfs?id=${p.id}`, { method: "DELETE" }).catch(err => console.error(err));
    });
    areasToDelete.forEach(a => {
      fetch(`/api/areas?id=${a.id}`, { method: "DELETE" }).catch(err => console.error(err));
    });
    quotesToDelete.forEach(q => {
      if (q.movie_id !== undefined) {
        fetch(`/api/movie_quotes?id=${q.id}`, { method: "DELETE" }).catch(err => console.error(err));
      } else {
        fetch(`/api/quotes?id=${q.id}`, { method: "DELETE" }).catch(err => console.error(err));
      }
    });
    imagesToDelete.forEach(img => {
      fetch(`/api/images?id=${img.id}`, { method: "DELETE" }).catch(err => console.error(err));
    });

  }, [saveStateBeforeMutation, showToast, isDbReady]);

  const handleBulkConnectToNode = async (targetId, targetType) => {
    if (selectedNodes.length === 0) return;
    saveStateBeforeMutation();

    const createdLinks = [];
    const sources = selectedNodes.filter(n => !(n.id === targetId && n.type === targetType));

    for (const source of sources) {
      const exists = links.some(l => 
        (l.source_id === source.id && l.target_id === targetId) ||
        (l.source_id === targetId && l.target_id === source.id)
      );
      if (exists) continue;

      const linkId = crypto.randomUUID();
      const newLink = {
        id: linkId,
        source_id: source.id,
        source_type: source.type,
        target_id: targetId,
        target_type: targetType,
        label: "",
        type: "default",
        arrow: "none",
        speed: "normal",
        shape: "curved",
        color: null
      };

      if (isDbReady) {
        try {
          dbClient.run(`
            INSERT INTO links (id, source_id, source_type, target_id, target_type, label, type, arrow, speed, shape, color)
            VALUES (@id, @source_id, @source_type, @target_id, @target_type, @label, @type, @arrow, @speed, @shape, @color)
          `, newLink);
        } catch (err) {
          console.error("Local SQLite bulk connect failed:", err);
        }
      }

      createdLinks.push(newLink);

      // Sync in background
      fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLink)
      }).catch((err) => console.error("Failed to sync connection in star layout:", err));
    }

    if (createdLinks.length > 0) {
      setLinks(prev => [...prev, ...createdLinks]);
      showToast("STAR-HUB CONNECTIONS ESTABLISHED");
    }
  };

  const handleBulkConnectInChain = async () => {
    if (selectedNodes.length < 2) return;
    saveStateBeforeMutation();

    const nodesWithCoords = selectedNodes.map(sel => {
      let item = null;
      if (sel.type === "book") item = booksRef.current.find(b => b.id === sel.id);
      else if (sel.type === "note") item = notesRef.current.find(n => n.id === sel.id);
      else if (sel.type === "pdf") item = pdfsRef.current.find(p => p.id === sel.id);
      else if (sel.type === "area") item = areasRef.current.find(a => a.id === sel.id);
      else if (sel.type === "quote") item = quotesRef.current.find(q => q.id === sel.id);
      
      return {
        ...sel,
        x: item ? item.x_pos : 0,
        y: item ? item.y_pos : 0
      };
    });

    nodesWithCoords.sort((a, b) => a.x - b.x);

    const createdLinks = [];

    for (let i = 0; i < nodesWithCoords.length - 1; i++) {
      const source = nodesWithCoords[i];
      const target = nodesWithCoords[i + 1];

      const exists = links.some(l => 
        (l.source_id === source.id && l.target_id === target.id) ||
        (l.source_id === target.id && l.target_id === source.id)
      );
      if (exists) continue;

      const linkId = crypto.randomUUID();
      const newLink = {
        id: linkId,
        source_id: source.id,
        source_type: source.type,
        target_id: target.id,
        target_type: target.type,
        label: "",
        type: "default",
        arrow: "forward",
        speed: "normal",
        shape: "curved",
        color: null
      };

      if (isDbReady) {
        try {
          dbClient.run(`
            INSERT INTO links (id, source_id, source_type, target_id, target_type, label, type, arrow, speed, shape, color)
            VALUES (@id, @source_id, @source_type, @target_id, @target_type, @label, @type, @arrow, @speed, @shape, @color)
          `, newLink);
        } catch (err) {
          console.error("Local SQLite bulk chain connect failed:", err);
        }
      }

      createdLinks.push(newLink);

      // Sync in background
      fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLink)
      }).catch((err) => console.error("Failed to sync connection in chain layout:", err));
    }

    if (createdLinks.length > 0) {
      setLinks(prev => [...prev, ...createdLinks]);
      showToast("CHRONOLOGICAL LINK CHAIN CREATED");
    }
  };

  const handleBulkConnectToNewHubNote = async () => {
    if (selectedNodes.length === 0) return;
    saveStateBeforeMutation();

    let sumX = 0, sumY = 0, count = 0;
    selectedNodes.forEach(sel => {
      let item = null;
      if (sel.type === "book") item = booksRef.current.find(b => b.id === sel.id);
      else if (sel.type === "note") item = notesRef.current.find(n => n.id === sel.id);
      else if (sel.type === "pdf") item = pdfsRef.current.find(p => p.id === sel.id);
      else if (sel.type === "area") item = areasRef.current.find(a => a.id === sel.id);
      else if (sel.type === "quote") item = quotesRef.current.find(q => q.id === sel.id);
      
      if (item) {
        sumX += item.x_pos;
        sumY += item.y_pos;
        count++;
      }
    });

    const centerX = count > 0 ? Math.round(sumX / count) : 100;
    const centerY = count > 0 ? Math.round(sumY / count) : 100;

    const title = prompt("ENTER TITLE/CONTENT FOR NEW HUB NOTE:", "Concept Hub");
    if (title === null) return;

    const content = `<h1>${title.toUpperCase()}</h1><p>Central hub connecting related workspace modules.</p>`;

    const noteId = crypto.randomUUID();
    const newNote = {
      id: noteId,
      content,
      x_pos: centerX - 110,
      y_pos: centerY - 75,
      width: 220,
      height: 150,
      z_index: 0,
      color: "rgba(168, 85, 247, 0.08)",
      wrap_text: 1
    };

    if (isDbReady) {
      try {
        dbClient.run(`
          INSERT INTO notes (id, content, x_pos, y_pos, width, height, z_index, color, wrap_text)
          VALUES (@id, @content, @x_pos, @y_pos, @width, @height, @z_index, @color, @wrap_text)
        `, newNote);
      } catch (err) {
        console.error("Local SQLite bulk connect hub note creation failed:", err);
      }
    }

    setNotes(prev => [...prev, newNote]);

    fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newNote)
    }).catch(err => console.error("Failed to sync new hub note:", err));

    const createdLinks = [];

    selectedNodes.forEach(source => {
      const linkId = crypto.randomUUID();
      const newLink = {
        id: linkId,
        source_id: source.id,
        source_type: source.type,
        target_id: noteId,
        target_type: "note",
        label: "",
        type: "default",
        arrow: "none",
        speed: "normal",
        shape: "curved",
        color: null
      };

      if (isDbReady) {
        try {
          dbClient.run(`
            INSERT INTO links (id, source_id, source_type, target_id, target_type, label, type, arrow, speed, shape, color)
            VALUES (@id, @source_id, @source_type, @target_id, @target_type, @label, @type, @arrow, @speed, @shape, @color)
          `, newLink);
        } catch (err) {
          console.error("Local SQLite bulk connect hub link creation failed:", err);
        }
      }

      createdLinks.push(newLink);

      fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLink)
      }).catch(err => console.error("Failed to link node to new hub note in background:", err));
    });

    if (createdLinks.length > 0) {
      setLinks(prev => [...prev, ...createdLinks]);
    }
    showToast("CENTROID CONCEPT HUB MEMO CARD CREATED");
  };

  const handleBulkCreateZone = async () => {
    if (selectedNodes.length === 0) return;
    saveStateBeforeMutation();

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    selectedNodes.forEach(sel => {
      let item = null;
      let w = 200;
      let h = 200;

      if (sel.type === "book") {
        item = booksRef.current.find(b => b.id === sel.id);
        if (item) {
          w = 192;
          h = item.cover_url ? 320 : 160;
        }
      } else if (sel.type === "movie") {
        item = moviesRef.current.find(m => m.id === sel.id);
        if (item) {
          w = 192;
          h = 300;
        }
      } else if (sel.type === "pdf") {
        item = pdfsRef.current.find(p => p.id === sel.id);
        if (item) {
          w = item.width || 340;
          h = item.height || 480;
        }
      } else if (sel.type === "image") {
        item = imagesRef.current.find(img => img.id === sel.id);
        if (item) {
          w = item.width || 300;
          h = item.height || 220;
        }
      } else if (sel.type === "area") {
        item = areasRef.current.find(a => a.id === sel.id);
        if (item) {
          w = item.width || 200;
          h = item.height || 200;
        }
      } else if (sel.type === "quote") {
        item = quotesRef.current.find(q => q.id === sel.id);
        if (item) {
          w = 280;
          h = 100;
        }
      } else if (sel.type === "note") {
        item = notesRef.current.find(n => n.id === sel.id);
        if (item) {
          w = item.width || 220;
          h = item.height || 150;
        }
      }

      if (item) {
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

    const zoneId = crypto.randomUUID();
    const newArea = {
      id: zoneId,
      name: name.trim().toUpperCase(),
      x_pos: zoneX,
      y_pos: zoneY,
      width: zoneW,
      height: zoneH,
      color: "rgba(0, 170, 255, 0.08)"
    };

    if (isDbReady) {
      try {
        dbClient.run(`
          INSERT INTO areas (id, name, x_pos, y_pos, width, height, color)
          VALUES (@id, @name, @x_pos, @y_pos, @width, @height, @color)
        `, newArea);
      } catch (err) {
        console.error("Local SQLite bulk create zone failed:", err);
      }
    }

    setAreas(prev => [...prev, newArea]);
    setSelectedNodes(prev => [...prev, { id: zoneId, type: "area" }]);
    showToast("SELECTION GROUPED INTO CATEGORY ZONE");

    fetch("/api/areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newArea)
    }).catch(err => console.error("Bulk create zone failed to sync:", err));
  };

  const handleBulkExport = () => {
    const selectedBooks = selectedNodes.filter(n => n.type === "book");
    const selectedNotes = selectedNodes.filter(n => n.type === "note");

    if (selectedBooks.length === 0 && selectedNotes.length === 0) return;

    let md = `# APIRON WORKSPACE EXPORT — CONSOLIDATED TELEMETRY\n`;
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
    link.setAttribute("download", `apiron_bulk_export_${new Date().toISOString().slice(0,10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CONSOLIDATED MARKDOWN SUMMARY EXPORTED");
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


  const togglePinNode = (id) => {
    setPinnedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast("MODULE POSITION UNLOCKED");
      } else {
        next.add(id);
        showToast("MODULE POSITION PINNED / LOCKED");
      }
      return next;
    });
  };

  const restoreSnapshot = async (state) => {
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state)
      });
      if (!res.ok) throw new Error("Failed to restore backup snapshot");
      
      setBooks(state.books);
      setMovies(state.movies || []);
      setQuotes(state.quotes);
      setAreas(state.areas);
      setNotes(state.notes);
      setLinks(state.links);
      setPresets(state.presets);
      setPdfs(state.pdfs);
      setDrawings(state.drawings || []);
      setImages(state.images || []);
    } catch (err) {
      console.error("Undo/Redo restore failed:", err);
    }
  };

  const performUndo = async () => {
    if (undoStackRef.current.length === 0) return;
    
    const currentState = {
      books: JSON.parse(JSON.stringify(booksRef.current)),
      movies: JSON.parse(JSON.stringify(moviesRef.current)),
      quotes: JSON.parse(JSON.stringify(quotesRef.current)),
      areas: JSON.parse(JSON.stringify(areasRef.current)),
      notes: JSON.parse(JSON.stringify(notesRef.current)),
      links: JSON.parse(JSON.stringify(linksRef.current)),
      presets: JSON.parse(JSON.stringify(presetsRef.current)),
      pdfs: JSON.parse(JSON.stringify(pdfsRef.current)),
      drawings: JSON.parse(JSON.stringify(drawingsRef.current)),
      images: JSON.parse(JSON.stringify(imagesRef.current))
    };
    redoStackRef.current.push(currentState);
    
    const targetState = undoStackRef.current.pop();
    await restoreSnapshot(targetState);
    showToast("SYSTEM SNAPSHOT RESTORED (UNDO)");
  };

  const performRedo = async () => {
    if (redoStackRef.current.length === 0) return;
    
    const currentState = {
      books: JSON.parse(JSON.stringify(booksRef.current)),
      movies: JSON.parse(JSON.stringify(moviesRef.current)),
      quotes: JSON.parse(JSON.stringify(quotesRef.current)),
      areas: JSON.parse(JSON.stringify(areasRef.current)),
      notes: JSON.parse(JSON.stringify(notesRef.current)),
      links: JSON.parse(JSON.stringify(linksRef.current)),
      presets: JSON.parse(JSON.stringify(presetsRef.current)),
      pdfs: JSON.parse(JSON.stringify(pdfsRef.current)),
      drawings: JSON.parse(JSON.stringify(drawingsRef.current)),
      images: JSON.parse(JSON.stringify(imagesRef.current))
    };
    undoStackRef.current.push(currentState);
    
    const targetState = redoStackRef.current.pop();
    await restoreSnapshot(targetState);
    showToast("SYSTEM SNAPSHOT APPLIED (REDO)");
  };

  // Sync refs with latest state for use in event handlers and callbacks
  useEffect(() => {
    connectionSourceRef.current = connectionSource;
    booksRef.current = books;
    moviesRef.current = movies;
    quotesRef.current = quotes;
    areasRef.current = areas;
    notesRef.current = notes;
    linksRef.current = links;
    selectedNodesRef.current = selectedNodes;
    pdfsRef.current = pdfs;
    drawingsRef.current = drawings;
    imagesRef.current = images;
  }, [connectionSource, books, movies, quotes, areas, notes, links, selectedNodes, pdfs, drawings, images]);

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

  async function fetchMovies() {
    try {
      const res = await fetch("/api/movies");
      const data = await res.json();
      setMovies(data);
      // merge movie_quotes into the flat quotes array
      const movieQuotes = data.flatMap((m) => m.quotes || []);
      setQuotes((prev) => [
        ...prev.filter((q) => q.book_id !== undefined),
        ...movieQuotes
      ]);
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

  async function fetchPdfs() {
    try {
      const res = await fetch("/api/pdfs");
      const data = await res.json();
      setPdfs(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchDrawings() {
    try {
      const res = await fetch("/api/drawings");
      const data = await res.json();
      setDrawings(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchImages() {
    try {
      const res = await fetch("/api/images");
      const data = await res.json();
      setImages(data);
    } catch (err) {
      console.error(err);
    }
  }

  const handleClearDrawings = async () => {
    if (!confirm("DELETE ALL ANNOTATIONS AND DRAWINGS FROM THE CANVAS?")) return;
    saveStateBeforeMutation();
    try {
      await fetch("/api/drawings", { method: "DELETE" });
      setDrawings([]);
    } catch (err) {
      console.error("Failed to clear drawings:", err);
    }
  };

  const handleDeleteStroke = async (id) => {
    saveStateBeforeMutation();
    try {
      setDrawings((prev) => prev.filter((d) => d.id !== id));
      await fetch(`/api/drawings?id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete drawing stroke:", err);
    }
  };

  const loadInitialDataFromWasm = useCallback(() => {
    try {
      // 1. Fetch Books
      const booksData = dbClient.all("SELECT * FROM books");
      setBooks(booksData);
      
      // 2. Fetch Quotes (associated with books)
      const quotesData = dbClient.all("SELECT * FROM quotes");
      setQuotes(quotesData);

      // 3. Fetch Movies
      const moviesData = dbClient.all("SELECT * FROM movies");
      setMovies(moviesData);
      
      // 4. Fetch Movie Quotes
      const movieQuotesData = dbClient.all("SELECT * FROM movie_quotes");
      setQuotes(prev => [
        ...prev.filter(q => q.book_id !== undefined),
        ...movieQuotesData
      ]);

      // 5. Fetch Areas
      const areasData = dbClient.all("SELECT * FROM areas");
      setAreas(areasData);

      // 6. Fetch Notes
      const notesData = dbClient.all("SELECT * FROM notes");
      setNotes(notesData);

      // 7. Fetch Links
      const linksData = dbClient.all("SELECT * FROM links");
      setLinks(linksData);

      // 8. Fetch Presets
      const presetsData = dbClient.all("SELECT * FROM presets");
      setPresets(presetsData);

      // 9. Fetch PDFs
      const pdfsData = dbClient.all("SELECT * FROM pdfs");
      setPdfs(pdfsData);

      // 10. Fetch Drawings
      const drawingsData = dbClient.all("SELECT * FROM drawings");
      setDrawings(drawingsData);

      // 11. Fetch Images
      const imagesData = dbClient.all("SELECT * FROM images");
      setImages(imagesData);

      setIsDbReady(true);
    } catch (err) {
      console.error("Error loading data from Wasm SQLite:", err);
    }
  }, []);

  useEffect(() => {
    async function setupWasmDb() {
      try {
        await initDb();
        loadInitialDataFromWasm();
      } catch (err) {
        console.error("Failed to load Wasm DB, falling back to server APIs", err);
        fetchBooks();
        fetchMovies();
        fetchAreas();
        fetchNotes();
        fetchLinks();
        fetchPresets();
        fetchPdfs();
        fetchDrawings();
        fetchImages();
      }
    }
    setupWasmDb();
  }, [loadInitialDataFromWasm]);

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

  const renamePreset = async (id, currentName, e) => {
    e.stopPropagation();
    const newName = prompt("ENTER NEW VIEWPORT TELEMETRY DESIGNATION:", currentName);
    if (!newName || !newName.trim() || newName.trim() === currentName) return;

    try {
      const res = await fetch("/api/presets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: newName.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setPresets((prev) => prev.map((p) => p.id === id ? data : p));
        showToast("VIEWPORT PRESET RENAMED");
      }
    } catch (err) {
      console.error("Failed to rename preset:", err);
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

  const handleUpdateLinkSpeed = async (linkId, speed) => {
    try {
      const link = linksRef.current.find(l => l.id === linkId);
      if (!link) return;

      if (isDbReady) {
        try {
          dbClient.run("UPDATE links SET speed = @speed WHERE id = @id", { id: linkId, speed });
        } catch (err) {
          console.error("Local SQLite update link speed failed:", err);
        }
      }

      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, speed } : l));

      // Sync in background
      fetch("/api/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: linkId, speed })
      }).catch((err) => console.error(err));
    } catch (err) {
      console.error(err);
    }
  };

  const createLink = useCallback(async (source, target, skipHistory = false) => {
    if (source.id === target.id) return;
    
    // Check if link already exists
    const exists = linksRef.current.some(l => 
      (l.source_id === source.id && l.target_id === target.id) ||
      (l.source_id === target.id && l.target_id === source.id)
    );
    if (exists) return;

    if (!skipHistory) saveStateBeforeMutation();

    const linkId = crypto.randomUUID();
    const newLink = {
      id: linkId,
      source_id: source.id,
      source_type: source.type,
      target_id: target.id,
      target_type: target.type,
      label: "",
      type: "default",
      arrow: "none",
      speed: "normal",
      shape: "curved",
      color: null
    };

    if (isDbReady) {
      try {
        dbClient.run(`
          INSERT INTO links (id, source_id, source_type, target_id, target_type, label, type, arrow, speed, shape, color)
          VALUES (@id, @source_id, @source_type, @target_id, @target_type, @label, @type, @arrow, @speed, @shape, @color)
        `, newLink);
      } catch (err) {
        console.error("Local SQLite create link failed:", err);
      }
    }

    setLinks(prev => [...prev, newLink]);

    // Sync in background
    fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newLink)
    }).catch((err) => console.error("Failed to sync new link in background:", err));
  }, [saveStateBeforeMutation, isDbReady]);

  const handleDeleteLink = async (linkId) => {
    saveStateBeforeMutation();
    try {
      if (isDbReady) {
        try {
          dbClient.run("DELETE FROM links WHERE id = @id", { id: linkId });
        } catch (err) {
          console.error("Local SQLite delete link failed:", err);
        }
      }

      setLinks(prev => prev.filter(l => l.id !== linkId));

      // Sync in background
      fetch(`/api/links?id=${linkId}`, { method: "DELETE" }).catch((err) => console.error(err));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveLinkLabel = async (linkId, label) => {
    saveStateBeforeMutation();
    setEditingLinkId(null);
    try {
      const link = linksRef.current.find(l => l.id === linkId);
      if (!link) return;

      if (isDbReady) {
        try {
          dbClient.run("UPDATE links SET label = @label WHERE id = @id", { id: linkId, label });
        } catch (err) {
          console.error("Local SQLite update link label failed:", err);
        }
      }

      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, label } : l));

      // Sync in background
      fetch("/api/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: linkId, label })
      }).catch((err) => console.error(err));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLinkType = async (linkId, type) => {
    saveStateBeforeMutation();
    try {
      const link = linksRef.current.find(l => l.id === linkId);
      if (!link) return;

      if (isDbReady) {
        try {
          dbClient.run("UPDATE links SET type = @type WHERE id = @id", { id: linkId, type });
        } catch (err) {
          console.error("Local SQLite update link type failed:", err);
        }
      }

      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, type } : l));

      // Sync in background
      fetch("/api/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: linkId, type })
      }).catch((err) => console.error(err));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLinkColor = async (linkId, color) => {
    saveStateBeforeMutation();
    try {
      const link = linksRef.current.find(l => l.id === linkId);
      if (!link) return;

      if (isDbReady) {
        try {
          dbClient.run("UPDATE links SET color = @color WHERE id = @id", { id: linkId, color });
        } catch (err) {
          console.error("Local SQLite update link color failed:", err);
        }
      }

      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, color } : l));

      // Sync in background
      fetch("/api/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: linkId, color })
      }).catch((err) => console.error(err));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLinkArrow = async (linkId, arrow) => {
    saveStateBeforeMutation();
    try {
      const link = linksRef.current.find(l => l.id === linkId);
      if (!link) return;

      if (isDbReady) {
        try {
          dbClient.run("UPDATE links SET arrow = @arrow WHERE id = @id", { id: linkId, arrow });
        } catch (err) {
          console.error("Local SQLite update link arrow failed:", err);
        }
      }

      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, arrow } : l));

      // Sync in background
      fetch("/api/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: linkId, arrow })
      }).catch((err) => console.error(err));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLinkShape = async (linkId, shape) => {
    saveStateBeforeMutation();
    try {
      const link = linksRef.current.find(l => l.id === linkId);
      if (!link) return;

      if (isDbReady) {
        try {
          dbClient.run("UPDATE links SET shape = @shape WHERE id = @id", { id: linkId, shape });
        } catch (err) {
          console.error("Local SQLite update link shape failed:", err);
        }
      }

      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, shape } : l));

      // Sync in background
      fetch("/api/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: linkId, shape })
      }).catch((err) => console.error(err));
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartConnection = (id, type, clientX, clientY) => {
    const center = getNodeCenter(id, type);
    setConnectionSource({ id, type, startX: clientX || 0, startY: clientY || 0 });
    setMouseCanvasPos(center);
  };

  const findNodeByIdAndType = (id, type) => {
    if (type === "book") return books.find(b => b.id === id);
    if (type === "movie") return movies.find(m => m.id === id);
    if (type === "note") return notes.find(n => n.id === id);
    if (type === "pdf") return pdfs.find(p => p.id === id);
    if (type === "image") return images.find(img => img.id === id);
    if (type === "area") return areas.find(a => a.id === id);
    if (type === "quote") return quotes.find(q => q.id === id);
    return null;
  };

  const getNodeCenter = (id, type) => {
    if (type === "book") {
      const b = booksRef.current.find(book => book.id === id);
      if (b) return { x: b.x_pos + 96, y: b.y_pos + 150 };
    } else if (type === "note") {
      const n = notesRef.current.find(note => note.id === id);
      if (n) return { x: n.x_pos + (n.width || 220) / 2, y: n.y_pos + (n.height || 150) / 2 };
    } else if (type === "pdf") {
      const p = pdfsRef.current.find(pdf => pdf.id === id);
      if (p) return { x: p.x_pos + (p.width || 450) / 2, y: p.y_pos + (p.height || 600) / 2 };
    } else if (type === "image") {
      const img = imagesRef.current.find(image => image.id === id);
      if (img) return { x: img.x_pos + (img.width || 300) / 2, y: img.y_pos + (img.height || 300) / 2 };
    } else if (type === "movie") {
      const m = moviesRef.current.find(movie => movie.id === id);
      if (m) return { x: m.x_pos + 96, y: m.y_pos + 150 };
    } else if (type === "quote") {
      const q = quotesRef.current.find(quote => quote.id === id);
      if (q) return { x: q.x_pos + 140, y: q.y_pos + 50 };
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
    } else if (type === "pdf") {
      w = node.width || 450;
      h = node.height || 600;
    } else if (type === "image") {
      w = node.width || 300;
      h = node.height || 300;
    } else if (type === "movie") {
      w = 192;
      h = 300;
    } else if (type === "quote") {
      w = 280;
      h = 100;
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

  const getPdfMatch = (p) => {
    if (!canvasFilter) return true;
    return p.name.toLowerCase().includes(canvasFilter.toLowerCase());
  };

  const getMovieMatch = (m) => {
    if (!canvasFilter) return true;
    const f = canvasFilter.toLowerCase();
    return (
      m.title.toLowerCase().includes(f) ||
      (m.director && m.director.toLowerCase().includes(f)) ||
      (m.review && m.review.toLowerCase().includes(f))
    );
  };

  const getNodeMatch = (id, type) => {
    if (type === "book") {
      const b = books.find(book => book.id === id);
      return b ? getBookMatch(b) : false;
    } else if (type === "movie") {
      const m = movies.find(movie => movie.id === id);
      return m ? getMovieMatch(m) : false;
    } else if (type === "note") {
      const n = notes.find(note => note.id === id);
      return n ? getNoteMatch(n) : false;
    } else if (type === "pdf") {
      const p = pdfs.find(pdf => pdf.id === id);
      return p ? getPdfMatch(p) : false;
    }
    return false;
  };

  const handleAddBook = async (bookData) => {
    saveStateBeforeMutation();
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

      const bookId = crypto.randomUUID();
      const newBook = {
        id: bookId,
        title: bookData.title,
        author: bookData.author || '',
        cover_url: bookData.cover_url || '',
        rating: null,
        review: null,
        x_pos,
        y_pos,
        status: bookData.status || 'To Read',
        quotes: []
      };

      if (isDbReady) {
        try {
          dbClient.run(`
            INSERT INTO books (id, title, author, cover_url, x_pos, y_pos, status)
            VALUES (@id, @title, @author, @cover_url, @x_pos, @y_pos, @status)
          `, newBook);
        } catch (err) {
          console.error("Local SQLite book creation failed:", err);
        }
      }

      setBooks((prev) => [...prev, newBook]);

      // Sync in background
      fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBook),
      }).catch((err) => console.error("Failed to sync new book in background:", err));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBook = async (updatedBook, skipHistory = false) => {
    if (!skipHistory) saveStateBeforeMutation();
    try {
      if (isDbReady) {
        try {
          dbClient.run(`
            UPDATE books
            SET title = @title, author = @author, cover_url = @cover_url,
                rating = @rating, review = @review, x_pos = @x_pos, y_pos = @y_pos, status = @status
            WHERE id = @id
          `, updatedBook);
        } catch (err) {
          console.error("Local SQLite book update failed:", err);
        }
      }

      setBooks((prev) => prev.map((b) => (b.id === updatedBook.id ? { ...b, ...updatedBook } : b)));

      // Sync in background
      fetch("/api/books", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedBook),
      }).catch((err) => console.error("Failed to sync updated book in background:", err));
    } catch (err) {
      console.error(err);
    }
  };

  const handleExtractQuote = async (bookId, text) => {
    saveStateBeforeMutation();
    const book = books.find((b) => b.id === bookId);
    if (!book) return;

    const x_pos = book.x_pos + 250 + Math.random() * 50;
    const y_pos = book.y_pos + Math.random() * 100;

    const quoteId = crypto.randomUUID();
    const newQuote = {
      id: quoteId,
      book_id: bookId,
      quote: text,
      x_pos,
      y_pos
    };

    try {
      if (isDbReady) {
        try {
          dbClient.run(`
            INSERT INTO quotes (id, book_id, quote, x_pos, y_pos)
            VALUES (@id, @book_id, @quote, @x_pos, @y_pos)
          `, newQuote);
        } catch (err) {
          console.error("Local SQLite quote creation failed:", err);
        }
      }

      setQuotes((prev) => [...prev, newQuote]);

      // Sync in background
      fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQuote),
      }).catch((err) => console.error("Failed to sync new quote in background:", err));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMovie = async (movieData) => {
    saveStateBeforeMutation();
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

      const movieId = crypto.randomUUID();
      const newMovie = {
        id: movieId,
        title: movieData.title,
        director: movieData.director || '',
        cover_url: movieData.cover_url || '',
        rating: null,
        review: null,
        x_pos,
        y_pos,
        status: movieData.status || 'To Watch',
        year: movieData.year || null,
        quotes: []
      };

      if (isDbReady) {
        try {
          dbClient.run(`
            INSERT INTO movies (id, title, director, cover_url, x_pos, y_pos, status, year)
            VALUES (@id, @title, @director, @cover_url, @x_pos, @y_pos, @status, @year)
          `, newMovie);
        } catch (err) {
          console.error("Local SQLite movie creation failed:", err);
        }
      }

      setMovies((prev) => [...prev, newMovie]);

      // Sync in background
      fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMovie),
      }).catch((err) => console.error("Failed to sync new movie in background:", err));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateMovie = async (updatedMovie, skipHistory = false) => {
    if (!skipHistory) saveStateBeforeMutation();
    try {
      if (isDbReady) {
        try {
          dbClient.run(`
            UPDATE movies
            SET title = @title, director = @director, cover_url = @cover_url,
                rating = @rating, review = @review, x_pos = @x_pos, y_pos = @y_pos, status = @status, year = @year
            WHERE id = @id
          `, updatedMovie);
        } catch (err) {
          console.error("Local SQLite movie update failed:", err);
        }
      }

      setMovies((prev) => prev.map((m) => (m.id === updatedMovie.id ? { ...m, ...updatedMovie } : m)));

      // Sync in background
      fetch("/api/movies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedMovie),
      }).catch((err) => console.error("Failed to sync updated movie in background:", err));
    } catch (err) {
      console.error(err);
    }
  };

  const handleExtractMovieQuote = async (movieId, text) => {
    saveStateBeforeMutation();
    const movie = movies.find((m) => m.id === movieId);
    if (!movie) return;
    const x_pos = movie.x_pos + 250 + Math.random() * 50;
    const y_pos = movie.y_pos + Math.random() * 100;

    const quoteId = crypto.randomUUID();
    const newQuote = {
      id: quoteId,
      movie_id: movieId,
      quote: text,
      x_pos,
      y_pos
    };

    try {
      if (isDbReady) {
        try {
          dbClient.run(`
            INSERT INTO movie_quotes (id, movie_id, quote, x_pos, y_pos)
            VALUES (@id, @movie_id, @quote, @x_pos, @y_pos)
          `, newQuote);
        } catch (err) {
          console.error("Local SQLite movie quote creation failed:", err);
        }
      }

      setQuotes((prev) => [...prev, newQuote]);
      setMovies((prev) =>
        prev.map((m) =>
          m.id === movieId
            ? { ...m, quotes: [...(m.quotes || []), newQuote] }
            : m
        )
      );

      // Sync in background
      fetch("/api/movie_quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQuote),
      }).catch((err) => console.error("Failed to sync new movie quote in background:", err));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMovie = (movieId) => {
    setActiveDialog({ type: "confirm-delete-movie", movieId });
  };

  const createArea = async (areaData) => {
    saveStateBeforeMutation();
    try {
      const areaId = crypto.randomUUID();
      const newArea = {
        id: areaId,
        name: areaData.name || 'NEW AREA',
        x_pos: areaData.x_pos || 0,
        y_pos: areaData.y_pos || 0,
        width: areaData.width || 200,
        height: areaData.height || 200,
        color: areaData.color || 'rgba(0, 170, 255, 0.08)'
      };

      if (isDbReady) {
        try {
          dbClient.run(`
            INSERT INTO areas (id, name, x_pos, y_pos, width, height, color)
            VALUES (@id, @name, @x_pos, @y_pos, @width, @height, @color)
          `, newArea);
        } catch (err) {
          console.error("Local SQLite area creation failed:", err);
        }
      }

      setAreas((prev) => [...prev, newArea]);

      // Sync in background
      fetch("/api/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newArea),
      }).catch((err) => console.error("Failed to sync new area in background:", err));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateArea = async (id, updates, skipHistory = false) => {
    if (!skipHistory) saveStateBeforeMutation();
    try {
      const area = areasRef.current.find((a) => a.id === id);
      if (!area) return;
      
      const updatedFields = typeof updates === "string" ? { name: updates } : updates;
      const updatedArea = { ...area, ...updatedFields };

      if (isDbReady) {
        try {
          dbClient.run(`
            UPDATE areas
            SET name = @name, x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height, color = @color
            WHERE id = @id
          `, updatedArea);
        } catch (err) {
          console.error("Local SQLite area update failed:", err);
        }
      }

      setAreas((prev) => prev.map((a) => (a.id === id ? updatedArea : a)));

      // Sync in background
      fetch("/api/areas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedArea),
      }).catch((err) => console.error("Failed to sync updated area in background:", err));
    } catch (err) {
      console.error(err);
    }
  };

  const handleArrangeAreaNodes = async (areaId) => {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;

    saveStateBeforeMutation();

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
          await handleUpdateBook(nextBook, true);
        } else {
          await handleEditNote(item.id, { x_pos: snappedX, y_pos: snappedY }, true);
        }
      }

      // Auto-resize Area bounding box to wrap elements with padding
      const targetAreaWidth = Math.round((maxColX - area.x_pos + padding) / 20) * 20;
      const targetAreaHeight = Math.round((maxRowY - area.y_pos + padding) / 20) * 20;

      await handleUpdateArea(area.id, { width: targetAreaWidth, height: targetAreaHeight }, true);
    } catch (err) {
      console.error("Failed to auto-arrange area nodes:", err);
    } finally {
      setTimeout(() => setIsFocusing(false), 450);
    }
  };

  const handlePullSelectionToZone = async (areaId) => {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;

    const booksToPull = selectedNodes.filter(n => n.type === "book");
    const notesToPull = selectedNodes.filter(n => n.type === "note");
    const totalToPull = [...booksToPull, ...notesToPull];

    if (totalToPull.length === 0) return;
    saveStateBeforeMutation();

    const promises = [];

    booksToPull.forEach(sel => {
      const book = booksRef.current.find(b => b.id === sel.id);
      if (book) {
        const updatedBook = { ...book, x_pos: area.x_pos + 40, y_pos: area.y_pos + 60 };
        setBooks(prev => prev.map(b => b.id === book.id ? updatedBook : b));
        promises.push(
          fetch("/api/books", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedBook)
          })
        );
      }
    });

    notesToPull.forEach(sel => {
      const note = notesRef.current.find(n => n.id === sel.id);
      if (note) {
        const updatedNote = { ...note, x_pos: area.x_pos + 40, y_pos: area.y_pos + 60 };
        setNotes(prev => prev.map(n => n.id === note.id ? updatedNote : n));
        promises.push(
          fetch("/api/notes", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedNote)
          })
        );
      }
    });

    try {
      await Promise.all(promises);
      await handleArrangeAreaNodes(areaId);
      showToast(`PULLED ${totalToPull.length} MODULES INTO ZONE "${area.name}"`);
    } catch (err) {
      console.error("Pull selection to zone failed:", err);
    }
  };

  const handleDeleteArea = (areaId) => {
    setActiveDialog({ type: "confirm-delete-area", areaId });
  };

  const handleDeleteBook = (bookId) => {
    setActiveDialog({ type: "confirm-delete-book", bookId });
  };

  const handleDeleteQuote = async (quoteId) => {
    saveStateBeforeMutation();
    try {
      const quote = quotes.find(q => q.id === quoteId);
      const isMovieQuote = quote && quote.movie_id !== undefined;
      const endpoint = isMovieQuote ? `/api/movie_quotes?id=${quoteId}` : `/api/quotes?id=${quoteId}`;
      await fetch(endpoint, { method: "DELETE" });
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      if (isMovieQuote && quote.movie_id) {
        setMovies((prev) =>
          prev.map((m) =>
            m.id === quote.movie_id
              ? { ...m, quotes: (m.quotes || []).filter((q) => q.id !== quoteId) }
              : m
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNote = useCallback(async (customX = null, customY = null, initialContent = "", skipHistory = false) => {
    if (!skipHistory) saveStateBeforeMutation();
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
    
    const noteId = crypto.randomUUID();
    const newNote = {
      id: noteId,
      content: initialContent || '',
      x_pos,
      y_pos,
      width: 220,
      height: 150,
      z_index: 0,
      color: 'rgba(255, 255, 255, 0.08)',
      wrap_text: 1
    };

    if (isDbReady) {
      try {
        dbClient.run(`
          INSERT INTO notes (id, content, x_pos, y_pos, width, height, z_index, color, wrap_text)
          VALUES (@id, @content, @x_pos, @y_pos, @width, @height, @z_index, @color, @wrap_text)
        `, newNote);
      } catch (err) {
        console.error("Local SQLite note creation failed:", err);
      }
    }

    setNotes((prev) => [...prev, newNote]);
    setNewlyCreatedNoteId(noteId);

    // Sync in background (failing gracefully)
    fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newNote),
    }).catch((err) => console.error("Failed to sync new note to server in background:", err));

    return newNote;
  }, [pendingPlacement, snapToGrid, saveStateBeforeMutation, isDbReady]);

  const handleDeleteNote = (noteId) => {
    setActiveDialog({ type: "confirm-delete-note", noteId });
  };

  const handleNoteTabOut = useCallback(async (sourceNoteId) => {
    const sourceNote = notesRef.current.find(n => n.id === sourceNoteId);
    if (!sourceNote) return;

    const noteWidth = 220;
    const noteHeight = 150;
    let newX = sourceNote.x_pos + (sourceNote.width || noteWidth) + 80;
    let newY = sourceNote.y_pos;

    // Helper to check for bounding box collisions at canvas coordinates
    const getCollisionAt = (x, y, w, h) => {
      const bookCollision = booksRef.current.some(b => {
        const bw = 192;
        const bh = b.cover_url ? 320 : 160;
        return x < b.x_pos + bw && x + w > b.x_pos && y < b.y_pos + bh && y + h > b.y_pos;
      });
      if (bookCollision) return true;

      const noteCollision = notesRef.current.some(n => {
        const nw = n.width || 220;
        const nh = n.height || 150;
        return x < n.x_pos + nw && x + w > n.x_pos && y < n.y_pos + nh && y + h > n.y_pos;
      });
      if (noteCollision) return true;

      const pdfCollision = pdfsRef.current.some(p => {
        const pw = p.width || 450;
        const ph = p.height || 600;
        return x < p.x_pos + pw && x + w > p.x_pos && y < p.y_pos + ph && y + h > p.y_pos;
      });
      if (pdfCollision) return true;

      const imageCollision = imagesRef.current.some(img => {
        const iw = img.width || 300;
        const ih = img.height || 300;
        return x < img.x_pos + iw && x + w > img.x_pos && y < img.y_pos + ih && y + h > img.y_pos;
      });
      if (imageCollision) return true;

      const quoteCollision = quotesRef.current.some(q => {
        const qw = 140;
        const qh = 80;
        return x < q.x_pos + qw && x + w > q.x_pos && y < q.y_pos + qh && y + h > q.y_pos;
      });
      if (quoteCollision) return true;

      return false;
    };

    // Shift newX to the right if there's an overlap
    while (getCollisionAt(newX, newY, noteWidth, noteHeight)) {
      newX += noteWidth + 80;
    }

    // Save history once
    saveStateBeforeMutation();

    const newNote = await handleCreateNote(newX, newY, "", true); // skipHistory = true
    if (newNote) {
      await createLink({ id: sourceNoteId, type: "note" }, { id: newNote.id, type: "note" }, true); // skipHistory = true
      setNewlyCreatedNoteId(newNote.id);
    }
  }, [createLink, handleCreateNote, saveStateBeforeMutation]);

  const handleNoteTabArrowNavigation = useCallback(async (sourceNoteId, direction) => {
    const sourceNote = notesRef.current.find(n => n.id === sourceNoteId);
    if (!sourceNote) return;

    const noteWidth = 220;
    const noteHeight = 150;
    let newX = sourceNote.x_pos;
    let newY = sourceNote.y_pos;

    // Helper to check for bounding box collisions at canvas coordinates
    const getCollisionAt = (x, y, w, h) => {
      const bookCollision = booksRef.current.some(b => {
        const bw = 192;
        const bh = b.cover_url ? 320 : 160;
        return x < b.x_pos + bw && x + w > b.x_pos && y < b.y_pos + bh && y + h > b.y_pos;
      });
      if (bookCollision) return true;

      const noteCollision = notesRef.current.some(n => {
        const nw = n.width || 220;
        const nh = n.height || 150;
        return x < n.x_pos + nw && x + w > n.x_pos && y < n.y_pos + nh && y + h > n.y_pos;
      });
      if (noteCollision) return true;

      const pdfCollision = pdfsRef.current.some(p => {
        const pw = p.width || 450;
        const ph = p.height || 600;
        return x < p.x_pos + pw && x + w > p.x_pos && y < p.y_pos + ph && y + h > p.y_pos;
      });
      if (pdfCollision) return true;

      const imageCollision = imagesRef.current.some(img => {
        const iw = img.width || 300;
        const ih = img.height || 300;
        return x < img.x_pos + iw && x + w > img.x_pos && y < img.y_pos + ih && y + h > img.y_pos;
      });
      if (imageCollision) return true;

      const quoteCollision = quotesRef.current.some(q => {
        const qw = 140;
        const qh = 80;
        return x < q.x_pos + qw && x + w > q.x_pos && y < q.y_pos + qh && y + h > q.y_pos;
      });
      if (quoteCollision) return true;

      return false;
    };

    let dx = 0;
    let dy = 0;

    if (direction === "ArrowRight") {
      newX = sourceNote.x_pos + (sourceNote.width || noteWidth) + 80;
      dx = noteWidth + 80;
    } else if (direction === "ArrowLeft") {
      newX = sourceNote.x_pos - noteWidth - 80;
      dx = -(noteWidth + 80);
    } else if (direction === "ArrowDown") {
      newY = sourceNote.y_pos + (sourceNote.height || noteHeight) + 80;
      dy = noteHeight + 80;
    } else if (direction === "ArrowUp") {
      newY = sourceNote.y_pos - noteHeight - 80;
      dy = -(noteHeight + 80);
    }

    // Shift new placement if there's an overlap, moving in the specified direction
    while (getCollisionAt(newX, newY, noteWidth, noteHeight)) {
      if (direction === "ArrowRight" || direction === "ArrowLeft") {
        newX += dx;
      } else {
        newY += dy;
      }
    }

    // Save history once
    saveStateBeforeMutation();

    const newNote = await handleCreateNote(newX, newY, "", true); // skipHistory = true
    if (newNote) {
      await createLink({ id: sourceNoteId, type: "note" }, { id: newNote.id, type: "note" }, true); // skipHistory = true
      setNewlyCreatedNoteId(newNote.id);
    }
  }, [createLink, handleCreateNote, saveStateBeforeMutation]);

  const handleNoteArrowNavigation = useCallback((sourceNoteId, direction) => {
    const sourceNote = notesRef.current.find(n => n.id === sourceNoteId);
    if (!sourceNote) return;

    // Find all links connected to this note
    const connectedLinks = linksRef.current.filter(l => 
      l.source_id === sourceNoteId || l.target_id === sourceNoteId
    );
    if (connectedLinks.length === 0) return;

    // Resolve target nodes
    const candidates = [];
    connectedLinks.forEach(link => {
      const targetId = link.source_id === sourceNoteId ? link.target_id : link.source_id;
      const targetType = link.source_id === sourceNoteId ? link.target_type : link.source_type;

      let node = null;
      if (targetType === "book") node = booksRef.current.find(b => b.id === targetId);
      else if (targetType === "note") node = notesRef.current.find(n => n.id === targetId);
      else if (targetType === "pdf") node = pdfsRef.current.find(p => p.id === targetId);
      else if (targetType === "image") node = imagesRef.current.find(img => img.id === targetId);
      else if (targetType === "quote") node = quotesRef.current.find(q => q.id === targetId);
      else if (targetType === "area") node = areasRef.current.find(a => a.id === targetId);

      if (node) {
        candidates.push({ id: targetId, type: targetType, x_pos: node.x_pos, y_pos: node.y_pos });
      }
    });

    if (candidates.length === 0) return;

    const sx = sourceNote.x_pos;
    const sy = sourceNote.y_pos;

    let bestCandidate = null;
    let bestScore = Infinity;

    candidates.forEach(c => {
      const dx = c.x_pos - sx;
      const dy = c.y_pos - sy;

      let isValid = false;
      let score = Infinity;

      if (direction === "ArrowRight") {
        if (dx > 5) {
          isValid = true;
          score = dx + Math.abs(dy) * 1.5;
        }
      } else if (direction === "ArrowLeft") {
        if (dx < -5) {
          isValid = true;
          score = Math.abs(dx) + Math.abs(dy) * 1.5;
        }
      } else if (direction === "ArrowDown") {
        if (dy > 5) {
          isValid = true;
          score = Math.abs(dx) * 1.5 + dy;
        }
      } else if (direction === "ArrowUp") {
        if (dy < -5) {
          isValid = true;
          score = Math.abs(dx) * 1.5 + Math.abs(dy);
        }
      }

      if (isValid && score < bestScore) {
        bestScore = score;
        bestCandidate = c;
      }
    });

    if (bestCandidate) {
      if (bestCandidate.type === "note") {
        setNewlyCreatedNoteId(bestCandidate.id);
      } else {
        centerOnNode(bestCandidate.id, bestCandidate.type);
      }
    }
  }, [centerOnNode]);

  // ── Layer handlers ─────────────────────────────────────────────────────────
  const getNodesForType = useCallback((type) => {
    if (type === "note") return notesRef.current;
    if (type === "book") return booksRef.current;
    if (type === "movie") return moviesRef.current;
    if (type === "pdf") return pdfsRef.current;
    if (type === "image") return imagesRef.current;
    if (type === "area") return areasRef.current;
    if (type === "quote") return quotesRef.current;
    return [];
  }, []);

  const setNodesForType = useCallback((type, updater) => {
    if (type === "note") setNotes(updater);
    else if (type === "book") setBooks(updater);
    else if (type === "movie") setMovies(updater);
    else if (type === "pdf") setPdfs(updater);
    else if (type === "image") setImages(updater);
    else if (type === "area") setAreas(updater);
    else if (type === "quote") setQuotes(updater);
  }, []);

  const patchLayerZ = useCallback(async (id, type, z_index) => {
    try {
      await fetch("/api/layer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type, z_index }),
      });
    } catch (err) {
      console.error("Layer patch failed:", err);
    }
  }, []);

  const handleBringToFront = useCallback(async (id, type) => {
    const nodes = getNodesForType(type);
    const maxZ = nodes.reduce((m, n) => Math.max(m, n.z_index || 0), 0);
    const newZ = maxZ + 1;
    setNodesForType(type, (prev) =>
      prev.map((n) => (n.id === id ? { ...n, z_index: newZ } : n))
    );
    await patchLayerZ(id, type, newZ);
  }, [getNodesForType, setNodesForType, patchLayerZ]);

  const handleSendToBack = useCallback(async (id, type) => {
    const nodes = getNodesForType(type);
    const minZ = nodes.reduce((m, n) => Math.min(m, n.z_index || 0), 0);
    const newZ = minZ - 1;
    setNodesForType(type, (prev) =>
      prev.map((n) => (n.id === id ? { ...n, z_index: newZ } : n))
    );
    await patchLayerZ(id, type, newZ);
  }, [getNodesForType, setNodesForType, patchLayerZ]);

  const handleBringForward = useCallback(async (id, type) => {
    const nodes = getNodesForType(type);
    const current = nodes.find((n) => n.id === id);
    if (!current) return;
    const currentZ = current.z_index || 0;
    // Find the next node above us
    const above = nodes
      .filter((n) => n.id !== id && (n.z_index || 0) > currentZ)
      .sort((a, b) => (a.z_index || 0) - (b.z_index || 0))[0];
    const newZ = above ? (above.z_index || 0) + 1 : currentZ + 1;
    setNodesForType(type, (prev) =>
      prev.map((n) => (n.id === id ? { ...n, z_index: newZ } : n))
    );
    await patchLayerZ(id, type, newZ);
  }, [getNodesForType, setNodesForType, patchLayerZ]);

  const handleSendBackward = useCallback(async (id, type) => {
    const nodes = getNodesForType(type);
    const current = nodes.find((n) => n.id === id);
    if (!current) return;
    const currentZ = current.z_index || 0;
    // Find the next node below us
    const below = nodes
      .filter((n) => n.id !== id && (n.z_index || 0) < currentZ)
      .sort((a, b) => (b.z_index || 0) - (a.z_index || 0))[0];
    const newZ = below ? (below.z_index || 0) - 1 : currentZ - 1;
    setNodesForType(type, (prev) =>
      prev.map((n) => (n.id === id ? { ...n, z_index: newZ } : n))
    );
    await patchLayerZ(id, type, newZ);
  }, [getNodesForType, setNodesForType, patchLayerZ]);
  // ──────────────────────────────────────────────────────────────────────────

  const handleEditNote = async (id, updates, skipHistory = false) => {
    if (!skipHistory) saveStateBeforeMutation();
    try {
      const note = notesRef.current.find((n) => n.id === id);
      if (!note) return;
      
      const updatedFields = typeof updates === "string" ? { content: updates } : updates;
      const updatedNote = { ...note, ...updatedFields };

      if (isDbReady) {
        try {
          dbClient.run(`
            UPDATE notes
            SET content = @content, x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height, z_index = @z_index, color = @color, wrap_text = @wrap_text
            WHERE id = @id
          `, {
            ...updatedNote,
            wrap_text: updatedNote.wrap_text !== undefined ? (updatedNote.wrap_text ? 1 : 0) : 1
          });
        } catch (err) {
          console.error("Local SQLite note edit failed:", err);
        }
      }

      setNotes((prev) => prev.map((n) => (n.id === id ? updatedNote : n)));

      // Sync in background
      fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedNote),
      }).catch((err) => console.error("Failed to sync note updates in background:", err));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePdf = async (file, x, y) => {
    saveStateBeforeMutation();
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("x_pos", x);
      formData.append("y_pos", y);

      const res = await fetch("/api/pdfs", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      setPdfs((prev) => [...prev, data]);

      // Synchronize creation with local client Wasm SQLite DB
      try {
        dbClient.run(
          "INSERT INTO pdfs (id, name, filename, x_pos, y_pos, width, height, z_index) VALUES (@id, @name, @filename, @x_pos, @y_pos, @width, @height, @z_index)",
          {
            id: data.id,
            name: data.name,
            filename: data.filename,
            x_pos: data.x_pos,
            y_pos: data.y_pos,
            width: data.width,
            height: data.height,
            z_index: data.z_index || 0,
          }
        );
      } catch (dbErr) {
        console.error("Failed to sync new PDF to local Wasm DB:", dbErr);
      }
    } catch (err) {
      console.error("PDF upload error:", err);
      alert("Failed to upload PDF. Please make sure it is a valid PDF file.");
    }
  };

  const handleDeletePdf = (pdfId) => {
    setActiveDialog({ type: "confirm-delete-pdf", pdfId });
  };

  const handleCreateImage = async (file, x, y) => {
    saveStateBeforeMutation();
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("x_pos", x);
      formData.append("y_pos", y);

      const res = await fetch("/api/images", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      setImages((prev) => [...prev, data]);

      // Synchronize creation with local client Wasm SQLite DB
      try {
        dbClient.run(
          "INSERT INTO images (id, name, filename, x_pos, y_pos, width, height, z_index) VALUES (@id, @name, @filename, @x_pos, @y_pos, @width, @height, @z_index)",
          {
            id: data.id,
            name: data.name,
            filename: data.filename,
            x_pos: data.x_pos,
            y_pos: data.y_pos,
            width: data.width,
            height: data.height,
            z_index: data.z_index || 0,
          }
        );
      } catch (dbErr) {
        console.error("Failed to sync new image to local Wasm DB:", dbErr);
      }

      showToast("IMAGE IMPORTED SUCCESSFULLY");
    } catch (err) {
      console.error("Image upload error:", err);
      alert("Failed to upload image. Please try again.");
    }
  };

  const handleDeleteImage = (imageId) => {
    setActiveDialog({ type: "confirm-delete-image", imageId });
  };

  const handleUpdateImage = async (id, updates) => {
    try {
      const image = imagesRef.current.find((img) => img.id === id);
      if (!image) return;

      const updatedImage = { ...image, ...updates };

      if (isDbReady) {
        try {
          dbClient.run(`
            UPDATE images
            SET name = @name, x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height
            WHERE id = @id
          `, updatedImage);
        } catch (err) {
          console.error("Local SQLite image update failed:", err);
        }
      }

      setImages((prev) => prev.map((img) => (img.id === id ? updatedImage : img)));

      // Sync in background
      fetch("/api/images", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedImage)
      }).catch((err) => console.error("Failed to sync updated image in background:", err));
    } catch (err) {
      console.error("Failed to update image:", err);
    }
  };

  const handleSpawnNoteFromPdf = async (pdfId, text) => {
    saveStateBeforeMutation();
    const pdf = pdfsRef.current.find((p) => p.id === pdfId);
    if (!pdf) return;

    const pdfWidth = pdf.width || 450;
    const spawnX = pdf.x_pos + pdfWidth + 60;
    const spawnY = pdf.y_pos;

    const noteId = crypto.randomUUID();
    const newNote = {
      id: noteId,
      content: text,
      x_pos: spawnX,
      y_pos: spawnY,
      width: 220,
      height: 150,
      z_index: 0,
      color: 'rgba(255, 255, 255, 0.08)',
      wrap_text: 1
    };

    const linkId = crypto.randomUUID();
    const newLink = {
      id: linkId,
      source_id: pdfId,
      source_type: "pdf",
      target_id: noteId,
      target_type: "note",
      label: "Source Citation",
      type: "default",
      arrow: "target",
      speed: "normal",
      shape: "curved",
      color: null
    };

    if (isDbReady) {
      try {
        dbClient.run(`
          INSERT INTO notes (id, content, x_pos, y_pos, width, height, z_index, color, wrap_text)
          VALUES (@id, @content, @x_pos, @y_pos, @width, @height, @z_index, @color, @wrap_text)
        `, newNote);
        dbClient.run(`
          INSERT INTO links (id, source_id, source_type, target_id, target_type, label, type, arrow, speed, shape, color)
          VALUES (@id, @source_id, @source_type, @target_id, @target_type, @label, @type, @arrow, @speed, @shape, @color)
        `, newLink);
      } catch (err) {
        console.error("Local SQLite PDF note spawning failed:", err);
      }
    }

    setNotes((prev) => [...prev, newNote]);
    setLinks((prev) => [...prev, newLink]);

    // Sync note in background
    fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newNote),
    }).then(() => {
      // Sync link in background
      return fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLink)
      });
    }).catch((err) => console.error("Failed to sync spawned note from PDF in background:", err));
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
      link.download = `apiron_board_backup_${new Date().toISOString().split('T')[0]}.json`;
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
    if (e.button === 2) return;
    setDraggedNode(null);
    // Clear active text selection to prevent unwanted drag highlights
    window.getSelection()?.removeAllRanges();
    setContextMenu(null);
    if (focusNode) setFocusNode(null);
    setActiveLinkMenuId(null);
    
    // Track pointer for multi-touch gestures and palm rejection
    activePointersRef.current.set(e.pointerId, {
      clientX: e.clientX,
      clientY: e.clientY,
      pointerType: e.pointerType,
    });

    if (activePointersRef.current.size >= 2) {
      const pointers = Array.from(activePointersRef.current.values());
      const dx = pointers[0].clientX - pointers[1].clientX;
      const dy = pointers[0].clientY - pointers[1].clientY;
      gestureStartDistRef.current = Math.hypot(dx, dy);
      gestureStartScaleRef.current = scale;
      gestureStartPanRef.current = { ...pan };
      gestureStartCenterRef.current = {
        x: (pointers[0].clientX + pointers[1].clientX) / 2,
        y: (pointers[0].clientY + pointers[1].clientY) / 2,
      };
      isGestureActiveRef.current = true;

      // Cancel drawing if it somehow started
      if (isDrawingStrokeRef.current) {
        isDrawingStrokeRef.current = false;
        setCurrentStroke("");
        strokePointsRef.current = [];
      }
      return;
    }

    // Palm Rejection: if drawing with stylus, ignore touch pointers
    const hasActivePen = Array.from(activePointersRef.current.values()).some(p => p.pointerType === "pen");
    if (hasActivePen && e.pointerType === "touch") {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const startX = (e.clientX - rect.left - pan.x) / scale;
    const startY = (e.clientY - rect.top - pan.y) / scale;

    if (isHandwritingMode) {
      if (brushMode === "erase") {
        try {
          e.target.releasePointerCapture(e.pointerId);
        } catch (err) {}
        return;
      }
      e.preventDefault();
      isDrawingStrokeRef.current = true;
      const pressure = (e.pointerType === "pen" || e.pointerType === "touch") ? (e.pressure || 0.5) : 0.5;
      strokePointsRef.current = [{ x: startX, y: startY, pressure }];
      setCurrentStroke(`M ${Math.round(startX)} ${Math.round(startY)}`);
      return;
    }

    setIsDragging(true);

    // Shift-click/drag or Lasso Mode starts lasso selection
    if (isLassoMode || e.shiftKey) {
      e.preventDefault();
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
    // Clear active text selection to prevent unwanted drag highlights
    window.getSelection()?.removeAllRanges();
    setContextMenu(null);
    if (pinnedNodeIdsRef.current.has(id)) {
      return;
    }
    tempSnapshotRef.current = {
      books: JSON.parse(JSON.stringify(booksRef.current)),
      movies: JSON.parse(JSON.stringify(moviesRef.current)),
      quotes: JSON.parse(JSON.stringify(quotesRef.current)),
      areas: JSON.parse(JSON.stringify(areasRef.current)),
      notes: JSON.parse(JSON.stringify(notesRef.current)),
      links: JSON.parse(JSON.stringify(linksRef.current)),
      presets: JSON.parse(JSON.stringify(presetsRef.current)),
      pdfs: JSON.parse(JSON.stringify(pdfsRef.current)),
      images: JSON.parse(JSON.stringify(imagesRef.current))
    };
    setIsDragging(true);
    const items = type === "book" 
      ? booksRef.current 
      : (type === "movie"
        ? moviesRef.current
        : (type === "quote" 
          ? quotesRef.current 
          : (type === "area" || type === "area-resize" 
            ? areasRef.current 
            : (type === "pdf" || type === "pdf-resize" 
              ? pdfsRef.current 
              : (type === "image" || type === "image-resize"
                ? imagesRef.current
                : notesRef.current)))));
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

      const containedMovies = moviesRef.current
        .filter((m) => m.x_pos >= ax1 && m.x_pos <= ax2 && m.y_pos >= ay1 && m.y_pos <= ay2)
        .map((m) => ({ id: m.id, startX: m.x_pos, startY: m.y_pos }));

      const containedQuotes = quotesRef.current
        .filter((q) => q.x_pos >= ax1 && q.x_pos <= ax2 && q.y_pos >= ay1 && q.y_pos <= ay2)
        .map((q) => ({ id: q.id, startX: q.x_pos, startY: q.y_pos }));

      const containedNotes = notesRef.current
        .filter((n) => n.x_pos >= ax1 && n.x_pos <= ax2 && n.y_pos >= ay1 && n.y_pos <= ay2)
        .map((n) => ({ id: n.id, startX: n.x_pos, startY: n.y_pos }));

      const containedPdfs = pdfsRef.current
        .filter((p) => p.x_pos >= ax1 && p.x_pos <= ax2 && p.y_pos >= ay1 && p.y_pos <= ay2)
        .map((p) => ({ id: p.id, startX: p.x_pos, startY: p.y_pos }));

      const containedImages = imagesRef.current
        .filter((img) => img.x_pos >= ax1 && img.x_pos <= ax2 && img.y_pos >= ay1 && img.y_pos <= ay2)
        .map((img) => ({ id: img.id, startX: img.x_pos, startY: img.y_pos }));

      containedItems = { 
        books: containedBooks, 
        movies: containedMovies,
        quotes: containedQuotes, 
        notes: containedNotes, 
        pdfs: containedPdfs,
        images: containedImages 
      };
    }

    // Check if item is in selection for relative group dragging
    const isSelected = selectedNodesRef.current.some((n) => n.id === id && n.type === type);
    let groupItems = null;
    if (isSelected) {
      groupItems = selectedNodesRef.current.map((node) => {
        const list = node.type === "book" 
          ? booksRef.current 
          : (node.type === "movie"
            ? moviesRef.current
            : (node.type === "quote" 
              ? quotesRef.current 
              : (node.type === "area" 
                ? areasRef.current 
                : (node.type === "pdf" 
                  ? pdfsRef.current 
                  : (node.type === "image" 
                    ? imagesRef.current 
                    : notesRef.current)))));
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
    setDraggedNode({
      id,
      type,
      containedItems,
      groupItems,
    });
  }, []);

  const handlePointerMove = (e) => {
    // Update pointer coordinates for tracked active pointers
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, {
        clientX: e.clientX,
        clientY: e.clientY,
        pointerType: e.pointerType,
      });
    }

    // Multi-touch pinch-to-zoom and pan support
    if (activePointersRef.current.size >= 2) {
      triggerZoomActive();
      const pointers = Array.from(activePointersRef.current.values());
      const p1 = pointers[0];
      const p2 = pointers[1];
      const currentDist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      const currentCenter = {
        x: (p1.clientX + p2.clientX) / 2,
        y: (p1.clientY + p2.clientY) / 2,
      };

      let newScale = scale;
      if (gestureStartDistRef.current > 0) {
        const ratio = currentDist / gestureStartDistRef.current;
        newScale = Math.min(Math.max(gestureStartScaleRef.current * ratio, 0.15), 3);
      }

      const deltaCenter = {
        x: currentCenter.x - gestureStartCenterRef.current.x,
        y: currentCenter.y - gestureStartCenterRef.current.y,
      };

      const rect = canvasRef.current.getBoundingClientRect();
      const gestureX = gestureStartCenterRef.current.x - rect.left;
      const gestureY = gestureStartCenterRef.current.y - rect.top;

      const canvasX = (gestureX - gestureStartPanRef.current.x) / gestureStartScaleRef.current;
      const canvasY = (gestureY - gestureStartPanRef.current.y) / gestureStartScaleRef.current;

      setPan({
        x: (gestureX + deltaCenter.x) - canvasX * newScale,
        y: (gestureY + deltaCenter.y) - canvasY * newScale,
      });
      setScale(newScale);

      // Cancel drawing stroke if gesture pan started
      if (isDrawingStrokeRef.current) {
        isDrawingStrokeRef.current = false;
        setCurrentStroke("");
        strokePointsRef.current = [];
      }
      return;
    }

    // Palm Rejection: if drawing with stylus, ignore finger touch inputs
    const hasActivePen = Array.from(activePointersRef.current.values()).some(p => p.pointerType === "pen");
    if (hasActivePen && e.pointerType === "touch" && isDrawingStrokeRef.current) {
      return;
    }

    if (isHandwritingMode && isDrawingStrokeRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - pan.x) / scale;
      const currentY = (e.clientY - rect.top - pan.y) / scale;
      
      const lastPoint = strokePointsRef.current[strokePointsRef.current.length - 1];
      const dist = Math.hypot(currentX - lastPoint.x, currentY - lastPoint.y);
      
      if (dist > 2) {
        const pressure = (e.pointerType === "pen" || e.pointerType === "touch") ? (e.pressure || 0.5) : 0.5;
        strokePointsRef.current.push({ x: currentX, y: currentY, pressure });
        setCurrentStroke(getSmoothSvgPath(strokePointsRef.current));
      }
      return;
    }

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
        setPdfs((prev) =>
          prev.map((p) => {
            const match = drag.groupItems.find((gi) => gi.id === p.id && gi.type === "pdf");
            if (!match) return p;
            let itemX = match.startX + deltaX;
            let itemY = match.startY + deltaY;
            if (snapToGrid) {
              itemX = Math.round(itemX / 20) * 20;
              itemY = Math.round(itemY / 20) * 20;
            }
            return { ...p, x_pos: itemX, y_pos: itemY };
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
        setImages((prev) =>
          prev.map((img) => {
            const match = drag.groupItems.find((gi) => gi.id === img.id && gi.type === "image");
            if (!match) return img;
            let itemX = match.startX + deltaX;
            let itemY = match.startY + deltaY;
            if (snapToGrid) {
              itemX = Math.round(itemX / 20) * 20;
              itemY = Math.round(itemY / 20) * 20;
            }
            return { ...img, x_pos: itemX, y_pos: itemY };
          })
        );
        setMovies((prev) =>
          prev.map((m) => {
            const match = drag.groupItems.find((gi) => gi.id === m.id && gi.type === "movie");
            if (!match) return m;
            let itemX = match.startX + deltaX;
            let itemY = match.startY + deltaY;
            if (snapToGrid) {
              itemX = Math.round(itemX / 20) * 20;
              itemY = Math.round(itemY / 20) * 20;
            }
            return { ...m, x_pos: itemX, y_pos: itemY };
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
      } else if (drag.type === "movie") {
        setMovies((prev) =>
          prev.map((m) => (m.id === drag.id ? { ...m, x_pos: newX, y_pos: newY } : m))
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
          const { books: cBooks, movies: cMovies, quotes: cQuotes, notes: cNotes, pdfs: cPdfs, images: cImages } = drag.containedItems;
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
          if (cMovies && cMovies.length > 0) {
            setMovies((prev) =>
              prev.map((m) => {
                const match = cMovies.find((cm) => cm.id === m.id);
                if (!match) return m;
                let itemX = match.startX + deltaX;
                let itemY = match.startY + deltaY;
                if (snapToGrid) {
                  itemX = Math.round(itemX / 20) * 20;
                  itemY = Math.round(itemY / 20) * 20;
                }
                return { ...m, x_pos: itemX, y_pos: itemY };
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
          if (cPdfs && cPdfs.length > 0) {
            setPdfs((prev) =>
              prev.map((p) => {
                const match = cPdfs.find((cp) => cp.id === p.id);
                if (!match) return p;
                let itemX = match.startX + deltaX;
                let itemY = match.startY + deltaY;
                if (snapToGrid) {
                  itemX = Math.round(itemX / 20) * 20;
                  itemY = Math.round(itemY / 20) * 20;
                }
                return { ...p, x_pos: itemX, y_pos: itemY };
              })
            );
          }
          if (cImages && cImages.length > 0) {
            setImages((prev) =>
              prev.map((img) => {
                const match = cImages.find((cimg) => cimg.id === img.id);
                if (!match) return img;
                let itemX = match.startX + deltaX;
                let itemY = match.startY + deltaY;
                if (snapToGrid) {
                  itemX = Math.round(itemX / 20) * 20;
                  itemY = Math.round(itemY / 20) * 20;
                }
                return { ...img, x_pos: itemX, y_pos: itemY };
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
      } else if (drag.type === "pdf-resize") {
        let newW = Math.max(drag.startWidth + deltaX, 300);
        let newH = Math.max(drag.startHeight + deltaY, 400);
        if (snapToGrid) {
          newW = Math.round(newW / 20) * 20;
          newH = Math.round(newH / 20) * 20;
        }
        setPdfs((prev) =>
          prev.map((p) => (p.id === drag.id ? { ...p, width: newW, height: newH } : p))
        );
      } else if (drag.type === "image-resize") {
        let newW = Math.max(drag.startWidth + deltaX, 150);
        let newH = Math.max(drag.startHeight + deltaY, 150);
        if (snapToGrid) {
          newW = Math.round(newW / 20) * 20;
          newH = Math.round(newH / 20) * 20;
        }
        setImages((prev) =>
          prev.map((img) => (img.id === drag.id ? { ...img, width: newW, height: newH } : img))
        );
      } else if (drag.type === "note") {
        setNotes((prev) =>
          prev.map((n) => (n.id === drag.id ? { ...n, x_pos: newX, y_pos: newY } : n))
        );
      } else if (drag.type === "pdf") {
        setPdfs((prev) =>
          prev.map((p) => (p.id === drag.id ? { ...p, x_pos: newX, y_pos: newY } : p))
        );
      } else if (drag.type === "image") {
        setImages((prev) =>
          prev.map((img) => (img.id === drag.id ? { ...img, x_pos: newX, y_pos: newY } : img))
        );
      }
    }
  };

  const handlePointerUp = async (e) => {
    const wasGestureActive = isGestureActiveRef.current;

    // Remove pointer
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      isGestureActiveRef.current = false;
      gestureStartDistRef.current = 0;
    }

    if (wasGestureActive) {
      dragRef.current = null;
      setIsDragging(false);
      setDraggedNode(null);
      return;
    }

    if (isHandwritingMode && isDrawingStrokeRef.current) {
      isDrawingStrokeRef.current = false;
      const finalPath = currentStroke;
      setCurrentStroke("");
      strokePointsRef.current = [];

      if (finalPath.length > 5) {
        const newStrokeId = crypto.randomUUID();
        const strokeObj = {
          id: newStrokeId,
          path_data: finalPath,
          color: drawColor,
          stroke_width: drawWidth
        };
        
        saveStateBeforeMutation();

        fetch("/api/drawings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(strokeObj)
        }).then(res => res.json()).then(data => {
          setDrawings(prev => [...prev, data]);
        }).catch(err => console.error("Failed to save drawing stroke:", err));
      }
      return;
    }

    if (connectionSourceRef.current) {
      const startX = connectionSourceRef.current.startX || 0;
      const startY = connectionSourceRef.current.startY || 0;
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      
      let targetEl = e.target.closest("[data-node-id]");
      if (!targetEl || targetEl.getAttribute("data-node-id") === connectionSourceRef.current.id) {
        const elAtPoint = document.elementFromPoint(e.clientX, e.clientY);
        if (elAtPoint) {
          targetEl = elAtPoint.closest("[data-node-id]");
        }
      }

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
        if (!targetEl) {
          const rect = canvasRef.current.getBoundingClientRect();
          const canvasX = (e.clientX - rect.left - pan.x) / scale;
          const canvasY = (e.clientY - rect.top - pan.y) / scale;
          const newNote = await handleCreateNote(canvasX - 110, canvasY - 75, "", true);
          if (newNote) {
            createLink(connectionSourceRef.current, { id: newNote.id, type: "note" }, true);
            setNewlyCreatedNoteId(newNote.id);
          }
        }
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

    // Persist group dragging coordinate changes using batch transaction API
    if (drag.groupItems && drag.hasMoved) {
      const batch = { books: [], notes: [], areas: [], quotes: [], pdfs: [], images: [], movies: [], movie_quotes: [] };
      drag.groupItems.forEach((item) => {
        if (item.type === "movie") {
          const movie = moviesRef.current.find((m) => m.id === item.id);
          if (movie) batch.movies.push({ id: movie.id, x_pos: movie.x_pos, y_pos: movie.y_pos });
        } else if (item.type === "book") {
          const book = booksRef.current.find((b) => b.id === item.id);
          if (book) batch.books.push({ id: book.id, x_pos: book.x_pos, y_pos: book.y_pos });
        } else if (item.type === "note") {
          const note = notesRef.current.find((n) => n.id === item.id);
          if (note) batch.notes.push({ id: note.id, x_pos: note.x_pos, y_pos: note.y_pos, width: note.width || 220, height: note.height || 150 });
        } else if (item.type === "area") {
          const area = areasRef.current.find((a) => a.id === item.id);
          if (area) batch.areas.push({ id: area.id, x_pos: area.x_pos, y_pos: area.y_pos, width: area.width || 200, height: area.height || 200 });
        } else if (item.type === "quote") {
          const quote = quotesRef.current.find((q) => q.id === item.id);
          if (quote) {
            if (quote.movie_id !== undefined) {
              batch.movie_quotes.push({ id: quote.id, x_pos: quote.x_pos, y_pos: quote.y_pos });
            } else {
              batch.quotes.push({ id: quote.id, x_pos: quote.x_pos, y_pos: quote.y_pos });
            }
          }
        } else if (item.type === "pdf") {
          const pdf = pdfsRef.current.find((p) => p.id === item.id);
          if (pdf) batch.pdfs.push({ id: pdf.id, x_pos: pdf.x_pos, y_pos: pdf.y_pos, width: pdf.width || 450, height: pdf.height || 600 });
        } else if (item.type === "image") {
          const image = imagesRef.current.find((img) => img.id === item.id);
          if (image) batch.images.push({ id: image.id, x_pos: image.x_pos, y_pos: image.y_pos, width: image.width || 300, height: image.height || 300 });
        }
      });

      if (isDbReady) {
        try {
          batch.movies?.forEach((m) => dbClient.run("UPDATE movies SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", m));
          batch.books?.forEach((b) => dbClient.run("UPDATE books SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", b));
          batch.notes?.forEach((n) => dbClient.run("UPDATE notes SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", n));
          batch.areas?.forEach((a) => dbClient.run("UPDATE areas SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", a));
          batch.quotes?.forEach((q) => dbClient.run("UPDATE quotes SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", q));
          batch.movie_quotes?.forEach((mq) => dbClient.run("UPDATE movie_quotes SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", mq));
          batch.pdfs?.forEach((p) => dbClient.run("UPDATE pdfs SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", p));
          batch.images?.forEach((img) => dbClient.run("UPDATE images SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", img));
        } catch (err) {
          console.error("Local batch coordinate write error:", err);
        }
      }

      fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      }).catch((err) => console.error("Failed to batch save group layout:", err));
      dragRef.current = null;
      return;
    }

    if (drag.type === "lasso") {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - pan.x) / scale;
      const currentY = (e.clientY - rect.top - pan.y) / scale;

      const lx1 = Math.min(drag.startX, currentX);
      const ly1 = Math.min(drag.startY, currentY);
      const lx2 = Math.max(drag.startX, currentX);
      const ly2 = Math.max(drag.startY, currentY);
      const lw = lx2 - lx1;
      const lh = ly2 - ly1;

      if (lw > 5 && lh > 5) {

        const newSelected = [];
        const visibleBookIds = new Set(filteredBooks.map(b => b.id));
        const visibleNoteIds = new Set(filteredNotes.map(n => n.id));
        const visiblePdfIds = new Set(filteredPdfs.map(p => p.id));
        const visibleAreaIds = new Set(filteredAreas.map(a => a.id));
        const visibleQuoteIds = new Set(filteredQuotes.map(q => q.id));
        const visibleImageIds = new Set(filteredImages.map(img => img.id));

        booksRef.current.forEach((b) => {
          if (!visibleBookIds.has(b.id)) return;
          const w = 192;
          const h = b.cover_url ? 320 : 160;
          const intersects = !(b.x_pos + w < lx1 || b.x_pos > lx2 || b.y_pos + h < ly1 || b.y_pos > ly2);
          if (intersects) newSelected.push({ id: b.id, type: "book" });
        });

        notesRef.current.forEach((n) => {
          if (!visibleNoteIds.has(n.id)) return;
          const w = n.width || 220;
          const h = n.height || 150;
          const intersects = !(n.x_pos + w < lx1 || n.x_pos > lx2 || n.y_pos + h < ly1 || n.y_pos > ly2);
          if (intersects) newSelected.push({ id: n.id, type: "note" });
        });

        pdfsRef.current.forEach((p) => {
          if (!visiblePdfIds.has(p.id)) return;
          const w = p.width || 450;
          const h = p.height || 600;
          const intersects = !(p.x_pos + w < lx1 || p.x_pos > lx2 || p.y_pos + h < ly1 || p.y_pos > ly2);
          if (intersects) newSelected.push({ id: p.id, type: "pdf" });
        });

        imagesRef.current.forEach((img) => {
          if (!visibleImageIds.has(img.id)) return;
          const w = img.width || 300;
          const h = img.height || 300;
          const intersects = !(img.x_pos + w < lx1 || img.x_pos > lx2 || img.y_pos + h < ly1 || img.y_pos > ly2);
          if (intersects) newSelected.push({ id: img.id, type: "image" });
        });

        areasRef.current.forEach((a) => {
          if (!visibleAreaIds.has(a.id)) return;
          const w = a.width || 200;
          const h = a.height || 200;
          const intersects = !(a.x_pos + w < lx1 || a.x_pos > lx2 || a.y_pos + h < ly1 || a.y_pos > ly2);
          if (intersects) newSelected.push({ id: a.id, type: "area" });
        });

        quotesRef.current.forEach((q) => {
          if (!visibleQuoteIds.has(q.id)) return;
          const w = 140;
          const h = 80;
          const intersects = !(q.x_pos + w < lx1 || q.x_pos > lx2 || q.y_pos + h < ly1 || q.y_pos > ly2);
          if (intersects) newSelected.push({ id: q.id, type: "quote" });
        });

        const visibleMovieIds = new Set(filteredMovies.map(m => m.id));
        moviesRef.current.forEach((m) => {
          if (!visibleMovieIds.has(m.id)) return;
          const w = 192;
          const h = 300;
          const intersects = !(m.x_pos + w < lx1 || m.x_pos > lx2 || m.y_pos + h < ly1 || m.y_pos > ly2);
          if (intersects) newSelected.push({ id: m.id, type: "movie" });
        });

        setSelectedNodes(newSelected);
      } else {
        setSelectedNodes([]);
      }
      setTempLassoBox(null);
      setIsLassoMode(false);
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
          if (isDbReady) {
            try {
              dbClient.run("UPDATE books SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", { id: book.id, x_pos: book.x_pos, y_pos: book.y_pos });
            } catch (err) {
              console.error(err);
            }
          }
          fetch("/api/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ books: [{ id: book.id, x_pos: book.x_pos, y_pos: book.y_pos }] }),
          }).catch((err) => console.error(err));
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
    } else if (drag.type === "movie") {
      if (drag.hasMoved) {
        const movie = moviesRef.current.find((m) => m.id === drag.id);
        if (movie) {
          if (isDbReady) {
            try {
              dbClient.run("UPDATE movies SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", { id: movie.id, x_pos: movie.x_pos, y_pos: movie.y_pos });
            } catch (err) {
              console.error(err);
            }
          }
          fetch("/api/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ movies: [{ id: movie.id, x_pos: movie.x_pos, y_pos: movie.y_pos }] }),
          }).catch((err) => console.error(err));
        }
      } else {
        if (e.shiftKey) {
          const isSelected = selectedNodesRef.current.some((n) => n.id === drag.id && n.type === "movie");
          setSelectedNodes((prev) =>
            isSelected
              ? prev.filter((n) => !(n.id === drag.id && n.type === "movie"))
              : [...prev, { id: drag.id, type: "movie" }]
          );
        } else {
          setSelectedNodes([]);
          if (connectionSourceRef.current) {
            createLink(connectionSourceRef.current, { id: drag.id, type: "movie" });
            setConnectionSource(null);
          } else {
            const movie = moviesRef.current.find((m) => m.id === drag.id);
            if (movie) {
              setSelectedMovie(movie);
            }
          }
        }
      }
    } else if (drag.type === "quote") {
      if (drag.hasMoved) {
        const quote = quotesRef.current.find((q) => q.id === drag.id);
        if (quote) {
          const isMovieQuote = quote.movie_id !== undefined;
          if (isDbReady) {
            try {
              if (isMovieQuote) {
                dbClient.run("UPDATE movie_quotes SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", { id: quote.id, x_pos: quote.x_pos, y_pos: quote.y_pos });
              } else {
                dbClient.run("UPDATE quotes SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", { id: quote.id, x_pos: quote.x_pos, y_pos: quote.y_pos });
              }
            } catch (err) {
              console.error(err);
            }
          }
          fetch("/api/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              isMovieQuote 
                ? { movie_quotes: [{ id: quote.id, x_pos: quote.x_pos, y_pos: quote.y_pos }] }
                : { quotes: [{ id: quote.id, x_pos: quote.x_pos, y_pos: quote.y_pos }] }
            ),
          }).catch((err) => console.error(err));
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
        const batch = { books: [], movies: [], notes: [], areas: [], quotes: [], movie_quotes: [], pdfs: [], images: [] };
        const area = areasRef.current.find((a) => a.id === drag.id);
        if (area) {
          batch.areas.push({ id: area.id, x_pos: area.x_pos, y_pos: area.y_pos, width: area.width || 200, height: area.height || 200 });
        }

        // Persist new coordinates of all grouped elements
        if (drag.type === "area" && drag.containedItems) {
          const { books: cBooks, movies: cMovies, quotes: cQuotes, notes: cNotes, pdfs: cPdfs, images: cImages } = drag.containedItems;
          
          cBooks?.forEach((cb) => {
            const b = booksRef.current.find((book) => book.id === cb.id);
            if (b) batch.books.push({ id: b.id, x_pos: b.x_pos, y_pos: b.y_pos });
          });

          cMovies?.forEach((cm) => {
            const m = moviesRef.current.find((movie) => movie.id === cm.id);
            if (m) batch.movies.push({ id: m.id, x_pos: m.x_pos, y_pos: m.y_pos });
          });

          cQuotes?.forEach((cq) => {
            const q = quotesRef.current.find((quote) => quote.id === cq.id);
            if (q) {
              if (q.movie_id !== undefined) {
                batch.movie_quotes.push({ id: q.id, x_pos: q.x_pos, y_pos: q.y_pos });
              } else {
                batch.quotes.push({ id: q.id, x_pos: q.x_pos, y_pos: q.y_pos });
              }
            }
          });

          cNotes?.forEach((cn) => {
            const n = notesRef.current.find((note) => note.id === cn.id);
            if (n) batch.notes.push({ id: n.id, x_pos: n.x_pos, y_pos: n.y_pos, width: n.width || 220, height: n.height || 150 });
          });

          cPdfs?.forEach((cp) => {
            const p = pdfsRef.current.find((pdf) => pdf.id === cp.id);
            if (p) batch.pdfs.push({ id: p.id, x_pos: p.x_pos, y_pos: p.y_pos, width: p.width || 450, height: p.height || 600 });
          });

          cImages?.forEach((cimg) => {
            const img = imagesRef.current.find((image) => image.id === cimg.id);
            if (img) batch.images.push({ id: img.id, x_pos: img.x_pos, y_pos: img.y_pos, width: img.width || 300, height: img.height || 300 });
          });
        }

        if (isDbReady) {
          try {
            batch.movies?.forEach((m) => dbClient.run("UPDATE movies SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", m));
            batch.books?.forEach((b) => dbClient.run("UPDATE books SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", b));
            batch.notes?.forEach((n) => dbClient.run("UPDATE notes SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", n));
            batch.areas?.forEach((a) => dbClient.run("UPDATE areas SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", a));
            batch.quotes?.forEach((q) => dbClient.run("UPDATE quotes SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", q));
            batch.movie_quotes?.forEach((mq) => dbClient.run("UPDATE movie_quotes SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id", mq));
            batch.pdfs?.forEach((p) => dbClient.run("UPDATE pdfs SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", p));
            batch.images?.forEach((img) => dbClient.run("UPDATE images SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", img));
          } catch (err) {
            console.error("Local batch coordinate write error in area drop:", err);
          }
        }

        fetch("/api/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batch),
        }).catch((err) => console.error(err));
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
            if (isDbReady) {
              try {
                dbClient.run("UPDATE notes SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", { id: note.id, x_pos: note.x_pos, y_pos: note.y_pos, width: note.width || 220, height: note.height || 150 });
              } catch (err) {
                console.error(err);
              }
            }
            fetch("/api/batch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ notes: [{ id: note.id, x_pos: note.x_pos, y_pos: note.y_pos, width: note.width || 220, height: note.height || 150 }] }),
            }).catch((err) => console.error(err));
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
      } else {
        // note-resize
        if (drag.hasMoved) {
          const note = notesRef.current.find((n) => n.id === drag.id);
          if (note) {
            if (isDbReady) {
              try {
                dbClient.run("UPDATE notes SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", { id: note.id, x_pos: note.x_pos, y_pos: note.y_pos, width: note.width || 220, height: note.height || 150 });
              } catch (err) {
                console.error(err);
              }
            }
            fetch("/api/batch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ notes: [{ id: note.id, x_pos: note.x_pos, y_pos: note.y_pos, width: note.width || 220, height: note.height || 150 }] }),
            }).catch((err) => console.error(err));
          }
        }
      }
    } else if (drag.type === "pdf" || drag.type === "pdf-resize") {
      if (drag.type === "pdf") {
        if (drag.hasMoved) {
          const pdf = pdfsRef.current.find((p) => p.id === drag.id);
          if (pdf) {
            if (isDbReady) {
              try {
                dbClient.run("UPDATE pdfs SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", { id: pdf.id, x_pos: pdf.x_pos, y_pos: pdf.y_pos, width: pdf.width || 450, height: pdf.height || 600 });
              } catch (err) {
                console.error(err);
              }
            }
            fetch("/api/batch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pdfs: [{ id: pdf.id, x_pos: pdf.x_pos, y_pos: pdf.y_pos, width: pdf.width || 450, height: pdf.height || 600 }] }),
            }).catch((err) => console.error(err));
          }
        } else {
          if (e.shiftKey) {
            const isSelected = selectedNodesRef.current.some((n) => n.id === drag.id && n.type === "pdf");
            setSelectedNodes((prev) =>
              isSelected
                ? prev.filter((n) => !(n.id === drag.id && n.type === "pdf"))
                : [...prev, { id: drag.id, type: "pdf" }]
            );
          } else {
            setSelectedNodes([]);
            if (connectionSourceRef.current) {
              createLink(connectionSourceRef.current, { id: drag.id, type: "pdf" });
              setConnectionSource(null);
            }
          }
        }
      } else {
        // pdf-resize
        if (drag.hasMoved) {
          const pdf = pdfsRef.current.find((p) => p.id === drag.id);
          if (pdf) {
            if (isDbReady) {
              try {
                dbClient.run("UPDATE pdfs SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", { id: pdf.id, x_pos: pdf.x_pos, y_pos: pdf.y_pos, width: pdf.width || 450, height: pdf.height || 600 });
              } catch (err) {
                console.error(err);
              }
            }
            fetch("/api/batch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pdfs: [{ id: pdf.id, x_pos: pdf.x_pos, y_pos: pdf.y_pos, width: pdf.width || 450, height: pdf.height || 600 }] }),
            }).catch((err) => console.error(err));
          }
        }
      }
    } else if (drag.type === "image" || drag.type === "image-resize") {
      if (drag.type === "image") {
        if (drag.hasMoved) {
          const image = imagesRef.current.find((img) => img.id === drag.id);
          if (image) {
            if (isDbReady) {
              try {
                dbClient.run("UPDATE images SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", { id: image.id, x_pos: image.x_pos, y_pos: image.y_pos, width: image.width || 300, height: image.height || 300 });
              } catch (err) {
                console.error(err);
              }
            }
            fetch("/api/batch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ images: [{ id: image.id, x_pos: image.x_pos, y_pos: image.y_pos, width: image.width || 300, height: image.height || 300 }] }),
            }).catch((err) => console.error(err));
          }
        } else {
          if (e.shiftKey) {
            const isSelected = selectedNodesRef.current.some((n) => n.id === drag.id && n.type === "image");
            setSelectedNodes((prev) =>
              isSelected
                ? prev.filter((n) => !(n.id === drag.id && n.type === "image"))
                : [...prev, { id: drag.id, type: "image" }]
            );
          } else {
            setSelectedNodes([]);
            if (connectionSourceRef.current) {
              createLink(connectionSourceRef.current, { id: drag.id, type: "image" });
              setConnectionSource(null);
            }
          }
        }
      } else {
        // image-resize
        if (drag.hasMoved) {
          const image = imagesRef.current.find((img) => img.id === drag.id);
          if (image) {
            if (isDbReady) {
              try {
                dbClient.run("UPDATE images SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id", { id: image.id, x_pos: image.x_pos, y_pos: image.y_pos, width: image.width || 300, height: image.height || 300 });
              } catch (err) {
                console.error(err);
              }
            }
            fetch("/api/batch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ images: [{ id: image.id, x_pos: image.x_pos, y_pos: image.y_pos, width: image.width || 300, height: image.height || 300 }] }),
            }).catch((err) => console.error(err));
          }
        }
      }
    }

    if (drag && drag.hasMoved && tempSnapshotRef.current) {
      undoStackRef.current.push(tempSnapshotRef.current);
      if (undoStackRef.current.length > 50) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
    }
    tempSnapshotRef.current = null;

    setIsDragging(false);
    setDraggedNode(null);
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

      // Undo / Redo shortcuts (only when not typing in form fields)
      if (!isTyping && (e.ctrlKey || e.metaKey)) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) {
            performRedo();
          } else {
            performUndo();
          }
        } else if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          performRedo();
        }
      }

      if (e.key === "Escape") {
        if (connectionSourceRef.current) {
          setConnectionSource(null);
        }
        if (isLassoMode || isHandwritingMode) {
          setIsLassoMode(false);
          setIsHandwritingMode(false);
        } else {
          setSelectedNodes([]);
        }
      }

      if (!isTyping) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (selectedNodesRef.current.length > 0) {
            e.preventDefault();
            handleBulkDelete();
            return;
          }
        }
        const num = parseInt(e.key);
        if (!isNaN(num) && num >= 1 && num <= 9) {
          e.preventDefault();
          const targetPresetIdx = num - 1;
          if (presetsRef.current && presetsRef.current[targetPresetIdx]) {
            const pr = presetsRef.current[targetPresetIdx];
            setPan({ x: pr.pan_x, y: pr.pan_y });
            setScale(pr.scale);
            showToast(`TELEPORTED TO PRESET ${num}: "${pr.name.toUpperCase()}"`);
          } else {
            showToast(`NO VIEWPORT PRESET ASSIGNED TO SLOT ${num}`);
          }
        } else if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          handleCreateNote();
        } else if (e.key === "h" || e.key === "H") {
          e.preventDefault();
          setIsHandwritingMode((prev) => {
            const next = !prev;
            if (next) {
              setIsDrawingMode(false);
              setIsLassoMode(false);
            }
            return next;
          });
        } else if (e.key === "l" || e.key === "L") {
          e.preventDefault();
          setIsLassoMode((prev) => {
            const next = !prev;
            if (next) {
              setIsHandwritingMode(false);
              setIsDrawingMode(false);
            }
            return next;
          });
        } else if (isHandwritingMode) {
          if (e.key === "e" || e.key === "E") {
            e.preventDefault();
            setBrushMode("erase");
          } else if (e.key === "b" || e.key === "B") {
            e.preventDefault();
            setBrushMode("draw");
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresentationMode, currentPresentationIndex, presets, isHandwritingMode, isLassoMode]);

  // Clipboard Paste support to spawn notes and upload/spawn images
  useEffect(() => {
    const handlePaste = async (e) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable);
      if (isTyping) return; // Let browser handle normal inputs

      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = (rect.width / 2 - panRef.current.x) / scaleRef.current;
      const y = (rect.height / 2 - panRef.current.y) / scaleRef.current;

      // Try pasting image files
      if (clipboardData.files && clipboardData.files.length > 0) {
        const file = clipboardData.files[0];
        if (file.type.startsWith("image/")) {
          e.preventDefault();
          showToast("PASTING IMAGE TO CANVAS...");
          await handleCreateImage(file, x - 150, y - 150);
          return;
        }
      }

      // Try pasting text
      const text = clipboardData.getData("text");
      if (text && text.trim()) {
        e.preventDefault();
        showToast("PASTING INDEX CARD...");
        await handleCreateNote(x - 110, y - 75, text.trim());
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isPresentationMode || !isPresentationAutoPlay || presets.length === 0) return;

    const timer = setInterval(() => {
      jumpToSlide(currentPresentationIndex + 1);
    }, presentationInterval);

    return () => clearInterval(timer);
  }, [isPresentationMode, isPresentationAutoPlay, currentPresentationIndex, presentationInterval, presets.length]);

  useEffect(() => {
    const handleWheelEvent = (e) => {
      const isZoomGesture = e.ctrlKey || e.metaKey;

      if (isZoomGesture) {
        e.preventDefault();
        triggerZoomActive();
        setSelectedNodes((prev) => prev.filter((n) => n.type !== "pdf"));
        
        const isTrackpadPinch = e.ctrlKey && !e.metaKey;
        const multiplier = isTrackpadPinch ? 0.015 : 0.003;
        
        const delta = -e.deltaY;
        const zoomFactor = Math.exp(delta * multiplier);
        
        const currentScale = scaleRef.current;
        const currentPan = panRef.current;
        
        const nextScale = Math.min(Math.max(currentScale * zoomFactor, 0.15), 3);
        
        const targetCanvas = canvasRef.current;
        if (!targetCanvas) return;
        const rect = targetCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const canvasMouseX = (mouseX - currentPan.x) / currentScale;
        const canvasMouseY = (mouseY - currentPan.y) / currentScale;
        
        const nextPan = {
          x: mouseX - canvasMouseX * nextScale,
          y: mouseY - canvasMouseY * nextScale,
        };
        
        setScale(nextScale);
        setPan(nextPan);
        
        scaleRef.current = nextScale;
        panRef.current = nextPan;
      } else {
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
        // Panning behavior (Miro/Figma swipe gesture or standard Scroll)
        const nextPan = {
          x: panRef.current.x - e.deltaX,
          y: panRef.current.y - e.deltaY,
        };
        setPan(nextPan);
        panRef.current = nextPan;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
      }
    };

    let gestureStartScale = 1;
    const handleGestureStart = (e) => {
      e.preventDefault();
      gestureStartScale = scaleRef.current;
      setSelectedNodes((prev) => prev.filter((n) => n.type !== "pdf"));
    };

    const handleGestureChange = (e) => {
      e.preventDefault();
      triggerZoomActive();
      const currentScale = scaleRef.current;
      const currentPan = panRef.current;
      
      const nextScale = Math.min(Math.max(gestureStartScale * e.scale, 0.15), 3);
      
      const targetCanvas = canvasRef.current;
      if (!targetCanvas) return;
      const rect = targetCanvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const canvasMouseX = (mouseX - currentPan.x) / currentScale;
      const canvasMouseY = (mouseY - currentPan.y) / currentScale;
      
      const nextPan = {
        x: mouseX - canvasMouseX * nextScale,
        y: mouseY - canvasMouseY * nextScale,
      };
      
      setScale(nextScale);
      setPan(nextPan);
      
      scaleRef.current = nextScale;
      panRef.current = nextPan;
    };

    window.addEventListener("wheel", handleWheelEvent, { passive: false, capture: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });
    window.addEventListener("gesturestart", handleGestureStart, { passive: false, capture: true });
    window.addEventListener("gesturechange", handleGestureChange, { passive: false, capture: true });

    return () => {
      window.removeEventListener("wheel", handleWheelEvent, { capture: true });
      window.removeEventListener("touchmove", handleTouchMove, { capture: true });
      window.removeEventListener("gesturestart", handleGestureStart, { capture: true });
      window.removeEventListener("gesturechange", handleGestureChange, { capture: true });
    };
  }, [triggerZoomActive]);

  useEffect(() => {
    const handleIframeMessage = (e) => {
      if (e.data && e.data.type === "IFRAME_ZOOM") {
        triggerZoomActive();
        setSelectedNodes((prev) => prev.filter((n) => n.type !== "pdf"));
        const { deltaY, clientX, clientY, ctrlKey, metaKey } = e.data;
        const iframes = Array.from(document.querySelectorAll("iframe"));
        const iframe = iframes.find((f) => f.contentWindow === e.source);
        if (!iframe) return;

        const rect = iframe.getBoundingClientRect();
        const windowClientX = rect.left + clientX;
        const windowClientY = rect.top + clientY;

        const isTrackpadPinch = ctrlKey && !metaKey;
        const multiplier = isTrackpadPinch ? 0.015 : 0.003;
        
        const delta = -deltaY;
        const zoomFactor = Math.exp(delta * multiplier);

        const currentScale = scaleRef.current;
        const currentPan = panRef.current;
        const nextScale = Math.min(Math.max(currentScale * zoomFactor, 0.15), 3);

        const targetCanvas = canvasRef.current;
        if (!targetCanvas) return;
        const canvasRect = targetCanvas.getBoundingClientRect();

        const mouseX = windowClientX - canvasRect.left;
        const mouseY = windowClientY - canvasRect.top;

        const canvasMouseX = (mouseX - currentPan.x) / currentScale;
        const canvasMouseY = (mouseY - currentPan.y) / currentScale;

        const nextPan = {
          x: mouseX - canvasMouseX * nextScale,
          y: mouseY - canvasMouseY * nextScale,
        };

        setScale(nextScale);
        setPan(nextPan);
        scaleRef.current = nextScale;
        panRef.current = nextPan;
      } else if (e.data && e.data.type === "IFRAME_PAN") {
        const { deltaX, deltaY } = e.data;
        const nextPan = {
          x: panRef.current.x - deltaX,
          y: panRef.current.y - deltaY,
        };
        setPan(nextPan);
        panRef.current = nextPan;
      } else if (e.data && e.data.type === "IFRAME_PINCH_START") {
        setSelectedNodes((prev) => prev.filter((n) => n.type !== "pdf"));
      } else if (e.data && e.data.type === "IFRAME_TOUCH_GESTURE_START") {
        triggerZoomActive();
        setSelectedNodes((prev) => prev.filter((n) => n.type !== "pdf"));
        const { dist, clientX, clientY } = e.data;
        const iframes = Array.from(document.querySelectorAll("iframe"));
        const iframe = iframes.find((f) => f.contentWindow === e.source);
        if (!iframe) return;
        const rect = iframe.getBoundingClientRect();
        const windowClientX = rect.left + clientX;
        const windowClientY = rect.top + clientY;

        gestureStartDistRef.current = dist;
        gestureStartScaleRef.current = scaleRef.current;
        gestureStartPanRef.current = { ...panRef.current };
        gestureStartCenterRef.current = { x: windowClientX, y: windowClientY };
        isGestureActiveRef.current = true;
      } else if (e.data && e.data.type === "IFRAME_TOUCH_GESTURE_MOVE") {
        if (!isGestureActiveRef.current) return;
        const { dist, clientX, clientY } = e.data;
        const iframes = Array.from(document.querySelectorAll("iframe"));
        const iframe = iframes.find((f) => f.contentWindow === e.source);
        if (!iframe) return;
        const rect = iframe.getBoundingClientRect();
        const windowClientX = rect.left + clientX;
        const windowClientY = rect.top + clientY;

        const currentDist = dist;
        const currentCenter = { x: windowClientX, y: windowClientY };

        let newScale = scaleRef.current;
        if (gestureStartDistRef.current > 0) {
          const ratio = currentDist / gestureStartDistRef.current;
          newScale = Math.min(Math.max(gestureStartScaleRef.current * ratio, 0.15), 3);
        }

        const deltaCenter = {
          x: currentCenter.x - gestureStartCenterRef.current.x,
          y: currentCenter.y - gestureStartCenterRef.current.y,
        };

        const targetCanvas = canvasRef.current;
        if (!targetCanvas) return;
        const canvasRect = targetCanvas.getBoundingClientRect();
        const gestureX = gestureStartCenterRef.current.x - canvasRect.left;
        const gestureY = gestureStartCenterRef.current.y - canvasRect.top;

        const canvasX = (gestureX - gestureStartPanRef.current.x) / gestureStartScaleRef.current;
        const canvasY = (gestureY - gestureStartPanRef.current.y) / gestureStartScaleRef.current;

        const nextPan = {
          x: (gestureX + deltaCenter.x) - canvasX * newScale,
          y: (gestureY + deltaCenter.y) - canvasY * newScale,
        };

        setScale(newScale);
        setPan(nextPan);
        scaleRef.current = newScale;
        panRef.current = nextPan;
      } else if (e.data && e.data.type === "IFRAME_TOUCH_GESTURE_END") {
        isGestureActiveRef.current = false;
        gestureStartDistRef.current = 0;
      }
    };

    window.addEventListener("message", handleIframeMessage);
    return () => {
      window.removeEventListener("message", handleIframeMessage);
    };
  }, [triggerZoomActive]);

  useEffect(() => {
    const trackPointerDown = (e) => {
      activePointersRef.current.set(e.pointerId, {
        clientX: e.clientX,
        clientY: e.clientY,
        pointerType: e.pointerType,
      });

      if (activePointersRef.current.size >= 2) {
        setSelectedNodes((prev) => prev.filter((n) => n.type !== "pdf"));
        const pointers = Array.from(activePointersRef.current.values());
        const dx = pointers[0].clientX - pointers[1].clientX;
        const dy = pointers[0].clientY - pointers[1].clientY;
        gestureStartDistRef.current = Math.hypot(dx, dy);
        gestureStartScaleRef.current = scaleRef.current;
        gestureStartPanRef.current = { ...panRef.current };
        gestureStartCenterRef.current = {
          x: (pointers[0].clientX + pointers[1].clientX) / 2,
          y: (pointers[0].clientY + pointers[1].clientY) / 2,
        };
        isGestureActiveRef.current = true;
      }
    };

    const trackPointerMove = (e) => {
      if (activePointersRef.current.has(e.pointerId)) {
        activePointersRef.current.set(e.pointerId, {
          clientX: e.clientX,
          clientY: e.clientY,
          pointerType: e.pointerType,
        });

        if (activePointersRef.current.size >= 2 && isGestureActiveRef.current) {
          const pointers = Array.from(activePointersRef.current.values());
          const p1 = pointers[0];
          const p2 = pointers[1];
          const currentDist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
          const currentCenter = {
            x: (p1.clientX + p2.clientX) / 2,
            y: (p1.clientY + p2.clientY) / 2,
          };

          let newScale = scaleRef.current;
          if (gestureStartDistRef.current > 0) {
            const ratio = currentDist / gestureStartDistRef.current;
            newScale = Math.min(Math.max(gestureStartScaleRef.current * ratio, 0.15), 3);
          }

          const deltaCenter = {
            x: currentCenter.x - gestureStartCenterRef.current.x,
            y: currentCenter.y - gestureStartCenterRef.current.y,
          };

          const targetCanvas = canvasRef.current;
          if (targetCanvas) {
            const rect = targetCanvas.getBoundingClientRect();
            const gestureX = gestureStartCenterRef.current.x - rect.left;
            const gestureY = gestureStartCenterRef.current.y - rect.top;

            const canvasX = (gestureX - gestureStartPanRef.current.x) / gestureStartScaleRef.current;
            const canvasY = (gestureY - gestureStartPanRef.current.y) / gestureStartScaleRef.current;

            const nextPan = {
              x: (gestureX + deltaCenter.x) - canvasX * newScale,
              y: (gestureY + deltaCenter.y) - canvasY * newScale,
            };

            setPan(nextPan);
            setScale(newScale);
            panRef.current = nextPan;
            scaleRef.current = newScale;
          }
        }
      }
    };

    const trackPointerUp = (e) => {
      activePointersRef.current.delete(e.pointerId);
      if (activePointersRef.current.size < 2) {
        isGestureActiveRef.current = false;
        gestureStartDistRef.current = 0;
      }
    };

    window.addEventListener("pointerdown", trackPointerDown, { capture: true });
    window.addEventListener("pointermove", trackPointerMove, { capture: true });
    window.addEventListener("pointerup", trackPointerUp, { capture: true });
    window.addEventListener("pointercancel", trackPointerUp, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", trackPointerDown, { capture: true });
      window.removeEventListener("pointermove", trackPointerMove, { capture: true });
      window.removeEventListener("pointerup", trackPointerUp, { capture: true });
      window.removeEventListener("pointercancel", trackPointerUp, { capture: true });
    };
  }, []);

  const handleCanvasDrop = async (e) => {
    e.preventDefault();
    if (dragRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dropX = (e.clientX - rect.left - pan.x) / scale;
    const dropY = (e.clientY - rect.top - pan.y) / scale;

    // Check if dragging files first
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
        let x = dropX - 225;
        let y = dropY - 300;
        if (snapToGrid) {
          x = Math.round(x / 20) * 20;
          y = Math.round(y / 20) * 20;
        }
        await handleCreatePdf(file, x, y);
      } else if (file && file.type.startsWith("image/")) {
        let x = dropX - 150;
        let y = dropY - 150;
        if (snapToGrid) {
          x = Math.round(x / 20) * 20;
          y = Math.round(y / 20) * 20;
        }
        await handleCreateImage(file, x, y);
      }
      return;
    }

    // Otherwise, check for text drop
    let text = e.dataTransfer.getData("text/plain");
    let pdfSourceId = e.dataTransfer.getData("application/x-pdf-source-id");

    // Fallback: if dragging was too fast and metadata/text is missing, query iframe selection directly
    if ((!text || !text.trim()) || !pdfSourceId) {
      const iframes = document.querySelectorAll('iframe[src*="pdf-viewer.html"]');
      for (const iframe of iframes) {
        if (iframe.contentWindow) {
          try {
            const sel = iframe.contentWindow.getSelection().toString();
            if (sel && sel.trim()) {
              if (!text || !text.trim()) {
                text = sel;
              }
              if (!pdfSourceId) {
                const url = new URL(iframe.src, window.location.href);
                pdfSourceId = url.searchParams.get("pdfId");
              }
              break;
            }
          } catch (err) {
            // same-origin window selection access fallback safety
          }
        }
      }
    }

    if (text && text.trim()) {
      saveStateBeforeMutation();
      let x = dropX - 110;
      let y = dropY - 75;
      if (snapToGrid) {
        x = Math.round(x / 20) * 20;
        y = Math.round(y / 20) * 20;
      }
      const noteData = await handleCreateNote(x, y, text.trim(), true);
      
      // If there's a source PDF card dragging this quote, spawn connection link
      if (noteData && pdfSourceId) {
        try {
          const linkRes = await fetch("/api/links", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source_id: pdfSourceId,
              source_type: "pdf",
              target_id: noteData.id,
              target_type: "note",
              label: "Source Citation",
              type: "default",
              arrow: "target",
              speed: "normal",
              shape: "curved"
            }),
          });
          if (linkRes.ok) {
            const linkData = await linkRes.json();
            setLinks((prev) => [...prev, linkData]);
          }
        } catch (err) {
          console.error("Failed to link dropped note to PDF source:", err);
        }
      }
    }
  };

  const handleBookClick = (book) => {
    setSelectedBook(book);
  };

  const filteredBooks = books.filter(b => 
    filters.showBooks && 
    ((b.status === "To Read" && filters.statusToRead) ||
     (b.status === "Reading" && filters.statusReading) ||
     (b.status === "Completed" && filters.statusCompleted)) &&
    (b.rating >= filters.minRating) &&
    (!filters.showOnlyOrphans || !links.some(l => l.source_id === b.id || l.target_id === b.id))
  ).sort((a, b) => (a.z_index || 0) - (b.z_index || 0));

  const filteredNotes = notes.filter(n => 
    filters.showNotes &&
    (!filters.showOnlyOrphans || !links.some(l => l.source_id === n.id || l.target_id === n.id))
  ).sort((a, b) => (a.z_index || 0) - (b.z_index || 0));

  const filteredPdfs = pdfs.filter(p => 
    filters.showPdfs &&
    (!filters.showOnlyOrphans || !links.some(l => l.source_id === p.id || l.target_id === p.id))
  ).sort((a, b) => (a.z_index || 0) - (b.z_index || 0));

  const filteredImages = images.filter(img => 
    filters.showImages &&
    (!filters.showOnlyOrphans || !links.some(l => l.source_id === img.id || l.target_id === img.id))
  ).sort((a, b) => (a.z_index || 0) - (b.z_index || 0));

  const filteredAreas = areas.filter(a => 
    filters.showAreas &&
    (!filters.showOnlyOrphans || !links.some(l => l.source_id === a.id || l.target_id === a.id))
  ).sort((a, b) => (a.z_index || 0) - (b.z_index || 0));

  const filteredQuotes = quotes.filter(q => {
    if (!filters.showQuotes) return false;
    const parentBook = books.find(b => b.id === q.book_id);
    let matchBook = true;
    if (parentBook) {
      matchBook = (
        ((parentBook.status === "To Read" && filters.statusToRead) ||
         (parentBook.status === "Reading" && filters.statusReading) ||
         (parentBook.status === "Completed" && filters.statusCompleted)) &&
        (parentBook.rating >= filters.minRating)
      );
    }
    return matchBook && (!filters.showOnlyOrphans || !links.some(l => l.source_id === q.id || l.target_id === q.id));
  }).sort((a, b) => (a.z_index || 0) - (b.z_index || 0));

  const filteredMovies = movies.filter(m =>
    filters.showMovies !== false &&
    (!filters.showOnlyOrphans || !links.some(l => l.source_id === m.id || l.target_id === m.id))
  ).sort((a, b) => (a.z_index || 0) - (b.z_index || 0));

  const filteredLinks = links.filter(l => {
    const sourceExists = 
      (l.source_type === "book" && filteredBooks.some(b => b.id === l.source_id)) ||
      (l.source_type === "note" && filteredNotes.some(n => n.id === l.source_id)) ||
      (l.source_type === "pdf" && filteredPdfs.some(p => p.id === l.source_id)) ||
      (l.source_type === "image" && filteredImages.some(img => img.id === l.source_id)) ||
      (l.source_type === "area" && filteredAreas.some(a => a.id === l.source_id)) ||
      (l.source_type === "movie" && filteredMovies.some(m => m.id === l.source_id)) ||
      (l.source_type === "quote" && filteredQuotes.some(q => q.id === l.source_id));
      
    const targetExists = 
      (l.target_type === "book" && filteredBooks.some(b => b.id === l.target_id)) ||
      (l.target_type === "note" && filteredNotes.some(n => n.id === l.target_id)) ||
      (l.target_type === "pdf" && filteredPdfs.some(p => p.id === l.target_id)) ||
      (l.target_type === "image" && filteredImages.some(img => img.id === l.target_id)) ||
      (l.target_type === "area" && filteredAreas.some(a => a.id === l.target_id)) ||
      (l.target_type === "movie" && filteredMovies.some(m => m.id === l.target_id)) ||
      (l.target_type === "quote" && filteredQuotes.some(q => q.id === l.target_id));
      
    return sourceExists && targetExists;
  });

  const getIsHoveredOrConnected = (id, type) => {
    if (!hoveredNode) return true;
    if (hoveredNode.id === id && hoveredNode.type === type) return true;
    return links.some(l => 
      ((l.source_id === hoveredNode.id && l.source_type === hoveredNode.type) && (l.target_id === id && l.target_type === type)) ||
      ((l.target_id === hoveredNode.id && l.target_type === hoveredNode.type) && (l.source_id === id && l.source_type === type))
    );
  };

  const isDraggingActive = isDragging || !!connectionSource;
  const isCanvasInteractMode = !isHandwritingMode && !isLassoMode && !isDrawingMode;
  const isNodeInteractive = isCanvasInteractMode && !isZooming;
  const canvasCursor = isHandwritingMode 
    ? (brushMode === "erase" ? "cell" : "crosshair") 
    : (isLassoMode ? "crosshair" : (isDrawingMode ? "crosshair" : (isDraggingActive ? "grabbing" : "grab")));

  return (
    <div
      className={`relative w-screen h-screen select-none overflow-hidden ${isDraggingActive ? "is-canvas-dragging" : ""} ${!isCanvasInteractMode ? "is-drawing-mode" : ""}`}
      ref={canvasRef}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onGotPointerCapture={(e) => {
        if (isHandwritingMode && brushMode === "erase") {
          try {
            e.target.releasePointerCapture(e.pointerId);
          } catch (err) {}
        }
      }}
      onContextMenu={handleCanvasContextMenu}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={handleCanvasDrop}
      style={{ cursor: canvasCursor, touchAction: "none" }}
    >
      {/* Minimal status wordmark & coordinates top-left */}
      <div className="fixed top-6 left-6 z-30 pointer-events-none flex flex-col font-mono tracking-widest text-left select-none">
        <span className="text-white text-[11px] font-bold opacity-80 uppercase">Apiron_OS // Workspace</span>
        <span className="text-gray-500 text-[8.5px] mt-0.5 uppercase">
          COORD: {Math.round(-pan.x)}, {Math.round(-pan.y)} | ZOOM: {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Hidden file inputs preserved for bottom toolbar / context menu actions */}
      <input
        id="canvas-pdf-upload-input"
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          let x = 0;
          let y = 0;
          if (pendingPlacement) {
            x = pendingPlacement.x;
            y = pendingPlacement.y;
            setPendingPlacement(null);
          } else {
            const currentPan = panRef.current;
            const currentScale = scaleRef.current;
            const widthFactor = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
            const heightFactor = typeof window !== "undefined" ? window.innerHeight / 2 : 400;
            x = (widthFactor - currentPan.x) / currentScale - 225;
            y = (heightFactor - currentPan.y) / currentScale - 300;
          }
          if (snapToGrid) {
            x = Math.round(x / 20) * 20;
            y = Math.round(y / 20) * 20;
          }
          await handleCreatePdf(file, x, y);
          e.target.value = "";
        }}
      />

      <input
        id="canvas-image-upload-input"
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          let x = 0;
          let y = 0;
          if (pendingPlacement) {
            x = pendingPlacement.x;
            y = pendingPlacement.y;
            setPendingPlacement(null);
          } else {
            const currentPan = panRef.current;
            const currentScale = scaleRef.current;
            const widthFactor = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
            const heightFactor = typeof window !== "undefined" ? window.innerHeight / 2 : 400;
            x = (widthFactor - currentPan.x) / currentScale - 150;
            y = (heightFactor - currentPan.y) / currentScale - 150;
          }
          if (snapToGrid) {
            x = Math.round(x / 20) * 20;
            y = Math.round(y / 20) * 20;
          }
          await handleCreateImage(file, x, y);
          e.target.value = "";
        }}
      />

      <input
        id="hud-restore-input"
        type="file"
        accept=".json"
        onChange={handleRestoreWorkspace}
        style={{ display: "none" }}
      />

      {/* Floating Bottom Toolbar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 bg-[#0a0a0bf0] border border-white/10 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            const input = document.getElementById("canvas-pdf-upload-input");
            if (input) input.click();
          }}
          className="p-2 hover:bg-white/10 border border-white/5 text-[#a855f7] hover:text-white rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer w-9 h-9"
          title="Upload PDF (Research Reference)"
        >
          <span className="text-xs">📎</span>
        </button>
        <button
          type="button"
          onClick={() => {
            const input = document.getElementById("canvas-image-upload-input");
            if (input) input.click();
          }}
          className="p-2 hover:bg-white/10 border border-white/5 text-[#00e1ff] hover:text-white rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer w-9 h-9"
          title="Upload Image"
        >
          <span className="text-xs">🖼️</span>
        </button>
        <button
          type="button"
          onClick={handleBackupWorkspace}
          className="p-2 hover:bg-white/10 border border-white/5 text-[#22c55e] hover:text-white rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer w-9 h-9"
          title="Backup Workspace"
        >
          <span className="text-xs">💾</span>
        </button>
        <button
          type="button"
          onClick={() => {
            const input = document.getElementById("hud-restore-input");
            if (input) input.click();
          }}
          className="p-2 hover:bg-white/10 border border-white/5 text-[#eab308] hover:text-white rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer w-9 h-9"
          title="Restore Workspace"
        >
          <span className="text-xs">📂</span>
        </button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        {/* Lasso Select Mode Toggle */}
        <button
          type="button"
          onClick={() => {
            setIsLassoMode((prev) => {
              const next = !prev;
              if (next) {
                setIsHandwritingMode(false);
                setIsDrawingMode(false);
              }
              return next;
            });
          }}
          className={`p-2 border rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer w-9 h-9 ${
            isLassoMode
              ? "bg-[#00aaff]/20 border-[#00aaff] text-[#00aaff] shadow-[0_0_10px_rgba(0,170,255,0.4)]"
              : "hover:bg-white/10 border-white/5 text-[#00aaff] hover:text-white"
          }`}
          title="Toggle Lasso Select Mode (L) - Click & drag background to select multiple items"
        >
          <span className="text-xs">🎯</span>
        </button>
        {/* Handwriting Sketcing Mode Toggle */}
        <button
          type="button"
          onClick={() => {
            setIsHandwritingMode((prev) => {
              const next = !prev;
              if (next) {
                setIsLassoMode(false);
                setIsDrawingMode(false);
              }
              return next;
            });
          }}
          className={`p-2 border rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer w-9 h-9 ${
            isHandwritingMode
              ? "bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.4)]"
              : "hover:bg-white/10 border-white/5 text-[#22c55e] hover:text-white"
          }`}
          title="Toggle Sketching / Handwriting Mode (H)"
        >
          <span className="text-xs">✏️</span>
        </button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button
          type="button"
          onClick={() => setShowShortcutsHelp(true)}
          className="p-2 hover:bg-white/10 border border-white/5 text-purple-400 hover:text-white rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer font-bold w-9 h-9"
          title="System Shortcuts Cheat Sheet"
        >
          <span className="text-xs">?</span>
        </button>
      </div>


      <div
        className={`absolute top-0 left-0 w-full h-full origin-top-left canvas-nodes-container ${isFocusing ? "focus-transition" : ""}`}
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
        {filteredAreas.map((area) => {
          const isMatched = getAreaMatch(area);
          const ax1 = area.x_pos;
          const ay1 = area.y_pos;
          const ax2 = area.x_pos + (area.width || 200);
          const ay2 = area.y_pos + (area.height || 200);
          const areaBooks = books.filter(b => b.x_pos >= ax1 && b.x_pos <= ax2 && b.y_pos >= ay1 && b.y_pos <= ay2);
          const booksCount = areaBooks.length;
          const completedCount = areaBooks.filter(b => b.status === "Completed").length;
          const isSelected = selectedNodes.some((n) => n.id === area.id && n.type === "area");
          const isHighlighted = teleportHighlightNodeId === area.id;
          const areaZIndex = isSelected || isHighlighted ? 19 : Math.min(18, 10 + (area.z_index || 0));

          return (
            <div
              key={area.id}
              className="transition-all duration-300"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                zIndex: areaZIndex,
                opacity: isMatched ? 1 : 0.15,
                pointerEvents: isNodeInteractive ? (isMatched ? "auto" : "none") : "none",
              }}
              onPointerEnter={() => setHoveredNode({ id: area.id, type: "area" })}
              onPointerLeave={() => setHoveredNode(null)}
              onContextMenu={(e) => {
                if (!isNodeInteractive) return;
                e.preventDefault();
                e.stopPropagation();
                const rect = canvasRef.current.getBoundingClientRect();
                setContextMenu({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  canvasX: (e.clientX - rect.left - pan.x) / scale,
                  canvasY: (e.clientY - rect.top - pan.y) / scale,
                  type: "area",
                  targetId: area.id,
                  item: area
                });
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
                isFocused={false}
                onToggleFocus={handleNodeToggleFocus}
                isHighlighted={teleportHighlightNodeId === area.id}
                isSelected={selectedNodes.some((n) => n.id === area.id && n.type === "area")}
                isPinned={pinnedNodeIds.has(area.id)}
              />
            </div>
          );
        })}

        {/* PDFs Layer */}
        {filteredPdfs.map((pdf) => {
          const isMatched = getPdfMatch(pdf);
          const isPdfDragging = isDragging && draggedNode && (
            draggedNode.id === pdf.id || 
            (draggedNode.groupItems && draggedNode.groupItems.some(gi => gi.id === pdf.id && gi.type === "pdf")) ||
            (draggedNode.type === "area" && draggedNode.containedItems && draggedNode.containedItems.pdfs && draggedNode.containedItems.pdfs.some(cp => cp.id === pdf.id))
          );
          const isSelected = selectedNodes.some((n) => n.id === pdf.id && n.type === "pdf");
          const isHighlighted = teleportHighlightNodeId === pdf.id;
          const isSidebarOpen = openPdfSidebarId === pdf.id;
          const pdfZIndex = isSidebarOpen ? 180 : (isSelected || isHighlighted ? 150 : 40 + (pdf.z_index || 0));
          return (
            <div
              key={pdf.id}
              className="transition-all duration-300"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                zIndex: pdfZIndex,
                opacity: isMatched ? 1 : 0.15,
                pointerEvents: isNodeInteractive ? (isMatched ? "auto" : "none") : "none",
              }}
              onPointerEnter={() => setHoveredNode({ id: pdf.id, type: "pdf" })}
              onPointerLeave={() => setHoveredNode(null)}
              onContextMenu={(e) => {
                if (!isNodeInteractive) return;
                e.preventDefault();
                e.stopPropagation();
                const rect = canvasRef.current.getBoundingClientRect();
                setContextMenu({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  canvasX: (e.clientX - rect.left - pan.x) / scale,
                  canvasY: (e.clientY - rect.top - pan.y) / scale,
                  type: "pdf",
                  targetId: pdf.id,
                  item: pdf
                });
              }}
            >
              <PdfNode
                pdf={pdf}
                onDragStart={handleItemDragStart}
                onResizeStart={handleItemDragStart}
                onDelete={handleDeletePdf}
                onSpawnNote={handleSpawnNoteFromPdf}
                onStartConnection={handleStartConnection}
                onToggleFocus={handleNodeToggleFocus}
                canvasScale={scale}
                isFocused={false}
                onInteract={handleNodeInteract}
                linkedNotes={pdfLinkedNotesMap[pdf.id] || []}
                onLocateNote={handleLocateNote}
                isHighlighted={teleportHighlightNodeId === pdf.id}
                isSelected={selectedNodes.some((n) => n.id === pdf.id && n.type === "pdf")}
                isPinned={pinnedNodeIds.has(pdf.id)}
                isDragging={isPdfDragging}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={(isOpen) => setOpenPdfSidebarId(isOpen ? pdf.id : null)}
              />
            </div>
          );
        })}

        {/* Images Layer */}
        {filteredImages.map((image) => {
          const isMatched = !canvasFilter || (image.name && image.name.toLowerCase().includes(canvasFilter.toLowerCase()));
          const isImageDragging = isDragging && draggedNode && (
            draggedNode.id === image.id || 
            (draggedNode.groupItems && draggedNode.groupItems.some(gi => gi.id === image.id && gi.type === "image")) ||
            (draggedNode.type === "area" && draggedNode.containedItems && draggedNode.containedItems.images && draggedNode.containedItems.images.some(ci => ci.id === image.id))
          );
          const isSelected = selectedNodes.some((n) => n.id === image.id && n.type === "image");
          const isHighlighted = teleportHighlightNodeId === image.id;
          const imageZIndex = isSelected || isHighlighted ? 150 : 40 + (image.z_index || 0);
          return (
            <div
              key={image.id}
              className="transition-all duration-300"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                zIndex: imageZIndex,
                opacity: isMatched ? 1 : 0.15,
                pointerEvents: isNodeInteractive ? (isMatched ? "auto" : "none") : "none",
              }}
              onPointerEnter={() => setHoveredNode({ id: image.id, type: "image" })}
              onPointerLeave={() => setHoveredNode(null)}
              onContextMenu={(e) => {
                if (!isNodeInteractive) return;
                e.preventDefault();
                e.stopPropagation();
                const rect = canvasRef.current.getBoundingClientRect();
                setContextMenu({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  canvasX: (e.clientX - rect.left - pan.x) / scale,
                  canvasY: (e.clientY - rect.top - pan.y) / scale,
                  type: "image",
                  targetId: image.id,
                  item: image
                });
              }}
            >
              <ImageNode
                image={image}
                onDragStart={handleItemDragStart}
                onResizeStart={handleItemDragStart}
                onDelete={handleDeleteImage}
                onStartConnection={handleStartConnection}
                onToggleFocus={handleNodeToggleFocus}
                canvasScale={scale}
                isFocused={false}
                onInteract={handleNodeInteract}
                isHighlighted={teleportHighlightNodeId === image.id}
                isSelected={selectedNodes.some((n) => n.id === image.id && n.type === "image")}
                isPinned={pinnedNodeIds.has(image.id)}
                onRename={handleUpdateImage}
                isDragging={isImageDragging}
              />
            </div>
          );
        })}

        {/* Notes Layer */}
        {filteredNotes.map((note) => {
          const isMatched = getNoteMatch(note);
          const isSelected = selectedNodes.some((n) => n.id === note.id && n.type === "note");
          const isHighlighted = teleportHighlightNodeId === note.id;
          const noteZIndex = isSelected || isHighlighted ? 150 : 50 + (note.z_index || 0);
          return (
            <div
              key={note.id}
              className="transition-all duration-300"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                zIndex: noteZIndex,
                opacity: isMatched ? 1 : 0.15,
                pointerEvents: isNodeInteractive ? (isMatched ? "auto" : "none") : "none",
              }}
              onPointerEnter={() => setHoveredNode({ id: note.id, type: "note" })}
              onPointerLeave={() => setHoveredNode(null)}
              onContextMenu={(e) => {
                if (!isNodeInteractive) return;
                e.preventDefault();
                e.stopPropagation();
                const rect = canvasRef.current.getBoundingClientRect();
                setContextMenu({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  canvasX: (e.clientX - rect.left - pan.x) / scale,
                  canvasY: (e.clientY - rect.top - pan.y) / scale,
                  type: "note",
                  targetId: note.id,
                  item: note
                });
              }}
            >
              <NoteNode
                note={note}
                onDragStart={handleItemDragStart}
                onResizeStart={handleItemDragStart}
                onDelete={handleDeleteNote}
                onEdit={handleEditNote}
                onStartConnection={handleStartConnection}
                isFocused={false}
                onToggleFocus={handleNodeToggleFocus}
                isHighlighted={teleportHighlightNodeId === note.id}
                isSelected={selectedNodes.some((n) => n.id === note.id && n.type === "note")}
                isPinned={pinnedNodeIds.has(note.id)}
                initiallyEditing={newlyCreatedNoteId === note.id}
                onEditingStarted={() => setNewlyCreatedNoteId(null)}
                onTabOut={handleNoteTabOut}
                onArrowNavigation={handleNoteArrowNavigation}
                onTabArrowNavigation={handleNoteTabArrowNavigation}
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

        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" style={{ zIndex: 20 }}>
          <defs>
            {/* arrow-default */}
            <marker id="arrow-default" markerWidth="8" markerHeight="6" refX="7.5" refY="3" orient="auto-start-reverse" markerUnits="strokeWidth">
              <path d="M0,0.5 L7.5,3 L0,5.5 Z" fill={linkTypeConfigs.default?.color || "#00aaff"} />
            </marker>
            {/* arrow-support */}
            <marker id="arrow-support" markerWidth="8" markerHeight="6" refX="7.5" refY="3" orient="auto-start-reverse" markerUnits="strokeWidth">
              <path d="M0,0.5 L7.5,3 L0,5.5 Z" fill={linkTypeConfigs.support?.color || "#22c55e"} />
            </marker>
            {/* arrow-contrast */}
            <marker id="arrow-contrast" markerWidth="8" markerHeight="6" refX="7.5" refY="3" orient="auto-start-reverse" markerUnits="strokeWidth">
              <path d="M0,0.5 L7.5,3 L0,5.5 Z" fill={linkTypeConfigs.contrast?.color || "#ef4444"} />
            </marker>
            {/* arrow-question */}
            <marker id="arrow-question" markerWidth="8" markerHeight="6" refX="7.5" refY="3" orient="auto-start-reverse" markerUnits="strokeWidth">
              <path d="M0,0.5 L7.5,3 L0,5.5 Z" fill={linkTypeConfigs.question?.color || "#eab308"} />
            </marker>
            {/* Custom overridden markers */}
            {links.filter(l => l.color).map(l => (
              <marker key={`arrow-custom-${l.id}`} id={`arrow-custom-${l.id}`} markerWidth="8" markerHeight="6" refX="7.5" refY="3" orient="auto-start-reverse" markerUnits="strokeWidth">
                <path d="M0,0.5 L7.5,3 L0,5.5 Z" fill={l.color} />
              </marker>
            ))}
          </defs>


          {/* Glowing quote connection curves */}
          {showConnections && filteredQuotes.map((quote) => {
            const book = books.find((b) => b.id === quote.book_id);
            if (!book) return null;
            const x1 = book.x_pos + 96;
            const y1 = book.y_pos + 150;
            const x2 = quote.x_pos + 40;
            const y2 = quote.y_pos + 30;
            const pathData = getBezierPath(x1, y1, x2, y2);
            const isMatched = getQuoteMatch(quote) || getBookMatch(book);
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
          {filteredLinks.map((link) => {
            const sourceNode = findNodeByIdAndType(link.source_id, link.source_type);
            const targetNode = findNodeByIdAndType(link.target_id, link.target_type);

            if (!sourceNode || !targetNode) return null;

            const { start, end } = getBestConnectionPoints(sourceNode, link.source_type, targetNode, link.target_type);
            const pathData = link.shape === "straight"
              ? `M ${start.x} ${start.y} L ${end.x} ${end.y}`
              : getSmartBezierPath(start, end);
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            const isMatched = getNodeMatch(link.source_id, link.source_type) || getNodeMatch(link.target_id, link.target_type);

            const getLinkColor = (type) => {
              const hex = linkTypeConfigs[type || "default"]?.color || "#00aaff";
              return getHexWithOpacity(hex, 0.55);
            };

            const getLinkDashArray = (type) => {
              switch (type) {
                case "contrast": return "5, 5";
                case "question": return "2, 3";
                default: return "none";
              }
            };

            const getStyleHex = (type) => {
              return linkTypeConfigs[type || "default"]?.color || "#00aaff";
            };

            const getStyleBg = (type) => {
              const hex = linkTypeConfigs[type || "default"]?.color || "#00aaff";
              return getHexWithOpacity(hex, 0.12);
            };

            const arrowMode = link.arrow || "none";
            const linkStyle = link.type || "default";
            const hasStartArrow = arrowMode === "both";
            const hasEndArrow = arrowMode === "forward" || arrowMode === "both";

            const activeColorHex = link.color || getStyleHex(link.type || "default");
            const activeColorBg = link.color ? getHexWithOpacity(link.color, 0.12) : getStyleBg(link.type || "default");
            const strokeColor = link.color ? getHexWithOpacity(link.color, 0.65) : getLinkColor(link.type || "default");
            const markerStyle = link.color ? `custom-${link.id}` : linkStyle;

            const isLinkConnectedToHovered = hoveredNode && (
              (link.source_id === hoveredNode.id && link.source_type === hoveredNode.type) ||
              (link.target_id === hoveredNode.id && link.target_type === hoveredNode.type)
            );

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
                {/* Thick invisible interactive path for easier hovering and clicking */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="12"
                  className="cursor-pointer"
                  style={{ pointerEvents: "auto" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveLinkMenuId(activeLinkMenuId === link.id ? null : link.id);
                  }}
                />

                <path
                  d={pathData}
                  fill="none"
                  stroke={isLinkConnectedToHovered ? "#00e1ff" : strokeColor}
                  strokeWidth={activeLinkMenuId === link.id ? "2.5" : (isLinkConnectedToHovered ? "2.5" : "1.5")}
                  strokeDasharray={getLinkDashArray(link.type)}
                  markerStart={hasStartArrow ? `url(#arrow-${markerStyle})` : undefined}
                  markerEnd={hasEndArrow ? `url(#arrow-${markerStyle})` : undefined}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveLinkMenuId(activeLinkMenuId === link.id ? null : link.id);
                  }}
                />
                
                {activeLinkMenuId !== link.id && (
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
                          { val: "default", label: "Associate" },
                          { val: "support", label: "Support" },
                          { val: "contrast", label: "Contrast" },
                          { val: "question", label: "Question" }
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
                            style={{ backgroundColor: getStyleHex(style.val) }}
                            title={linkTypeConfigs[style.val]?.label || style.label}
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
                            style={{ color: activeColorHex }}
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
                            style={{ color: activeColorHex }}
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
                            style={{ color: activeColorHex }}
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
                              backgroundColor: link.label ? activeColorBg : "rgba(0,0,0,0.5)",
                              borderColor: link.label ? `${activeColorHex}55` : "rgba(255,255,255,0.1)",
                              color: link.label ? activeColorHex : "rgba(255,255,255,0.3)"
                            }}
                            title={link.label ? "Double-click to edit label" : "Double-click to add label"}
                          >
                            {link.label || "+ LABEL"}
                          </div>
                        )}
                      </div>
                    </div>
                  </foreignObject>
                )}

                {/* Floating Quick Actions Customization Menu on Click */}
                {activeLinkMenuId === link.id && (
                  <foreignObject
                    x={midX - 140}
                    y={midY - 110}
                    width={280}
                    height={215}
                    style={{ pointerEvents: "auto", zIndex: 1000 }}
                  >
                    <div className="flex flex-col gap-2 p-3 rounded-xl border bg-[#0a0a0af8] text-white font-mono text-[9px] shadow-[0_10px_35px_rgba(0,0,0,0.95)] border-white/20 backdrop-blur-xl">
                      {/* Title Bar */}
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 font-bold tracking-wider text-white/50">
                        <span className="text-[8px] text-[#00aaff] tracking-widest">CONNECTION MODULE CONFIG</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveLinkMenuId(null);
                          }}
                          className="hover:text-white text-white/60 text-[10px] px-1 font-sans cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Label Input */}
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[7px] text-white/40 uppercase tracking-wider">Connection Label</label>
                        <input
                          type="text"
                          value={link.label || ""}
                          onChange={(e) => {
                            handleSaveLinkLabel(link.id, e.target.value);
                          }}
                          placeholder="Double-click line label or enter here"
                          onClick={(e) => e.stopPropagation()}
                          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[9px] focus:border-[#00aaff] outline-none"
                        />
                      </div>

                      {/* Connection Custom Color Picker (Direct Customization) */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[7px] text-white/40 uppercase tracking-wider">Direct Color Override</label>
                          {link.color && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateLinkColor(link.id, null);
                              }}
                              className="text-[6px] text-red-400 hover:text-red-300 uppercase underline cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Native color picker wrapper */}
                          <div className="relative w-5 h-5 rounded overflow-hidden border border-white/20">
                            <input
                              type="color"
                              value={link.color || activeColorHex}
                              onChange={(e) => {
                                handleUpdateLinkColor(link.id, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute inset-[-4px] w-8 h-8 bg-transparent border-0 cursor-pointer"
                              title="Custom HEX Color Picker"
                            />
                          </div>
                          {/* Presets */}
                          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 w-full justify-between">
                            {["#00aaff", "#22c55e", "#ef4444", "#eab308", "#a855f7", "#ec4899", "#ffffff"].map((presetColor) => (
                              <button
                                key={presetColor}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateLinkColor(link.id, presetColor);
                                }}
                                className={`w-2.5 h-2.5 rounded-full border transition-transform hover:scale-125 ${
                                  link.color === presetColor ? "border-white scale-110" : "border-white/20"
                                }`}
                                style={{ backgroundColor: presetColor }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Connection Properties Layout Controls */}
                      <div className="grid grid-cols-3 gap-1 mt-0.5 border-t border-white/5 pt-1.5">
                        {/* Shape Toggler */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[6px] text-white/35 uppercase">Shape</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextShape = (link.shape || "curved") === "curved" ? "straight" : "curved";
                              handleUpdateLinkShape(link.id, nextShape);
                            }}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded py-0.5 text-center text-white/80"
                          >
                            {(link.shape || "curved") === "curved" ? "Curved" : "Straight"}
                          </button>
                        </div>

                        {/* Arrow Toggler */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[6px] text-white/35 uppercase">Arrow</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentArrow = link.arrow || "none";
                              const nextArrow = currentArrow === "none" ? "forward" : currentArrow === "forward" ? "both" : "none";
                              handleUpdateLinkArrow(link.id, nextArrow);
                            }}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded py-0.5 text-center text-white/80"
                          >
                            {(link.arrow || "none") === "none" ? "None" : (link.arrow === "forward" ? "Forward" : "Both")}
                          </button>
                        </div>

                        {/* Speed Toggler */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[6px] text-white/35 uppercase">Flow</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentSpeed = link.speed || "normal";
                              const nextSpeed = currentSpeed === "normal" ? "fast" : currentSpeed === "fast" ? "slow" : currentSpeed === "slow" ? "pause" : "normal";
                              handleUpdateLinkSpeed(link.id, nextSpeed);
                            }}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded py-0.5 text-center text-white/80"
                          >
                            {link.speed || "Normal"}
                          </button>
                        </div>
                      </div>

                      {/* Danger Actions */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("DELETE THIS LINK CONNECTION?")) {
                            handleDeleteLink(link.id);
                            setActiveLinkMenuId(null);
                          }
                        }}
                        className="mt-1 w-full py-1 text-center bg-red-950/80 hover:bg-red-900 border border-red-500/30 hover:border-red-500 text-red-200 rounded transition-all cursor-pointer font-bold tracking-widest text-[8px]"
                      >
                        ✕ DELETE CONNECTION
                      </button>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Active drawing connection preview line */}
          {connectionSource && (() => {
            const sourceNode = findNodeByIdAndType(connectionSource.id, connectionSource.type);
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

          {/* Freeform drawing strokes layer */}
          {showDrawings && drawings.map((drawing) => {
            const isHighlighter = drawing.stroke_width >= 12;
            const strokeColor = isHighlighter 
              ? getHexWithOpacity(drawing.color, 0.4) 
              : drawing.color;
            const isEraseMode = isHandwritingMode && brushMode === "erase";
            const isHovered = isEraseMode && hoveredDrawingId === drawing.id;
            return (
              <g key={`drawing-${drawing.id}`}>
                {/* Thick invisible path for robust erasing */}
                {isEraseMode && (
                  <path
                    d={drawing.path_data}
                    stroke="transparent"
                    strokeWidth={Math.max(drawing.stroke_width + 24, 28)}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="cursor-pointer"
                    style={{ pointerEvents: "auto" }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      handleDeleteStroke(drawing.id);
                    }}
                    onPointerEnter={(e) => {
                      setHoveredDrawingId(drawing.id);
                      if (e.buttons === 1) {
                        e.stopPropagation();
                        handleDeleteStroke(drawing.id);
                      }
                    }}
                    onPointerLeave={() => {
                      setHoveredDrawingId(null);
                    }}
                  />
                )}
                {/* Visible path */}
                <path
                  d={drawing.path_data}
                  stroke={isHovered ? "#ef4444" : strokeColor}
                  strokeWidth={drawing.stroke_width}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drawing-stroke transition-colors pointer-events-none"
                  style={{
                    opacity: isHovered ? 0.5 : undefined
                  }}
                />
              </g>
            );
          })}

          {/* Active drawing stroke */}
          {currentStroke && (
            <path
              d={currentStroke}
              stroke={drawWidth >= 12 ? getHexWithOpacity(drawColor, 0.4) : drawColor}
              strokeWidth={drawWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: "none" }}
            />
          )}
        </svg>

        {filteredQuotes.map((quote) => {
          const isMatched = getQuoteMatch(quote);
          const isSelected = selectedNodes.some((n) => n.id === quote.id && n.type === "quote");
          const quoteZIndex = isSelected ? 150 : 30 + (quote.z_index || 0);
          return (
            <div
              key={quote.id}
              className="transition-all duration-300"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                zIndex: quoteZIndex,
                opacity: isMatched ? 1 : 0.15,
                pointerEvents: isNodeInteractive ? (isMatched ? "auto" : "none") : "none",
              }}
              onPointerEnter={() => setHoveredNode({ id: quote.id, type: "quote" })}
              onPointerLeave={() => setHoveredNode(null)}
              onContextMenu={(e) => {
                if (!isNodeInteractive) return;
                e.preventDefault();
                e.stopPropagation();
                const rect = canvasRef.current.getBoundingClientRect();
                setContextMenu({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  canvasX: (e.clientX - rect.left - pan.x) / scale,
                  canvasY: (e.clientY - rect.top - pan.y) / scale,
                  type: "quote",
                  targetId: quote.id,
                  item: quote
                });
              }}
            >
              <QuoteNode
                quote={quote}
                onDragStart={handleItemDragStart}
                onDelete={handleDeleteQuote}
                isSelected={selectedNodes.some((n) => n.id === quote.id && n.type === "quote")}
                isPinned={pinnedNodeIds.has(quote.id)}
              />
            </div>
          );
        })}

        {filteredBooks.map((book) => {
          const isMatched = getBookMatch(book);
          const isSelected = selectedNodes.some((n) => n.id === book.id && n.type === "book");
          const isHighlighted = teleportHighlightNodeId === book.id;
          const bookZIndex = isSelected || isHighlighted ? 150 : 50 + (book.z_index || 0);
          return (
            <div
              key={book.id}
              className="transition-all duration-300"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                zIndex: bookZIndex,
                opacity: isMatched ? 1 : 0.15,
                pointerEvents: isNodeInteractive ? (isMatched ? "auto" : "none") : "none",
              }}
              onPointerEnter={() => setHoveredNode({ id: book.id, type: "book" })}
              onPointerLeave={() => setHoveredNode(null)}
              onContextMenu={(e) => {
                if (!isNodeInteractive) return;
                e.preventDefault();
                e.stopPropagation();
                const rect = canvasRef.current.getBoundingClientRect();
                setContextMenu({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  canvasX: (e.clientX - rect.left - pan.x) / scale,
                  canvasY: (e.clientY - rect.top - pan.y) / scale,
                  type: "book",
                  targetId: book.id,
                  item: book
                });
              }}
            >
              <BookNode
                book={book}
                onClick={handleBookClick}
                onDragStart={handleItemDragStart}
                onStartConnection={handleStartConnection}
                isFocused={false}
                onToggleFocus={handleNodeToggleFocus}
                isHighlighted={teleportHighlightNodeId === book.id}
                isSelected={selectedNodes.some((n) => n.id === book.id && n.type === "book")}
                isPinned={pinnedNodeIds.has(book.id)}
              />
            </div>
          );
        })}

        {filteredMovies.map((movie) => {
          const isMatched = getMovieMatch(movie);
          const isSelected = selectedNodes.some((n) => n.id === movie.id && n.type === "movie");
          const isHighlighted = teleportHighlightNodeId === movie.id;
          const movieZIndex = isSelected || isHighlighted ? 150 : 50 + (movie.z_index || 0);
          return (
            <div
              key={movie.id}
              className="transition-all duration-300"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                zIndex: movieZIndex,
                opacity: isMatched ? 1 : 0.15,
                pointerEvents: isNodeInteractive ? (isMatched ? "auto" : "none") : "none",
              }}
              onPointerEnter={() => setHoveredNode({ id: movie.id, type: "movie" })}
              onPointerLeave={() => setHoveredNode(null)}
              onContextMenu={(e) => {
                if (!isNodeInteractive) return;
                e.preventDefault();
                e.stopPropagation();
                const rect = canvasRef.current.getBoundingClientRect();
                setContextMenu({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  canvasX: (e.clientX - rect.left - pan.x) / scale,
                  canvasY: (e.clientY - rect.top - pan.y) / scale,
                  type: "movie",
                  targetId: movie.id,
                  item: movie
                });
              }}
            >
              <MovieNode
                movie={movie}
                onDragStart={handleItemDragStart}
                onStartConnection={handleStartConnection}
                isFocused={false}
                onToggleFocus={handleNodeToggleFocus}
                isHighlighted={isHighlighted}
                isSelected={isSelected}
                isPinned={pinnedNodeIds.has(movie.id)}
              />
            </div>
          );
        })}
      </div>

      {connectionSource && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 bg-black/85 border border-[#00aaff]/20 rounded-full shadow-md backdrop-blur-md">
          <span className="text-[9px] font-mono tracking-widest text-[#00aaff]">
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
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 bg-black/85 border border-white/10 rounded-full shadow-md backdrop-blur-md">
          <span className="text-[9px] font-mono tracking-widest text-gray-300">
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

      {isHandwritingMode && (
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-16 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-4 px-5 py-3 bg-[#0a0a0af0] border border-[#00aaff]/40 rounded-xl shadow-[0_10px_35px_rgba(0,170,255,0.2)] backdrop-blur-xl pointer-events-auto"
        >
          <div className="flex flex-col font-mono text-[9px] tracking-widest text-[#00aaff] border-r border-white/10 pr-4">
            <span className="font-bold">✏️ DRAWING MODULE ACTIVE</span>
            <span className="text-white/40 mt-0.5">
              {brushMode === "erase" ? "[DRAG/CLICK LINES TO ERASE]" : "[DRAG TO WRITE OR ANNOTATE]"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Draw / Erase Mode Switcher */}
            <div className="flex gap-1 items-center bg-black/40 px-2 py-1 rounded border border-white/5 h-7 font-mono text-[8px]">
              <span className="text-white/45 mr-1.5 uppercase tracking-wider">MODE:</span>
              <button
                type="button"
                onClick={() => setBrushMode("draw")}
                className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
                  brushMode === "draw"
                    ? "border-[#00aaff] text-[#00aaff] bg-[#00aaff]/10 font-bold"
                    : "border-white/10 hover:border-white/20 text-white/60 hover:text-white"
                }`}
                title="Brush Drawing Mode (H)"
              >
                BRUSH
              </button>
              <button
                type="button"
                onClick={() => setBrushMode("erase")}
                className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
                  brushMode === "erase"
                    ? "border-[#ef4444] text-[#ef4444] bg-[#ef4444]/10 font-bold"
                    : "border-white/10 hover:border-white/20 text-white/60 hover:text-white"
                }`}
                title="Stroke Eraser Mode (E)"
              >
                ERASER
              </button>
            </div>

            <div 
              className={`flex gap-1 items-center bg-black/40 px-2.5 py-1 rounded border border-white/5 h-7 transition-opacity duration-300 ${
                brushMode === "erase" ? "opacity-30 pointer-events-none" : ""
              }`}
            >
              <span className="text-white/45 font-mono text-[8px] mr-1.5 uppercase tracking-wider">COLOR:</span>
              {[
                { hex: "#00aaff", label: "Cyan" },
                { hex: "#22c55e", label: "Green" },
                { hex: "#ef4444", label: "Red" },
                { hex: "#eab308", label: "Yellow" },
                { hex: "#a855f7", label: "Purple" },
                { hex: "#ec4899", label: "Pink" },
                { hex: "#ffffff", label: "White" }
              ].map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setDrawColor(c.hex)}
                  className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer ${
                    drawColor === c.hex
                      ? "border-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                      : "border-white/20 hover:scale-110"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>

            <div 
              className={`flex gap-1.5 items-center bg-black/40 px-2.5 py-1 rounded border border-white/5 h-7 font-mono text-[8px] transition-opacity duration-300 ${
                brushMode === "erase" ? "opacity-30 pointer-events-none" : ""
              }`}
            >
              <span className="text-white/45 mr-1.5 uppercase tracking-wider">SIZE:</span>
              {[
                { val: 2, label: "Fine" },
                { val: 4, label: "Normal" },
                { val: 8, label: "Thick" },
                { val: 16, label: "Highlight" }
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setDrawWidth(s.val)}
                  className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
                    drawWidth === s.val
                      ? "border-[#00aaff] text-[#00aaff] bg-[#00aaff]/10 font-bold"
                      : "border-white/10 hover:border-white/20 text-white/60 hover:text-white"
                  }`}
                  title={s.label}
                >
                  {s.val}px
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleClearDrawings}
              className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-500/30 hover:border-red-500 text-red-200 text-[8px] font-mono font-bold tracking-wider rounded transition-all cursor-pointer h-7 flex items-center"
              title="Delete all drawings from the board"
            >
              ✕ CLEAR BOARD
            </button>

            <button
              type="button"
              onClick={() => setIsHandwritingMode(false)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[8px] font-mono font-bold tracking-wider border border-white/10 rounded transition-all cursor-pointer h-7 flex items-center"
            >
              EXIT
            </button>
          </div>
        </div>
      )}

      {isLassoMode && (
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-16 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-4 px-5 py-3 bg-[#0a0a0af5] border border-[#00aaff]/40 rounded-xl shadow-[0_10px_35px_rgba(0,170,255,0.2)] backdrop-blur-xl pointer-events-auto"
        >
          <div className="flex flex-col font-mono text-[9px] tracking-widest text-[#00aaff] border-r border-white/10 pr-4">
            <span className="font-bold">🎯 LASSO MATRIX ACTIVE</span>
            <span className="text-white/40 mt-0.5">
              [DRAG WORKSPACE BACKGROUND TO SELECT MULTIPLE CARDS]
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsLassoMode(false)}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[8px] font-mono font-bold tracking-wider border border-white/10 rounded transition-all cursor-pointer h-7 flex items-center"
          >
            EXIT
          </button>
        </div>
      )}

      <SearchModal
        isOpen={showSearchModal}
        onOpen={() => setShowSearchModal(true)}
        onClose={() => setShowSearchModal(false)}
        onAddBook={handleAddBook}
        onAddMovie={handleAddMovie}
        onAddNote={handleCreateNote}
        onToggleConnections={() => setShowConnections((prev) => !prev)}
        onResetViewport={() => { setPan({ x: 0, y: 0 }); setScale(1); }}
        onEnterDrawMode={() => setIsDrawingMode((prev) => !prev)}
        onZoomIn={() => setScale((prev) => Math.min(prev + 0.15, 3))}
        onZoomOut={() => setScale((prev) => Math.max(prev - 0.15, 0.15))}
        books={books}
        movies={movies}
        notes={notes}
        areas={areas}
        pdfs={pdfs}
        quotes={quotes}
        images={images}
        onTeleport={centerOnNode}
      />

      {selectedNodes.length > 0 && (
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 flex flex-col md:flex-row items-center gap-4 px-5 py-3 bg-[#0a0a0af5] border border-white/10 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl pointer-events-auto"
        >
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
          className="absolute z-50 p-1.5 aero-panel bg-[#0a0a0af8] border border-white/10 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl pointer-events-auto"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-0.5 text-[10px] font-mono tracking-wider w-48">
            {(!contextMenu.type || contextMenu.type === "canvas") && (
              <>
                {selectedNodes.length > 0 && (
                  <>
                    <div className="px-2.5 py-1 border-b border-white/5 bg-purple-500/10 text-purple-400 font-bold text-[8px] tracking-widest truncate">
                      SELECTION ({selectedNodes.length} MODULES)
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleBulkArrangeGrid();
                        setContextMenu(null);
                      }}
                      className="text-left text-gray-300 hover:text-[#00aaff] hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                    >
                      <span>田</span> <span>GRID ALIGN</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleBulkArrangeCircle();
                        setContextMenu(null);
                      }}
                      className="text-left text-gray-300 hover:text-[#00aaff] hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                    >
                      <span>⭕</span> <span>RADIAL ALIGN</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleBulkArrangeHorizontal();
                        setContextMenu(null);
                      }}
                      className="text-left text-gray-300 hover:text-[#00aaff] hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                    >
                      <span>➖</span> <span>ALIGN HORIZONTALLY</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleBulkArrangeVertical();
                        setContextMenu(null);
                      }}
                      className="text-left text-gray-300 hover:text-[#00aaff] hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                    >
                      <span>❘</span> <span>ALIGN VERTICALLY</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleBulkCreateZone();
                        setContextMenu(null);
                      }}
                      className="text-left text-gray-300 hover:text-green-400 hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                    >
                      <span>⏹</span> <span>GROUP INTO ZONE</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleBulkDelete();
                        setContextMenu(null);
                      }}
                      className="text-left text-gray-300 hover:text-red-400 hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                    >
                      <span>🗑</span> <span>DECOMMISSION SELECTION</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleBulkConnectInChain();
                        setContextMenu(null);
                      }}
                      className="text-left text-gray-300 hover:text-yellow-400 hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                    >
                      <span>⛓️</span> <span>LINK IN CHAIN</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleBulkConnectToNewHubNote();
                        setContextMenu(null);
                      }}
                      className="text-left text-gray-300 hover:text-pink-400 hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                    >
                      <span>🏵️</span> <span>LINK TO NEW HUB NOTE</span>
                    </button>
                    
                    {/* Bulk Color Palette */}
                    <div className="flex gap-1 items-center bg-black/40 px-2 py-1.5 rounded border border-white/5 mx-1 mt-1">
                      <span className="text-white/40 text-[7px] mr-1 uppercase">COLOR:</span>
                      {[
                        { val: "rgba(0, 170, 255, 0.08)", hex: "#00aaff" },
                        { val: "rgba(168, 85, 247, 0.08)", hex: "#a855f7" },
                        { val: "rgba(34, 197, 94, 0.08)", hex: "#22c55e" },
                        { val: "rgba(239, 68, 68, 0.08)", hex: "#ef4444" },
                        { val: "rgba(234, 179, 8, 0.08)", hex: "#eab308" }
                      ].map((theme) => (
                        <button
                          key={theme.val}
                          type="button"
                          onClick={() => {
                            handleBulkColor(theme.val);
                            setContextMenu(null);
                          }}
                          className="w-3 h-3 rounded-full border border-white/20 hover:scale-125 transition-transform cursor-pointer"
                          style={{ backgroundColor: theme.hex }}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleBulkDelete();
                        setContextMenu(null);
                      }}
                      className="text-left text-red-400 hover:text-red-300 hover:bg-red-950/20 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                    >
                      <span>✕</span> <span>DELETE SELECTION</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNodes([]);
                        setContextMenu(null);
                      }}
                      className="text-left text-gray-400 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                    >
                      <span>✕</span> <span>CLEAR SELECTION</span>
                    </button>
                    <div className="h-px bg-white/10 my-1 mx-1" />
                  </>
                )}

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
                    const input = document.getElementById("canvas-pdf-upload-input");
                    if (input) {
                      setPendingPlacement({ x: contextMenu.canvasX, y: contextMenu.canvasY });
                      input.click();
                    }
                    setContextMenu(null);
                  }}
                  className="text-left text-gray-300 hover:text-[#a855f7] hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>+ UPLOAD PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById("canvas-image-upload-input");
                    if (input) {
                      setPendingPlacement({ x: contextMenu.canvasX, y: contextMenu.canvasY });
                      input.click();
                    }
                    setContextMenu(null);
                  }}
                  className="text-left text-gray-300 hover:text-[#00e1ff] hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>+ UPLOAD IMAGE</span>
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
                <div className="h-px bg-white/10 my-0.5 mx-1" />
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
              </>
            )}

            {contextMenu.type === "book" && (() => {
              const book = contextMenu.item;
              const isSelected = selectedNodes.some((n) => n.id === book.id && n.type === "book");
              return (
                <>
                  <div className="px-2.5 py-1 border-b border-white/5 bg-white/5 text-[#00aaff] font-bold text-[8px] tracking-widest truncate">
                    BOOK: {book.title.toUpperCase()}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      togglePinNode(book.id);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-yellow-400 hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>📌</span> <span>{pinnedNodeIds.has(book.id) ? "UNPIN POSITION" : "PIN POSITION"}</span>
                  </button>
                  {selectedNodes.some(n => !(n.id === book.id && n.type === "book")) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleBulkConnectToNode(book.id, "book");
                        setContextMenu(null);
                      }}
                      className="text-left text-[#00aaff] hover:text-blue-300 hover:bg-blue-950/10 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2 font-bold"
                    >
                      <span>🔱</span> <span>CONNECT SELECTION HERE</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleFocus(book.id, "book", true);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-purple-400 hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>👁️</span> <span>FOCUS CLUSTER</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      handleStartConnection(book.id, "book", e.clientX, e.clientY);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-[#00aaff] hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>🔗</span> <span>CONNECT MODULE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      centerOnNode(book.id, "book");
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>🎯</span> <span>CENTER CAMERA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNodes(prev =>
                        isSelected
                          ? prev.filter(n => !(n.id === book.id && n.type === "book"))
                          : [...prev, { id: book.id, type: "book" }]
                      );
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>⏹️</span> <span>{isSelected ? "DESELECT MODULE" : "SELECT MODULE"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBook(book);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>📝</span> <span>EDIT REVIEW & RATING</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextStatus = book.status === "To Read" ? "Reading" : (book.status === "Reading" ? "Completed" : "To Read");
                      handleUpdateBook({ ...book, status: nextStatus });
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>🔄</span> <span>STATUS: {book.status.toUpperCase()}</span>
                  </button>
                  <div className="h-px bg-white/10 my-0.5 mx-1" />

                  {/* Layer Controls */}
                  <div className="px-2.5 py-0.5 text-white/30 font-bold text-[7px] tracking-widest uppercase">Layers</div>
                  <div className="grid grid-cols-2 gap-0.5 mx-1">
                    <button
                      type="button"
                      onClick={() => { handleBringToFront(book.id, "book"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-sky-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>⬆️</span> <span>FRONT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleBringForward(book.id, "book"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-sky-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>↑</span> <span>FORWARD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleSendBackward(book.id, "book"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-orange-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>↓</span> <span>BACKWARD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleSendToBack(book.id, "book"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-orange-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>⬇️</span> <span>BACK</span>
                    </button>
                  </div>

                  <div className="h-px bg-white/10 my-0.5 mx-1" />
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`DELETE '${book.title.toUpperCase()}'?`)) {
                        handleDeleteBook(book.id);
                      }
                      setContextMenu(null);
                    }}
                    className="text-left text-red-400 hover:text-red-300 hover:bg-red-950/20 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>✕</span> <span>DELETE BOOK</span>
                  </button>
                </>
              );
            })()}

            {contextMenu.type === "note" && (() => {
              const note = contextMenu.item;
              const isSelected = selectedNodes.some((n) => n.id === note.id && n.type === "note");
              return (
                <>
                  <div className="px-2.5 py-1 border-b border-white/5 bg-white/5 text-[#00aaff] font-bold text-[8px] tracking-widest truncate">
                    NOTE: {note.id.substring(0, 8).toUpperCase()}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      togglePinNode(note.id);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-yellow-400 hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>📌</span> <span>{pinnedNodeIds.has(note.id) ? "UNPIN POSITION" : "PIN POSITION"}</span>
                  </button>
                  {selectedNodes.some(n => !(n.id === note.id && n.type === "note")) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleBulkConnectToNode(note.id, "note");
                        setContextMenu(null);
                      }}
                      className="text-left text-[#00aaff] hover:text-blue-300 hover:bg-blue-950/10 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2 font-bold"
                    >
                      <span>🔱</span> <span>CONNECT SELECTION HERE</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleFocus(note.id, "note", true);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-purple-400 hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>👁️</span> <span>FOCUS CLUSTER</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      handleStartConnection(note.id, "note", e.clientX, e.clientY);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-[#00aaff] hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>🔗</span> <span>CONNECT MODULE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      centerOnNode(note.id, "note");
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>🎯</span> <span>CENTER CAMERA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNodes(prev =>
                        isSelected
                          ? prev.filter(n => !(n.id === note.id && n.type === "note"))
                          : [...prev, { id: note.id, type: "note" }]
                      );
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>⏹️</span> <span>{isSelected ? "DESELECT MODULE" : "SELECT MODULE"}</span>
                  </button>
                  <div className="h-px bg-white/10 my-0.5 mx-1" />
                  
                  {/* Theme Colors */}
                  <div className="flex gap-1 items-center bg-black/40 px-2 py-1.5 rounded border border-white/5 mx-1 mt-1">
                    <span className="text-white/40 text-[7px] mr-1 uppercase">COLOR:</span>
                    {[
                      { val: "rgba(255, 255, 255, 0.08)", hex: "#ffffff" },
                      { val: "rgba(0, 170, 255, 0.08)", hex: "#00aaff" },
                      { val: "rgba(168, 85, 247, 0.08)", hex: "#a855f7" },
                      { val: "rgba(34, 197, 94, 0.08)", hex: "#22c55e" },
                      { val: "rgba(239, 68, 68, 0.08)", hex: "#ef4444" },
                      { val: "rgba(234, 179, 8, 0.08)", hex: "#eab308" }
                    ].map((theme) => (
                      <button
                        key={theme.val}
                        type="button"
                        onClick={() => {
                          const updatedNote = { ...note, color: theme.val };
                          setNotes(prev => prev.map(n => n.id === note.id ? updatedNote : n));
                          fetch("/api/notes", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(updatedNote)
                          });
                          setContextMenu(null);
                        }}
                        className="w-3 h-3 rounded-full border border-white/20 hover:scale-125 transition-transform cursor-pointer"
                        style={{ backgroundColor: theme.hex }}
                      />
                    ))}
                  </div>

                  {/* Layer Controls */}
                  <div className="h-px bg-white/10 my-0.5 mx-1" />
                  <div className="px-2.5 py-0.5 text-white/30 font-bold text-[7px] tracking-widest uppercase">Layers</div>
                  <div className="grid grid-cols-2 gap-0.5 mx-1">
                    <button
                      type="button"
                      onClick={() => { handleBringToFront(note.id, "note"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-sky-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>⬆️</span> <span>FRONT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleBringForward(note.id, "note"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-sky-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>↑</span> <span>FORWARD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleSendBackward(note.id, "note"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-orange-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>↓</span> <span>BACKWARD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleSendToBack(note.id, "note"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-orange-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>⬇️</span> <span>BACK</span>
                    </button>
                  </div>

                  <div className="h-px bg-white/10 my-0.5 mx-1" />
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("DELETE THIS NOTE?")) {
                        handleDeleteNote(note.id);
                      }
                      setContextMenu(null);
                    }}
                    className="text-left text-red-400 hover:text-red-300 hover:bg-red-950/20 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>✕</span> <span>DELETE NOTE</span>
                  </button>
                </>
              );
            })()}

            {contextMenu.type === "area" && (() => {
              const area = contextMenu.item;
              const isSelected = selectedNodes.some((n) => n.id === area.id && n.type === "area");
              return (
                <>
                  <div className="px-2.5 py-1 border-b border-white/5 bg-white/5 text-[#00aaff] font-bold text-[8px] tracking-widest truncate">
                    ZONE: {area.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      togglePinNode(area.id);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-yellow-400 hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>📌</span> <span>{pinnedNodeIds.has(area.id) ? "UNPIN POSITION" : "PIN POSITION"}</span>
                  </button>
                  {selectedNodes.some(n => !(n.id === area.id && n.type === "area")) && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          handleBulkConnectToNode(area.id, "area");
                          setContextMenu(null);
                        }}
                        className="text-left text-[#00aaff] hover:text-blue-300 hover:bg-blue-950/10 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2 font-bold"
                      >
                        <span>🔱</span> <span>CONNECT SELECTION HERE</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handlePullSelectionToZone(area.id);
                          setContextMenu(null);
                        }}
                        className="text-left text-[#00aaff] hover:text-blue-300 hover:bg-blue-950/10 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2 font-bold"
                      >
                        <span>📥</span> <span>PULL SELECTION INTO ZONE</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleFocus(area.id, "area", true);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-purple-400 hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>👁️</span> <span>FOCUS CLUSTER</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      centerOnNode(area.id, "area");
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>🎯</span> <span>CENTER CAMERA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNodes(prev =>
                        isSelected
                          ? prev.filter(n => !(n.id === area.id && n.type === "area"))
                          : [...prev, { id: area.id, type: "area" }]
                      );
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>⏹️</span> <span>{isSelected ? "DESELECT MODULE" : "SELECT MODULE"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newName = prompt("RENAME ZONE:", area.name);
                      if (newName && newName.trim()) {
                        handleUpdateArea(area.id, newName.trim().toUpperCase());
                      }
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>✏️</span> <span>RENAME ZONE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleArrangeAreaNodes(area.id);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>田</span> <span>ARRANGE ZONED ITEMS</span>
                  </button>
                  
                  {/* Theme Colors */}
                  <div className="flex gap-1 items-center bg-black/40 px-2 py-1.5 rounded border border-white/5 mx-1 mt-1">
                    <span className="text-white/40 text-[7px] mr-1 uppercase">COLOR:</span>
                    {[
                      { val: "rgba(0, 170, 255, 0.08)", hex: "#00aaff" },
                      { val: "rgba(168, 85, 247, 0.08)", hex: "#a855f7" },
                      { val: "rgba(34, 197, 94, 0.08)", hex: "#22c55e" },
                      { val: "rgba(239, 68, 68, 0.08)", hex: "#ef4444" },
                      { val: "rgba(234, 179, 8, 0.08)", hex: "#eab308" }
                    ].map((theme) => (
                      <button
                        key={theme.val}
                        type="button"
                        onClick={() => {
                          handleUpdateArea(area.id, { color: theme.val });
                          setContextMenu(null);
                        }}
                        className="w-3 h-3 rounded-full border border-white/20 hover:scale-125 transition-transform cursor-pointer"
                        style={{ backgroundColor: theme.hex }}
                      />
                    ))}
                  </div>

                  {/* Layer Controls */}
                  <div className="h-px bg-white/10 my-0.5 mx-1" />
                  <div className="px-2.5 py-0.5 text-white/30 font-bold text-[7px] tracking-widest uppercase">Layers</div>
                  <div className="grid grid-cols-2 gap-0.5 mx-1">
                    <button
                      type="button"
                      onClick={() => { handleBringToFront(area.id, "area"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-sky-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>⬆️</span> <span>FRONT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleBringForward(area.id, "area"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-sky-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>↑</span> <span>FORWARD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleSendBackward(area.id, "area"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-orange-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>↓</span> <span>BACKWARD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleSendToBack(area.id, "area"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-orange-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>⬇️</span> <span>BACK</span>
                    </button>
                  </div>
                  <div className="h-px bg-white/10 my-0.5 mx-1" />
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`DELETE '${area.name.toUpperCase()}' ZONE?`)) {
                        handleDeleteArea(area.id);
                      }
                      setContextMenu(null);
                    }}
                    className="text-left text-red-400 hover:text-red-300 hover:bg-red-950/20 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>✕</span> <span>DELETE ZONE</span>
                  </button>
                </>
              );
            })()}

            {contextMenu.type === "pdf" && (() => {
              const pdf = contextMenu.item;
              const isSelected = selectedNodes.some((n) => n.id === pdf.id && n.type === "pdf");
              return (
                <>
                  <div className="px-2.5 py-1 border-b border-white/5 bg-white/5 text-[#00aaff] font-bold text-[8px] tracking-widest truncate">
                    PDF: {pdf.name.toUpperCase()}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      togglePinNode(pdf.id);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-yellow-400 hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>📌</span> <span>{pinnedNodeIds.has(pdf.id) ? "UNPIN POSITION" : "PIN POSITION"}</span>
                  </button>
                  {selectedNodes.some(n => !(n.id === pdf.id && n.type === "pdf")) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleBulkConnectToNode(pdf.id, "pdf");
                        setContextMenu(null);
                      }}
                      className="text-left text-[#00aaff] hover:text-blue-300 hover:bg-blue-950/10 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2 font-bold"
                    >
                      <span>🔱</span> <span>CONNECT SELECTION HERE</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleFocus(pdf.id, "pdf", true);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-purple-400 hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>👁️</span> <span>FOCUS CLUSTER</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      handleStartConnection(pdf.id, "pdf", e.clientX, e.clientY);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-[#00aaff] hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>🔗</span> <span>CONNECT MODULE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      centerOnNode(pdf.id, "pdf");
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>🎯</span> <span>CENTER CAMERA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNodes(prev =>
                        isSelected
                          ? prev.filter(n => !(n.id === pdf.id && n.type === "pdf"))
                          : [...prev, { id: pdf.id, type: "pdf" }]
                      );
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>⏹️</span> <span>{isSelected ? "DESELECT MODULE" : "SELECT MODULE"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSpawnNoteFromPdf(pdf.id);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>📝</span> <span>SPAWN NOTE CARD</span>
                  </button>
                  {/* Layer Controls */}
                  <div className="h-px bg-white/10 my-0.5 mx-1" />
                  <div className="px-2.5 py-0.5 text-white/30 font-bold text-[7px] tracking-widest uppercase">Layers</div>
                  <div className="grid grid-cols-2 gap-0.5 mx-1">
                    <button
                      type="button"
                      onClick={() => { handleBringToFront(pdf.id, "pdf"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-sky-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>⬆️</span> <span>FRONT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleBringForward(pdf.id, "pdf"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-sky-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>↑</span> <span>FORWARD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleSendBackward(pdf.id, "pdf"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-orange-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>↓</span> <span>BACKWARD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleSendToBack(pdf.id, "pdf"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-orange-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>⬇️</span> <span>BACK</span>
                    </button>
                  </div>
                  <div className="h-px bg-white/10 my-0.5 mx-1" />
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`DELETE '${pdf.name.toUpperCase()}' RESEARCH PDF?`)) {
                        handleDeletePdf(pdf.id);
                      }
                      setContextMenu(null);
                    }}
                    className="text-left text-red-400 hover:text-red-300 hover:bg-red-950/20 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>✕</span> <span>DELETE PDF CARD</span>
                  </button>
                </>
              );
            })()}

            {contextMenu.type === "image" && (() => {
              const image = contextMenu.item;
              const isSelected = selectedNodes.some((n) => n.id === image.id && n.type === "image");
              return (
                <>
                  <div className="px-2.5 py-1 border-b border-white/5 bg-white/5 text-[#00e1ff] font-bold text-[8px] tracking-widest truncate">
                    IMAGE: {(image.name || "IMAGE").toUpperCase()}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      togglePinNode(image.id);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-yellow-400 hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>📌</span> <span>{pinnedNodeIds.has(image.id) ? "UNPIN POSITION" : "PIN POSITION"}</span>
                  </button>
                  {selectedNodes.some(n => !(n.id === image.id && n.type === "image")) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleBulkConnectToNode(image.id, "image");
                        setContextMenu(null);
                      }}
                      className="text-left text-[#00e1ff] hover:text-[#00e1ff]/80 hover:bg-blue-950/10 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2 font-bold"
                    >
                      <span>🔱</span> <span>CONNECT SELECTION HERE</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleFocus(image.id, "image", true);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-purple-400 hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>👁️</span> <span>FOCUS CLUSTER</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      handleStartConnection(image.id, "image", e.clientX, e.clientY);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-[#00e1ff] hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>🔗</span> <span>CONNECT MODULE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      centerOnNode(image.id, "image");
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>🎯</span> <span>CENTER CAMERA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNodes(prev =>
                        isSelected
                          ? prev.filter(n => !(n.id === image.id && n.type === "image"))
                          : [...prev, { id: image.id, type: "image" }]
                      );
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>⏹️</span> <span>{isSelected ? "DESELECT MODULE" : "SELECT MODULE"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newName = prompt("RENAME IMAGE:", image.name || "");
                      if (newName !== null && newName.trim() !== "") {
                        handleUpdateImage(image.id, { name: newName });
                      }
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-cyan-400 hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>✏️</span> <span>RENAME IMAGE</span>
                  </button>
                  {/* Layer Controls */}
                  <div className="h-px bg-white/10 my-0.5 mx-1" />
                  <div className="px-2.5 py-0.5 text-white/30 font-bold text-[7px] tracking-widest uppercase">Layers</div>
                  <div className="grid grid-cols-2 gap-0.5 mx-1">
                    <button
                      type="button"
                      onClick={() => { handleBringToFront(image.id, "image"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-sky-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>⬆️</span> <span>FRONT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleBringForward(image.id, "image"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-sky-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>↑</span> <span>FORWARD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleSendBackward(image.id, "image"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-orange-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>↓</span> <span>BACKWARD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleSendToBack(image.id, "image"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-orange-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>⬇️</span> <span>BACK</span>
                    </button>
                  </div>
                  <div className="h-px bg-white/10 my-0.5 mx-1" />
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`DELETE '${(image.name || "IMAGE").toUpperCase()}' IMAGE?`)) {
                        handleDeleteImage(image.id);
                      }
                      setContextMenu(null);
                    }}
                    className="text-left text-red-400 hover:text-red-300 hover:bg-red-950/20 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>✕</span> <span>DELETE IMAGE CARD</span>
                  </button>
                </>
              );
            })()}

            {contextMenu.type === "quote" && (() => {
              const quote = contextMenu.item;
              const isSelected = selectedNodes.some((n) => n.id === quote.id && n.type === "quote");
              return (
                <>
                  <div className="px-2.5 py-1 border-b border-white/5 bg-white/5 text-[#00aaff] font-bold text-[8px] tracking-widest truncate">
                    QUOTE NODE
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      togglePinNode(quote.id);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-yellow-400 hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>📌</span> <span>{pinnedNodeIds.has(quote.id) ? "UNPIN POSITION" : "PIN POSITION"}</span>
                  </button>
                  {selectedNodes.some(n => !(n.id === quote.id && n.type === "quote")) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleBulkConnectToNode(quote.id, "quote");
                        setContextMenu(null);
                      }}
                      className="text-left text-[#00aaff] hover:text-blue-300 hover:bg-blue-950/10 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2 font-bold"
                    >
                      <span>🔱</span> <span>CONNECT SELECTION HERE</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleFocus(quote.id, "quote", true);
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-purple-400 hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>👁️</span> <span>FOCUS CLUSTER</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      centerOnNode(quote.id, "quote");
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>🎯</span> <span>CENTER CAMERA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNodes(prev =>
                        isSelected
                          ? prev.filter(n => !(n.id === quote.id && n.type === "quote"))
                          : [...prev, { id: quote.id, type: "quote" }]
                      );
                      setContextMenu(null);
                    }}
                    className="text-left text-gray-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>⏹️</span> <span>{isSelected ? "DESELECT MODULE" : "SELECT MODULE"}</span>
                  </button>
                  {/* Layer Controls */}
                  <div className="h-px bg-white/10 my-0.5 mx-1" />
                  <div className="px-2.5 py-0.5 text-white/30 font-bold text-[7px] tracking-widest uppercase">Layers</div>
                  <div className="grid grid-cols-2 gap-0.5 mx-1">
                    <button
                      type="button"
                      onClick={() => { handleBringToFront(quote.id, "quote"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-sky-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>⬆️</span> <span>FRONT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleBringForward(quote.id, "quote"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-sky-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>↑</span> <span>FORWARD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleSendBackward(quote.id, "quote"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-orange-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>↓</span> <span>BACKWARD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleSendToBack(quote.id, "quote"); setContextMenu(null); }}
                      className="text-left text-gray-300 hover:text-orange-400 hover:bg-white/5 px-2 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-1.5 text-[9px]"
                    >
                      <span>⬇️</span> <span>BACK</span>
                    </button>
                  </div>
                  <div className="h-px bg-white/10 my-0.5 mx-1" />
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("DELETE THIS QUOTE NODE?")) {
                        handleDeleteQuote(quote.id);
                      }
                      setContextMenu(null);
                    }}
                    className="text-left text-red-400 hover:text-red-300 hover:bg-red-950/20 px-2.5 py-1.5 rounded flex items-center transition-colors cursor-pointer gap-2"
                  >
                    <span>✕</span> <span>DELETE QUOTE</span>
                  </button>
                </>
              );
            })()}
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
            className="aero-panel w-full max-w-4xl mx-4 bg-[#0a0a0af5] border border-white/10 p-5 text-white flex flex-col max-h-[85vh]"
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
            <div className="overflow-y-auto pr-1 text-xs grid grid-cols-1 lg:grid-cols-2 gap-6 leading-relaxed font-sans custom-scrollbar">
              {/* Column 1 */}
              <div className="space-y-4">
                {/* Category 1: Camera & Navigation */}
                <div>
                  <h4 className="text-[#00aaff] font-semibold font-mono tracking-wider text-[10px] uppercase mb-1.5 border-b border-white/5 pb-1">
                    1. Camera & Navigation
                  </h4>
                  <div className="space-y-1.5 text-gray-300 font-mono text-[10px]">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Pan Workspace</span><span className="text-white text-left sm:text-right font-semibold">Drag Empty Canvas</span></div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Zoom Camera</span><span className="text-white text-left sm:text-right font-semibold">Mouse Scroll wheel</span></div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Reset Viewport</span><span className="text-white text-left sm:text-right font-semibold">HOME in Command Center</span></div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Snap View to Node</span><span className="text-white text-left sm:text-right font-semibold">Click FOCUS in Workspace Index</span></div>
                  </div>
                </div>

                {/* Category 2: Gestures */}
                <div>
                  <h4 className="text-[#22c55e] font-semibold font-mono tracking-wider text-[10px] uppercase mb-1.5 border-b border-white/5 pb-1">
                    2. Board Editing Gestures
                  </h4>
                  <div className="space-y-1.5 text-gray-300 font-mono text-[10px]">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Move Modules</span><span className="text-white text-left sm:text-right font-semibold">Drag Book / Note Header</span></div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Resize Note card</span><span className="text-white text-left sm:text-right font-semibold">Drag bottom-right corner (↘)</span></div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Grid Snapping</span><span className="text-white text-left sm:text-right font-semibold">Toggled via SNAP TO GRID checkbox</span></div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Spawn Zone (Area)</span><span className="text-white text-left sm:text-right font-semibold">Drag-draw box (Drawing Mode ON)</span></div>
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
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Book Reviews</span><span className="text-white text-left sm:text-right font-semibold">./reviews/*.md</span></div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Index Notes</span><span className="text-white text-left sm:text-right font-semibold">./notes/*.md</span></div>
                  </div>
                </div>
              </div>

              {/* Column 2 */}
              <div className="space-y-4">
                {/* Category 3: Connections & Edge Routing */}
                <div>
                  <h4 className="text-[#a855f7] font-semibold font-mono tracking-wider text-[10px] uppercase mb-1.5 border-b border-white/5 pb-1">
                    3. Connections & Edge Routing
                  </h4>
                  <div className="space-y-1.5 text-gray-300 font-mono text-[10px]">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Create Connection</span><span className="text-white text-left sm:text-right font-semibold">Drag from card boundary connector dot</span></div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Midpoint Controls HUD</span><span className="text-white text-left sm:text-right font-semibold">Hover cursor over link path line</span></div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Toggle Arrowhead</span><span className="text-white text-left sm:text-right font-semibold">Click Arrow cycle button (— / ➡ / ↔)</span></div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Modify Text Label</span><span className="text-white text-left sm:text-right font-semibold">Double-click label badge (Esc to abort)</span></div>
                  </div>
                </div>

                {/* Category 4: Focus & Presentation Modes */}
                <div>
                  <h4 className="text-[#eab308] font-semibold font-mono tracking-wider text-[10px] uppercase mb-1.5 border-b border-white/5 pb-1">
                    4. Advanced Modes & Filtering
                  </h4>
                  <div className="space-y-1.5 text-gray-300 font-mono text-[10px]">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Command Console</span><span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] border border-white/10 text-white font-mono">Cmd/Ctrl + K</kbd></span></div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Isolate Node / Area</span><span className="text-white text-left sm:text-right font-semibold">Click Eye icon (👁) in Node/Area header</span></div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Slideshow Navigation</span><span className="text-white text-left sm:text-right font-semibold">Space / ➡ (Next), ⬅ (Prev), Esc (Exit)</span></div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Handwriting Mode</span><span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] border border-white/10 text-white font-mono">H</kbd></span></div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-0.5"><span className="text-gray-400">Brush / Eraser Toggle</span><span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] border border-white/10 text-white font-mono">B</kbd> / <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] border border-white/10 text-white font-mono">E</kbd></span></div>
                  </div>
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

      {selectedMovie && (
        <ReviewModal
          item={selectedMovie}
          type="movie"
          quotes={quotes.filter((q) => q.movie_id === selectedMovie.id)}
          onClose={() => setSelectedMovie(null)}
          onSave={handleUpdateMovie}
          onExtractQuote={handleExtractMovieQuote}
          onDelete={handleDeleteMovie}
        />
      )}

      {/* Floating Workspace Minimap */}
      <div className={`transition-all duration-300 ${isPresentationMode ? "opacity-0 translate-y-full pointer-events-none" : ""}`}>
        <Minimap
          books={filteredBooks}
          movies={filteredMovies}
          notes={filteredNotes}
          areas={filteredAreas}
          pdfs={filteredPdfs}
          images={filteredImages}
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
              {activeDialog.type === "confirm-delete-movie" && "System // Decommission Movie"}
              {activeDialog.type === "confirm-delete-area" && "System // Decommission Zone"}
              {activeDialog.type === "confirm-delete-note" && "System // Decommission Note"}
              {activeDialog.type === "confirm-delete-pdf" && "System // Decommission PDF"}
              {activeDialog.type === "confirm-delete-image" && "System // Decommission Image"}
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

            {(activeDialog.type === "confirm-delete-book" || activeDialog.type === "confirm-delete-movie" || activeDialog.type === "confirm-delete-area" || activeDialog.type === "confirm-delete-note" || activeDialog.type === "confirm-delete-pdf" || activeDialog.type === "confirm-delete-image") && (
              <div className="space-y-4">
                <p className="text-xs text-gray-300 leading-relaxed">
                  {activeDialog.type === "confirm-delete-book"
                    ? "Are you sure you want to decommission this book module? All associated quote fragments will be permanently purged."
                    : activeDialog.type === "confirm-delete-movie"
                    ? "Are you sure you want to decommission this movie module? All associated quote fragments will be permanently purged."
                    : activeDialog.type === "confirm-delete-note"
                    ? "Are you sure you want to decommission this index card note?"
                    : activeDialog.type === "confirm-delete-pdf"
                    ? "Are you sure you want to decommission this PDF document module and delete the local file?"
                    : activeDialog.type === "confirm-delete-image"
                    ? "Are you sure you want to decommission this image module and delete the local file?"
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
                      saveStateBeforeMutation();
                      if (activeDialog.type === "confirm-delete-book") {
                        try {
                          await fetch(`/api/books?id=${activeDialog.bookId}`, { method: "DELETE" });
                          setBooks((prev) => prev.filter((b) => b.id !== activeDialog.bookId));
                          setQuotes((prev) => prev.filter((q) => q.book_id !== activeDialog.bookId));
                          setSelectedBook(null);
                        } catch (err) {
                          console.error(err);
                        }
                      } else if (activeDialog.type === "confirm-delete-movie") {
                        try {
                          await fetch(`/api/movies?id=${activeDialog.movieId}`, { method: "DELETE" });
                          setMovies((prev) => prev.filter((m) => m.id !== activeDialog.movieId));
                          setQuotes((prev) => prev.filter((q) => q.movie_id !== activeDialog.movieId));
                          setSelectedMovie(null);
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
                      } else if (activeDialog.type === "confirm-delete-pdf") {
                        try {
                          await fetch(`/api/pdfs?id=${activeDialog.pdfId}`, { method: "DELETE" });
                          setPdfs((prev) => prev.filter((p) => p.id !== activeDialog.pdfId));
                          setLinks((prev) => prev.filter((l) => l.source_id !== activeDialog.pdfId && l.target_id !== activeDialog.pdfId));
                        } catch (err) {
                          console.error(err);
                        }
                      } else if (activeDialog.type === "confirm-delete-image") {
                        try {
                          await fetch(`/api/images?id=${activeDialog.imageId}`, { method: "DELETE" });
                          setImages((prev) => prev.filter((img) => img.id !== activeDialog.imageId));
                          setLinks((prev) => prev.filter((l) => l.source_id !== activeDialog.imageId && l.target_id !== activeDialog.imageId));
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

            <div className="flex items-center gap-2 border-l border-white/10 pl-3">
              <button
                type="button"
                onClick={() => {
                  setIsPresentationAutoPlay(!isPresentationAutoPlay);
                  showToast(!isPresentationAutoPlay ? "PRESENTATION AUTOPLAY STARTED" : "PRESENTATION AUTOPLAY PAUSED");
                }}
                className={`text-[9px] font-bold py-1 px-3 rounded uppercase transition-all tracking-wider ${
                  isPresentationAutoPlay
                    ? "bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,170,255,0.4)]"
                    : "bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                }`}
              >
                {isPresentationAutoPlay ? "⏸ AUTOPLAYING" : "▶ AUTOPLAY"}
              </button>
              
              <select
                value={presentationInterval}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setPresentationInterval(val);
                  showToast(`AUTOPLAY INTERVAL SET TO ${val / 1000}s`);
                }}
                className="bg-black/60 border border-white/10 text-white text-[9px] py-1 px-2.5 rounded font-mono cursor-pointer"
              >
                <option value="2000">2s INTERVAL</option>
                <option value="4000">4s INTERVAL</option>
                <option value="6000">6s INTERVAL</option>
                <option value="8000">8s INTERVAL</option>
                <option value="10000">10s INTERVAL</option>
              </select>
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

      {toast && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-lg aero-panel border border-cyan-500/30 bg-[#05050bf2] shadow-[0_0_20px_rgba(0,170,255,0.25)] flex items-center gap-2 pointer-events-none transition-all duration-300 transform scale-100 opacity-100"
        >
          <span className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">▶ SYSTEM TELEMETRY:</span>
          <span className="text-[11px] text-white font-mono tracking-wide">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
