"use client";
import { useState, useEffect, useRef } from "react";
import { handleContentEditableKeyDown } from "@/lib/editorHelpers";
import { CheckCircle, XCircle, Play, RotateCcw } from "lucide-react";

export default function TestPage() {
  const [tests, setTests] = useState([]);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState({ passed: 0, failed: 0, total: 0 });
  const editorRef = useRef(null);

  const initEditor = (html) => {
    if (!editorRef.current) return null;
    editorRef.current.innerHTML = html;
    
    // Position caret in the first text node or block
    const selection = window.getSelection();
    const range = document.createRange();
    
    let textNode = null;
    const walk = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
    if (walk.nextNode()) {
      textNode = walk.currentNode;
    }
    
    if (textNode) {
      range.setStart(textNode, textNode.textContent.length);
    } else if (editorRef.current.firstChild) {
      range.setStart(editorRef.current.firstChild, 0);
    } else {
      range.setStart(editorRef.current, 0);
    }
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    return textNode || editorRef.current;
  };

  const createMockEvent = (key, options = {}) => {
    const event = new KeyboardEvent("keydown", { key, bubbles: true, ...options });
    // Mock read-only properties currentTarget and target
    Object.defineProperty(event, "currentTarget", { value: editorRef.current, configurable: true });
    
    const sel = window.getSelection();
    const targetNode = (sel && sel.rangeCount > 0) ? sel.getRangeAt(0).startContainer : editorRef.current;
    Object.defineProperty(event, "target", { value: targetNode, configurable: true });
    
    return event;
  };

  const runSuite = async () => {
    if (running) return;
    setRunning(true);
    
    const results = [];
    let passedCount = 0;
    let failedCount = 0;

    const cases = [
      {
        id: 1,
        name: "Markdown H1 Auto-Parsing",
        desc: "Type '#' + Space, verify conversion to H1 tag",
        run: () => {
          initEditor("<div>#</div>");
          const event = createMockEvent(" ");
          
          handleContentEditableKeyDown(event, () => {});
          
          const html = editorRef.current.innerHTML.toLowerCase();
          const hasH1 = html.includes("<h1") || editorRef.current.querySelector("h1");
          const cleanedText = editorRef.current.textContent.trim();
          
          if (hasH1 && !cleanedText.includes("#")) {
            return { pass: true, detail: `Result HTML: ${html}` };
          }
          return { pass: false, detail: `Expected H1 heading, got: ${html}` };
        }
      },
      {
        id: 2,
        name: "Markdown Blockquote Auto-Parsing",
        desc: "Type '>' + Space, verify blockquote conversion",
        run: () => {
          initEditor("<div>&gt;</div>");
          const event = createMockEvent(" ");
          
          handleContentEditableKeyDown(event, () => {});
          
          const html = editorRef.current.innerHTML.toLowerCase();
          const hasBlockquote = html.includes("<blockquote") || editorRef.current.querySelector("blockquote");
          
          if (hasBlockquote && !editorRef.current.textContent.includes(">")) {
            return { pass: true, detail: `Result HTML: ${html}` };
          }
          return { pass: false, detail: `Expected blockquote, got: ${html}` };
        }
      },
      {
        id: 3,
        name: "Markdown Horizontal Rule Auto-Parsing",
        desc: "Type '---' + Space, verify horizontal rule hr creation",
        run: () => {
          initEditor("<div>---</div>");
          const event = createMockEvent(" ");
          
          handleContentEditableKeyDown(event, () => {});
          
          const html = editorRef.current.innerHTML.toLowerCase();
          const hasHR = html.includes("<hr") || editorRef.current.querySelector("hr");
          
          if (hasHR) {
            return { pass: true, detail: `Result HTML: ${html}` };
          }
          return { pass: false, detail: `Expected hr, got: ${html}` };
        }
      },
      {
        id: 4,
        name: "Notion Heading Split on Enter",
        desc: "Press Enter at the end of H1, verify it inserts a clean body div (not H1)",
        run: () => {
          initEditor("<h1>My Heading</h1>");
          
          // Place selection at the end of the text
          const selection = window.getSelection();
          const range = document.createRange();
          const h1 = editorRef.current.querySelector("h1");
          range.setStart(h1.firstChild, h1.firstChild.textContent.length);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);

          const event = createMockEvent("Enter");
          handleContentEditableKeyDown(event, () => {});

          const html = editorRef.current.innerHTML.toLowerCase();
          const children = editorRef.current.children;
          const secondChild = children[1];

          if (children.length >= 2 && secondChild.tagName === "DIV" && secondChild.innerHTML.includes("<br>")) {
            return { pass: true, detail: `Result HTML: ${html}` };
          }
          return { pass: false, detail: `Expected H1 followed by div with br, got: ${html}` };
        }
      },
      {
        id: 5,
        name: "Notion Checkbox Continuation",
        desc: "Press Enter on active checkbox line, verify it inserts a new unchecked checkbox",
        run: () => {
          initEditor('<div class="flex items-start gap-2 my-1"><input type="checkbox" checked="checked" /><span>Task Item</span></div>');
          
          const selection = window.getSelection();
          const range = document.createRange();
          const span = editorRef.current.querySelector("span");
          range.setStart(span.firstChild, span.firstChild.textContent.length);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);

          const event = createMockEvent("Enter");
          handleContentEditableKeyDown(event, () => {});

          const html = editorRef.current.innerHTML.toLowerCase();
          const checkboxes = editorRef.current.querySelectorAll('input[type="checkbox"]');
          
          if (checkboxes.length === 2 && !checkboxes[1].checked) {
            return { pass: true, detail: `Result HTML: ${html}` };
          }
          return { pass: false, detail: `Expected 2 checkboxes (second unchecked), got: ${html}` };
        }
      },
      {
        id: 6,
        name: "Notion Checkbox Exit on Enter",
        desc: "Press Enter on empty checkbox list line, verify conversion to standard div (exit list)",
        run: () => {
          initEditor('<div class="flex items-start gap-2 my-1"><input type="checkbox" /><span>&nbsp;</span></div>');
          
          const selection = window.getSelection();
          const range = document.createRange();
          const span = editorRef.current.querySelector("span");
          range.setStart(span.firstChild, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);

          const event = createMockEvent("Enter");
          handleContentEditableKeyDown(event, () => {});

          const html = editorRef.current.innerHTML.toLowerCase();
          const checkboxes = editorRef.current.querySelectorAll('input[type="checkbox"]');

          if (checkboxes.length === 0 && html.includes("div") && html.includes("<br>")) {
            return { pass: true, detail: `Result HTML: ${html}` };
          }
          return { pass: false, detail: `Expected checkbox to be removed and replaced by div, got: ${html}` };
        }
      },
      {
        id: 7,
        name: "Notion Checkbox Delete on Backspace",
        desc: "Press Backspace at start of checkbox text, verify conversion to standard div",
        run: () => {
          initEditor('<div class="flex items-start gap-2 my-1"><input type="checkbox" /><span>Task</span></div>');
          
          const selection = window.getSelection();
          const range = document.createRange();
          const span = editorRef.current.querySelector("span");
          range.setStart(span.firstChild, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);

          const event = createMockEvent("Backspace");
          handleContentEditableKeyDown(event, () => {});

          const html = editorRef.current.innerHTML.toLowerCase();
          const checkboxes = editorRef.current.querySelectorAll('input[type="checkbox"]');

          if (checkboxes.length === 0 && editorRef.current.textContent.includes("Task")) {
            return { pass: true, detail: `Result HTML: ${html}` };
          }
          return { pass: false, detail: `Expected checkbox deleted, keeping text 'Task', got: ${html}` };
        }
      }
    ];

    for (const tc of cases) {
      try {
        const res = tc.run();
        results.push({ ...tc, pass: res.pass, detail: res.detail });
        if (res.pass) passedCount++;
        else failedCount++;
      } catch (err) {
        results.push({ ...tc, pass: false, detail: `Crash: ${err.message}` });
        failedCount++;
      }
      await new Promise(r => setTimeout(r, 100));
      setTests([...results]);
      setSummary({ passed: passedCount, failed: failedCount, total: passedCount + failedCount });
    }

    setRunning(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runSuite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-screen h-screen bg-[#050505] text-white flex flex-col p-8 overflow-y-auto select-none font-sans">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-white">AETHER_OS // WYSIWYG // TEST_RUNNER</h1>
            <p className="text-xs text-gray-500 font-mono mt-1">AUTOMATED CORE EDITOR TEST SUITE</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={runSuite}
              disabled={running}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all border ${
                running 
                  ? "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed"
                  : "bg-[#00aaff]/15 hover:bg-[#00aaff]/30 border-[#00aaff]/30 text-[#00aaff]"
              }`}
            >
              <Play size={14} />
              {running ? "TESTING..." : "RUN SUITE"}
            </button>
            
            <button
              onClick={() => {
                setTests([]);
                setSummary({ passed: 0, failed: 0, total: 0 });
                if (editorRef.current) editorRef.current.innerHTML = "";
              }}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all border bg-white/5 hover:bg-white/10 border-white/10 text-white"
            >
              <RotateCcw size={14} />
              RESET
            </button>
          </div>
        </div>

        {/* Dashboard Status cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="aero-panel p-4 bg-black/40 border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-mono">STATUS</span>
            <span className={`text-sm font-bold tracking-widest font-mono ${running ? "text-yellow-500 animate-pulse" : "text-green-500"}`}>
              {running ? "EXECUTING_RUN" : "IDLE // READY"}
            </span>
          </div>
          <div className="aero-panel p-4 bg-black/40 border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-mono">TOTAL_TESTS</span>
            <span className="text-lg font-bold font-mono text-white">{summary.total}</span>
          </div>
          <div className="aero-panel p-4 bg-black/40 border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-mono">PASSED</span>
            <span className="text-lg font-bold font-mono text-green-400">{summary.passed}</span>
          </div>
          <div className="aero-panel p-4 bg-black/40 border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-mono">FAILED</span>
            <span className={`text-lg font-bold font-mono ${summary.failed > 0 ? "text-red-500" : "text-gray-400"}`}>
              {summary.failed}
            </span>
          </div>
        </div>

        {/* Mock Sandbox Editor (Hidden visually but active in DOM for testing) */}
        <div className="aero-panel p-4 bg-black/80 border border-white/10 flex flex-col gap-2">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <span className="text-[10px] text-gray-500 font-mono">SANDBOX_BUFFER (DOM EDITOR VIEW)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          </div>
          <div
            ref={editorRef}
            contentEditable
            className="w-full min-h-[80px] bg-black/30 border border-white/5 text-white text-[11px] p-3 rounded outline-none overflow-y-auto leading-relaxed font-sans"
            placeholder="Sandbox container..."
            style={{ pointerEvents: "none" }}
          />
        </div>

        {/* Test Run Log */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold tracking-widest font-mono text-white">TEST_CASE_LOGS</h2>
          
          <div className="flex flex-col gap-2.5">
            {tests.length === 0 && (
              <div className="aero-panel p-6 text-center text-xs text-gray-500 font-mono bg-black/20 border border-white/5">
                NO TESTS EXECUTED YET. CLICK RUN SUITE.
              </div>
            )}
            
            {tests.map((test) => (
              <div
                key={test.id}
                className={`aero-panel p-4 flex items-start gap-4 border transition-all ${
                  test.pass 
                    ? "border-green-500/20 bg-green-500/2" 
                    : "border-red-500/20 bg-red-500/2"
                }`}
              >
                <div className="mt-0.5">
                  {test.pass ? (
                    <CheckCircle className="text-green-500" size={18} />
                  ) : (
                    <XCircle className="text-red-500" size={18} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold tracking-wide font-mono text-white uppercase">{test.name}</h3>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      test.pass ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {test.pass ? "PASSED" : "FAILED"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{test.desc}</p>
                  <pre className="text-[9px] font-mono text-gray-600 bg-black/40 p-2 rounded mt-2 border border-white/5 overflow-x-auto">
                    {test.detail}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
