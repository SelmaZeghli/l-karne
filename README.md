# 🍪 L-Karné — SnackBox & Kridi Tracker Bureau

> Kiosk libre-service et registre de suivi des dettes de collègues ("Kridi") hébergé sur **GitHub Pages**, synchronisé en direct avec **Google Sheets** sur Google Drive via **Google Apps Script**.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-TailwindCSS%20%7C%20Lucide-059669.svg)](#)
[![Backend](https://img.shields.io/badge/Backend-Google%20Apps%20Script-10b981.svg)](#)
[![Database](https://img.shields.io/badge/Database-Google%20Sheets-34d399.svg)](#)

---

## 🎯 Fonctionnalités Principales

### 👤 Espace Colleague (Libre-service & Kiosk)
- **Authentification Sécurisée par PIN** : Clavier numérique tactile ergonomique adapté aux tablettes de bureau et smartphones.
- **Solde en Temps Réel** : Badge visuel indiquant la dette actuelle en Dirhams Marocains (`DH`).
- **Catalogue de Snacks** : Grille interactive avec filtres de catégories (*Boissons, Biscuits, Snacks, Café*), recherche instantanée et indicateurs de stock dynamiques (*En stock, Faible stock, Rupture*).
- **Achat Rapide "Khditha (+1)"** : Enregistrement d'un snack en 1 tap avec confirmation, retour sonore Web Audio et mise à jour atomique du stock.
- **Confidentialité Totale (Multi-Tenancy Strict)** : Filtrage côté serveur dans Google Apps Script. Un collègue ne peut en aucun cas voir les dettes ou les achats de ses collègues dans l'inspecteur réseau.
- **Historique Personnel** : Liste chronologique détaillée des achats et des règlements effectués.

### 🛡️ Espace Administrateur (Gestion & Encaissement)
- **Tableau de Bord Global** :
  - Total de la dette du bureau (Kridi cumulé).
  - Nombre de collègues actifs.
  - Alerte de stock faible (&le; 3 unités).
- **Règlement des Dettes ("Khllas")** : Modal rapide pour enregistrer les encaissements en espèces avec montant personnalisable et motif, déclenchant des confettis et un son de célébration.
- **Gestion des Stocks (Restock)** : Boutons rapides (+5, +10) pour réapprovisionner l'inventaire en un clic.
- **Ajout de Nouveaux Articles & Nouveaux Collègues** : Formulaires intégrés connectés à Google Sheets.

---

## 📊 Schéma de la Base de Données (Google Sheets)

### Onglet 1 : `Products`
| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Identifiant unique (`p1`, `p2`, ...) |
| `name` | String | Nom du produit (ex: *Merendina Original Chocolat*) |
| `category` | String | Catégorie (*Boissons, Biscuits, Snacks, Café*) |
| `price_mad` | Number | Prix unitaire en Dirhams (MAD) |
| `stock_qty` | Number | Quantité restante en stock |
| `image_url` | String | Emoji ou URL de l'image |
| `is_active` | Boolean | Visibilité dans le catalogue (`TRUE` / `FALSE`) |

### Onglet 2 : `Users`
| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Identifiant unique (`u_aziz`, `u_admin`, ...) |
| `name` | String | Nom complet du collègue |
| `username` | String | Identifiant de connexion |
| `pin_hash` | String | Empreinte SHA-256 du code PIN |
| `role` | String | `colleague` ou `admin` |
| `balance_mad` | Number | Solde dû en Dirhams (dette) |
| `created_at` | String | Date de création (ISO 8601) |

### Onglet 3 : `Transactions`
| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Identifiant unique de transaction (`TX-...`) |
| `timestamp` | String | Date et heure de l'opération (ISO 8601) |
| `user_id` | String | Référence vers l'utilisateur |
| `user_name` | String | Nom de l'utilisateur au moment de l'opération |
| `type` | String | Type d'opération : `purchase`, `payment`, `restock` |
| `item_id` | String | Identifiant du produit (si achat ou restock) |
| `item_name` | String | Nom du produit ou description de paiement |
| `quantity` | Number | Quantité concernée |
| `amount_mad` | Number | Montant en Dirhams |
| `notes` | String | Commentaire ou motif |

---

## 🔒 Sécurité & Conception Anti-Course

1. **Aucune clé API stockée côté client** : Le frontend GitHub Pages ne stocke aucune clé privée de service account Google ni de mot de passe maître.
2. **Tokens de Session HMAC-SHA256** : À la connexion, Apps Script émet un jeton signé cryptographiquement contenant `userId`, `role`, et `expiresAt`. Ce jeton est validé à chaque appel d'API.
3. **Contrôle d'accès strict** : Si un utilisateur non-admin tente d'appeler `admin/overview` ou `admin/settle`, le serveur refuse l'opération avec un code d'erreur `Forbidden`.
4. **Verrouillage Atomique (`LockService`)** : Prévient les conditions de concurrence (*race conditions*) lorsqu'un même article est pris simultanément par plusieurs collègues.

---

## 🚀 Démarrage Rapide & Déploiement

Consultez le guide complet pas-à-pas : **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** pour configurer Google Sheets, déployer `Code.gs` et publier sur GitHub Pages.

---

## 💻 Structure du Projet

```text
├── Code.gs                # Moteur backend complet Google Apps Script (REST API)
├── index.html             # Application Frontend Kiosk (Mobile-First SPA)
├── DEPLOYMENT_GUIDE.md    # Guide pas-à-pas illustré de déploiement
└── README.md              # Documentation technique du projet
```