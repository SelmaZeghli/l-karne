# 🍪 L-Karné — SnackBox & Kridi Tracker Bureau

> Kiosk libre-service et registre de suivi des dettes de collègues ("Kridi") hébergé sur **GitHub Pages**, synchronisé en direct avec **Google Sheets** sur Google Drive via **Google Apps Script**.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-TailwindCSS%20%7C%20Lucide-059669.svg)](#)
[![Backend](https://img.shields.io/badge/Backend-Google%20Apps%20Script-10b981.svg)](#)
[![Database](https://img.shields.io/badge/Database-Google%20Sheets-34d399.svg)](#)

---

## 🎯 Fonctionnalités Principales

### 👤 Espace Colleague (Libre-service & Kiosk)
- **Authentification par PIN et invitation privée** : Chaque client active son compte avec un code personnel à usage unique.
- **Solde en Temps Réel** : Badge visuel indiquant la dette actuelle en Dirhams Marocains (`DH`).
- **Catalogue de Snacks** : Grille interactive avec filtres de catégories (*Boissons, Biscuits, Chocolat, Snacks, Café*), recherche instantanée et produits disponibles uniquement (quantité en stock supérieure à zéro).
- **Achat "Khditha" avec quantité** : Choix du nombre d’unités avant confirmation, limité au stock disponible. La transaction est d’abord enregistrée `PENDING`, puis le stock et le solde éventuel sont mis à jour; elle ne devient `COMPLETE` et n’entre dans l’historique ou la caisse qu’après vérification de ces changements. En cas d’échec, l’application tente de rétablir les valeurs et marque la transaction `FAILED`; une nouvelle tentative n’est proposée que si cette annulation est vérifiée. Google Sheets ne fournit pas de transaction atomique entre plusieurs onglets. Pour `Tea (3pc)` et `Trident (3pc)`, une quantité vendue est facturée au prix affiché (prix du lot de 3) et retire 3 pièces physiques du stock.
- **Prix particulier** : Le produit `Capsule L'or` est facturé 3,50 DH au compte Achraf; les autres comptes conservent le prix du produit.
- **Catalogue café simplifié** : Une seule variante de café active est présentée, en privilégiant celle qui a le plus grand stock positif.
- **Paiement à l'achat** : Le client indique s'il paie immédiatement ou ajoute l'article à son solde. Les achats payés et les règlements reçus alimentent la caisse.
- **Échec d’achat** : Si l’application ne peut pas vérifier l’annulation d’une opération, elle demande de ne pas réessayer et de faire vérifier le solde, le stock et l’onglet `Transactions` par l’administrateur. Si la réponse réseau est perdue, vérifiez l’historique avant toute nouvelle demande.
- **Annulation d’achat** : Un client peut demander l’annulation d’un achat terminé; l’achat reste actif jusqu’à la décision de l’administrateur. L’approbation confirme le retour du produit et, si l’achat était payé, le remboursement en espèces; elle rétablit le stock, corrige la dette si nécessaire et enregistre l’effet sur la caisse. L’administrateur peut aussi annuler directement un achat depuis l’activité récente.
- **Confidentialité Totale (Multi-Tenancy Strict)** : Filtrage côté serveur dans Google Apps Script. Un collègue ne peut en aucun cas voir les dettes ou les achats de ses collègues dans l'inspecteur réseau.
- **Historique Personnel** : Liste chronologique détaillée des achats et des règlements effectués.

### 🛡️ Espace Administrateur (Gestion & Encaissement)
- **Tableau de Bord Global** :
  - Total de la dette du bureau (Kridi cumulé).
  - Caisse basée sur le dernier comptage manuel, augmentée des encaissements et diminuée du coût des achats de stock ultérieurs.
  - Nombre de collègues actifs.
  - Alerte de stock faible (&le; 3 unités).
- **Règlement des Dettes ("Khllas")** : Modal rapide pour enregistrer les encaissements en espèces avec montant personnalisable et motif, déclenchant des confettis et un son de célébration.
- **Avances** : Un solde négatif représente une avance du collègue et apparaît en vert; les dettes apparaissent en rouge. Un solde réglé est arrondi à `0,00 DH`.
- **Correction des paiements** : Un montant négatif dans le formulaire de règlement annule tout ou partie d’un paiement saisi en trop et corrige la caisse.
- **Gestion des Stocks** : L’action **Achat** ajoute les unités nouvellement achetées et enregistre leur coût total, déduit de la caisse; **Retirer** permet uniquement de corriger le stock à la baisse. Le stock ne peut pas passer sous zéro.
- **Ajout de produit avec achat initial** : Le formulaire de nouveau produit accepte le coût total payé pour son stock initial; ce montant est enregistré comme achat de stock et déduit de la caisse.
- **Correction du catalogue** : L’administrateur peut modifier le nom, le prix de vente et choisir une catégorie existante (ou en créer une) dans une fenêtre d’édition, sans changer le stock.
- **Recherche et filtres admin** : Recherche des collègues et produits, filtres par rôle/solde, catégorie/état du stock, type d’opération, utilisateur et date.
- **Accès admin** : Navigation réservée aux administrateurs; le serveur vérifie également le rôle pour chaque action protégée.
- **Images produit** : L’administrateur peut enregistrer une URL HTTPS publique lors de la création ou remplacer l’image d’un produit existant depuis le tableau d’inventaire. La recherche d’images ouvre les résultats par nom de produit; il faut copier l’URL directe d’une photo autorisée. À défaut, l’emoji sert d’image.
- **Import du classeur** : Clients et soldes importés comme comptes non activés; produits et prix importés avec stock initial nul.
- **Inscription client** : Le client utilise un code privé à usage unique pour activer la fiche et conserver son solde importé.
- **PIN oublié** : Le client demande une réinitialisation depuis l’écran de connexion. Après vérification de son identité en personne, l’administrateur génère un PIN temporaire depuis les demandes du tableau de bord et le remet directement au client. Le premier accès avec ce PIN impose son remplacement avant tout usage; les anciennes sessions sont invalidées.
- **Ajout de Nouveaux Articles & Nouveaux Collègues** : Formulaires intégrés connectés à Google Sheets; un collègue importé garde son solde lorsqu’on lui attribue un compte.

---

## 📊 Schéma de la Base de Données (Google Sheets)

### Onglet 1 : `Products`
| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Identifiant unique (`p1`, `p2`, ...) |
| `name` | String | Nom du produit (ex: *Merendina Original Chocolat*) |
| `category` | String | Catégorie (*Boissons, Biscuits, Chocolat, Snacks, Café*) |
| `price_mad` | Number | Prix unitaire en Dirhams (MAD) |
| `stock_qty` | Number | Quantité restante en pièces physiques (initialisée à `0`; pour `Tea (3pc)` et `Trident (3pc)`, une vente retire 3 pièces) |
| `image_url` | String | Emoji ou URL de l'image |
| `is_active` | Boolean | Visibilité dans le catalogue (`TRUE` / `FALSE`) |

### Onglet 2 : `Users`
| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Identifiant unique (`u_client_1`, `u_admin`, ...) |
| `name` | String | Nom complet du collègue |
| `username` | String | Identifiant de connexion |
| `pin_hash` | String | Empreinte SHA-256 du code PIN |
| `role` | String | `user` ou `admin` |
| `balance_mad` | Number | Solde en DH : positif = dû par le collègue, négatif = avance du collègue |
| `created_at` | String | Date de création (ISO 8601) |
| `pin_reset_required` | Boolean | Un PIN temporaire doit être remplacé avant tout usage |
| `pin_reset_requested_at` | String | Date de la demande de réinitialisation, vide après changement du PIN |
| `session_version` | Number | Version d’authentification utilisée pour invalider les sessions précédentes |

Les fiches importées ont déjà leur nom et leur solde; leur identifiant/PIN restent vides jusqu’à activation avec le code privé de `Invites`.

### Onglet 3 : `Invites`
| Colonne | Type | Description |
| :--- | :--- | :--- |
| `user_id` | String | Client concerné |
| `code_hash` | String | Empreinte du code à usage unique |
| `claim_code` | String | Code à remettre individuellement au client; effacé après activation |
| `used_at` | String | Date d’activation, vide tant que le code n’est pas utilisé |

Après l’initialisation, l’administrateur peut télécharger les invitations non utilisées au format CSV depuis son tableau de bord. Ne partagez jamais l’onglet `Invites` ni ce fichier avec les clients : transmettez à chacun uniquement son propre code. Les codes sont retirés de l’export après activation.

### Onglet 4 : `Transactions`
| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Identifiant unique de transaction (`TX-...`) |
| `timestamp` | String | Date et heure de l'opération (ISO 8601) |
| `user_id` | String | Référence vers l'utilisateur |
| `user_name` | String | Nom de l'utilisateur au moment de l'opération |
| `type` | String | Type d'opération : `purchase`, `purchase_cancellation`, `payment`, `restock`, `inventory_purchase` |
| `item_id` | String | Identifiant du produit (si achat ou restock) |
| `item_name` | String | Nom du produit ou description de paiement |
| `quantity` | Number | Quantité concernée |
| `amount_mad` | Number | Montant en Dirhams; coût positif pour `inventory_purchase`, déduit de la caisse |
| `notes` | String | Commentaire ou motif |
| `paid` | Boolean | Achat payé au moment de l'achat (vide pour les autres opérations) |
| `status` | String | État de transaction : `PENDING`, `COMPLETE` ou `FAILED`; seuls les états `COMPLETE` sont comptabilisés. Les lignes historiques sans état sont considérées comme terminées. |
| `cancel_status` | String | État d’une demande d’annulation : vide, `REQUESTED`, `REJECTED` ou `APPROVED`. |
| `cancel_requested_at` | String | Date de la dernière demande d’annulation du client. |
| `cancel_decided_at` | String | Date de décision de l’administrateur. |
| `cancel_decided_by` | String | Identifiant de l’administrateur ayant traité la demande. |

### Onglet 5 : `Settings`
| Colonne | Type | Description |
| :--- | :--- | :--- |
| `key` | String | Nom du paramètre |
| `value` | Number/String | `opening_cash_mad` : dernier montant compté; `opening_cash_timestamp` : heure du comptage |

Après chaque comptage, la caisse affichée est ce montant + les achats payés et règlements enregistrés ensuite. Le formulaire peut être utilisé à nouveau après un nouveau comptage. Ce n'est pas un bénéfice net : le coût du réapprovisionnement n'est pas déduit.

Le classeur contient 36 clients et 65 produits. Les soldes positifs sont des dettes; les soldes négatifs sont des avances/crédits. Les cellules de solde vides sont importées comme `0`; la somme nette des soldes importés est de `148,50 DH`. Les catégories `Chocolate` et `Beverages` sont affichées comme `Chocolat` et `Boissons`.

---

## 🖼️ Gestion des images produit

Les images sont référencées par l’onglet `Products`, colonne `image_url` : le formulaire **Nouveau Produit** accepte une URL HTTPS publique et conserve l’emoji comme solution de repli. Les images distantes sont chargées par le navigateur; aucun fichier image n’est envoyé ou stocké dans Google Sheets ou Google Drive par l’application. Pour remplacer une image, modifiez `image_url` dans Sheets avec une URL d’image stable et publiquement accessible. Privilégiez une image de produit fournie par le fabricant ou une image que vous êtes autorisé à utiliser; les liens de recherche/aperçu et les pages de boutique ne sont pas des URL d’image.

---

## 🔒 Sécurité & Conception Anti-Course

1. **Aucune clé API stockée côté client** : Le frontend GitHub Pages ne stocke aucune clé privée de service account Google ni de mot de passe maître.
2. **Tokens de Session HMAC-SHA256** : À la connexion, Apps Script émet un jeton signé cryptographiquement contenant `userId`, `role`, et `expiresAt`. Ce jeton est validé à chaque appel d'API.
3. **Contrôle d'accès strict** : Seul le compte admin initial peut accéder aux routes d’administration; l’inscription client ne peut créer que des comptes `user`. Les routes admin vérifient le rôle côté serveur.
4. **Invitation à usage unique** : Les codes sont hachés pour leur validation, jamais renvoyés dans les endpoints publics, et ne peuvent activer qu’une seule fiche client.
5. **Verrouillage Atomique (`LockService`)** : Prévient les conditions de concurrence (*race conditions*) lors des achats et activations de comptes.

## 🌐 Utilisation sur plusieurs étages et à distance

L'application est déjà centralisée : chaque téléphone ou ordinateur envoie ses opérations au même Apps Script, qui met à jour le même Google Sheet. Les appareils peuvent utiliser des réseaux Wi-Fi différents ou le réseau mobile ; ils ont besoin d'Internet, mais pas du même réseau local ni d'un serveur à installer.

Publiez l'application sur GitHub Pages, déployez Apps Script en application Web, puis configurez la même URL `/exec` dans les paramètres de chaque appareil. Les nouvelles opérations sont enregistrées dans la feuille partagée. Une page déjà ouverte ne rafraîchit pas automatiquement les changements effectués sur les autres appareils : rechargez la vue. Pour ce petit commerce, c'est la solution simple ; un rafraîchissement périodique peut être ajouté si une actualisation automatique est nécessaire.

Sans Internet, les étages et les jours à distance ne peuvent pas partager instantanément les données sans un serveur accessible de partout. L’application n’affiche plus de comptes ni de produits de démonstration : configurez le backend Google Sheets pour utiliser les données importées.

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