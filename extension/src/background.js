
// Service worker de Criterio

chrome.runtime.onInstalled.addListener(() => {
  console.log("Criterio instalado");
});

// Abrir el Side Panel al hacer clic en el icono de la extensión
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Opcional: también se puede abrir con el menú contextual
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
