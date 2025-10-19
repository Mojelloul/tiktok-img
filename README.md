## TikTok Image + JSON Concat (Next.js)

### Installation locale

```bash
npm install
npm run dev
```

Ouvrez `http://localhost:3000`.

### Déploiement sur Vercel

1. **Préparer le projet** :
   ```bash
   # Dans le dossier du projet
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Déployer sur Vercel** :
   - Va sur [vercel.com](https://vercel.com)
   - Connecte-toi avec GitHub/GitLab/Bitbucket
   - Clique "New Project"
   - Importe ton repository
   - Vercel détectera automatiquement Next.js
   - Clique "Deploy"

3. **Variables d'environnement** (optionnel) :
   - Dans Vercel Dashboard → Settings → Environment Variables
   - Ajoute `RUNWARE_API_KEY` avec ta clé API
   - Redéploie

### Fonctionnalités
- Coller un JSON avec `titre`, `chapitres[{id, texte, prompt}]`, `hashtags`.
- Parser et sauvegarder automatiquement dans LocalStorage (y compris état "copié").
- Générer texte concaténé et copier.
- Liste des prompts avec bouton Copier (barrer et afficher `texte` en rouge quand copié, persistant après refresh).
- Génération d'images via l'API `pages/api/generateImage` (Runware) avec API Key et modèle configurables.

### Exemple de JSON
```json
{
  "titre": "Mon Titre",
  "chapitres": [
    { "id": 1, "texte": "Texte 1", "prompt": "Prompt 1" },
    { "id": 2, "texte": "Texte 2", "prompt": "Prompt 2" }
  ],
  "hashtags": "#tag1 #tag2"
}
```

### Notes
- API Runware côté serveur: `pages/api/generateImage.js`.
- Modèle configurable via l'interface (ex: `runware:101@1`).
- Clé API configurable via l'interface ou variable d'environnement.
- Images générées en 9:16 (768x1344) pour TikTok.


