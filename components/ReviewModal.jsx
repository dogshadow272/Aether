"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Save, Orbit, X, Bold, Italic, Underline, List, ListOrdered, FileDown } from "lucide-react";
import { handleContentEditableKeyDown } from "../lib/editorHelpers";

export default function ReviewModal({ book, onClose, onSave, onExtractQuote, onDelete, quotes = [] }) {
  const [review, setReview] = useState(book?.review || "");
  const [rating, setRating] = useState(book?.rating || 0);
  const [status, setStatus] = useState(book?.status || "To Read");
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef(null);

  // Strip HTML tags for word counting safely
  const getPlainText = (html) => {
    if (typeof document === "undefined") return html;
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || "";
  };

  const plainTextReview = getPlainText(review);
  const wordCount = plainTextReview.trim() ? plainTextReview.trim().split(/\s+/).length : 0;
  const maxWords = 500;
  const progress = Math.min((wordCount / maxWords) * 100, 100);

  // Initialize review text on book change
  useEffect(() => {
    if (editorRef.current && book) {
      editorRef.current.innerHTML = book.review || "";
    }
  }, [book]);

  // Auto-save after 2 seconds of inactivity
  const stableOnSave = useCallback(onSave, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (review !== book?.review || rating !== book?.rating || status !== book?.status) {
        setIsSaving(true);
        stableOnSave({ ...book, review, rating, status });
        setTimeout(() => setIsSaving(false), 1000);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [review, rating, status, book, stableOnSave]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleExtract = () => {
    const selection = window.getSelection().toString();
    if (selection) {
      onExtractQuote(book.id, selection);
    } else {
      alert("Highlight some text first to extract a satellite quote.");
    }
  };

  const handleExport = () => {
    // Generate Rating stars representation
    const maxStars = 5;
    const filledStars = "★".repeat(rating);
    const emptyStars = "☆".repeat(maxStars - rating);
    const ratingString = `${filledStars}${emptyStars} (${rating}/${maxStars} Stars)`;

    // Convert HTML review to Markdown
    const markdownNotes = htmlToMarkdown(review);

    // Format Export Date
    const exportDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Compile Markdown content
    let markdown = `# REVIEW: ${book.title.toUpperCase()}\n\n`;
    markdown += `- **Author:** ${book.author || "Unknown"}\n`;
    markdown += `- **Status:** ${status}\n`;
    markdown += `- **Rating:** ${ratingString}\n`;
    markdown += `- **Export Date:** ${exportDate}\n\n`;
    markdown += `---\n\n`;
    markdown += `## REVIEW NOTES\n\n`;
    markdown += `${markdownNotes || "*No review notes written yet.*"}\n\n`;

    if (quotes && quotes.length > 0) {
      markdown += `---\n\n`;
      markdown += `## SATELLITE QUOTES & FRAGMENTS\n\n`;
      quotes.forEach((q, idx) => {
        markdown += `> "${q.quote}"\n`;
        markdown += `> — Fragment ${idx + 1}\n\n`;
      });
    }

    // Trigger File Download
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const sanitizedTitle = book.title
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    link.setAttribute("download", `${sanitizedTitle || "book"}_review.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Click handler to toggle custom checkbox status inside contenteditable
  const handleEditorClick = (e) => {
    if (e.target.tagName === "INPUT" && e.target.type === "checkbox") {
      if (e.target.checked) {
        e.target.setAttribute("checked", "checked");
      } else {
        e.target.removeAttribute("checked");
      }
      if (editorRef.current) {
        setReview(editorRef.current.innerHTML);
      }
    }
  };

  // Keyboard shortcut and Markdown auto-parse shortcut interceptor
  const handleEditorKeyDown = (e) => {
    const handled = handleContentEditableKeyDown(e, (newHTML) => {
      setReview(newHTML);
    });
    if (handled) return;
  };

  if (!book) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-xl"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-5xl h-[85vh] flex flex-col aero-panel bg-[#0a0a0a]"
      >
        <div className="aero-header justify-between bg-black/50">
          <div className="hud-text text-white tracking-widest flex items-center gap-4">
            <span>DATA_MODULE</span>
            <span className="text-[#00aaff] opacity-60">ID: {book.id.substring(0, 8)}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-72 border-r border-r-white/10 p-6 flex flex-col gap-6 bg-black/30 overflow-y-auto">
            <div>
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full h-auto rounded border border-white/10 mb-4"
                  style={{ boxShadow: "0 5px 20px rgba(0,0,0,0.5)" }}
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-white/5 border border-white/10 rounded flex items-center justify-center mb-4 text-gray-500">
                  No Cover
                </div>
              )}
              <h2 className="text-xl font-medium text-white mb-1 leading-tight">{book.title}</h2>
              <p className="text-gray-400 text-sm">{book.author}</p>
            </div>

            <div>
              <label className="hud-text block mb-2 text-gray-400">STATUS</label>
              <select
                id="review-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="aero-input text-sm"
              >
                <option value="To Read">To Read</option>
                <option value="Reading">Reading</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="hud-text block mb-2 text-gray-400">RATING</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    id={`review-rating-star-${star}`}
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: star <= rating ? "2px solid #fff" : "2px solid #555",
                      backgroundColor: star <= rating ? "#ffffff" : "transparent",
                      boxShadow: star <= rating ? "0 0 10px #fff" : "none",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-3 text-xs hud-text">
              <div className="flex items-center gap-2">
                {isSaving ? (
                  <span className="text-[#00aaff] flex items-center gap-2">
                    <Save size={14} className="animate-pulse" /> SYNCING...
                  </span>
                ) : (
                  <span className="text-gray-500 flex items-center gap-2">
                    <Save size={14} /> UP TO DATE
                  </span>
                )}
              </div>
              <button
                id="review-decommission-btn"
                type="button"
                onClick={() => onDelete(book.id)}
                className="aero-button bg-red-950/40 text-red-400 hover:bg-red-900/60 border border-red-500/20 text-[10px] w-full text-center py-2 transition-all mt-2"
              >
                DECOMMISSION MODULE
              </button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 flex flex-col relative bg-black/10 min-h-0 overflow-hidden">
            {/* WYSIWYG formatting toolbar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-black/40">
              <div className="flex gap-1 items-center">
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    document.execCommand("bold", false, null);
                    if (editorRef.current) {
                      setReview(editorRef.current.innerHTML);
                    }
                  }}
                  className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  title="Bold (Cmd+B)"
                >
                  <Bold size={16} />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    document.execCommand("italic", false, null);
                    if (editorRef.current) {
                      setReview(editorRef.current.innerHTML);
                    }
                  }}
                  className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  title="Italic (Cmd+I)"
                >
                  <Italic size={16} />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    document.execCommand("underline", false, null);
                    if (editorRef.current) {
                      setReview(editorRef.current.innerHTML);
                    }
                  }}
                  className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  title="Underline (Cmd+U)"
                >
                  <Underline size={16} />
                </button>
                
                {/* Vertical Divider */}
                <div className="w-px h-5 bg-white/10 mx-1.5" />

                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    document.execCommand("insertUnorderedList", false, null);
                    if (editorRef.current) {
                      setReview(editorRef.current.innerHTML);
                    }
                  }}
                  className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  title="Bulleted List"
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    document.execCommand("insertOrderedList", false, null);
                    if (editorRef.current) {
                      setReview(editorRef.current.innerHTML);
                    }
                  }}
                  className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  title="Numbered List"
                >
                  <ListOrdered size={16} />
                </button>

                {/* Vertical Divider */}
                <div className="w-px h-5 bg-white/10 mx-1.5" />

                {/* Heading blocks shortcuts */}
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    document.execCommand("formatBlock", false, "H1");
                    if (editorRef.current) {
                      setReview(editorRef.current.innerHTML);
                    }
                  }}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-gray-400 hover:text-white hover:bg-white/5 border border-white/10"
                  title="Heading 1"
                >
                  H1
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    document.execCommand("formatBlock", false, "H2");
                    if (editorRef.current) {
                      setReview(editorRef.current.innerHTML);
                    }
                  }}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-gray-400 hover:text-white hover:bg-white/5 border border-white/10"
                  title="Heading 2"
                >
                  H2
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    document.execCommand("formatBlock", false, "H3");
                    if (editorRef.current) {
                      setReview(editorRef.current.innerHTML);
                    }
                  }}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-gray-400 hover:text-white hover:bg-white/5 border border-white/10"
                  title="Heading 3"
                >
                  H3
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  id="export-compilation-btn"
                  type="button"
                  onClick={handleExport}
                  className="aero-button secondary text-xs flex items-center gap-2 py-1 px-3 border border-white/10 hover:border-[#00aaff]/40 transition-colors"
                >
                  <FileDown size={12} /> EXPORT COMPILATION
                </button>
                <button
                  id="extract-fragment-btn"
                  type="button"
                  onClick={handleExtract}
                  className="aero-button secondary text-xs flex items-center gap-2 py-1 px-3 border border-white/10 hover:border-[#00aaff]/40 transition-colors"
                >
                  <Orbit size={12} /> EXTRACT FRAGMENT
                </button>
              </div>
            </div>

            {/* Rich text editing area */}
            <div
              ref={editorRef}
              contentEditable
              id="review-text-area"
              className="flex-1 w-full bg-transparent text-gray-200 p-8 outline-none leading-relaxed text-lg overflow-y-auto"
              style={{ fontFamily: "var(--font-sans)" }}
              placeholder="Enter review logs here... Use '# ' for H1, '## ' for H2, '- ' for bullets, or '- [ ] ' for checkboxes."
              onInput={(e) => {
                setReview(e.currentTarget.innerHTML);
              }}
              onKeyDown={handleEditorKeyDown}
              onClick={handleEditorClick}
            />

            {/* Progress Bar */}
            <div className="h-1 bg-white/5 w-full relative">
              <div
                className="absolute top-0 left-0 h-full bg-[#00aaff] transition-all duration-500"
                style={{ width: `${progress}%`, boxShadow: "0 0 10px #00aaff" }}
              />
            </div>
            <div className="text-right py-2 px-4 hud-text text-gray-500 bg-black/50">
              BUFFER: {wordCount} / {maxWords}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Clean HTML to Markdown converter
function htmlToMarkdown(html) {
  if (typeof document === "undefined") return html || "";
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html || "";

  const traverse = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const tagName = node.tagName.toUpperCase();

    if (tagName === "BR") {
      return "\n";
    }

    if (tagName === "INPUT" && node.getAttribute("type") === "checkbox") {
      const isChecked = node.checked || node.hasAttribute("checked");
      return isChecked ? "[x] " : "[ ] ";
    }

    let childrenContent = "";
    node.childNodes.forEach((child) => {
      childrenContent += traverse(child);
    });

    switch (tagName) {
      case "H1":
        return `\n# ${childrenContent.trim()}\n`;
      case "H2":
        return `\n## ${childrenContent.trim()}\n`;
      case "H3":
        return `\n### ${childrenContent.trim()}\n`;
      case "B":
      case "STRONG":
        return `**${childrenContent}**`;
      case "I":
      case "EM":
        return `*${childrenContent}*`;
      case "U":
        return `_${childrenContent}_`;
      case "LI": {
        const parent = node.parentNode;
        const isTask = node.querySelector('input[type="checkbox"]') !== null;
        if (isTask) {
          return `- ${childrenContent.trim()}\n`;
        }
        if (parent && parent.tagName.toUpperCase() === "OL") {
          const index = Array.from(parent.children).indexOf(node) + 1;
          return `${index}. ${childrenContent.trim()}\n`;
        }
        return `- ${childrenContent.trim()}\n`;
      }
      case "UL":
      case "OL":
        return `\n${childrenContent}\n`;
      case "DIV":
      case "P":
        return `\n${childrenContent}\n`;
      default:
        return childrenContent;
    }
  };

  let markdown = "";
  tempDiv.childNodes.forEach((child) => {
    markdown += traverse(child);
  });

  return markdown
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
