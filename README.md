# Calendrier du Village — Prototype Web

**Identité visuelle :** tissu traditionnel comme fond de logo + soleil à 8 branches doré. Fond général écru (\#FFF8E1).**Signature :** "Proposé par Gilbert FONGA".

## Structure
- `index.html` – Interface 3 mois (précédent, courant, suivant)
- `style.css` – Thème Afro‑Vibrant
- `moteur.js` – Moteur 8 jours (équivalent MOD_MOTEUR)
- `ui.js` – Chargement données, navigation, rendu
- `data/villages.json` – Données villages (BANGOU fourni en exemple)
- `assets/` – Place ici tes icônes (`logo-*.png`)

## Comment utiliser
1. Ouvre `index.html` dans un navigateur récent (Chrome/Edge/Safari).
2. Choisis Année, Mois, Village.
3. Utilise les boutons pour naviguer («3 mois / 1 an / Aujourd'hui»).

## Ajouter d'autres villages
Édite `data/villages.json` et ajoute de nouvelles entrées en reprenant la structure de BANGOU. Les clés importantes :
- `dayNames` – 8 noms de jours- `monthNames` – 12 mois traditionnels- `forbidden` – indices J interdits (1..8)- `market` – indices J de marché (1..8)- `king`, `marketLabels`, `info` – métadonnées

## Logo
Dépose tes fichiers générés ici :
- `assets/logo-1024.png`, `assets/logo-512.png`, etc.
- Ajoute un `assets/favicon.ico` si besoin.

---
© 2026 — Proposé par G.FONGA
