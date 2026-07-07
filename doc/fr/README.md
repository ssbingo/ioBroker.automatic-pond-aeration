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

> ⚠️ **État du projet : travail en cours.** Le modèle de configuration et le modèle complet des
> points de données sont en place : l'adaptateur valide ta configuration et crée (et nettoie) tous
> ses objets en conséquence. Le moteur de commande, les backends matériels et les fonctions de
> surveillance sont ajoutés étape par étape. Elle n'est pas encore destinée à un usage en production.

---

## Table des matières

1. [Ce que fait l'adaptateur](#1-ce-que-fait-ladaptateur)
2. [Concept de sécurité](#2-concept-de-sécurité)
3. [Prérequis](#3-prérequis)
4. [Installation](#4-installation)
5. [Aperçu de la configuration](#5-aperçu-de-la-configuration)
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

Les vannes et la pompe peuvent être pilotées soit via des **états ioBroker existants** (de n'importe
quel adaptateur qui expose les commutateurs), soit **directement sur un ESP32** exécutant le firmware
compagnon.

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
* Une ou plusieurs vannes accessibles en tant qu'états ioBroker, ou un ESP32 avec le firmware
  compagnon.

## 4. Installation

Installe l'adaptateur depuis l'admin ioBroker (ou, en phase de développement, depuis le dépôt GitHub)
et crée une instance. Ouvre les paramètres de l'instance pour la configurer.

## 5. Aperçu de la configuration

La page de configuration s'étoffe au fil des étapes. Sections prévues : général/backend, points
d'aération, commande (planning/round-robin/groupes), capteurs, astro & emplacement, couplage au
feeder, sécurité et notifications. Voir [PROJECT_PLAN.md](../../PROJECT_PLAN.md) pour la conception
complète.

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

**Statistiques**

| Objet | Type | Rôle | Description |
|-------|------|------|-------------|
| `statistics.compressorRuntimeTodayH` | number | `value` | Durée de fonctionnement du compresseur aujourd'hui (heures) |
| `statistics.switchCyclesToday` | number | `value` | Cycles de commutation des vannes aujourd'hui |

Lorsqu'un point, un groupe ou un capteur est retiré de la configuration, ses objets sont nettoyés
automatiquement.

## 7. Feuille de route

Voir [PROJECT_PLAN.md](../../PROJECT_PLAN.md) pour le plan d'implémentation complet, basé sur des
étapes (moteur de commande, backends HAL, firmware ESP32, surveillance, couplage au feeder, mode
hivernal et l'adaptateur de widgets vis-2 qui suivra).

---

📖 [Documentation principale (anglais)](../../README.md)
