# Synaxone — Questionnaires client

Pages statiques (HTML/JS) des questionnaires remplis par les clients avant/pendant leur suivi en neurofeedback.

- `index.html` — questionnaire initial (grand bilan)
- `bilan-10-seances-client.html` — bilan de suivi (10 séances)
- `crypto-utils.js` — chiffrement côté client (RSA-OAEP + AES-GCM) vers la clé publique de la praticienne

Les réponses sont chiffrées dans le navigateur avant tout envoi : ce dépôt ne contient aucune donnée client et aucune clé privée.
