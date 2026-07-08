![Logo](../../admin/automatic-pond-aeration.png)
# ioBroker.automatic-pond-aeration

<p align="center">
  <a href="https://www.buymeacoffee.com/ssbingo"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=ssbingo&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" /></a>
</p>

## Adaptateur automatic-pond-aeration pour ioBroker

Cet adaptateur **commande et surveille un système d'aération de bassin**. Une pompe à air/un
compresseur envoie de l'air à travers des vannes (électrovannes) vers **jusqu'à 8 points d'aération**
dans le bassin. L'adaptateur commute ces vannes selon un **planning horaire**, un **cycle en rotation
(round-robin)** ou un **programme de groupes**, et protège la pompe par un **verrouillage de sécurité
(interlock)** : tant que la pompe fonctionne, au moins une vanne reste toujours ouverte – sinon la
**vanne de secours** est ouverte et (si la pompe est disponible comme point de données) la pompe est
arrêtée.

En option, il peut surveiller l'**oxygène dissous**, la **température de l'air et de l'eau** ainsi
que la **pression**, calculer des **heures astronomiques** à partir de ta **géolocalisation**,
piloter le matériel **directement sur un ESP32** (sans instance ioBroker supplémentaire) et mettre en
pause certains points d'aération pendant la distribution de nourriture lorsque
[ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder) est installé.

> 🛑 **AVERTISSEMENT — STADE DE DÉVELOPPEMENT, BIEN-ÊTRE ANIMAL (à lire).**
> Cet adaptateur est **encore en développement actif et n'est PAS encore validé pour un
> fonctionnement sans surveillance.** Il commande un **système de survie pour des animaux vivants** –
> un dysfonctionnement, une mauvaise configuration ou un bug peut arrêter l'aération et **mettre en
> danger la santé et la vie de tes poissons et du reste de la vie du bassin** (manque d'oxygène,
> absence de trou hors gel en hiver, une pompe fonctionnant contre des vannes fermées). **Ne
> l'utilise pas sans contrôle :** avant tout fonctionnement sans surveillance, **observe-le de près
> et vérifie chaque fonction** sur ton propre matériel pendant une durée significative, et garde en
> place une aération/sécurité indépendante et éprouvée. **Utilisation à tes propres risques.**
> *(Cet avis reste en vigueur jusqu'à révocation explicite.)*

> ⚠️ **État du projet.** Entièrement implémenté et configurable depuis l'admin : la commande des
> vannes (planning, cycle en rotation round-robin, groupes), le **verrouillage de sécurité** contre le
> dead-heading, la **surveillance** (oxygène, température air/eau, pression avec alarmes), les
> **heures astronomiques & la géolocalisation**, le **couplage au feeder**, le **mode hiver /
> hors-gel**, la **boucle fermée d'oxygène**, les **notifications via un adaptateur de messagerie**,
> les **statistiques de fonctionnement**, un **mode de test à blanc (dry-run)**, les **boutons de
> forçage** par point et le backend matériel **ESP32** direct (communique en HTTP avec le
> [firmware de référence](https://github.com/ssbingo/pond-aeration-esp32-firmware) séparé ; le
> firmware est encore en cours de finalisation). Le backend par défaut pilote tes vannes et ta pompe
> via des états ioBroker existants, de sorte que n'importe quelle carte à relais fonctionne.

> 📘 **Manuel complet pas à pas (PDF, pour débutants — avec schémas de câblage, FAQ et
> dépannage) :** English → [../../docs/manual/pond-aeration-manual.en.pdf](../../docs/manual/pond-aeration-manual.en.pdf) ·
> Deutsch → [../../docs/manual/pond-aeration-manual.de.pdf](../../docs/manual/pond-aeration-manual.de.pdf)
> (source et build dans [../../docs/manual/](../../docs/manual/)).

---

## Table des matières

1. [Ce que fait l'adaptateur](#1-ce-que-fait-ladaptateur)
2. [Concept de sécurité](#2-concept-de-sécurité)
3. [Prérequis](#3-prérequis)
4. [Installation](#4-installation)
5. [Configuration](#5-configuration)
6. [Objets / points de données](#6-objets--points-de-données)
7. [Feuille de route](#7-feuille-de-route)

---

## 1. Ce que fait l'adaptateur

Une aération de bassin distribue l'air d'une seule pompe vers plusieurs diffuseurs/pierres à air.
Quels points reçoivent de l'air est décidé par des **électrovannes**. Cet adaptateur décide **quand**
chaque vanne s'ouvre :

* **Planning** – ouvrir un point/un groupe pendant des plages horaires configurées par jour de la
  semaine.
* **Cycle en rotation (round-robin)** – parcourir les points à tour de rôle, chacun ouvert pendant
  une durée de maintien configurable.
* **Groupes** – commander plusieurs points ensemble ; il ne peut **jamais y avoir plus de groupes que
  de points**.

Les vannes et la pompe sont pilotées via des **états ioBroker existants** (de n'importe quel
adaptateur qui expose les commutateurs). Un backend matériel **ESP32** direct (sans instance ioBroker
supplémentaire) est prévu.

## 2. Concept de sécurité

Un compresseur d'air ne doit **jamais fonctionner contre des vannes entièrement fermées** (dead-
heading) – cela provoque une surpression et peut endommager la pompe. C'est pourquoi :

* Tant que la pompe fonctionne, **au moins une vanne reste toujours ouverte** (minimum configurable).
* Si cela ne peut pas être garanti, la **vanne de secours est ouverte** et, si la pompe est
  commandable, la **pompe est arrêtée**.
* La commutation des vannes utilise le principe **make-before-break** (la vanne suivante s'ouvre
  avant que la précédente ne se ferme), de sorte qu'il n'y a jamais un instant où toutes les vannes
  sont fermées.

> 💡 **Recommandation de câblage :** utilise une vanne de secours **normalement ouverte (NO)** afin
> qu'elle s'ouvre en cas de coupure de courant (fail-safe). Lorsque le matériel fonctionne sur un
> ESP32, le même verrouillage s'exécute aussi localement sur l'appareil, de sorte qu'une panne réseau
> ou ioBroker ne peut pas endommager la pompe.

## 3. Prérequis

* Node.js ≥ 22
* js-controller ≥ 6.0.11, admin ≥ 7.6.20
* Une ou plusieurs vannes accessibles en tant qu'états ioBroker (p. ex. un adaptateur de relais/prise
  connectée).

## 4. Installation

Installe l'adaptateur depuis l'admin ioBroker (ou, en phase de développement, depuis le dépôt GitHub)
et crée une instance. Ouvre les paramètres de l'instance pour la configurer.

## 5. Configuration

La page de paramètres est organisée en onglets. Tu n'es pas obligé de tout remplir – seulement les
parties que tu utilises.

### Général
- **Activation principale** – l'interrupteur marche/arrêt de tout l'adaptateur. À l'arrêt, rien n'est
  commandé.
- **Test à blanc (journal uniquement, ne commute pas le matériel)** – tout le moteur de commande
  s'exécute et les points de données se mettent à jour, mais les commandes de vannes/pompe sont
  uniquement écrites dans le journal (`[DRY-RUN] would …`) au lieu des états réels. Idéal pour la mise
  en service et pour tester une configuration avant de la câbler.
- **Backend matériel** – `États ioBroker existants` (par défaut) pilote tes vannes/ta pompe via les
  états d'autres adaptateurs. `ESP32 (direct)` communique en HTTP avec le
  [firmware de référence](https://github.com/ssbingo/pond-aeration-esp32-firmware) sur un Waveshare
  ESP32-S3-POE-ETH-8DI-8RO — définis le **host/IP** et associe le **relais de la vanne de secours** et
  le **relais de la pompe** (0–7) ; les points d'aération utilisent le canal de relais défini par
  point. L'adaptateur envoie une configuration de sécurité et un battement (heartbeat) pour que la
  sécurité intégrée à l'appareil du firmware protège le bassin même si ioBroker est hors service.
  - **Horaire autonome (fonctionne sans ioBroker)** *(ESP32 uniquement, facultatif)* – lorsqu'il est
    activé, l'adaptateur envoie aussi tes horaires à l'appareil ; si la connexion est perdue,
    l'ESP32 continue de les exécuter lui-même à l'aide de son horloge NTP (le verrouillage de
    sécurité dead-head reste actif). La séquence cyclique reste gérée par l'adaptateur.
- **Intervalle d'interrogation (s)** – à quelle fréquence l'état du backend est interrogé (p. ex.
  `30`).

### Points d'aération
Le cœur de la configuration. Ajoute **jusqu'à 8** points ; chaque point est une vanne. Par point :
- **Nom** – p. ex. `Pier`, `Deep zone`.
- **Activé** – inclure ce point dans la commande.
- **Backend** – `ioBroker` (un état étranger) ou `ESP32` (un canal de relais, prévu).
- **État de vanne / canal** – pour le backend ioBroker, choisis l'état commutateur qui ouvre la vanne
  (via l'explorateur d'objets) ; pour ESP32, le numéro de canal.
- **Bouton de forçage** *(optionnel)* – un bouton-poussoir physique par point (p. ex. une entrée
  numérique d'un ESP32, ou n'importe quel état booléen). Il fonctionne comme un **inverseur
  (toggle)** : une pression force le point **en marche, avec priorité sur la commande automatique**
  (planning/séquence/hiver/oxygène) et même sur une pause du feeder — *seuls l'interrupteur principal
  ou un déclenchement de sécurité le supplantent*. Appuie de nouveau pour le relâcher. (D'autres
  modes de bouton sont prévus ; le champ est préparé pour eux.) Un bouton n'est disponible que pour une **vanne d'aération** — un point situé sur le canal de relais ESP32 de la **pompe** ou de la **vanne de secours** ne peut pas en avoir (l'option est grisée). Avec le backend ESP32, un bouton pressé **sur l'appareil** est répercuté dans ioBroker (`aeration.point.<n>.buttonOn`) et obtient la même priorité.

### Groupes
Regroupe des points pour les commuter ensemble (p. ex. un bouton ouvre plusieurs diffuseurs). Donne
un nom au groupe et coche ses points membres. **Il ne peut jamais y avoir plus de groupes que de
points.**

### Commande
- **Cycle en rotation (round-robin)** – parcourir les points à tour de rôle, chacun ouvert pendant la
  **durée de maintien** (secondes).
  - **Séquence (points et groupes)** – définir éventuellement un **cycle ordonné d'étapes**, où chaque
    étape cible un seul **point ou un groupe entier** et peut porter sa propre durée de maintien. Cela
    permet d'exécuter p. ex. *groupe 1 → groupe 3 → point 1 → …* et de **mélanger** librement points et
    groupes. Réordonne les étapes avec les flèches haut/bas dans l'admin. Laisse la séquence vide pour
    revenir au round-robin simple sur tous les points.
- **Plannings** – ouvrir des points/groupes sélectionnés pendant une plage horaire par jour de
  semaine. **De**/**À** se choisissent via un **sélecteur d'horloge** (heure/minute, 24 h ; les plages
  de nuit comme `22:00`–`06:00` sont prises en charge). Un planning actif est **prioritaire sur le
  round-robin / la séquence**.
- **Mode hiver / hors-gel** – pendant la saison configurée (**Début**/**Fin** choisis via un
  **calendrier** — seuls le **jour et le mois** comptent, récurrent chaque année, p. ex. 1 nov – 15 mars,
  à cheval sur le nouvel an) les points sélectionnés sont forcés
  en marche afin de maintenir un trou hors gel. Coche éventuellement **Seulement quand il fait froid
  (protection antigel)** et fixe un **seuil de température de l'air** pour que le bassin ne soit aéré
  que lorsqu'il gèle réellement (cela nécessite la surveillance de la température de l'air). Laisse
  **Points maintenus ouverts** vide pour aérer tout le bassin. Le mode hiver s'exécute dans le mode de
  fonctionnement `auto` et, comme tout programme, cède la priorité au verrouillage de sécurité et à
  une pause du feeder.

### Capteurs
Surveillance facultative. Pour chaque capteur, coche **Activé** et choisis l'**état source** :
- **Oxygène dissous** – avec un seuil bas (déclenche `sensors.oxygenAlarm`), une consigne et une
  hystérésis ; le **% de saturation** en oxygène est calculé à partir de la température de l'eau.
  - **Boucle fermée d'oxygène** – lorsqu'elle est activée, l'adaptateur **force l'aération en marche**
    tant que l'oxygène est sous le seuil bas et la maintient jusqu'à ce qu'il remonte à la consigne
    (ou `low + hysteresis` si aucune consigne n'est définie). Laisse **Points boostés** vide pour
    booster tout le bassin. Comme le mode hiver, la boucle s'exécute dans le mode `auto` et cède la
    priorité à la sécurité et aux pauses du feeder.
- **Température air/eau**.
- **Pression** – avec min/max (hors plage, déclenche `sensors.pressureAlarm`).

### Emplacement
Nécessaire pour les heures astronomiques (lever/coucher du soleil/nuit).
- **Source d'emplacement** – `Emplacement système ioBroker` (utilise les coordonnées de ton système)
  ou `Emplacement personnalisé`. Pour un emplacement personnalisé, saisis une adresse et appuie sur
  **Rechercher** (géocodée à la demande via OpenStreetMap/Nominatim) ou clique/fais glisser le
  marqueur sur la carte.

### Feeder
Mettre en pause des points sélectionnés pendant que
[ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder) distribue la
nourriture, afin qu'elle ne soit pas dispersée.
- Choisis l'**instance feeder** (détectée automatiquement) et coche les **commutateurs feeder** à
  surveiller.
- **Mode de durée** – `Mesurer` surveille le commutateur (pause = distribution + décalage, sans
  connaître à l'avance la durée de distribution) ; `Impulsion` utilise une durée de distribution fixe.
- **Décalage (s)** – pause supplémentaire après la fin de la distribution. **Il devrait être au moins
  égal au temps moyen dont les animaux ont besoin pour manger** (exemple : 15 s de distribution + 60 s
  de décalage ⇒ 75 s d'aération en pause).
- **Points concernés** – quels points se mettent en pause pendant la distribution.

### Sécurité
Chaque champ de cet onglet comporte une **explication dans l'admin** de ce qu'il fait et de son effet
— lis-les, car c'est l'onglet où une mauvaise valeur importe le plus.
- **Vannes ouvertes min. pendant que la pompe tourne** – la protection contre le dead-heading (par
  défaut `1`).
- **Intervalle du watchdog (s)** et **chevauchement make-before-break (s)**.
- **Pompe** – si elle est commandable (le verrouillage peut alors l'arrêter), son état et les durées
  min. de marche/arrêt contre les cycles trop courts.
- **Vanne de secours** – son état, si elle est **normalement ouverte** (fail-safe), le **type** de
  vanne (électrovanne ou vanne à bille motorisée) et, pour une vanne motorisée, son **temps de
  course**.

### Notifications
Active les notifications et choisis une **instance de messagerie** (n'importe quel adaptateur de type
`messaging`, p. ex. Telegram ou Pushover), puis **coche les événements** qui doivent envoyer un
message :
- **Verrouillage de sécurité** – lorsque le verrouillage contre le dead-heading se déclenche ou se relâche ;
- **Alarme d'oxygène** – lorsque l'oxygène dissous descend trop bas ou revient à la normale ;
- **Alarme de pression** – lorsque la pression sort de sa plage ou y revient.

À chaque front (déclenchement et relâchement), un court texte localisé est envoyé. Si aucun événement
n'est coché, rien n'est envoyé.

## 6. Objets / points de données

L'adaptateur crée ses points de données à partir de ta configuration. Espaces réservés : `<n>` =
index du point d'aération (0–7), `<g>` = index de groupe. Les objets marqués **(w)** sont des
commandes accessibles en écriture ; tous les autres sont des valeurs d'état en lecture seule mises à
jour par l'adaptateur.

**Général**

| Objet | Type | Rôle | Description |
|-------|------|------|-------------|
| `info.connection` | boolean | `indicator.connected` | L'adaptateur fonctionne / configuration valide |
| `info.backend` | string | `text` | Backend matériel actif (`iobroker` ou `esp32`) |
| `info.activeMode` | string | `text` | Mode de fonctionnement actuel |
| `info.dryRun` | boolean | `indicator` | Test à blanc actif (aucun matériel n'est commuté) |

**Commande (commandes accessibles en écriture)**

| Objet | Type | Rôle | Description |
|-------|------|------|-------------|
| `control.enabled` | boolean (w) | `switch.enable` | Activation principale |
| `control.mode` | string (w) | `text` | Mode de fonctionnement : `auto`, `manual` ou `off` |
| `control.allOff` | boolean (w) | `button` | Fermer toutes les vannes |
| `control.point.<n>.open` | boolean (w) | `switch` | Ouvrir manuellement la vanne du point `<n>` |
| `control.group.<g>.active` | boolean (w) | `switch` | Activer manuellement le groupe `<g>` |

**Points d'aération** (un canal par point configuré, nommé d'après le point)

| Objet | Type | Rôle | Description |
|-------|------|------|-------------|
| `aeration.point.<n>.valveState` | boolean | `indicator` | La vanne est ouverte |
| `aeration.point.<n>.active` | boolean | `indicator` | Le point est en cours d'aération |
| `aeration.point.<n>.buttonOn` | boolean | `indicator` | Bouton de forçage manuel actif (uniquement avec un bouton configuré) |
| `aeration.point.<n>.runtimeTodaySec` | number | `value` | Durée de fonctionnement aujourd'hui (secondes) |
| `aeration.point.<n>.runtimeTotalH` | number | `value` | Durée de fonctionnement totale (heures, pour la maintenance) |
| `aeration.point.<n>.lastChange` | number | `value.time` | Horodatage du dernier changement de vanne |
| `aeration.point.<n>.error` | string | `text` | Dernière erreur pour ce point |

**Groupes**

| Objet | Type | Rôle | Description |
|-------|------|------|-------------|
| `groups.<g>.members` | string | `json` | Indices des points membres |
| `groups.<g>.active` | boolean | `indicator` | Le groupe est actuellement actif |

**Sécurité**

| Objet | Type | Rôle | Description |
|-------|------|------|-------------|
| `safety.interlockActive` | boolean | `indicator.alarm` | Verrouillage de sécurité actuellement actif |
| `safety.emergencyValve` | boolean | `indicator` | La vanne de secours est ouverte |
| `safety.pumpRunning` | boolean | `indicator` | La pompe fonctionne |
| `safety.openValveCount` | number | `value` | Nombre de vannes ouvertes |
| `safety.lastTripReason` | string | `text` | Raison du dernier déclenchement du verrouillage |

**Capteurs** (créés uniquement lorsque la surveillance correspondante est activée)

| Objet | Type | Rôle | Description |
|-------|------|------|-------------|
| `sensors.oxygen` | number | `value` | Oxygène dissous (mg/l) |
| `sensors.oxygenSaturation` | number | `value` | Saturation en oxygène (%) |
| `sensors.oxygenAlarm` | boolean | `indicator.alarm` | Oxygène sous le seuil bas |
| `sensors.oxygenBoostActive` | boolean | `indicator` | La boucle fermée d'oxygène force l'aération en marche (uniquement lorsque la boucle est activée) |
| `sensors.airTemperature` | number | `value.temperature` | Température de l'air (°C) |
| `sensors.waterTemperature` | number | `value.temperature` | Température de l'eau (°C) |
| `sensors.pressure` | number | `value.pressure` | Pression du système (bar) |
| `sensors.pressureAlarm` | boolean | `indicator.alarm` | Pression hors plage |

**Astronomie & emplacement**

| Objet | Type | Rôle | Description |
|-------|------|------|-------------|
| `astro.sunrise` / `astro.sunset` / `astro.solarNoon` | string | `text` | Heures solaires pour l'emplacement |
| `astro.isNight` | boolean | `indicator` | Il fait actuellement nuit |
| `location.latitude` / `location.longitude` | number | `value.gps.*` | Coordonnées résolues |
| `location.resolvedAddress` | string | `text` | Adresse résolue |

**Couplage au feeder** (créé uniquement lorsque le couplage au feeder est activé)

| Objet | Type | Rôle | Description |
|-------|------|------|-------------|
| `feeder.pauseActive` | boolean | `indicator` | Aération en pause pour la distribution de nourriture |
| `feeder.pauseUntil` | number | `value.time` | Pause active jusqu'à |
| `feeder.lastFeedStart` | number | `value.time` | Dernier début de distribution |

**Mode hiver / hors-gel** (créé uniquement lorsque le mode hiver est activé)

| Objet | Type | Rôle | Description |
|-------|------|------|-------------|
| `winter.active` | boolean | `indicator` | Le mode hiver force actuellement l'aération en marche |
| `winter.frostActive` | boolean | `indicator` | La protection antigel est engagée (il fait assez froid) |

**Statistiques**

| Objet | Type | Rôle | Description |
|-------|------|------|-------------|
| `aeration.point.<n>.runtimeTodaySec` | number | `value` | Durée de fonctionnement du point `<n>` aujourd'hui (secondes) |
| `aeration.point.<n>.runtimeTotalH` | number | `value` | Durée de fonctionnement totale du point `<n>` (heures) |
| `statistics.compressorRuntimeTodayH` | number | `value` | Durée de fonctionnement du compresseur aujourd'hui (heures) |
| `statistics.switchCyclesToday` | number | `value` | Cycles de commutation des vannes aujourd'hui |

Lorsqu'un point, un groupe ou un capteur est retiré de la configuration, ses objets sont nettoyés
automatiquement.

## 7. Feuille de route

Terminé : interface de configuration, commande des vannes (planning/round-robin/groupes), le
verrouillage de sécurité contre le dead-heading, la surveillance, l'astro & la géolocalisation, le
couplage au feeder, le mode hiver / hors-gel, la boucle fermée d'oxygène, les notifications, les
statistiques de fonctionnement et le mode de test à blanc (dry-run). **Encore à venir :**

* l'achèvement du **[firmware de référence](https://github.com/ssbingo/pond-aeration-esp32-firmware)**
  pour le Waveshare ESP32-S3-POE-ETH-8DI-8RO — le backend ESP32 côté adaptateur est en place ; la base
  du firmware (Ethernet, relais, boutons sur entrées numériques, API HTTP/WS, sécurité intégrée à
  l'appareil, interface web adaptée aux mobiles sur le port 80) est livrée, les capteurs de référence
  (oxygène dissous, pression de la conduite d'air, température de l'eau — voir
  [dev/hardware/sensors.md](../../dev/hardware/sensors.md)) constituant l'étape suivante ;
* un **adaptateur de widgets vis-2** ultérieur pour l'exploitation et la surveillance.

Voir [PROJECT_PLAN.md](../../PROJECT_PLAN.md) pour le plan complet, basé sur des étapes.

---

📖 [Documentation principale (anglais)](../../README.md)
