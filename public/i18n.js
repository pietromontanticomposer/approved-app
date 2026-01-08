// ==========================================
// INTERNATIONALIZATION (i18n) SYSTEM
// Supports: English (en), Italian (it)
// ==========================================

(function() {
  'use strict';

  const translations = {
    en: {
      // Sidebar
      'app.name': 'Approved',
      'sidebar.newProject': '+ New project',
      'sidebar.myProjects': 'My projects',
      'sidebar.sharedWithMe': 'Shared with me',
      'sidebar.noProjects': 'No projects yet. Click "New project".',
      'sidebar.noSharedProjects': 'No shared projects yet.',
      'sidebar.loginToSeeShared': 'Log in to see shared projects.',

      // Header
      'header.noProject': 'No project',
      'header.getStarted': 'Click "New project" to get started',
      'header.projectNotes': 'Project notes',
      'header.projectOptions': 'Project options',
      'header.myAccount': 'My account',

      // Upload
      'upload.dropHere': 'Drop media here',
      'upload.createProject': 'Create a project to start.',
      'upload.autoRename': 'Auto rename files',
      'project.createPrompt': 'Project name',
      'project.renamePrompt': 'Rename project',
      'upload.scheme': 'Scheme:',
      'upload.media': 'Media',
      'upload.cinema': 'Cinema',

      // References
      'refs.title': 'Project references',
      'refs.subtitle': 'Upload script, storyboard, temp tracks, brief...',
      'refs.show': 'Show',
      'refs.hide': 'Hide',
      'refs.dropHere': 'Drop reference files here',
      'refs.dropHint': 'PDF, images, audio, video, zip...',
      'refs.browse': 'Browse files',
      'refs.add': 'Add reference files',
      'refs.countSingle': 'file',
      'refs.countPlural': 'files',
      'refs.noFiles': 'No reference files for this project.',
      'refs.groupLabel': 'Reference · {n} versions',
      'refs.groupLabelSingle': 'Reference',
      'refs.menuRenameActive': 'Rename active version',
      'refs.menuDeleteActive': 'Delete active version',
      'refs.menuDeleteGroup': 'Delete reference group',
      'refs.menuSetActive': 'Set as active',
      'refs.renameActivePrompt': 'Rename active version',
      'refs.deleteActiveConfirm': 'Delete active version "{name}" from this reference group?',
      'refs.deleteGroupConfirm': 'Delete reference group "{name}"?',
      'refs.referenceDownloadHint': 'Reference file. Use the "Download" button in the left panel.',
      'refs.labelPdf': 'PDF',
      'refs.labelImage': 'Image',
      'refs.labelAudio': 'Audio',
      'refs.labelVideo': 'Video',
      'refs.labelArchive': 'Archive',
      'refs.labelFile': 'File',

      // Cues
      'cues.title': 'Project cues',
      'cues.add': 'Add cue media',
      'cues.show': 'Show',
      'cues.hide': 'Hide',
      'cues.subtitle': 'Manage cue notes and versions for each project.',
      'cues.noProject': 'No project yet. Click "New project".',
      'cues.noCues': 'No project. Click "New project" to get started.',
      'cues.maxRevisionsPrompt': 'Max revisions for this cue',
      'cues.countSingle': 'cue',
      'cues.countPlural': 'cues',
      'cues.setInReview': 'Set in review',
      'cues.setApproved': 'Set approved',
      'cues.approveConfirmTitle': 'Approve cue',
      'cues.approveConfirmMessage': 'Are you sure you want to approve this cue?',
      'cues.noVersionsForStatus': 'No versions available to change status',

      // Player
      'player.reviewVersions': 'Review versions',
      'player.projectRefs': 'Project references',
      'player.noVersion': 'No version selected',
      'player.noMedia': 'No media',
      'player.placeholder': 'Create a project and drop a file to see the player.',
      'player.play': 'Play',
      'player.pause': 'Pause',
      'player.inReview': 'In review',
      'player.approved': 'Approved',
      'player.changesRequested': 'Changes requested',
      'status.reviewCompleted': 'Review completed',
      'status.inRevision': 'In revision',
      'player.noMediaForVersion': 'This version has no media.',
      'player.referenceBadge': 'Reference',
      'review.completeCta': 'I\'m done commenting',
      'review.startRevisionCta': 'Start revision',
      'review.approveCta': 'Approved',
      'review.requestChangesCta': 'Request changes',
      'review.confirmReviewCompleteTitle': 'Confirm',
      'review.confirmReviewCompleteMessage': 'Are you sure you\'re done commenting on this version? You can still approve or wait for a new version.',
      'review.confirmReviewCompleteBtn': 'Yes, I\'m done',
      'review.confirmApproveTitle': 'Approve as final version',
      'review.confirmApproveMessage': 'This will mark the version as FINAL and approved. This action confirms your acceptance of this version as definitive. Are you sure?',
      'review.confirmApproveBtn': 'Yes, approve as final',
      'review.messageInReviewOwner': 'Review in progress.',
      'review.messageInReviewClient': 'Leave all comments, then click I\'m done commenting.',
      'review.messageCompleted': 'Review completed. Waiting for the new version.',
      'review.messageInRevision': 'Version in progress.',
      'review.messageChangesRequested': 'Changes requested. Waiting for the new version.',
      'review.messageApproved': 'Version approved.',

      // Comments
      'comments.title': 'Comments',
      'comments.noComments': 'No comments',
      'comments.addPlaceholder': 'Add a comment (auto timecode)...',
      'comments.closedPlaceholder': 'Comments are closed for this version.',
      'comments.referencesOnly': 'Comments only available on review versions',
      'comments.count': '{n} comments',
      'comments.emptyError': 'Comment text cannot be empty',
      'comments.updateError': 'Failed to update comment: {error}',
      'comments.deleteError': 'Failed to delete comment: {error}',
      'comments.closedMessage': 'This version is closed. New comments will go on the next version.',
      'comments.send': 'Send',

      // Share
      'share.clientLink': 'Client link',
      'share.clientHint': 'They can listen, comment and approve without an account.',
      'share.copyLink': 'Copy demo link',
      'share.registerPrompt': 'You are not authenticated. Register now to create a shareable link. Press OK to register, Cancel to copy a temporary link.',
      'share.tabLink': 'Link',
      'share.tabPeople': 'Shared with',
      'share.peopleHint': 'Only project owners can see this list.',
      'share.peopleEmpty': 'Not shared yet.',
      'share.peopleLoading': 'Loading...',
      'share.peopleForbidden': 'You do not have permission to view this list.',
      'share.invitePlaceholder': 'name@email.com',
      'share.inviteRoleViewer': 'Viewer',
      'share.inviteRoleEditor': 'Editor',
      'share.inviteSend': 'Send invite',
      'share.inviteSuccess': 'Invite sent.',
      'share.inviteError': 'Could not send invite.',
      'share.inviteEmailRequired': 'Email required.',
      'share.inviteNoProject': 'Select a project to invite people.',
      'share.inviteNoTeam': 'This project has no team yet.',
      'share.inviteForbidden': 'Only project owners can invite people.',

      // Notes
      'notes.title': 'Notes',
      'notes.projectNotes': 'Project notes',
      'notes.cueNotes': 'General notes',
      'notes.selectProject': 'Select a project to see general notes',
      'notes.selectCue': 'Select a cue to see notes',
      'notes.addGeneral': 'Write a general note...',
      'notes.addCue': 'Select a cue to add notes',
      'notes.addNote': 'Add note',
      'notes.saveNote': 'Save note',
      'notes.loading': 'Loading...',
      'notes.error': 'Error loading notes',
      'notes.noNotes': 'No notes for this project',
      'notes.editPrompt': 'Edit note',
      'notes.deleteConfirm': 'Delete this note?',

      // Modal
      'modal.projectNotes': 'Project Notes',
      'modal.close': 'Close',
      'modal.addNotePlaceholder': 'Write a note for the team...',

      // Actions
      'action.rename': 'Rename',
      'action.delete': 'Delete',
      'action.download': 'Download',
      'action.cancel': 'Cancel',
      'action.save': 'Save',
      'action.confirm': 'Confirm',
      'action.yes': 'Yes',
      'action.no': 'No',
      'action.renameCue': 'Rename cue',
      'action.renameVersion': 'Rename version',
      'action.deleteVersion': 'Delete version',
      'action.deleteCueTitle': 'Delete cue',
      'action.deleteCueMessage': 'Delete cue "{name}" and all its versions?',
      'action.deleteVersionMessage': 'Are you sure you want to delete "{name}"?',
      'action.confirmDefaultTitle': 'Are you sure?',
      'action.confirmDefaultMessage': 'Confirm this action?',
      'action.ok': 'OK',
      'modal.alertTitle': 'Notice',

      // Misc
      'misc.version': 'Version',
      'misc.user': 'User',
      'misc.client': 'Client',
      'misc.versions': 'Versions',

      // Media
      'media.audio': 'Audio',
      'media.video': 'Video',
      'media.file': 'File',
      'media.techFiles': '{n} tech files',
      'media.onlyDeliverables': 'Only deliverables',
      'misc.now': 'now',
      'misc.minutesAgo': '{n}m ago',
      'misc.hoursAgo': '{n}h ago',
      'misc.daysAgo': '{n}d ago',

      // Language
      'lang.select': 'Language',
      'lang.en': 'English',
      'lang.it': 'Italiano',

      // Upload
      'upload.panelTitle': 'Uploads in progress',
      'upload.countLabel': '{n} uploads',
      'upload.fileLabel': 'Uploading file',
      'upload.preparing': 'Preparing…',
      'upload.uploading': 'Uploading…',
      'upload.finalizing': 'Finalizing…',
      'upload.completed': 'Completed',
      'upload.error': 'Upload error',
      'upload.cancelled': 'Upload canceled',
      'upload.networkError': 'Network error',
      'upload.serverError': 'Server error {code}',
      'upload.invalidResponse': 'Invalid server response',
      'upload.unexpectedError': 'Unexpected error'
    },

    it: {
      // Sidebar
      'app.name': 'Approved',
      'sidebar.newProject': '+ Nuovo progetto',
      'sidebar.myProjects': 'I miei progetti',
      'sidebar.sharedWithMe': 'Condivisi con me',
      'sidebar.noProjects': 'Nessun progetto. Clicca "Nuovo progetto".',
      'sidebar.noSharedProjects': 'Nessun progetto condiviso.',
      'sidebar.loginToSeeShared': 'Accedi per vedere i progetti condivisi.',

      // Header
      'header.noProject': 'Nessun progetto',
      'header.getStarted': 'Clicca "Nuovo progetto" per iniziare',
      'header.projectNotes': 'Note progetto',
      'header.projectOptions': 'Opzioni progetto',
      'header.myAccount': 'Il mio account',

      // Upload
      'upload.dropHere': 'Trascina i file qui',
      'upload.createProject': 'Crea un progetto per iniziare.',
      'upload.autoRename': 'Rinomina automatica',
      'project.createPrompt': 'Nome progetto',
      'project.renamePrompt': 'Rinomina progetto',
      'upload.scheme': 'Schema:',
      'upload.media': 'Media',
      'upload.cinema': 'Cinema',

      // References
      'refs.title': 'Riferimenti progetto',
      'refs.subtitle': 'Carica script, storyboard, temp tracks, brief...',
      'refs.show': 'Mostra',
      'refs.hide': 'Nascondi',
      'refs.dropHere': 'Trascina i file di riferimento qui',
      'refs.dropHint': 'PDF, immagini, audio, video, zip...',
      'refs.browse': 'Sfoglia file',
      'refs.add': 'Aggiungi file di riferimento',
      'refs.countSingle': 'file',
      'refs.countPlural': 'file',
      'refs.noFiles': 'Nessun file di riferimento per questo progetto.',
      'refs.groupLabel': 'Riferimento · {n} versioni',
      'refs.groupLabelSingle': 'Riferimento',
      'refs.menuRenameActive': 'Rinomina versione attiva',
      'refs.menuDeleteActive': 'Elimina versione attiva',
      'refs.menuDeleteGroup': 'Elimina gruppo riferimento',
      'refs.menuSetActive': 'Imposta come attivo',
      'refs.renameActivePrompt': 'Rinomina versione attiva',
      'refs.deleteActiveConfirm': 'Eliminare la versione attiva "{name}" da questo gruppo?',
      'refs.deleteGroupConfirm': 'Eliminare il gruppo riferimento "{name}"?',
      'refs.referenceDownloadHint': 'File di riferimento. Usa il pulsante "Scarica" nel pannello sinistro.',
      'refs.labelPdf': 'PDF',
      'refs.labelImage': 'Immagine',
      'refs.labelAudio': 'Audio',
      'refs.labelVideo': 'Video',
      'refs.labelArchive': 'Archivio',
      'refs.labelFile': 'File',

      // Cues
      'cues.title': 'Cue del progetto',
      'cues.add': 'Aggiungi media cue',
      'cues.show': 'Mostra',
      'cues.hide': 'Nascondi',
      'cues.subtitle': 'Gestisci note e versioni di ogni cue del progetto.',
      'cues.noProject': 'Nessun progetto. Clicca "Nuovo progetto".',
      'cues.noCues': 'Nessun progetto. Clicca "Nuovo progetto" per iniziare.',
      'cues.maxRevisionsPrompt': 'Numero massimo revisioni per questa cue',
      'cues.countSingle': 'cue',
      'cues.countPlural': 'cue',
      'cues.setInReview': 'Imposta in review',
      'cues.setApproved': 'Imposta approvato',
      'cues.approveConfirmTitle': 'Approva cue',
      'cues.approveConfirmMessage': 'Sei sicuro di voler approvare questa cue?',
      'cues.noVersionsForStatus': 'Nessuna versione disponibile per cambiare stato',

      // Player
      'player.reviewVersions': 'Revisiona versioni',
      'player.projectRefs': 'Riferimenti progetto',
      'player.noVersion': 'Nessuna versione selezionata',
      'player.noMedia': 'Nessun media',
      'player.placeholder': 'Crea un progetto e trascina un file per vedere il player.',
      'player.play': 'Play',
      'player.pause': 'Pausa',
      'player.inReview': 'In revisione',
      'player.approved': 'Approvato',
      'player.changesRequested': 'Modifiche richieste',
      'status.reviewCompleted': 'Review completata',
      'status.inRevision': 'In revisione',
      'player.noMediaForVersion': 'Questa versione non ha media.',
      'player.referenceBadge': 'Riferimento',
      'review.completeCta': 'Ho finito di commentare',
      'review.startRevisionCta': 'Start revision',
      'review.approveCta': 'Approved',
      'review.requestChangesCta': 'Richiedi modifiche',
      'review.confirmReviewCompleteTitle': 'Conferma',
      'review.confirmReviewCompleteMessage': 'Sei sicuro di aver finito di commentare questa versione? Potrai ancora approvarla o attendere una nuova versione.',
      'review.confirmReviewCompleteBtn': 'Sì, ho finito',
      'review.confirmApproveTitle': 'Approva come versione finale',
      'review.confirmApproveMessage': 'Questa azione segnerà la versione come DEFINITIVA e approvata. Confermi di accettare questa versione come finale?',
      'review.confirmApproveBtn': 'Sì, approva come finale',
      'review.messageInReviewOwner': 'Review in corso.',
      'review.messageInReviewClient': 'Lascia tutti i commenti, poi clicca Ho finito.',
      'review.messageCompleted': 'Review completata. In attesa della nuova versione.',
      'review.messageInRevision': 'Versione in lavorazione.',
      'review.messageChangesRequested': 'Modifiche richieste. In attesa della nuova versione.',
      'review.messageApproved': 'Versione approvata.',

      // Comments
      'comments.title': 'Commenti',
      'comments.noComments': 'Nessun commento',
      'comments.addPlaceholder': 'Aggiungi un commento (timecode automatico)...',
      'comments.closedPlaceholder': 'Commenti chiusi per questa versione.',
      'comments.referencesOnly': 'Commenti disponibili solo sulle versioni in review',
      'comments.count': '{n} commenti',
      'comments.emptyError': 'Il commento non può essere vuoto',
      'comments.updateError': 'Errore aggiornamento commento: {error}',
      'comments.deleteError': 'Errore cancellazione commento: {error}',
      'comments.closedMessage': 'Questa versione è chiusa. I nuovi commenti andranno sulla prossima versione.',
      'comments.send': 'Invia',

      // Share
      'share.clientLink': 'Link cliente',
      'share.clientHint': 'Possono ascoltare, commentare e approvare senza account.',
      'share.copyLink': 'Copia link demo',
      'share.registerPrompt': 'Non sei autenticato. Registrarsi ora permette di creare un link condivisibile. Premi OK per registrarti, Annulla per copiare un link temporaneo da incollare.',
      'share.tabLink': 'Link',
      'share.tabPeople': 'Condivisi con',
      'share.peopleHint': 'Solo i proprietari del progetto possono vedere questa lista.',
      'share.peopleEmpty': 'Non condiviso con nessuno.',
      'share.peopleLoading': 'Caricamento...',
      'share.peopleForbidden': 'Non hai i permessi per vedere questa lista.',
      'share.invitePlaceholder': 'nome@email.com',
      'share.inviteRoleViewer': 'Viewer',
      'share.inviteRoleEditor': 'Editor',
      'share.inviteSend': 'Invia invito',
      'share.inviteSuccess': 'Invito inviato.',
      'share.inviteError': 'Invio invito non riuscito.',
      'share.inviteEmailRequired': 'Email richiesta.',
      'share.inviteNoProject': 'Seleziona un progetto per invitare persone.',
      'share.inviteNoTeam': 'Questo progetto non ha ancora un team.',
      'share.inviteForbidden': 'Solo i proprietari possono invitare persone.',

      // Notes
      'notes.title': 'Note',
      'notes.projectNotes': 'Note progetto',
      'notes.cueNotes': 'NOTE GENERALI',
      'notes.selectProject': 'Seleziona un progetto per vedere le note generali',
      'notes.selectCue': 'Seleziona una cue per vedere le note',
      'notes.addGeneral': 'Scrivi una nota generale...',
      'notes.addCue': 'Seleziona una cue per aggiungere note',
      'notes.addNote': 'Aggiungi nota',
      'notes.saveNote': 'Salva nota',
      'notes.loading': 'Caricamento...',
      'notes.error': 'Errore caricamento note',
      'notes.noNotes': 'Nessuna nota per questo progetto',
      'notes.editPrompt': 'Modifica nota',
      'notes.deleteConfirm': 'Eliminare questa nota?',

      // Modal
      'modal.projectNotes': 'Note Progetto',
      'modal.close': 'Chiudi',
      'modal.addNotePlaceholder': 'Scrivi una nota per il team...',

      // Actions
      'action.rename': 'Rinomina',
      'action.delete': 'Elimina',
      'action.download': 'Scarica',
      'action.cancel': 'Annulla',
      'action.save': 'Salva',
      'action.confirm': 'Conferma',
      'action.yes': 'Sì',
      'action.no': 'No',
      'action.renameCue': 'Rinomina cue',
      'action.renameVersion': 'Rinomina versione',
      'action.deleteVersion': 'Elimina versione',
      'action.deleteCueTitle': 'Elimina cue',
      'action.deleteCueMessage': 'Eliminare la cue "{name}" e tutte le sue versioni?',
      'action.deleteVersionMessage': 'Sei sicuro di voler eliminare "{name}"?',
      'action.confirmDefaultTitle': 'Sei sicuro?',
      'action.confirmDefaultMessage': 'Confermi questa azione?',
      'action.ok': 'OK',
      'modal.alertTitle': 'Avviso',

      // Misc
      'misc.version': 'Versione',
      'misc.user': 'Utente',
      'misc.client': 'Cliente',
      'misc.versions': 'Versioni',

      // Media
      'media.audio': 'Audio',
      'media.video': 'Video',
      'media.file': 'File',
      'media.techFiles': '{n} file tecnici',
      'media.onlyDeliverables': 'Solo file tecnici',
      'misc.now': 'ora',
      'misc.minutesAgo': '{n}m fa',
      'misc.hoursAgo': '{n}h fa',
      'misc.daysAgo': '{n}g fa',

      // Language
      'lang.select': 'Lingua',
      'lang.en': 'English',
      'lang.it': 'Italiano',

      // Upload
      'upload.panelTitle': 'Upload in corso',
      'upload.countLabel': '{n} upload',
      'upload.fileLabel': 'File in caricamento',
      'upload.preparing': 'Preparazione…',
      'upload.uploading': 'Caricamento in corso…',
      'upload.finalizing': 'Finalizzazione…',
      'upload.completed': 'Completato',
      'upload.error': 'Errore durante l\'upload',
      'upload.cancelled': 'Upload annullato',
      'upload.networkError': 'Errore di rete',
      'upload.serverError': 'Errore server {code}',
      'upload.invalidResponse': 'Risposta server non valida',
      'upload.unexpectedError': 'Errore inatteso'
    }
  };

  // Get saved language or detect from browser
  function getSavedLanguage() {
    try {
      const saved = localStorage.getItem('app-language');
      if (saved && translations[saved]) return saved;
    } catch (e) {}

    // Default to browser language
    try {
      if (navigator.language && navigator.language.startsWith('it')) return 'it';
    } catch (e) {}

    return 'en';
  }

  let currentLang = getSavedLanguage();

  // Get translation
  function t(key, params) {
    params = params || {};
    const langData = translations[currentLang] || translations['en'];
    let text = langData[key] || translations['en'][key] || key;

    // Replace parameters like {n}
    Object.keys(params).forEach(function(param) {
      text = text.replace('{' + param + '}', params[param]);
    });

    return text;
  }

  // Update ONLY static elements with data-i18n attribute
  // Does NOT touch elements with data-i18n-default (those are handled by flow.js)
  function updatePageTranslations() {
    // Update text content for static elements only
    var elements = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    }

    // Update placeholders
    var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < placeholders.length; j++) {
      var el2 = placeholders[j];
      var key2 = el2.getAttribute('data-i18n-placeholder');
      if (key2) el2.placeholder = t(key2);
    }

    // Update titles
    var titles = document.querySelectorAll('[data-i18n-title]');
    for (var k = 0; k < titles.length; k++) {
      var el3 = titles[k];
      var key3 = el3.getAttribute('data-i18n-title');
      if (key3) el3.title = t(key3);
    }

    // Update language selector if present
    var langSelect = document.getElementById('languageSelect');
    if (langSelect) {
      langSelect.value = currentLang;
    }

    console.log('[i18n] Page translations updated to: ' + currentLang);
  }

  // Set language
  function setLanguage(lang) {
    if (!translations[lang]) {
      console.warn('[i18n] Language "' + lang + '" not supported');
      return;
    }

    currentLang = lang;

    try {
      localStorage.setItem('app-language', lang);
    } catch (e) {}

    // Update static translatable elements
    updatePageTranslations();

    // Dispatch event for flow.js to re-render dynamic content
    try {
      window.dispatchEvent(new CustomEvent('language-changed', { detail: { language: lang } }));
    } catch (e) {}

    console.log('[i18n] Language set to: ' + lang);
  }

  // Get current language
  function getLanguage() {
    return currentLang;
  }

  // Initialize language selector
  function initLanguageSelector() {
    var selector = document.getElementById('languageSelect');
    if (!selector) return;

    selector.value = currentLang;

    // Remove any existing listener
    selector.removeEventListener('change', handleLanguageChange);
    selector.addEventListener('change', handleLanguageChange);
  }

  function handleLanguageChange(e) {
    setLanguage(e.target.value);
  }

  // Initialize everything
  function init() {
    console.log('[i18n] Initializing with language: ' + currentLang);
    updatePageTranslations();
    initLanguageSelector();
  }

  // Export to window immediately
  window.i18n = {
    t: t,
    setLanguage: setLanguage,
    getLanguage: getLanguage,
    updatePageTranslations: updatePageTranslations,
    init: init,
    translations: translations
  };

  // Run init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded, run immediately
    init();
  }

  // Also run after a short delay to catch Next.js hydration
  setTimeout(init, 100);
  setTimeout(init, 500);

})();
