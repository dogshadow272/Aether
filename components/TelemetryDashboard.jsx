"use client";
import { useState, useMemo } from "react";
import { BarChart3, Database, GitMerge, Compass, Award, AlertCircle, X, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function TelemetryDashboard({ books = [], notes = [], areas = [], links = [], quotes = [], onClose, onTeleport }) {
  // 1. Calculate General Inventory Stats
  const bookCount = books.length;
  const noteCount = notes.length;
  const areaCount = areas.length;
  const linkCount = links.length;
  const quoteCount = quotes.length;
  const totalCards = bookCount + noteCount + areaCount + quoteCount;

  // 2. Calculate Reading Velocity Metrics
  const toReadCount = books.filter(b => b.status === "To Read").length;
  const readingCount = books.filter(b => b.status === "Reading").length;
  const completedCount = books.filter(b => b.status === "Completed").length;
  const completionRate = bookCount > 0 ? Math.round((completedCount / bookCount) * 100) : 0;

  // Average Rating
  const ratedBooks = books.filter(b => b.rating > 0);
  const averageRating = ratedBooks.length > 0
    ? (ratedBooks.reduce((acc, curr) => acc + curr.rating, 0) / ratedBooks.length).toFixed(1)
    : "0.0";

  // 3. Topological Calculations (Hubs and Orphans)
  // Build degree mapping of nodes
  const graphData = useMemo(() => {
    const degrees = {};
    
    // Initialize degrees
    books.forEach(b => { degrees[b.id] = { id: b.id, name: b.title, type: "book", count: 0 }; });
    notes.forEach(n => { degrees[n.id] = { id: n.id, name: "Note: " + n.content.replace(/<[^>]+>/g, "").substring(0, 15) + "...", type: "note", count: 0 }; });
    
    // Count link connections
    links.forEach(l => {
      if (degrees[l.source_id]) degrees[l.source_id].count += 1;
      if (degrees[l.target_id]) degrees[l.target_id].count += 1;
    });

    const list = Object.values(degrees);
    const hubs = [...list].filter(item => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);
    const orphans = [...list].filter(item => item.count === 0);

    return { hubs, orphans };
  }, [books, notes, links]);

  // 4. Area Metrics
  const areaMetrics = useMemo(() => {
    return areas.map(area => {
      const ax1 = area.x_pos;
      const ay1 = area.y_pos;
      const ax2 = area.x_pos + (area.width || 200);
      const ay2 = area.y_pos + (area.height || 200);

      // Find books inside area boundaries
      const areaBooks = books.filter(b => b.x_pos >= ax1 && b.x_pos <= ax2 && b.y_pos >= ay1 && b.y_pos <= ay2);
      const total = areaBooks.length;
      const completed = areaBooks.filter(b => b.status === "Completed").length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        id: area.id,
        name: area.name,
        color: area.color,
        total,
        completed,
        rate
      };
    });
  }, [areas, books]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md pointer-events-auto"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="aero-panel w-full max-w-4xl mx-4 bg-[#0a0a0af8] border border-white/10 text-white rounded-xl overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.9)] max-h-[90vh]"
      >
        {/* Header */}
        <div className="aero-header justify-between bg-white/5 border-b border-white/5 px-6 py-4">
          <div className="hud-text text-white flex items-center gap-2.5 text-xs font-bold tracking-widest">
            <BarChart3 size={15} className="text-[#00aaff] animate-pulse" />
            <span>AETHER // TELEMETRY ANALYTICS CENTER</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Row: Inventory Stats & Reading Velocities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Stats Card */}
            <div className="aero-panel bg-black/40 border-white/5 p-4 rounded-lg flex flex-col justify-between">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
                <Database size={13} className="text-[#00aaff]" />
                <span className="font-mono text-[10px] tracking-wider text-[#00aaff] font-bold">WORKSPACE_INVENTORY</span>
              </div>
              <div className="grid grid-cols-3 gap-3 font-mono text-center">
                <div className="bg-white/5 p-2 rounded border border-white/5">
                  <div className="text-xl font-bold text-white">{bookCount}</div>
                  <div className="text-[7px] text-gray-500 mt-1">BOOKS</div>
                </div>
                <div className="bg-white/5 p-2 rounded border border-white/5">
                  <div className="text-xl font-bold text-white">{noteCount}</div>
                  <div className="text-[7px] text-gray-500 mt-1">NOTES</div>
                </div>
                <div className="bg-white/5 p-2 rounded border border-white/5">
                  <div className="text-xl font-bold text-white">{areaCount}</div>
                  <div className="text-[7px] text-gray-500 mt-1">ZONES</div>
                </div>
                <div className="bg-white/5 p-2 rounded border border-white/5">
                  <div className="text-xl font-bold text-white">{linkCount}</div>
                  <div className="text-[7px] text-gray-500 mt-1">LINKS</div>
                </div>
                <div className="bg-white/5 p-2 rounded border border-white/5">
                  <div className="text-xl font-bold text-white">{quoteCount}</div>
                  <div className="text-[7px] text-gray-500 mt-1">QUOTES</div>
                </div>
                <div className="bg-white/5 p-2 rounded border border-white/5 border-dashed border-[#00aaff]/30">
                  <div className="text-xl font-bold text-[#00aaff]">{totalCards}</div>
                  <div className="text-[7px] text-[#00aaff]/60 mt-1">TOTAL NODES</div>
                </div>
              </div>
            </div>

            {/* Reading Velocities Card */}
            <div className="aero-panel bg-black/40 border-white/5 p-4 rounded-lg flex flex-col justify-between">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
                <Award size={13} className="text-[#a855f7]" />
                <span className="font-mono text-[10px] tracking-wider text-[#a855f7] font-bold">READING_METRICS_TELEMETRY</span>
              </div>
              <div className="space-y-3 font-mono text-[9px]">
                <div className="flex justify-between items-center text-xs">
                  <span>COMPLETION RATE:</span>
                  <span className="text-[#a855f7] font-bold">{completionRate}%</span>
                </div>
                
                {/* Horizontal Progress bar */}
                <div className="h-2 bg-white/5 rounded-full overflow-hidden flex border border-white/10">
                  {bookCount > 0 ? (
                    <>
                      <div className="bg-green-500 h-full" style={{ width: `${(completedCount/bookCount)*100}%` }} title={`Completed: ${completedCount}`} />
                      <div className="bg-yellow-500 h-full" style={{ width: `${(readingCount/bookCount)*100}%` }} title={`Reading: ${readingCount}`} />
                      <div className="bg-blue-500 h-full" style={{ width: `${(toReadCount/bookCount)*100}%` }} title={`To Read: ${toReadCount}`} />
                    </>
                  ) : (
                    <div className="bg-white/10 w-full h-full" />
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[8px] mt-1 pt-1 border-t border-white/5">
                  <div>
                    <span className="text-green-500 font-bold">■</span> COMPLETED ({completedCount})
                  </div>
                  <div>
                    <span className="text-yellow-500 font-bold">■</span> READING ({readingCount})
                  </div>
                  <div>
                    <span className="text-blue-500 font-bold">■</span> TO READ ({toReadCount})
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] mt-2 pt-1">
                  <span>AVERAGE SCORE:</span>
                  <span className="text-yellow-400 font-bold">{averageRating} ★</span>
                </div>
              </div>
            </div>

          </div>

          {/* Middle Row: Network Topology (Hubs & Orphans) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Hubs Card */}
            <div className="aero-panel bg-black/40 border-white/5 p-4 rounded-lg flex flex-col">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
                <GitMerge size={13} className="text-green-400" />
                <span className="font-mono text-[10px] tracking-wider text-green-400 font-bold">TOP_INTEGRATION_HUBS</span>
              </div>
              <div className="flex-1 space-y-1.5 font-mono text-[9px] max-h-48 overflow-y-auto pr-1">
                {graphData.hubs.map((hub) => (
                  <div key={hub.id} className="flex justify-between items-center p-2 rounded bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <span className="truncate max-w-[70%] text-white">{hub.name.toUpperCase()}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">({hub.count} links)</span>
                      <button
                        type="button"
                        onClick={() => { onTeleport(hub.id, hub.type); onClose(); }}
                        className="px-1.5 py-0.5 border border-green-500/40 text-green-400 hover:bg-green-500/10 rounded text-[7px] cursor-pointer flex items-center gap-0.5"
                      >
                        <Compass size={8} /> TELEPORT
                      </button>
                    </div>
                  </div>
                ))}
                {graphData.hubs.length === 0 && (
                  <div className="text-center text-gray-600 py-6 uppercase tracking-wider text-[8px]">NO NETWORK LINKS DETECTED</div>
                )}
              </div>
            </div>

            {/* Orphans Card */}
            <div className="aero-panel bg-black/40 border-white/5 p-4 rounded-lg flex flex-col">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
                <AlertCircle size={13} className="text-[#ef4444]" />
                <span className="font-mono text-[10px] tracking-wider text-[#ef4444] font-bold">DISCONNECTED_ORPHANS</span>
              </div>
              <div className="flex-1 space-y-1.5 font-mono text-[9px] max-h-48 overflow-y-auto pr-1">
                {graphData.orphans.map((orph) => (
                  <div key={orph.id} className="flex justify-between items-center p-2 rounded bg-white/5 border border-white/5 hover:bg-[#ef4444]/5 transition-colors">
                    <span className="truncate max-w-[70%] text-white">{orph.name.toUpperCase()}</span>
                    <button
                      type="button"
                      onClick={() => { onTeleport(orph.id, orph.type); onClose(); }}
                      className="px-1.5 py-0.5 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded text-[7px] cursor-pointer flex items-center gap-0.5"
                    >
                      <Compass size={8} /> TELEPORT
                    </button>
                  </div>
                ))}
                {graphData.orphans.length === 0 && (
                  <div className="text-center text-green-500 font-bold py-6 uppercase tracking-wider text-[8px]">NO ORPHAN MODULES DETECTED</div>
                )}
              </div>
            </div>

          </div>

          {/* Bottom Row: Category Sectors */}
          <div className="aero-panel bg-black/40 border-white/5 p-4 rounded-lg">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
              <Shield size={13} className="text-yellow-400" />
              <span className="font-mono text-[10px] tracking-wider text-yellow-400 font-bold">CATEGORY_ZONES_METRICS</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[9px]">
              {areaMetrics.map((area) => (
                <div key={area.id} className="p-3 bg-white/5 border border-white/5 rounded-lg flex flex-col justify-between gap-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">{area.name}</span>
                    <span className="text-gray-400">{area.completed}/{area.total} completed</span>
                  </div>
                  
                  {/* Progress gauge bar */}
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${area.rate}%`,
                        backgroundColor: area.color || "#00aaff"
                      }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[8px]">
                    <span className="text-white/40">COMPLETION: {area.rate}%</span>
                    <button
                      type="button"
                      onClick={() => { onTeleport(area.id, "area"); onClose(); }}
                      className="text-[#00aaff] hover:underline flex items-center gap-0.5 cursor-pointer text-[7px]"
                    >
                      <Compass size={8} /> ZOOM_ZONE
                    </button>
                  </div>
                </div>
              ))}
              {areaMetrics.length === 0 && (
                <div className="col-span-2 text-center text-gray-600 py-6 uppercase tracking-wider text-[8px]">NO CATEGORY ZONES DEFINED IN SYSTEM</div>
              )}
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
