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
