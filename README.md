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

L’application écoute sur [localhost:3003](http://localhost:3003). Libérer ce port si une autre instance du projet tourne déjà. Les variables Convex du frontend sont les URL publiques `VITE_CONVEX_URL` et `VITE_CONVEX_SITE_URL`. Ne jamais copier les secrets du backend vers le frontend.

Le serveur local utilise le runtime Cloudflare : définir aussi un secret dédié `AUTH_PROXY_SECRET` (32 caractères minimum) dans `apps/web/.env.local` et la même valeur dans les variables du déploiement Convex de développement. Redémarrer le serveur après configuration. Voir [IP des visiteurs sur Cloudflare](#ip-des-visiteurs-sur-cloudflare) pour le rôle de ce secret privé.

`bunfig.toml` utilise le linker `hoisted` pour partager une même copie de Convex entre les workspaces et les composants, et conserver des types compatibles. Après une ancienne installation avec le linker isolé, supprimer les répertoires `node_modules` du dépôt et des workspaces avant de relancer `bun install --frozen-lockfile`.

Le déploiement de développement existant est `affable-ptarmigan-378`, projet `the-page`, équipe `throuquette`, région Europe (Irlande). Pour utiliser un projet indépendant : `bun run dev:setup`, puis adapter les deux URL publiques.

`bun run dev:server` initialise les pages après le premier déploiement des fonctions. Pour lancer l’initialisation manuellement depuis `packages/backend` :

```bash
bunx --bun convex run slots:initialize '{}'
```

Cette fonction interne rattache les anciens emplacements à World et crée seulement les places manquantes de chaque page. Elle conserve les IDs, les mots, les prix, les propriétaires et les réservations existants ; elle peut être relancée sans doublons. Après un déploiement effectué sans `dev:server`, l’exécuter une fois pour ouvrir les nouvelles pages. La liste des pages est définie dans `packages/backend/convex/lib/pages.ts`.

## Déploiement Cloudflare Workers

Le frontend SSR utilise `@cloudflare/vite-plugin` et Wrangler. Le Worker s’appelle **`the-page`** ; sa configuration est dans `apps/web/wrangler.jsonc`. Il utilise l’entrée serveur standard de TanStack Start, la compatibilité Node.js et les logs Cloudflare. Le backend reste hébergé sur Convex et se déploie séparément.

Depuis la racine du dépôt :

```bash
bun install --frozen-lockfile
bun run --cwd apps/web cf-typegen
bun run --cwd apps/web build
bun run --cwd apps/web preview
```

`preview` sert le build dans le runtime local Cloudflare. `cf-typegen` génère les types des bindings dans `apps/web/worker-configuration.d.ts`, ignoré par Git ; le relancer après un changement de bindings. Les types globaux du runtime sont exclus pour conserver les types DOM de l’application React. Le plugin génère `dist/client`, `dist/server` et la redirection Wrangler dans `.wrangler/deploy`. Turborepo conserve aussi cette redirection dans son cache de build.

Configurer les variables publiques **au moment du build**, avec les URL du déploiement Convex choisi :

| Variable | Valeur |
| --- | --- |
| `VITE_CONVEX_URL` | URL publique `https://…convex.cloud` |
| `VITE_CONVEX_SITE_URL` | URL publique `https://…convex.site` |
| `VITE_POSTHOG_PROJECT_TOKEN` | Jeton public du projet PostHog de production, ou vide pour désactiver le suivi |
| `VITE_POSTHOG_HOST` | `https://eu.i.posthog.com` |
| `VITE_POSTHOG_ENVIRONMENT` | `production` |

Pour un build local destiné à la production, renseigner ces valeurs dans `apps/web/.env.production.local` afin de remplacer les valeurs de développement de `.env`. Les variables `VITE_*` sont intégrées au bundle : toute modification nécessite un nouveau build.

Ajouter **`AUTH_PROXY_SECRET`** aux secrets du Worker et configurer la même valeur côté Convex, comme décrit dans « IP des visiteurs sur Cloudflare ». Ce secret privé de 32 caractères minimum est lu à l’exécution ; il ne doit jamais devenir une variable `VITE_*`. Pour le runtime local Cloudflare, y compris `bun run dev:web` et `bun run --cwd apps/web preview`, le renseigner dans `apps/web/.env.local` ou `apps/web/.dev.vars` (ignorés par Git), avec la même valeur dans le déploiement Convex de développement. Si `.dev.vars` existe, Wrangler utilise ce fichier pour les secrets et ignore les fichiers `.env*`. Redémarrer le serveur après un changement de configuration. Côté Convex, régler `SITE_URL` et `BETTER_AUTH_URL` sur l’origine HTTPS publiée, puis adapter les callbacks OAuth et le webhook Polar au déploiement choisi.

Après connexion à Cloudflare avec Wrangler, la commande suivante reconstruit et déploie le frontend :

```bash
bun run --cwd apps/web deploy
```

Pour **Workers Builds** connecté au dépôt Git, garder la racine du dépôt comme répertoire de travail pour installer les workspaces Bun. Utiliser `bun run --cwd apps/web build` comme commande de build et `cd apps/web && bunx wrangler deploy` comme commande de déploiement. Renseigner les variables `VITE_*` dans les variables de build et `AUTH_PROXY_SECRET` dans les secrets du Worker.

Pour les déploiements de branches avec **Cloudflare Previews**, utiliser `cd apps/web && bunx wrangler preview` après le build. Le bloc `previews: {}` de `wrangler.jsonc` est requis pour cette commande. Configurer aussi `AUTH_PROXY_SECRET` dans **Previews Base**, avec la même valeur que dans le déploiement Convex ciblé ; les secrets de production ne sont pas hérités. La commande locale `bun run --cwd apps/web preview` sert uniquement l’aperçu sur la machine.

Référence : [TanStack Start sur Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/).
Configuration des previews : [Cloudflare Previews](https://developers.cloudflare.com/workers/previews/configuration/).

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
- Chaque utilisateur est limité à une réservation en cours. Le quota de nouvelles réservations accepte cinq créations rapprochées, puis récupère une place toutes les deux minutes.
- Le webhook signé relit la commande Polar et vérifie commande, checkout, produit, utilisateur, devise et montant. La publication et l’augmentation de prix sont atomiques et idempotentes.
- Avant de libérer une réservation expirée, le backend vérifie Polar. Une panne ou un paiement encore en cours conserve la réservation pendant la vérification.
- Un paiement reçu après libération est remboursé ; il ne peut jamais écraser un achat plus récent. Une tâche planifiée toutes les cinq minutes récupère les paiements et remboursements interrompus.
- Les remboursements complets retirent uniquement le mot correspondant s’il est encore actuel. Ils ne diminuent pas le prix d’un emplacement.

## Analytique PostHog (EU)

Le frontend utilise `@posthog/react` et `posthog-js` ; le backend utilise le composant officiel `@posthog/convex`, avec Convex **1.49.0**. L’ingestion est configurée en Europe (`https://eu.i.posthog.com`).

| Événement | Déclenchement |
| --- | --- |
| `$pageview` | Premier affichage et chaque changement de chemin côté navigateur ; les changements de paramètres ou d’ancre ne créent pas une nouvelle vue. |
| `purchase_form_opened` | Ouverture du formulaire depuis un emplacement ou une action de rachat. |
| `checkout_created` | Première association d’un checkout Polar à l’achat dans Convex. |
| `purchase_completed` | Commande validée et achat publié, depuis le webhook ou la récupération du paiement. |
| `purchase_refunded` | Premier passage de l’achat à l’état entièrement remboursé. |

Les événements métier sont planifiés dans la même mutation que leur changement d’état. Une transaction annulée ne produit pas de capture, et les commandes ou remboursements rejoués ne créent pas de nouvelle conversion. Les appels HTTP PostHog sont exécutés séparément par le composant, après la transaction.

Chaque événement d’achat contient `purchase_id`, `checkout_id` et `order_id` lorsqu’ils sont disponibles, `page_id`, `slot_id`, `position`, `amount_cents`, `currency: "EUR"` et `acquisition_number` (à partir de 1). `purchase_type` vaut `initial` pour le premier achat d’un emplacement, puis `takeover` pour les suivants. Les remboursements ajoutent `refunded_amount_cents` et, lorsqu’il est disponible, `refund_id`. Les paiements portent toujours `payment_mode: "sandbox"`.

Le navigateur appelle `identify()` avec le même ID Better Auth que `purchase.userId` côté serveur, puis réinitialise l’identité à la déconnexion ou au changement de compte. Le mot, la description, le lien de l’acheteur, son nom et son email ne sont pas ajoutés aux captures. Les paramètres et ancres des URL sont retirés des événements et des propriétés initiales de la personne. L’autocapture des interactions, les enregistrements de session et les enquêtes sont désactivés.

### Configuration

1. Créer un projet dans [PostHog EU](https://eu.posthog.com) et récupérer son **jeton public de projet** (`phc_…`). Utiliser des projets distincts pour le développement et la production.
2. Renseigner dans `apps/web/.env` :

   ```dotenv
   VITE_POSTHOG_PROJECT_TOKEN=phc_...
   VITE_POSTHOG_HOST=https://eu.i.posthog.com
   VITE_POSTHOG_ENVIRONMENT=development
   ```

3. Depuis `packages/backend`, configurer **le même jeton** dans les variables du déploiement Convex, puis déployer les fonctions de développement :

   ```bash
   bunx --bun convex env set POSTHOG_PROJECT_TOKEN 'phc_...'
   bunx --bun convex env set POSTHOG_ENVIRONMENT development
   bunx --bun convex dev --once
   ```

4. Redémarrer le frontend. En production, renseigner les variables publiques au build et `POSTHOG_ENVIRONMENT=production` côté Convex. Le navigateur utilise `production` par défaut lors d’un build de production, et `development` en mode dev ; le backend utilise `development` si la variable n’est pas précisée. Ne pas mélanger les projets PostHog entre frontend et backend d’un même environnement.

Sans jeton frontend, le SDK n’est pas initialisé. Le composant exige que la variable backend **existe**, mais elle peut rester vide pour désactiver toutes les captures métier :

```bash
# Depuis packages/backend, avant le premier déploiement sans jeton.
bunx --bun convex env set POSTHOG_PROJECT_TOKEN ''
```

Cette valeur vide est déjà configurée sur le déploiement de développement partagé. L’ajout ultérieur du vrai jeton active les nouveaux événements ; les achats historiques ne sont pas renvoyés. Aucune clé personnelle ou secrète PostHog n’est nécessaire pour ce suivi et aucune ne doit être ajoutée aux variables `VITE_*`.

Dans PostHog, utiliser `$pageview` pour les vues et visiteurs uniques, et un entonnoir `$pageview` → `purchase_form_opened` → `checkout_created` → `purchase_completed` pour la conversion. Filtrer `purchase_type` pour comparer achats initiaux et rachats. Les tests couvrent les navigations, l’identité, les URL expurgées, les événements rejoués et le fonctionnement sans jeton ; ils n’envoient rien à PostHog.

Références : [intégration Convex](https://posthog.com/docs/libraries/convex), [intégration TanStack Start](https://posthog.com/docs/libraries/tanstack-start).

## Comptes et administration

L’authentification email exige `RESEND_API_KEY`, `EMAIL_FROM` et `BETTER_AUTH_SECRET` côté Convex. Google et GitHub utilisent respectivement `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` et `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`. Configurer leurs callbacks pour l’origine de l’application. Les connexions et les emails de vérification ramènent au brouillon conservé dans l’onglet, sur sa page d’origine. Les retours de paiement conservent également la page sélectionnée. « Mes mots » regroupe les achats de toutes les pages et indique leur pays.

Le menu utilisateur donne accès à « Notifications », un panneau latéral avec un compteur de non-lus, un historique paginé et l’action « Tout marquer comme lu ». Chaque nouvel achat confirmé crée une notification pour l’acheteur et, si l’emplacement appartenait à quelqu’un, une notification pour l’ancien propriétaire. Le rachat depuis ce panneau reprend le dernier mot, la description et le lien de l’ancien propriétaire, au prix actuel de l’emplacement.

Ces deux événements envoient aussi un email avec Resend : félicitations et lien vers le mot acheté, ou invitation à le racheter. Le lien de rachat conserve la bonne page après connexion et reste réservé au compte destinataire. Les emails utilisent la langue enregistrée lors de l’achat du destinataire (français par défaut pour les achats anciens). `RESEND_API_KEY`, `EMAIL_FROM` et `SITE_URL` doivent être configurés côté Convex. La publication, les notifications et leur mise en attente sont atomiques ; les événements de paiement rejoués ne créent aucun doublon. L’envoi est indépendant du paiement, avec reprise des emails en attente toutes les cinq minutes et suivi dans le composant Resend. Aucun email n’est adressé à un compte supprimé. L’historique antérieur à l’installation de cette fonctionnalité n’est pas recréé.

Pour activer la modération, ajouter **`ADMIN_USER_IDS`** dans les variables Convex : IDs Better Auth des administrateurs, séparés par des virgules. Les IDs sont visibles dans la table `user` du composant Better Auth dans le dashboard. Une liste vide n’accorde aucun accès.

La route `/admin` permet de sélectionner une page, puis de masquer, rétablir ou retirer le mot actuel. Chaque action vérifie les permissions côté serveur et conserve une trace. Un mot masqué, sa description et son URL ne sont jamais renvoyés aux visiteurs ; l’édition par le propriétaire ne contourne pas la modération.

Lorsqu’un mot est masqué ou révélé, son propriétaire reçoit un email dans la langue de son achat, avec le dernier texte du mot, la page et l’emplacement concernés. La mise en attente est atomique avec la modération et réutilise Resend et la reprise toutes les cinq minutes. Répéter une action sans changer la visibilité n’envoie pas d’autre email. Les anciens événements ne déclenchent aucun envoi rétroactif, et les comptes supprimés sont exclus.

Les routes utiles sont `/`, `/settings`, `/admin`, les écrans de connexion et récupération de compte, et `/api/auth/*`.

## Limites de l’authentification

Les routes HTTP utilisent le [rate limiter de Better Auth](https://better-auth.com/docs/concepts/rate-limit), activé en développement et en production. Les compteurs sont persistés dans la table `rateLimit` du composant Better Auth, par IP et par route. Les adresses IPv6 sont normalisées et regroupées par sous-réseau `/64` ; les adresses IPv4 mappées en IPv6 partagent le quota de leur équivalent IPv4. Les règles sont définies dans `packages/backend/convex/authRateLimits.ts`.

| Route | Maximum | Fenêtre |
| --- | --- | --- |
| Connexion email | 5 | 60 secondes |
| Connexion sociale | 10 | 60 secondes |
| Inscription | 3 | 60 secondes |
| Demande de réinitialisation et renvoi de vérification, chacune | 3 | 5 minutes |
| Réinitialisation et modification du mot de passe, chacune | 5 | 60 secondes |
| Changement d’email | 3 | 5 minutes |
| Autres routes | 100 | 10 secondes |

Les lectures de session (`/get-session`) et renouvellements JWT (`/convex/token`) sont exemptés pour préserver l’authentification en arrière-plan. Un dépassement renvoie HTTP **429** avec `X-Retry-After` en secondes ; le frontend affiche le message traduit de limitation. Les requêtes refusées ne prolongent pas l’attente.

Better Auth 1.4, compatible avec l’adaptateur installé, fournit une API de stockage `get`/`set`. La consommation relit et incrémente le compteur dans une seule mutation Convex pour empêcher les dépassements sous concurrence. Aucune migration de schéma ni mise à niveau de Better Auth n’est nécessaire.

### IP des visiteurs sur Cloudflare

Les [sous-requêtes Worker entre zones Cloudflare](https://developers.cloudflare.com/fundamentals/reference/http-headers/#cf-connecting-ip) peuvent remplacer l’IP du visiteur par une adresse du Worker. Le serveur TanStack Start signe donc l’IP reçue de l’edge avant de transmettre la requête à Convex. Convex vérifie la signature, la route, la méthode et un horodatage de moins d’une minute avant d’utiliser cette IP. Les en-têtes du navigateur sont remplacés ; une IP transmise sans signature valide est refusée. Les appels directs à Convex utilisent l’en-tête `CF-Connecting-IP` de son edge.

Avant le déploiement Cloudflare, créer un secret dédié **`AUTH_PROXY_SECRET`** de 32 caractères minimum, distinct de `BETTER_AUTH_SECRET`, et configurer la même valeur dans les **bindings secrets du Worker** et dans les **variables du déploiement Convex**. Ce secret reste exclusivement côté serveur : ne jamais le préfixer par `VITE_` ni copier les secrets backend dans les variables publiques du frontend. Sans ce binding, les requêtes d’authentification reçues depuis Cloudflare renvoient 503. Le plugin Vite exécute aussi le serveur de développement dans Miniflare, qui ajoute un en-tête `CF-Connecting-IP` simulé : ce mode local nécessite donc lui aussi le secret partagé avec son déploiement Convex. Le développement local direct, sans runtime Cloudflare, ne requiert pas de signature.

Le serveur lit ce binding via `process.env` : activer la [compatibilité Node.js de Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/nodejs/process/#processenv) avec une date de compatibilité récente (au moins `2025-04-01`) et sans désactiver `nodejs_compat_populate_process_env`.

## Limites des opérations Convex

Le composant [Convex Rate Limiter](https://www.convex.dev/components/rate-limiter) est enregistré dans `packages/backend/convex/convex.config.ts`. Les quotas sont définis dans `packages/backend/convex/lib/rateLimits.ts`, persistés par le composant et appliqués côté serveur par ID utilisateur authentifié. Ils sont partagés entre toutes les pages et les sessions du compte. Chaque quota utilise un seau de jetons : la capacité fixe le nombre d’opérations rapprochées et le débit indique la vitesse de recharge.

| Opération | Débit de recharge | Capacité |
| --- | --- | --- |
| Ouverture d’un paiement | 10 / minute | 3 |
| Actualisation d’un paiement | 20 / minute | 5 |
| Nouvelle réservation | 5 / 10 minutes | 5 |
| Modification d’un mot | 20 / minute | 10 |
| Modération | 60 / minute | 30 |
| Notifications lues, seules ou en lot | 60 / minute | 30 |

Les actions de paiement consomment leur quota avant de réserver ou d’appeler Polar, même en cas d’échec ultérieur. Les mutations consomment leur quota dans la même transaction que leurs modifications. Réutiliser une réservation existante ne consomme pas une nouvelle réservation.

Un dépassement renvoie l’erreur structurée `RateLimited` du composant, avec le nom du quota et `retryAfter` en millisecondes. L’interface affiche le message traduit « Trop de demandes. Réessayez dans un instant. ». Les lectures publiques, les webhooks signés et les tâches internes de récupération restent disponibles. Le composant est installé sur le déploiement lors du prochain `bun run dev:server` ou déploiement Convex ; aucune variable d’environnement supplémentaire n’est nécessaire.

## Pages légales

Le footer commun aux pages publiques donne accès à `/mentions-legales` et `/conditions-utilisation`. Les textes français et anglais sont dans `apps/web/src/locales`, avec TOMA comme éditeur, `contact@thepage.com` comme contact et Cloudflare comme hébergeur. Les conditions reflètent le fonctionnement actuel du prototype et ses paiements de test.

L’adresse postale de l’éditeur et les éventuelles informations d’immatriculation restent à compléter selon son statut avant publication. Références : [mentions obligatoires — Service Public](https://entreprendre.service-public.gouv.fr/vosdroits/F37351?lang=fr), [coordonnées de Cloudflare](https://www.cloudflare.com/website-terms/), [téléphone de Cloudflare — rapport annuel](https://www.sec.gov/Archives/edgar/data/1477333/000147733326000026/cloud-20251231.htm), [cookies — CNIL](https://www.cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi).

## Vérification

```bash
bun run test
bun run check-types
bun run build
```

Les tests Vitest/Convex utilisent une base en mémoire et des appels Polar simulés : ils ne créent ni utilisateur réel, ni paiement, ni mot sur le déploiement distant. Ils vérifient l’isolation des pages, la migration de World, les retours après connexion et paiement, les prix indépendants, la propriété, l’édition, les réservations concurrentes, la modération, les signatures invalides, les commandes incohérentes et la récupération des paiements/remboursements. Les tests de limitation vérifient les quotas par utilisateur, leur partage entre pages et points d’entrée, leur recharge et le blocage avant les effets de bord.

Les tests HTTP Better Auth couvrent aussi la persistance entre invocations, l’isolation des IP, les appels simultanés, le délai de reprise et l’absence d’email ou de token supplémentaire après un refus. Les tests du proxy Cloudflare vérifient les signatures, leur expiration et le rejet des en-têtes modifiés.

Pour valider l’intégration réelle après configuration : acheter une place avec les moyens de paiement de test documentés par Polar ; vérifier `order.paid`, le mot publié et l’augmentation d’un euro ; racheter avec un second compte ; vérifier que le premier compte ne peut plus modifier la place. Tester aussi un checkout abandonné, un événement rejoué et un paiement après expiration. N’utiliser aucune carte réelle dans ce prototype.

## Structure

- `apps/web/src/routes` : routes TanStack Start ; `routeTree.gen.ts` est régénéré par le routeur.
- `apps/web/src/components` : page, panneaux, authentification et composants shadcn.
- `packages/backend/convex` : schéma, propriété, paiements et modération ; `_generated` est généré par Convex.
- `packages/backend/tests` : tests du métier et de l’intégration de paiement.
