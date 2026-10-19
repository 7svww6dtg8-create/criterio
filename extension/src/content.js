
// Content script de Criterio - Extracción + resaltado de lenguaje cargado

console.log("Criterio content script loaded");

// Léxico inicial de lenguaje cargado / emocional (ampliable)
const LOADED_WORDS = [
  "escándalo", "escandaloso", "brutal", "brutales", "heroico", "heroica",
  "desastre", "desastroso", "amenaza", "amenazante", "crisis", "catástrofe",
  "indignante", "vergonzoso", "alarmante", "terrorífico", "increíble",
  "absurdo", "ridículo", "dramático", "explosivo", "impactante", "devastador",
  "outrage", "shocking", "disastrous", "heroic", "brutal", "scandal"
];

// Función para extraer el texto principal del artículo
function extractArticleText() {
  // Intentamos varios selectores comunes
  const selectors = [
    "article",
    "[role='main']",
    ".article-body",
    ".post-content",
    ".entry-content",
    ".content",
    "main"
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText && el.innerText.length > 200) {
      return el;
    }
  }

  // Fallback: body
  return document.body;
}

// Función para resaltar palabras cargadas
function highlightLoadedLanguage(container) {
  if (!container) return;

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    if (node.parentElement && 
        !["SCRIPT", "STYLE", "NOSCRIPT"].includes(node.parentElement.tagName)) {
      textNodes.push(node);
    }
  }

  textNodes.forEach(textNode => {
    let text = textNode.textContent;
    let hasMatch = false;

    LOADED_WORDS.forEach(word => {
      const regex = new RegExp(`\\b(${word})\\b`, "gi");
      if (regex.test(text)) {
        hasMatch = true;
        text = text.replace(regex, (match) => {
          return `<span class="criterio-highlight" 
                        data-tooltip="Lenguaje cargado / emocional. Este tipo de palabras puede influir en la percepción del lector."
                        title="Lenguaje cargado / emocional">${match}</span>`;
        });
      }
    });

    if (hasMatch) {
      const span = document.createElement("span");
      span.innerHTML = text;
      textNode.parentNode.replaceChild(span, textNode);
    }
  });
}

// Estilos para el resaltado (inyectados)
function injectStyles() {
  if (document.getElementById("criterio-styles")) return;

  const style = document.createElement("style");
  style.id = "criterio-styles";
  style.textContent = `
    .criterio-highlight {
      background-color: rgba(255, 193, 7, 0.35);
      border-bottom: 1px dashed #f59e0b;
      cursor: help;
      border-radius: 2px;
      padding: 0 1px;
    }
    .criterio-highlight:hover {
      background-color: rgba(255, 193, 7, 0.55);
    }
  `;
  document.head.appendChild(style);
}

// Ejecutar cuando la página esté lista
function init() {
  injectStyles();
  const article = extractArticleText();
  if (article) {
    highlightLoadedLanguage(article);
    console.log("Criterio: análisis básico aplicado");
  }
}

// Esperar a que el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
