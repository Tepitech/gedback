# Guide de déploiement Render.com

## Étape 1 : Pousser le code sur GitHub
Si ce n'est pas encore fait :
```
bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

## Étape 2 : Créer la base de données MySQL sur Render

1. Aller sur https://dashboard.render.com
2. Cliquer **"New +"** → **"MySQL"**
3. Configurer :
   - **Name**: `ged-db`
   - **Region**: `Paris`
   - **Plan**: `Free`
4. Cliquer **"Create Database"**

## Étape 3 : Connecter GitHub à Render

1. **"New +"** → **"Web Service"**
2. **"Connect a GitHub repository"**
3. Autoriser Render à accéder à GitHub
4. Sélectionner votre dépôt

## Étape 4 : Configuration du Web Service

Remplir les champs :
- **Name**: `ged-backend`
- **Region**: `Paris`
- **Branch**: `main`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

## Étape 5 : Variables d'environnement

Aller dans l'onglet **"Environment"** du Web Service et cliquer **"Add"** pour chaque variable :

| Variable | Valeur |
|----------|--------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `DB_HOST` | (hostname depuis MySQL créé - voir ci-dessous) |
| `DB_PORT` | `3306` |
| `DB_NAME` | `ged_db` |
| `DB_USER` | `render` |
| `DB_PASSWORD` | (mot de passe depuis MySQL créé) |
| `JWT_SECRET` | (clé aléatoire générée automatiquement) |
| `FRONTEND_URL` | `https://votre-frontend.onrender.com` |

### Récupérer les infos MySQL :
- Dans votre base MySQL sur Render Dashboard
- Cliquer **"Connect"** → **"External Connection"**
- Copier les valeurs de host, user, password

## Étape 6 : Lancer le déploiement

Cliquer **"Create Web Service"**

## Étape 7 : Lancer les migrations

1. Une fois déployé, cliquer sur **"Shell"**
2. Exécuter :
```
bash
npm run db:migrate
npm run db:seed
```

## Étape 8 : Vérifier

- URL : `https://ged-backend.onrender.com`
- Test santé : `https://ged-backend.onrender.com/health`
