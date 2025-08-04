# 🔒 Node.js Authentication Starter Kit

![Node.js](https://img.shields.io/badge/Node.js-20.x-green)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-green)
![JWT](https://img.shields.io/badge/JWT-Auth-orange)
![CI/CD](https://img.shields.io/badge/CI/CD-GitHub_Actions-blue)

**Briefs** pour système d'authentification Node.js/Express avec MongoDB, développé dans le cadre de la formation **Développeur Web et Mobile** par [WenakLabs](https://www.wenaklabs.org) et [Simplon Africa](https://africa.simplon.co).

## ✨ Fonctionnalités Clés

### 🛡️ Sécurité Complète
- Authentification JWT (Access + Refresh tokens)
- Hashing des mots de passe avec bcrypt
- Validation rigoureuse des inputs

### 🔄 Workflows Complets
- Inscription avec vérification email
- Connexion sécurisée
- Réinitialisation de mot de passe
- Gestion des produits
- Renouvellement de token
### ✅ Authentification & Sécurité
-Enregistrement d’un utilisateur
- Vérification de l'adresse email par lien
- Connexion avec JSON Web Token (JWT)
- Modification du mot de passe
- Réinitialisation du mot de passe oublié
- Suppression du compte utilisateur
- Accès sécurisé aux routes via middleware JWT

### 📦 Produits
- Création d’un produit
- Récupération de tous les produits
- Récupération des produits d’un utilisateur
- Récupération d’un produit par ID
- Modification et suppression d’un produit

### � Gestion des Erreurs
- Middleware d'erreur centralisé
- Logging structuré avec Winston
- Codes HTTP sémantiques
- Messages d'erreur clairs

## 🛠️ Stack Technique

| Composant        | Technologie         | Version |
|------------------|---------------------|---------|
| Runtime         | Node.js            | 20 LTS  |
| Framework       | Express            | 4.x     |
| Base de données | MongoDB            | 7.x     |
| ODM             | Mongoose           | 8.x     |
| Authentification| jsonwebtoken       | 9.x     |
| Tests           | Postman   |    |

## 🏗️ Structure du Projet
<img width="222" height="467" alt="Capture d’écran du 2025-08-04 15-47-55" src="https://github.com/user-attachments/assets/f8c0bc1f-1bf1-46d0-9acb-8f54d43369d7" />

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 20+
- MongoDB (local ou Atlas)
- Compte SMTP (code application de Gmail avec Nodemailer)

```bash
# 1. Cloner le dépôt
git clone https://github.com/HisseinHD/starter-code_Auth_node.git
cd starter-code_Auth_node

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp  .env
# Modifier les variables dans .env

# 4. Lancer en développement
npm run dev
```
# 5. Exécuter les tests
lance Postman puis tester 
