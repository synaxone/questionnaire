// Majuscule automatique en début de champ et après chaque retour à la ligne
// (20/07/2026, demande de Camille : "quand on débute une case ou qu'on va à
// la ligne"). Module partagé chargé par les 4 fichiers HTML vanilla du projet
// (index.html, questionnaire-client.html, bilan-10-seances-client.html,
// electron-index.html) — même principe que plan-logic.js/crypto-utils.js :
// une seule copie à maintenir, jamais réécrite fichier par fichier.
//
// Fonctionne sur <textarea>, <input type="text"> et les cases contenteditable
// riches (rich-field, plan-box, popover...). Utilise beforeinput pour
// intercepter la lettre AVANT son insertion et la remplacer en majuscule —
// préserve l'historique d'annulation (Ctrl+Z) et ne perturbe jamais la
// position du curseur, contrairement à une correction après coup sur .value/
// .innerHTML qui obligerait à recalculer la sélection. Ignore explicitement
// la composition IME (accents composés, saisie non-latine) et le collage
// (on ne retouche jamais un texte collé).
(function () {
  const SELECTOR = 'textarea, input[type="text"], input:not([type]), [contenteditable="true"]';
  const LETTRE = /^[a-zà-öø-ÿ]$/i;

  function attacher(el) {
    if (el.__autocapBound) return;
    el.__autocapBound = true;
    const estRiche = el.hasAttribute('contenteditable');
    let capitaliserProchaine = false; // vient de passer à la ligne (contenteditable) : la prochaine lettre tapée doit être capitalisée

    el.addEventListener('beforeinput', function (e) {
      if (e.isComposing) return;

      if (estRiche) {
        if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') {
          capitaliserProchaine = true;
          return;
        }
        if (e.inputType !== 'insertText' || !e.data) {
          if (e.inputType && e.inputType.indexOf('insert') === 0) capitaliserProchaine = false;
          return;
        }
        if (!LETTRE.test(e.data)) { capitaliserProchaine = false; return; }
        const vide = el.textContent.replace(/​/g, '') === '';
        if (!vide && !capitaliserProchaine) return;
        capitaliserProchaine = false;
        if (e.data === e.data.toUpperCase()) return;
        e.preventDefault();
        document.execCommand('insertText', false, e.data.toUpperCase());
      } else {
        if (e.inputType !== 'insertText' || !e.data || !LETTRE.test(e.data)) return;
        const val = el.value;
        const pos = el.selectionStart;
        const avant = val.slice(0, pos).replace(/[ \t]+$/, '');
        if (avant !== '' && !avant.endsWith('\n')) return;
        if (e.data === e.data.toUpperCase()) return;
        e.preventDefault();
        el.setRangeText(e.data.toUpperCase(), pos, el.selectionEnd, 'end');
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  function attacherTout(racine) {
    if (racine.nodeType !== 1) return;
    if (racine.matches && racine.matches(SELECTOR)) attacher(racine);
    if (racine.querySelectorAll) racine.querySelectorAll(SELECTOR).forEach(attacher);
  }

  function demarrer() {
    attacherTout(document.body);
    // La plupart des écrans de ce projet sont reconstruits via innerHTML
    // (pas de framework) : un MutationObserver est nécessaire pour attraper
    // les nouveaux champs à chaque changement d'écran/re-rendu.
    new MutationObserver(function (mutations) {
      for (const m of mutations) m.addedNodes.forEach(attacherTout);
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }
})();
