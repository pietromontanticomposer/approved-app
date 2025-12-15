// public/share-handler.js
// Gestisce l'apertura del modal Share usando React

window.openShareModal = function(projectId, projectName, teamId) {
  console.log('[ShareHandler] Opening share modal for:', projectName);
  
  // Crea evento custom che il componente React può ascoltare
  const event = new CustomEvent('open-share-modal', {
    detail: { projectId, projectName, teamId }
  });
  window.dispatchEvent(event);
};

// Da chiamare quando il pulsante Share viene cliccato
if (window.shareBtn) {
  window.shareBtn.addEventListener('click', () => {
    const project = window.getActiveProject ? window.getActiveProject() : null;
    if (!project) {
      alert('Nessun progetto selezionato');
      return;
    }
    
    // teamId dovrebbe essere disponibile nel progetto
    const teamId = project.team_id || project.teamId;
    if (!teamId) {
      alert('Team ID non disponibile per questo progetto');
      return;
    }
    
    window.openShareModal(project.id, project.name, teamId);
  });
}

console.log('[ShareHandler] Script loaded');
