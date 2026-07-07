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

> ⚠️ **État du projet : ébauche initiale / travail en cours.** Cette version met en place le
> squelette de l'adaptateur (cycle de vie, objets de base, modèle de configuration et les fondations
> du verrouillage de sécurité). Le moteur de commande, les backends matériels et les fonctions de
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

| Objet | Type | Rôle | Description |
|-------|------|------|-------------|
| `info.connection` | boolean | `indicator.connected` | L'adaptateur fonctionne / configuration valide |
| `control.enabled` | boolean (accessible en écriture) | `switch.enable` | Activation principale (commande) |
| `safety.interlockActive` | boolean | `indicator.alarm` | Verrouillage de sécurité actuellement actif |

D'autres points de données (par point d'aération, groupes, capteurs, sécurité et statistiques) sont
ajoutés au fur et à mesure de l'implémentation des fonctions correspondantes ; chaque nouvel état
sera documenté ici.

## 7. Feuille de route

Voir [PROJECT_PLAN.md](../../PROJECT_PLAN.md) pour le plan d'implémentation complet, basé sur des
étapes (moteur de commande, backends HAL, firmware ESP32, surveillance, couplage au feeder, mode
hivernal et l'adaptateur de widgets vis-2 qui suivra).

---

📖 [Documentation principale (anglais)](../../README.md)
