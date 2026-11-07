console.log("Criterio content script cargado");

const SIGNALS = [
  { id: "loaded", color: "criterio-loaded", tooltip: "Lenguaje cargado", patterns: ["escándalo","brutal","desastre","indignante","impactante","devastador","manipulación","mentira"] },
  { id: "weak", color: "criterio-weak", tooltip: "Atribución débil", patterns: ["según fuentes","se dice","al parecer","presuntamente","supuestamente"] },
  { id: "certainty", color: "criterio-certainty", tooltip: "Certeza excesiva", patterns: ["sin duda","está claro que","es evidente","obviamente","claramente"] },
  { id: "official", color: "criterio-official", tooltip: "Documento oficial", patterns: ["código penal","código civil","boe","ley orgánica","real decreto","constitución española"] }
];

let currentSource = null;
let signalCounts = { loaded:0, weak:0, certainty:0, official:0 };

async function detectSource() {
  try {
    const res = await fetch(chrome.runtime.getURL("data/sources.json"));
    const data = await res.json();
    const host = location.hostname.replace("www.","");
    currentSource = data.sources.find(s => s.domains.some(d => host.includes(d))) || null;
  } catch(e) { console.error(e); }
}

function highlight() {
  signalCounts = { loaded:0, weak:0, certainty:0, official:0 };
  const article = document.querySelector("article") || document.querySelector("main") || document.body;
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach(node => {
    if (!node.parentElement || node.parentElement.classList?.contains("criterio-hl")) return;
    let html = node.textContent;
    let changed = false;
    SIGNALS.forEach(sig => {
      sig.patterns.forEach(p => {
        const re = new RegExp(p, "gi");
        if (re.test(html)) {
          changed = true;
          html = html.replace(re, m => {
            signalCounts[sig.id]++;
            return `<span class="criterio-hl ${sig.color}" title="${sig.tooltip}">${m}</span>`;
          });
        }
      });
    });
    if (changed) {
      const span = document.createElement("span");
      span.innerHTML = html;
      node.parentNode.replaceChild(span, node);
    }
  });
}

function addStyles() {
  if (document.getElementById("criterio-styles")) return;
  const style = document.createElement("style");
  style.id = "criterio-styles";
  style.textContent = `
    .criterio-hl{padding:0 2px;border-radius:3px;cursor:help}
    .criterio-loaded{background:rgba(255,193,7,.35);border-bottom:1px dashed #f59e0b}
    .criterio-weak{background:rgba(59,130,246,.3);border-bottom:1px dashed #3b82f6}
    .criterio-certainty{background:rgba(239,68,68,.3);border-bottom:1px dashed #ef4444}
    .criterio-official{background:rgba(16,185,129,.3);border-bottom:1px dashed #10b981}
  `;
  document.head.appendChild(style);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getAnalysis") {
    sendResponse({ source: currentSource, signals: signalCounts });
  }
});

async function start() {
  addStyles();
  await detectSource();
  highlight();
  console.log("Análisis listo", signalCounts, currentSource);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => setTimeout(start, 800));
} else {
  setTimeout(start, 800);
}
