console.log("Criterio content script cargado");

const SIGNALS = [
  {
    id: "loaded",
    colorClass: "criterio-loaded",
    tooltip: "Lenguaje cargado o emocional",
    patterns: ["escándalo", "escandaloso", "brutal", "desastre", "catástrofe", "indignante", "vergonzoso", "alarmante", "impactante", "devastador", "inaceptable", "manipulación", "mentira", "fraude", "corrupción"]
  },
  {
    id: "weak",
    colorClass: "criterio-weak",
    tooltip: "Atribución débil o anónima",
    patterns: ["según fuentes", "se dice", "se comenta", "al parecer", "presuntamente", "supuestamente", "fuentes cercanas", "según se ha podido saber"]
  },
  {
    id: "certainty",
    colorClass: "criterio-certainty",
    tooltip: "Certeza excesiva",
    patterns: ["sin duda", "indudablemente", "está claro que", "es evidente que", "obviamente", "claramente", "definitivamente"]
  },
  {
    id: "official",
    colorClass: "criterio-official",
    tooltip: "Documento oficial. Consulta el texto original.",
    patterns: ["código penal", "codigo penal", "código civil", "codigo civil", "boe", "boletín oficial del estado", "ley orgánica", "ley organica", "real decreto", "constitución española", "estatuto de los trabajadores"]
  }
];

let currentSource = null;
let signalCounts = { loaded: 0, weak: 0, certainty: 0, official: 0 };

async function detectSource() {
  try {
    const response = await fetch(chrome.runtime.getURL("data/sources.json"));
    const data = await response.json();
    const hostname = location.hostname.replace("www.", "");
    currentSource = data.sources.find(s => s.domains.some(d => hostname.includes(d))) || null;
  } catch (e) {
    console.error("Error cargando fuentes:", e);
  }
}

function highlightSignals() {
  signalCounts = { loaded: 0, weak: 0, certainty: 0, official: 0 };

  const container = document.querySelector("article") || document.querySelector("main") || document.body;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.classList?.contains("criterio-hl")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);

  textNodes.forEach(textNode => {
    let html = textNode.textContent;
    let modified = false;

    SIGNALS.forEach(signal => {
      signal.patterns.forEach(pattern => {
        const regex = new RegExp(pattern, "gi");
        if (regex.test(html)) {
          modified = true;
          html = html.replace(regex, (match) => {
            signalCounts[signal.id]++;
            return `<span class="criterio-hl ${signal.colorClass}" title="${signal.tooltip}">${match}</span>`;
          });
        }
      });
    });

    if (modified) {
      const span = document.createElement("span");
      span.innerHTML = html;
      textNode.parentNode.replaceChild(span, textNode);
    }
  });
}

function injectStyles() {
  if (document.getElementById("criterio-styles")) return;
  const style = document.createElement("style");
  style.id = "criterio-styles";
  style.textContent = `
    .criterio-hl { border-radius: 3px; padding: 0 2px; cursor: help; }
    .criterio-loaded { background: rgba(255,193,7,0.35); border-bottom: 1px dashed #f59e0b; }
    .criterio-weak { background: rgba(59,130,246,0.3); border-bottom: 1px dashed #3b82f6; }
    .criterio-certainty { background: rgba(239,68,68,0.3); border-bottom: 1px dashed #ef4444; }
    .criterio-official { background: rgba(16,185,129,0.3); border-bottom: 1px dashed #10b981; }
  `;
  document.head.appendChild(style);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getAnalysis") {
    sendResponse({
      source: currentSource,
      signals: signalCounts
    });
  }
  return true;
});

async function init() {
  injectStyles();
  await detectSource();
  highlightSignals();
  console.log("Análisis completado", signalCounts);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => setTimeout(init, 500));
} else {
  setTimeout(init, 500);
}
