// ══════════════════════════════════════════════════════
// CHIFFREMENT DES QUESTIONNAIRES/BILANS TRANSMIS PAR LES CLIENTS
// ══════════════════════════════════════════════════════
// Chiffrement hybride RSA-OAEP (2048 bits) + AES-256-GCM, via l'API native du
// navigateur (SubtleCrypto) — aucune dépendance externe, aucun service tiers, gratuit.
// Fonctionne à l'identique dans un navigateur (index.html, bilan-10-seances-client.html)
// et dans l'Electron de Synaxone NFB.
//
// Principe : le questionnaire/bilan est chiffré côté client avec la clé PUBLIQUE du
// praticien (sans danger à exposer, c'est prévu pour), et ne peut être déchiffré
// qu'avec la clé PRIVÉE, qui ne vit que sur le PC du praticien (voir CLAUDE.md §5).
//
// Chargé via <script src="crypto-utils.js"> — doit être présent dans le même dossier
// que le fichier qui l'utilise (comme plan-logic.js pour electron-index.html).

async function _importerClePublique(jwk) {
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
}

async function _importerClePrivee(jwk) {
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
}

function _bufVersBase64(buf) {
  let binaire = '';
  new Uint8Array(buf).forEach(o => binaire += String.fromCharCode(o));
  return btoa(binaire);
}

function _base64VersBuf(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
}

// Chiffre un objet JS quelconque (JSON-sérialisable) avec la clé publique du praticien.
// Retourne une enveloppe JSON-sérialisable, à utiliser à la place du JSON en clair.
async function chiffrerPourPraticien(objet, clePubliqueJwk) {
  const clePublique = await _importerClePublique(clePubliqueJwk);
  const cleAES = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const texteClair = new TextEncoder().encode(JSON.stringify(objet));
  const donneesChiffrees = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cleAES, texteClair);
  const cleAESBrute = await crypto.subtle.exportKey('raw', cleAES);
  const cleAESChiffree = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, clePublique, cleAESBrute);
  return {
    chiffre: true,
    v: 1,
    alg: 'RSA-OAEP-256+AES-256-GCM',
    cle: _bufVersBase64(cleAESChiffree),
    iv: _bufVersBase64(iv.buffer),
    donnees: _bufVersBase64(donneesChiffrees)
  };
}

// Déchiffre une enveloppe produite par chiffrerPourPraticien, avec la clé privée du
// praticien. Retourne l'objet JS d'origine.
async function dechiffrerDuClient(enveloppe, clePriveeJwk) {
  const clePrivee = await _importerClePrivee(clePriveeJwk);
  const cleAESBrute = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, clePrivee, _base64VersBuf(enveloppe.cle));
  const cleAES = await crypto.subtle.importKey('raw', cleAESBrute, { name: 'AES-GCM' }, false, ['decrypt']);
  const iv = new Uint8Array(_base64VersBuf(enveloppe.iv));
  const texteClair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cleAES, _base64VersBuf(enveloppe.donnees));
  return JSON.parse(new TextDecoder().decode(texteClair));
}

// Export pour usage en environnement Node/CommonJS si besoin (tests). Sans effet
// dans un <script> classique navigateur/Electron.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { chiffrerPourPraticien, dechiffrerDuClient };
}
