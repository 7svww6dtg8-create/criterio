console.log("=== SIDE PANEL CARGADO ===");

const statusEl = document.getElementById("status");
const sourceCard = document.getElementById("source-card");
const signalsCard = document.getElementById("signals-card");
const signalsList = document.getElementById("signals-list");

function updateUI(data) {
  if (!data || !data.source) {
    statusEl.style.display = "block";
    statusEl.textContent = data ? "Fuente no catalogada" : "Analizando página...";
    sourceCard.style.display = "none";
  } else {
    document.getElementById("source-name").textContent = data.source.name || "—";
    document.getElementById("source-bias").textContent = data.source.bias || "—";
    document.getElementById("source-reliability").textContent = data.source.reliability || "—";
    document.getElementById("source-notes").textContent = data.source.notes || "";
    sourceCard.style.display = "block";
    statusEl.style.display = "none";
  }

  // Señales
  signalsList.innerHTML = "";
  const counts = data?.signals || {};
  let hasSignals = false;

  const labels = {
    loaded: "Lenguaje cargado",
    weak: "Atribución débil",
    certainty: "Certeza excesiva",
    official: "Documentos oficiales"
  };

  for (const [key, count] of Object.entries(counts)) {
    if (count > 0) {
      hasSignals = true;
      const div = document.createElement("div");
      div.className = "signal-item";
      div.innerHTML = `<span>${labels[key] || key}</span> <strong>${count}</strong>`;
      signalsList.appendChild(div);
    }
  }

  if (!hasSignals) {
    signalsList.innerHTML = `<div class="muted">No se han detectado señales destacadas.</div>`;
  }
  // Bloque de documentos oficiales
if (data?.signals?.official > 0) {
  let officialBlock = document.getElementById("official-block");
  if (officialBlock) officialBlock.remove();

  officialBlock = document.createElement("div");
  officialBlock.id = "official-block";
  officialBlock.className = "card";

  // Enlaces más útiles según lo detectado
  let links = `
    <a href="https://www.boe.es/buscar/act.php?id=BOE-A-1995-25444" target="_blank" style="display:block; margin:6px 0; color:#2563eb;">Código Penal (texto consolidado)</a>
    <a href="https://www.boe.es/buscar/act.php?id=BOE-A-1889-4763" target="_blank" style="display:block; margin:6px 0; color:#2563eb;">Código Civil (texto consolidado)</a>
    <a href="https://www.boe.es/buscar/" target="_blank" style="display:block; margin:6px 0; color:#2563eb;">Buscar en el BOE</a>
  `;

  officialBlock.innerHTML = `
    <h2>Documentos oficiales</h2>
    <p>Se han detectado <strong>${data.signals.official}</strong> mención(es).</p>
    ${links}
    <p class="muted" style="font-size:12px; margin-top:10px;">
      Enlaces directos a textos consolidados cuando es posible. Siempre verifica en el BOE. No es asesoramiento legal.
    </p>
  `;
  document.body.appendChild(officialBlock);
}
  signalsCard.style.display = "block";
}

async function refresh() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    chrome.tabs.sendMessage(tab.id, { action: "getAnalysis" }, (response) => {
      if (chrome.runtime.lastError) {
        console.log("Esperando content script...");
        return;
      }
      updateUI(response);
    });
  } catch (e) {
    console.error(e);
  }
}

// Actualizar cada 2 segundos
setInterval(refresh, 2000);

// Actualizar también al cambiar de pestaña o cargar página
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    setTimeout(refresh, 1000);
  }
});

chrome.tabs.onActivated.addListener(() => {
  setTimeout(refresh, 500);
});

// Primera carga
refresh();
