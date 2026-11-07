// Criterio - Content Script v2.2 (comunicación mejorada)

console.log("Criterio content script v2.2 loaded");

const SIGNALS = [
  {
    id: "loaded",
    name: "Lenguaje cargado / emocional",
    colorClass: "criterio-loaded",
    tooltip: "Lenguaje cargado o emocional.",
    patterns: ["escándalo", "escandaloso", "brutal", "desastre", "catástrofe", "indignante", "vergonzoso", "alarmante", "impactante", "devastador", "inaceptable", "manipulación", "mentira", "fraude", "corrupción"]
  },
  {
    id: "weak",
    name: "Atribución débil o anónima",
    colorClass: "criterio-weak",
    tooltip: "Atribución débil o anónima.",
    patterns: ["fuentes cercanas", "según fuentes", "se dice", "se comenta", "expertos afirman", "al parecer", "presuntamente", "supuestamente", "según se ha podido saber"]
  },
  {
    id: "certainty",
    name: "Certeza excesiva",
    colorClass: "criterio-certainty",
    tooltip: "Certeza excesiva.",
    patterns: ["sin duda", "indudablemente", "está claro que", "es evidente que", "obviamente", "claramente", "definitivamente", "sin lugar a dudas"]
  },
  {
    id: "sensational",
    name: "Sensacionalismo",
    colorClass: "criterio-sensational",
    tooltip: "Posible sensacionalismo.",
    patterns: ["sin precedentes", "histórico", "épico", "apocalíptico", "el mayor", "el peor", "nunca antes"]
  },
  {
    id: "irony",
    name: "Posible ironía",
    colorClass: "criterio-irony",
    tooltip: "Posible marcador de ironía.",
    patterns: ["ya claro", "sí, seguro", "qué sorpresa", "como era de esperar"]
  },
  {
    id: "official",
    name: "Documento oficial",
    colorClass: "criterio-official",
    tooltip: "Mención a documento oficial. Consulta el texto original.",
    patterns: ["código penal", "codigo penal", "código civil", "codigo civil", "boe", "boletín oficial del estado", "ley orgánica", "real decreto", "constitución española"]
  }
];

let currentSource = null;
let signalCounts = { loaded: 0, weak: 0, certainty: 0, sensational: 0, irony: 0, official: 0 };
let analysisReady = false;

async function detectSource() {
  try {
    const response = await fetch(chrome.runtime.getURL("data/sources.json"));
    const data = await response.json();
    const hostname = window.location.hostname.replace("www.", "");
    currentSource = data.sources.find(s => s.domains.some(d => hostname.includes(d))) || null;
    return currentSource;
  } catch (e) {
    console.error(e);
    return null;
  }
}

function extractArticleContainer() {
  const selectors = ["article", "[role='main']", ".article-body", ".post-content", ".entry-content", "main"];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim().length > 300) return el;
  }
  return document.body;
}

function highlightSignals(container) {
  signalCounts = { loaded: 0, weak: 0, certainty: 0, sensational: 0, irony: 0, official: 0 };
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode: n => {
      const p = n.parentElement;
      if (!p || ["SCRIPT","STYLE","NOSCRIPT"].includes(p.tagName) || p.classList?.contains("criterio-hl")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  let node;
  while (node = walker.nextNode()) nodes.push(node);

  nodes.forEach(textNode => {
    let html = textNode.textContent;
    let changed = false;
    SIGNALS.forEach(signal => {
      signal.patterns.forEach(pat => {
        const re = new RegExp(`(${pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
        if (re.test(html)) {
          changed = true;
          html = html.replace(re, m => {
            signalCounts[signal.id]++;
            return `<span class="criterio-hl ${signal.colorClass}" title="${signal.tooltip}">${m}</span>`;
          });
        }
      });
    });
    if (changed) {
      const span = document.createElement("span");
      span.innerHTML = html;
      textNode.parentNode.replaceChild(span, textNode);
    }
  });
}

function injectStyles() {
  if (document.getElementById("criterio-styles")) return;
  const s = document.createElement("style");
  s.id = "criterio-styles";
  s.textContent = `
    .criterio-hl{border-radius:3px;padding:0 2px;cursor:help}
    .criterio-loaded{background:rgba(255,193,7,.32);border-bottom:1px dashed #f59e0b}
    .criterio-weak{background:rgba(59,130,246,.28);border-bottom:1px dashed #3b82f6}
    .criterio-certainty{background:rgba(239,68,68,.28);border-bottom:1px dashed #ef4444}
    .criterio-sensational{background:rgba(249,115,22,.3);border-bottom:1px dashed #f97316}
    .criterio-irony{background:rgba(168,85,247,.28);border-bottom:1px dashed #a855f7}
    .criterio-official{background:rgba(16,185,129,.28);border-bottom:1px dashed #10b981}
  `;
  document.head.appendChild(s);
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "getAnalysis") {
    sendResponse({
      source: currentSource,
      signals: signalCounts,
      ready: analysisReady
    });
  }
  return true;
});

async function init() {
  injectStyles();
  await detectSource();
  const container = extractArticleContainer();
  if (container) highlightSignals(container);
  analysisReady = true;
  console.log("Criterio listo", { source: currentSource, signals: signalCounts });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => setTimeout(init, 600));
} else {
  setTimeout(init, 600);
}
