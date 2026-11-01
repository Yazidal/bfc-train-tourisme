# TER Bourgogne-Franche-Comté — gares, lieux & temps de trajet

Vite + React 19 + TypeScript + Leaflet. Carte des gares TER de
Bourgogne-Franche-Comté, lieux touristiques DATAtourisme à proximité, temps de
train (API SNCF → GTFS → estimation) et temps d'accès à pied / à vélo.

## Démarrage

```bash
npm install
npm run data:build   # régénère public/data depuis ../GTFS + data/*.csv
npm run dev          # http://localhost:5173
```

`npm run build` exécute `tsc --noEmit` puis `vite build`.

## Architecture

```
src/
  domain/      types et constantes métier purs (aucun React, aucun fetch)
  services/    accès aux données
    reference.ts   gares, communes, durées GTFS, contour BFC (petits JSON)
    pois.ts        catalogue de lieux (5 Mo, chargé à l'ouverture de la carte)
    train/         sncf.ts (API) → static.ts (GTFS/estimation) → index.ts (chaîne)
    routing.ts     OSRM piéton/vélo avec repli vol d'oiseau
    http.ts        wrapper fetch typé
  hooks/       useReferenceData, usePois, useTrainTime
  features/    un dossier par story (home, explore, station-search, …)
  map/         MapCanvas + layers (Region, Station, Poi, Route, Reachability)
  lib/         geo, hull, format (fonctions pures)
server/        proxy dev pour l'API SNCF (token côté serveur)
scripts/       pipeline Python (GTFS + DATAtourisme → public/data)
```

Règle : un composant ne fait jamais `fetch`. Il passe par un service. Le jour où
l'API DATAtourisme remplace le JSON statique, seul `services/pois.ts` change.

## API SNCF (horaires réels)

Le token ne doit **jamais** être exposé au navigateur. Le proxy Vite expose
`GET /api/sncf/journeys?from=<UIC>&to=<UIC>` et appelle l'API Navitia.

```bash
cp .env.example .env
# puis renseigner SNCF_API_TOKEN
npm run dev
```

- `SNCF_API_BASE` / `SNCF_API_COVERAGE` : par défaut `https://api.sncf.com/v1` et `sncf`.
- `SNCF_API_AUTH_MODE` : `basic` (api.sncf.com) ou `bearer` (api.navitia.io).
- Sans token, le proxy répond 503 et l'app bascule automatiquement sur le GTFS
  puis sur l'estimation par distance. La méthode utilisée est affichée à l'écran.

`VITE_TRAIN_API=false` désactive l'appel live ; `VITE_ROUTING=false` désactive
OSRM. Les trajets avec correspondance sont exclus (MVP, `max_nb_transfers=0`).

### Brancher l'API quand le jeton arrive

Le portail SNCF étant indisponible, l'emplacement est déjà prêt. Deux étapes :

```bash
# 1. .env
SNCF_API_TOKEN=votre_jeton
SNCF_API_MOCK=false

# 2. redémarrer Vite (les variables serveur sont lues au démarrage)
npm run dev
```

Rien d'autre à modifier : `services/train/sncf.ts` appelle déjà
`/api/sncf/journeys`, et l'interface bascule automatiquement de « repli GTFS /
estimation » à « API SNCF connectée ».

### Tester sans jeton (mode simulation)

```bash
SNCF_API_MOCK=true npm run dev
```

Le proxy renvoie trois départs directs synthétiques (durée stable par couple de
gares). Cela permet de valider la carte, les badges et la liste des prochains
départs avant l'ouverture de l'API. `SNCF_API_MOCK` ne doit jamais être activé
en production.

### Endpoints locaux

| Endpoint | Réponse |
|---|---|
| `GET /api/sncf/status` | `{ mode: "live" \| "mock" \| "unconfigured", configured, mock, base, coverage }` |
| `GET /api/sncf/journeys?from=<UIC>&to=<UIC>` | `{ source, fetchedAt, journeys[] }` |

`status` ne contient jamais le jeton. L'interface affiche un badge
« API SNCF connectée / simulée / en attente du jeton » en haut de la carte.

## Données

`public/data` est généré et versionné (l'app doit fonctionner sur GitHub Pages) :

| Fichier | Contenu | Source |
|---|---|---|
| `stations.json` | 196 gares BFC (`uic`, `trigram`, `insee`) | GTFS SNCF |
| `towns.json` | 1 039 communes → gare la plus proche | DATAtourisme |
| `durations.json` | 3 075 couples de gares (durée directe min.) | GTFS `stop_times` |
| `pois.json` | 15 089 lieux (thème + sous-catégorie), 3,9 Mo | `data/BFC.csv` |
| `bfc-boundary.geojson` | contour régional (sert aussi de masque) | IGN/admin |

`data/BFC.csv` est l'extrait DATAtourisme brut : **34 496 POIs**, 8 colonnes
(`Nom_du_POI`, `Latitude`, `Longitude`, `Adresse_postale`, `Code_postal`,
`commune`, `grande_categorie`, `petite_categorie`). `prepare_data.py` ne
conserve que les POIs **à ≤ 5 km d'une gare et dans le polygone BFC**
(15 089 après dédoublonnage), car au-delà aucun mode d'accès (vélo = 5 km max)
ne pourrait les afficher. Les 12 valeurs de `grande_categorie` correspondent
exactement aux thèmes de l'interface ; aucune n'est ignorée.

Chaque POI publié contient :

- `id` = hash stable `nom + coordonnées` (ne bouge pas si le CSV est ré-exporté) ;
- `themes` = famille DATAtourisme (filtres) ;
- `subCategory` = classe la plus précise de `petite_categorie`, traduite en
  français (« Château », « Musée », « Restaurant », « Camping »…) ;
- `address`, `commune` ;
- `rating` / `ratingCount` / `ratingSource` si `data/ratings.csv` est fourni.

Les champs bruts `datatourisme` et `themeBits` ne sont **pas** publiés : ils
n'étaient utilisés nulle part et représentaient 1,4 Mo du fichier.

Les doublons stricts (même nom + mêmes coordonnées) sont supprimés : 82 lignes.
13 POIs hors du polygone BFC sont également écartés.

## Photos et avis

- **Photos** : au chargement d'une carte, l'app interroge l'API Wikipédia FR
  (résumé + vignette) ; la fiche « Plus de détails » charge en plus une galerie
  Wikimedia Commons. Aucune clé, CORS ouvert (`origin=*`), requêtes limitées à
  4 en parallèle et mises en cache par POI.
- **Avis** : le filtre « Avis Google » lit `rating` dans `pois.json`. Pour
  l'alimenter, déposer `data/ratings.csv` avec les colonnes
  `id,rating,rating_count,source` (l'`id` est celui de `pois.json`), puis
  relancer `npm run data:build`. Sans ce fichier, le filtre est désactivé.
  Pour une démo : `VITE_RATINGS_MOCK=true npm run dev` (notes simulées,
  clairement signalées à l'écran).

## Choisir un trajet

Deux champs **Départ** et **Destination** avec autocomplétion (gares + communes →
gare la plus proche), un bouton d'inversion ⇅, un effacement × par champ et ◎
pour utiliser la position GPS comme départ. Le clic sur la carte remplit le
premier champ vide (départ, puis destination) ; une fois les deux remplis, il ne
fait que sélectionner la gare pour explorer ses lieux — le trajet n'est jamais
modifié silencieusement.

## Périmètre BFC

`prepare_data.py` filtre les POIs sur le polygone régional, et la carte applique
`maxBounds` sur ce même contour : impossible de sortir de la région au pan/zoom.


`npm run data:build` = `scripts/prepare_data.py` (canonique). Les fichiers
bruts GTFS (`../stop_times.txt`, etc.) ne sont pas dans ce dépôt : pour
régénérer ailleurs, fournir l'export GTFS à côté du dossier de l'app.

## Limites connues

- Zone « temps de train max » = envelope convexe des gares atteignables, pas une
  isochrone réelle.
- POIs chargés en un bloc (3,9 Mo) : à remplacer par un appel API par gare/rayon.
- Photos et résumés viennent de Wikipédia/Commons (proxy du lieu le plus proche) :
  ce n'est pas une photo officielle de chaque POI, et certains lieux n'en ont pas.
- Sans `data/ratings.csv`, le filtre « Avis » est inactif.
- Pas encore de routeur d'URL (`/explore?depart=…&arrivee=…`) : l'état est local.
- Le proxy SNCF fonctionne en `dev`/`preview`. Sur un hébergement statique
  (GitHub Pages), `/api/sncf/journeys` doit être déployé comme fonction
  serverless, sinon le repli GTFS/estimation s'applique.
