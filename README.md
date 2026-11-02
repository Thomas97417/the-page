# the page

Une page mondiale **World**, complétée par **50 pages nationales**, dont la France, le Royaume-Uni, les États-Unis, le Canada, le Maroc, le Japon et le Brésil. Chaque page possède ses **50 emplacements indépendants**. Chaque place commence à **1 € TTC** ; son prix augmente de **1 €** à chaque achat confirmé. Un rachat remplace le mot précédent immédiatement. Chaque mot peut être accompagné d’une **description facultative de 160 caractères maximum**, visible dans sa fiche, et d’un lien facultatif. Le propriétaire peut modifier gratuitement son mot, sa description et son lien jusqu’au prochain achat.

World reste la page par défaut sur `/`. Les pages nationales utilisent un slug anglais, par exemple `/france`, `/united-kingdom`, `/united-states` ou `/japan`. Les anciennes adresses françaises redirigent vers ces URL avec un statut 301, en conservant le suivi d’achat et l’ancre. Les identifiants enregistrés en base restent stables ; chaque entrée de `packages/backend/convex/lib/pages.ts` sépare l’`id` interne, le `slug` public et le `label` français. Le suffixe à côté de « the page. » dans le header ouvre un sélecteur compact : World apparaît en premier, suivi des pays par ordre alphabétique. Une recherche par nom français, slug anglais ou suffixe (`fr`, `uk`, `jp`…) ignore les accents, la casse, les espaces et la ponctuation. La liste défile sous le champ de recherche avec une scrollbar assortie aux thèmes clair et sombre. `/world` redirige vers `/`. Chacun peut participer à la page de son choix ; le pays n’est pas déterminé par géolocalisation. Les prix restent en euros pour toutes les pages.

React 19, TanStack Start, Convex, Better Auth, Tailwind CSS et shadcn/ui (Base UI). Monorepo Bun / Turborepo.

## Démarrage

Prérequis : **Node 22.12+**, Bun 1.3+ et l’accès au projet Convex de développement.

```bash
bun install --frozen-lockfile
cp packages/backend/.env.example packages/backend/.env.local
cp apps/web/.env.example apps/web/.env
bun run dev
```

L’application écoute sur [localhost:3003](http://localhost:3003). Libérer ce port si une autre instance du projet tourne déjà. Les deux variables frontend sont uniquement les URL publiques `VITE_CONVEX_URL` et `VITE_CONVEX_SITE_URL`. Ne jamais copier les secrets du backend vers le frontend.

Le déploiement de développement existant est `affable-ptarmigan-378`, projet `the-page`, équipe `throuquette`, région Europe (Irlande). Pour utiliser un projet indépendant : `bun run dev:setup`, puis adapter les deux URL publiques.

`bun run dev:server` initialise les pages après le premier déploiement des fonctions. Pour lancer l’initialisation manuellement depuis `packages/backend` :

```bash
bunx --bun convex run slots:initialize '{}'
```

Cette fonction interne rattache les anciens emplacements à World et crée seulement les places manquantes de chaque page. Elle conserve les IDs, les mots, les prix, les propriétaires et les réservations existants ; elle peut être relancée sans doublons. Après un déploiement effectué sans `dev:server`, l’exécuter une fois pour ouvrir les nouvelles pages. La liste des pages est définie dans `packages/backend/convex/lib/pages.ts`.

## Paiement Polar : sandbox uniquement

L’intégration utilise `@convex-dev/polar`, son endpoint signé **`/polar/events`** et le SDK Polar pour les prix fixes calculés côté serveur. Il n’existe aucun commutateur de production.

**La politique de Polar exclut la publicité et le sponsoring.** Ce projet reste un prototype avec des paiements de test. Résoudre l’incompatibilité avec Polar avant toute mise en service commerciale : [Acceptable Use Policy](https://polar.sh/legal/acceptable-use-policy).

1. Ouvrir [Polar Sandbox](https://sandbox.polar.sh) et créer une organisation de test.
2. Créer un produit **à paiement unique**, sans abonnement. Le prix du catalogue est remplacé à chaque checkout par un prix fixe en EUR, taxes incluses.
3. Créer un token sandbox avec les droits `products:read`, `checkouts:read`, `checkouts:write`, `orders:read`, `refunds:read` et `refunds:write`.
4. Ajouter un webhook pointant vers `https://affable-ptarmigan-378.eu-west-1.convex.site/polar/events` (adapter au déploiement utilisé), avec les événements **`order.paid`** et **`order.refunded`**.
5. Renseigner dans **les variables du déploiement Convex**, via son dashboard :

| Variable                   | Valeur                                                        |
| -------------------------- | ------------------------------------------------------------- |
| `POLAR_ORGANIZATION_TOKEN` | Token de l’organisation **sandbox**                           |
| `POLAR_WEBHOOK_SECRET`     | Secret du webhook sandbox                                     |
| `POLAR_PRODUCT_ID`         | ID du produit à paiement unique sandbox                       |
| `SITE_URL`                 | Origine de l’application, par exemple `http://localhost:3003` |
| `BETTER_AUTH_URL`          | Même origine que `SITE_URL`                                   |

Les fichiers `.env.local` ne configurent pas automatiquement les variables du déploiement. Ne pas mettre de token dans une variable `VITE_*`, dans un commit ou dans une URL.

Sans configuration Polar, la page reste consultable et l’achat affiche une indisponibilité. Aucun paiement fictif n’est enregistré. `payments:availability` permet de vérifier la configuration sans dévoiler les secrets.

### Confirmation et récupération

- Un checkout réserve sa place cinq minutes. L’ancien mot reste visible et le prix reste inchangé jusqu’à confirmation.
- Chaque utilisateur est limité à une réservation en cours et cinq tentatives par dix minutes.
- Le webhook signé relit la commande Polar et vérifie commande, checkout, produit, utilisateur, devise et montant. La publication et l’augmentation de prix sont atomiques et idempotentes.
- Avant de libérer une réservation expirée, le backend vérifie Polar. Une panne ou un paiement encore en cours conserve la réservation pendant la vérification.
- Un paiement reçu après libération est remboursé ; il ne peut jamais écraser un achat plus récent. Une tâche planifiée toutes les cinq minutes récupère les paiements et remboursements interrompus.
- Les remboursements complets retirent uniquement le mot correspondant s’il est encore actuel. Ils ne diminuent pas le prix d’un emplacement.

## Comptes et administration

L’authentification email exige `RESEND_API_KEY`, `EMAIL_FROM` et `BETTER_AUTH_SECRET` côté Convex. Google et GitHub utilisent respectivement `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` et `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`. Configurer leurs callbacks pour l’origine de l’application. Les connexions et les emails de vérification ramènent au brouillon conservé dans l’onglet, sur sa page d’origine. Les retours de paiement conservent également la page sélectionnée. « Mes mots » regroupe les achats de toutes les pages et indique leur pays.

Pour activer la modération, ajouter **`ADMIN_USER_IDS`** dans les variables Convex : IDs Better Auth des administrateurs, séparés par des virgules. Les IDs sont visibles dans la table `user` du composant Better Auth dans le dashboard. Une liste vide n’accorde aucun accès.

La route `/admin` permet de sélectionner une page, puis de masquer, rétablir ou retirer le mot actuel. Chaque action vérifie les permissions côté serveur et conserve une trace. Un mot masqué, sa description et son URL ne sont jamais renvoyés aux visiteurs ; l’édition par le propriétaire ne contourne pas la modération.

Les routes utiles sont `/`, `/settings`, `/admin`, les écrans de connexion et récupération de compte, et `/api/auth/*`. Les anciennes démonstrations `/dashboard` et `/upload` ont été supprimées. Le stockage R2 préexistant n’est pas utilisé par les nouveaux parcours.

## Vérification

```bash
bun run test
bun run check-types
bun run build
```

Les tests Vitest/Convex utilisent une base en mémoire et des appels Polar simulés : ils ne créent ni utilisateur réel, ni paiement, ni mot sur le déploiement distant. Ils vérifient l’isolation des pages, la migration de World, les retours après connexion et paiement, les prix indépendants, la propriété, l’édition, les réservations concurrentes, la modération, les signatures invalides, les commandes incohérentes et la récupération des paiements/remboursements.

Pour valider l’intégration réelle après configuration : acheter une place avec les moyens de paiement de test documentés par Polar ; vérifier `order.paid`, le mot publié et l’augmentation d’un euro ; racheter avec un second compte ; vérifier que le premier compte ne peut plus modifier la place. Tester aussi un checkout abandonné, un événement rejoué et un paiement après expiration. N’utiliser aucune carte réelle dans ce prototype.

## Structure

- `apps/web/src/routes` : routes TanStack Start ; `routeTree.gen.ts` est régénéré par le routeur.
- `apps/web/src/components` : page, panneaux, authentification et composants shadcn.
- `packages/backend/convex` : schéma, propriété, paiements et modération ; `_generated` est généré par Convex.
- `packages/backend/tests` : tests du métier et de l’intégration de paiement.
