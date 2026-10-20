
// Criterio - Content Script v2.1 (con comunicación al Side Panel)

console.log("Criterio content script v2.1 loaded");

// ===== CONFIGURACIÓN DE SEÑALES =====
const SIGNALS = [
  {
    id: "loaded",
    name: "Lenguaje cargado / emocional",
    colorClass: "criterio-loaded",
    tooltip: "Lenguaje cargado o emocional. Estas palabras o expresiones pueden influir en la percepción del lector más allá del hecho descrito.",
    patterns: [
      "escándalo", "escandaloso", "escandalosa", "brutal", "brutales", "heroico", "heroica",
      "desastre", "desastroso", "catástrofe", "indignante", "vergonzoso", "alarmante",
      "terrorífico", "absurdo", "ridículo", "dramático", "impactante", "devastador",
      "inaceptable", "intolerable", "peligroso", "grave", "terrible", "horrible",
      "manipulación", "mentira", "engaño", "fraude", "corrupción", "abuso",
      "ataque frontal", "agresión", "caos total", "colapso", "fracaso estrepitoso",
      "sin precedentes", "histórico", "épico", "apocalíptico"
    ]
  },
  {
    id: "weak",
    name: "Atribución débil o anónima",
    colorClass: "criterio-weak",
    tooltip: "Atribución débil o anónima. La información se presenta sin identificar claramente la fuente.",
    patterns: [
      "fuentes cercanas", "según fuentes", "se dice", "se comenta", "expertos afirman",
      "algunos dicen", "se rumorea", "según informes", "fuentes no identificadas",
      "según se ha podido saber", "al parecer", "presuntamente", "supuestamente",
      "fuentes del entorno", "voces autorizadas", "según ha trascendido"
    ]
  },
  {
    id: "certainty",
    name: "Certeza excesiva",
    colorClass: "criterio-certainty",
    tooltip: "Certeza excesiva. Se presenta una afirmación como indiscutible sin matizar.",
    patterns: [
      "sin duda", "indudablemente", "está claro que", "es evidente que", "obviamente",
      "claramente", "definitivamente", "sin lugar a dudas", "es innegable",
      "todo el mundo sabe", "nadie puede negar", "es indiscutible", "no cabe duda"
    ]
  },
  {
    id: "sensational",
    name: "Sensacionalismo / exageración",
    colorClass: "criterio-sensational",
    tooltip: "Posible sensacionalismo o exageración.",
    patterns: [
      "sin precedentes", "histórico", "épico", "apocalíptico", "devastador",
      "el mayor", "el peor", "nunca antes", "por primera vez en la historia",
      "explosión de", "ola de", "tsunami de", "bomba", "terremoto político"
    ]
  },
  {
    id: "irony",
    name: "Posible ironía / tono irónico",
    colorClass: "criterio-irony",
    tooltip: "Posible marcador de ironía. La detección es limitada; úsalo como aviso.",
    patterns: [
      "ya claro", "sí, seguro", "qué sorpresa", "menuda sorpresa",
      "como era de esperar", "sorprendentemente", "curiosamente"
    ]
  }
];

// Variables globales para el Side Panel
let currentSource = null;
let signalCounts = { loaded: 0, weak: 0, certainty: 0, sensational: 0, irony: 0 };

// ===== FUNCIONES =====

async function detectSource() {
  try {
    const response = await fetch(chrome.runtime.getURL("data/sources.json"));
    const data = await response.json();
    const hostname = window.location.hostname.replace("www.", "");

    const source = data.sources.find(s =>
      s.domains.some(domain => hostname.includes(domain))
    );

    currentSource = source || null;
    console.log("Fuente detectada:", currentSource);
    return currentSource;
  } catch (e) {
    console.error("Error cargando sources.json", e);
    return null;
  }
}

function extractArticleContainer() {
  const selectors = [
    "article", "[role='main']", ".article-body", ".post-content",
    ".entry-content", ".story-body", ".content__article-body", "main", ".content"
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText && el.innerText.trim().length > 400) {
      return el;
    }
  }
  return document.body;
}

function highlightSignals(container) {
  if (!container) return;

  // Reiniciar contadores
  signalCounts = { loaded: 0, weak: 0, certainty: 0, sensational: 0, irony: 0 };

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
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
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(${escaped})`, "gi");

        if (regex.test(html)) {
          modified = true;
          html = html.replace(regex, (match) => {
            signalCounts[signal.id] = (signalCounts[signal.id] || 0) + 1;
            return `<span class="criterio-hl ${signal.colorClass}" title="${signal.tooltip}">${match}</span>`;
          });
        }
      });
    });

    if (modified) {
      const wrapper = document.createElement("span");
      wrapper.innerHTML = html;
      textNode.parentNode.replaceChild(wrapper, textNode);
    }
  });
}

function injectStyles() {
  if (document.getElementById("criterio-styles")) return;
  const style = document.createElement("style");
  style.id = "criterio-styles";
  style.textContent = `
    .criterio-hl { border-radius: 3px; padding: 0 2px; cursor: help; }
    .criterio-loaded { background: rgba(255,193,7,0.32); border-bottom: 1px dashed #f59e0b; }
    .criterio-weak { background: rgba(59,130,246,0.28); border-bottom: 1px dashed #3b82f6; }
    .criterio-certainty { background: rgba(239,68,68,0.28); border-bottom: 1px dashed #ef4444; }
    .criterio-sensational { background: rgba(249,115,22,0.30); border-bottom: 1px dashed #f97316; }
    .criterio-irony { background: rgba(168,85,247,0.28); border-bottom: 1px dashed #a855f7; }
  `;
  document.head.appendChild(style);
}

// Comunicación con el Side Panel
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
  try {
    injectStyles();
    await detectSource();
    const container = extractArticleContainer();
    if (container) {
      highlightSignals(container);
      console.log("Criterio: análisis completado", signalCounts);
    }
  } catch (e) {
    console.error("Criterio error:", e);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  setTimeout(init, 400);
}
