// Abrir el Side Panel al hacer clic en el icono
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
  console.log("Criterio instalado correctamente");
});
