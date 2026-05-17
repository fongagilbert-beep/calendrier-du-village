#!/bin/bash
# ══════════════════════════════════════════════════════════════
#  SCRIPT DE NETTOYAGE & COMMIT — Calendrier du Village
#  Auteur : Gilbert FONGA
#  Usage  : ./commit-nettoyage.sh /chemin/vers/votre/dossier
# ══════════════════════════════════════════════════════════════

# Couleurs pour les messages
VERT='\033[0;32m'
ROUGE='\033[0;31m'
OR='\033[0;33m'
RESET='\033[0m'
GRAS='\033[1m'

echo ""
echo -e "${GRAS}══════════════════════════════════════════${RESET}"
echo -e "${OR}  🗓  Calendrier du Village — Nettoyage Git${RESET}"
echo -e "${GRAS}══════════════════════════════════════════${RESET}"
echo ""

# ── Vérifier que Git est installé ──
if ! command -v git &> /dev/null; then
  echo -e "${ROUGE}❌  Git n'est pas installé. Installez-le via : brew install git${RESET}"
  exit 1
fi

# ── Se placer dans le bon dossier ──
# Si un chemin est passé en argument, l'utiliser
if [ -n "$1" ]; then
  cd "$1" || { echo -e "${ROUGE}❌  Dossier introuvable : $1${RESET}"; exit 1; }
fi

# Vérifier que c'est bien un dépôt Git
if [ ! -d ".git" ]; then
  echo -e "${ROUGE}❌  Ce dossier n'est pas un dépôt Git.${RESET}"
  echo -e "   Assurez-vous d'être dans le dossier 'calendrier-du-village'."
  echo -e "   Chemin actuel : $(pwd)"
  exit 1
fi

echo -e "${VERT}✅  Dépôt Git trouvé : $(pwd)${RESET}"
echo ""

# ── Vérifier la connexion au remote GitHub ──
REMOTE=$(git remote get-url origin 2>/dev/null)
if [ -z "$REMOTE" ]; then
  echo -e "${ROUGE}❌  Aucun remote GitHub configuré.${RESET}"
  exit 1
fi
echo -e "${OR}📡  Remote : $REMOTE${RESET}"
echo ""

# ══════════════════════════════════════════
# ÉTAPE 1 — SUPPRESSION DES FICHIERS INUTILES
# ══════════════════════════════════════════
echo -e "${GRAS}📦  ÉTAPE 1 — Suppression des fichiers obsolètes...${RESET}"
echo ""

FICHIERS_A_SUPPRIMER=(
  "app.v3.j.s"
  "data.json"
  "data_final.json"
  "data_final - Copie.json"
  "styles.v3 (ancien).css"
  "tets.html"
  "favicon.ico"
  "fichier .nojekyll"
  "calendrier final"
)

for f in "${FICHIERS_A_SUPPRIMER[@]}"; do
  if [ -e "$f" ]; then
    git rm -rf "$f" --quiet
    echo -e "   ${ROUGE}🗑  Supprimé : $f${RESET}"
  else
    echo -e "   ⚪  Déjà absent : $f"
  fi
done
echo ""

# ══════════════════════════════════════════
# ÉTAPE 2 — CRÉER .nojekyll CORRECT
# ══════════════════════════════════════════
echo -e "${GRAS}📄  ÉTAPE 2 — Vérification du fichier .nojekyll...${RESET}"
if [ ! -f ".nojekyll" ]; then
  touch .nojekyll
  git add .nojekyll
  echo -e "   ${VERT}✅  Créé : .nojekyll${RESET}"
else
  echo -e "   ${VERT}✅  Déjà présent : .nojekyll${RESET}"
fi
echo ""

# ══════════════════════════════════════════
# ÉTAPE 3 — DÉPLACER LE FICHIER EXCEL DANS archives/
# ══════════════════════════════════════════
echo -e "${GRAS}📊  ÉTAPE 3 — Archivage du fichier Excel...${RESET}"
if [ -f "GilbertCalendar80.xlsm" ]; then
  mkdir -p archives
  git mv "GilbertCalendar80.xlsm" "archives/GilbertCalendar80.xlsm"
  echo -e "   ${VERT}✅  Déplacé vers archives/GilbertCalendar80.xlsm${RESET}"
  # Ajouter un README dans archives
  cat > archives/README.md << 'EOF'
# Archives — Calendrier du Village

Ce dossier contient les fichiers de travail et outils de création
utilisés lors du développement du Calendrier Traditionnel Perpétuel Bamiléké.

## Contenu
- `GilbertCalendar80.xlsm` — Outil Excel/VBA original de calcul du cycle de 8 jours

© Gilbert FONGA — fongagilbert@gmail.com
EOF
  git add archives/README.md
  echo -e "   ${VERT}✅  Créé : archives/README.md${RESET}"
else
  echo -e "   ⚪  GilbertCalendar80.xlsm non trouvé dans ce dossier."
  echo -e "   ${OR}   → Copiez-le manuellement ici avant de relancer le script.${RESET}"
fi
echo ""

# ══════════════════════════════════════════
# ÉTAPE 4 — AJOUTER LES NOUVEAUX FICHIERS
# ══════════════════════════════════════════
echo -e "${GRAS}✨  ÉTAPE 4 — Ajout des nouveaux fichiers améliorés...${RESET}"
echo ""
echo -e "${OR}   ⚠️  Assurez-vous d'avoir copié ces fichiers dans ce dossier :${RESET}"
echo -e "   • index.html"
echo -e "   • styles.v3.css"
echo -e "   • app.v3.js"
echo -e "   • mentions-legales.html"
echo ""

NOUVEAUX_FICHIERS=("index.html" "styles.v3.css" "app.v3.js" "mentions-legales.html")
MANQUANTS=0

for f in "${NOUVEAUX_FICHIERS[@]}"; do
  if [ -f "$f" ]; then
    git add "$f"
    echo -e "   ${VERT}✅  Ajouté : $f${RESET}"
  else
    echo -e "   ${ROUGE}❌  MANQUANT : $f — copiez ce fichier dans le dossier !${RESET}"
    MANQUANTS=$((MANQUANTS+1))
  fi
done

if [ $MANQUANTS -gt 0 ]; then
  echo ""
  echo -e "${ROUGE}⚠️  $MANQUANTS fichier(s) manquant(s). Copiez-les dans le dossier et relancez le script.${RESET}"
  echo ""
  echo -e "   Chemin du dossier : ${GRAS}$(pwd)${RESET}"
  exit 1
fi
echo ""

# ══════════════════════════════════════════
# ÉTAPE 5 — COMMIT
# ══════════════════════════════════════════
echo -e "${GRAS}💾  ÉTAPE 5 — Création du commit...${RESET}"
echo ""

# Vérifier s'il y a des changements à committer
if git diff --cached --quiet; then
  echo -e "${OR}ℹ️  Aucun changement détecté à committer.${RESET}"
  exit 0
fi

# Afficher le résumé des changements
echo -e "${OR}📋  Résumé des changements :${RESET}"
git diff --cached --name-status
echo ""

# Créer le commit
git commit -m "🧹 Nettoyage + améliorations majeures v3.1

✨ Nouveautés :
- Design africain Bamiléké : boutons bleu ciel/foncé visibles, motifs Kente
- 3 mois côte à côte en grille grégorienne 7 colonnes
- Filtre par jour traditionnel via menu déroulant (pas de frappe)
- Protection impression : identification nom + email obligatoire
- Watermark © Gilbert FONGA sur chaque impression
- Page mentions-legales.html avec droits d'auteur complets

🔍 SEO :
- Balises meta description, keywords, Open Graph, Twitter Card
- Schema.org JSON-LD (WebApplication + auteur)
- Balise canonical + aria-labels accessibilité

🧹 Nettoyage du dépôt :
- Supprimé : app.v3.j.s (doublon faute de frappe)
- Supprimé : data.json, data_final.json, data_final - Copie.json (obsolètes)
- Supprimé : styles.v3 (ancien).css (remplacé)
- Supprimé : tets.html (fichier de test)
- Supprimé : favicon.ico racine (doublon de icons/)
- Corrigé : .nojekyll (nom correct)
- Archivé : GilbertCalendar80.xlsm → archives/

© Gilbert FONGA — fongagilbert@gmail.com"

echo ""
echo -e "${VERT}✅  Commit créé avec succès !${RESET}"
echo ""

# ══════════════════════════════════════════
# ÉTAPE 6 — PUSH VERS GITHUB
# ══════════════════════════════════════════
echo -e "${GRAS}🚀  ÉTAPE 6 — Push vers GitHub...${RESET}"
echo ""

# Détecter la branche courante
BRANCHE=$(git branch --show-current)
echo -e "   Branche : ${GRAS}$BRANCHE${RESET}"
echo ""

git push origin "$BRANCHE"

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GRAS}══════════════════════════════════════════${RESET}"
  echo -e "${VERT}  🎉  SUCCÈS ! Votre calendrier est mis à jour.${RESET}"
  echo -e "${GRAS}══════════════════════════════════════════${RESET}"
  echo ""
  echo -e "  🌐  Votre site : ${OR}https://fongagilbert-beep.github.io/calendrier-du-village/${RESET}"
  echo -e "  ⏳  Patientez 1-2 minutes pour que GitHub Pages se mette à jour."
  echo ""
else
  echo ""
  echo -e "${ROUGE}❌  Erreur lors du push. Vérifiez :${RESET}"
  echo -e "   1. Que vous êtes connecté à GitHub (${OR}git config --list | grep user${RESET})"
  echo -e "   2. Que vous avez les droits sur ce dépôt"
  echo -e "   3. Essayez : ${OR}git push origin $BRANCHE --force${RESET} si besoin"
fi
