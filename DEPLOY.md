# Commandes de déploiement Render.com

## Étape 1 : Pousser sur GitHub
```
bash
git add .
git commit -m "Add deployment files"
git push origin main
```

## Étape 2 : Créer la base de données MySQL
Aller sur https://dashboard.render.com :
- New + → MySQL
- Name: ged-db
- Region: Paris
- Plan: Free

## Étape 3 : Créer le Web Service
- New + → Web Service
- Connecter GitHub
- Build Command: npm install && npm run build
- Start Command: npm start

## Étape 4 : Variables d'environnement
Ajouter dans Render Dashboard :
- NODE_ENV=production
- PORT=10000
- DB_HOST= (depuis MySQL créé)
- DB_PORT=3306
- DB_NAME=ged_db
- DB_USER= (depuis MySQL créé)
- DB_PASSWORD= (depuis MySQL créé)
- JWT_SECRET= (générer une chaîne aléatoire)
- FRONTEND_URL= (URL de votre frontend)

## Étape 5 : Lancer les migrations
Aller dans "Shell" du web service :
```
bash
npm run db:migrate
npm run db:seed
```
