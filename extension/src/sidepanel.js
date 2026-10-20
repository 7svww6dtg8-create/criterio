// Side Panel de Criterio

const statusEl = document.getElementById("status");
const sourceCard = document.getElementById("source-card");
const signalsCard = document.getElementById("signals-card");
const signalsList = document.getElementById("signals-list");

function showSource(source) {
  if (!source) {
    statusEl.textContent = "Fuente no catalogada";
    return;
  }

  document.getElementById("source-name").textContent = source.name;
  document.getElementById("source-bias").textContent = source.bias;
  document.getElementById("source-reliability").textContent = source.reliability;
  document.getElementById("source-notes").textContent = source.notes || "";

  sourceCard.style.display = "block";
  statusEl.style.display = "none";
}

function showSignals(counts) {
  signalsList.innerHTML = "";

  const labels = {
    loaded: "Lenguaje cargado",
    weak: "Atribución débil",
    certainty: "Certeza excesiva",
    sensational: "Sensacionalismo",
    irony: "Posible ironía"
  };

  const colors = {
    loaded: "loaded",
    weak: "weak",
    certainty: "certainty",
    sensational: "sensational",
    irony: "irony"
  };

  let hasAny = false;

  for (const [key, count] of Object.entries(counts)) {
    if (count > 0) {
      hasAny = true;
      const div = document.createElement("div");
      div.className = "signal-item";
      div.innerHTML = `
        <span><span class="dot ${colors[key]}"></span>${labels[key] || key}</span>
        <strong>${count}</strong>
      `;
      signalsList.appendChild(div);
    }
  }

  if (hasAny) {
    signalsCard.style.display = "block";
  } else {
    signalsList.innerHTML = `<div class="muted">No se han detectado señales destacadas.</div>`;
    signalsCard.style.display = "block";
  }
}

// Pedir datos al content script de la pestaña activa
async function requestAnalysis() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    chrome.tabs.sendMessage(tab.id, { action: "getAnalysis" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        statusEl.textContent = "No se pudo analizar esta página.";
        return;
      }

      showSource(response.source);
      showSignals(response.signals || {});
    });
  } catch (e) {
    statusEl.textContent = "Error al conectar con la página.";
    console.error(e);
  }
}

// Ejecutar al abrir el panel
requestAnalysis();
