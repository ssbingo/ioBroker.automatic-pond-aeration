![Logo](admin/automatic-pond-aeration.png)
# ioBroker.automatic-pond-aeration

[![NPM version](https://img.shields.io/npm/v/iobroker.automatic-pond-aeration.svg)](https://www.npmjs.com/package/iobroker.automatic-pond-aeration)
[![Downloads](https://img.shields.io/npm/dm/iobroker.automatic-pond-aeration.svg)](https://www.npmjs.com/package/iobroker.automatic-pond-aeration)
![Number of Installations](https://iobroker.live/badges/automatic-pond-aeration-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/automatic-pond-aeration-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.automatic-pond-aeration.png?downloads=true)](https://nodei.co/npm/iobroker.automatic-pond-aeration/)

**Tests:** ![Test and Release](https://github.com/ssbingo/ioBroker.automatic-pond-aeration/workflows/Test%20and%20Release/badge.svg)

---

<p align="center">
  <a href="https://www.buymeacoffee.com/ssbingo"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=ssbingo&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" /></a>
</p>

---

## automatic-pond-aeration adapter for ioBroker

This adapter **controls and monitors a pond aeration system**. An air pump/compressor feeds air
through valves (solenoids) to **up to 8 aeration points** in the pond. The adapter switches those
valves by a **time schedule**, a **cyclic round-robin**, or a **group program**, and it protects
the pump with a **safety interlock**: while the pump runs, at least one valve is always kept open –
otherwise the **emergency valve** is opened and (if the pump is available as a data point) the pump
is switched off.

Optionally it can monitor **dissolved oxygen**, **air and water temperature** and **pressure**,
compute **astronomical times** from your **geolocation**, drive the hardware **directly on an ESP32**
(no additional ioBroker instance required), and pause selected aeration points during feeding when
[ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder) is installed.

> ⚠️ **Project status: work in progress.** The configuration model and the complete data-point
> model are in place: the adapter validates your configuration and creates (and cleans up) all of
> its objects accordingly. The control engine, hardware backends and the monitoring features are
> being added milestone by milestone. It is not yet meant for production use.

> 🇩🇪 Deutsche Anleitung: [doc/de/README.md](doc/de/README.md) · other languages: see
> [Documentation](#documentation) at the bottom.

---

## Table of contents

1. [What the adapter does](#1-what-the-adapter-does)
2. [Safety concept](#2-safety-concept)
3. [Requirements](#3-requirements)
4. [Installation](#4-installation)
5. [Configuration overview](#5-configuration-overview)
6. [Objects / data points](#6-objects--data-points)
7. [Roadmap](#7-roadmap)

---

## 1. What the adapter does

A pond aeration distributes air from a single pump to several diffusers/air stones. Which points
receive air is decided by **solenoid valves**. This adapter decides **when** each valve opens:

* **Schedule** – open a point/group during configured weekday time windows.
* **Cyclic round-robin** – rotate through the points, each open for a configurable dwell time.
* **Groups** – control several points together; there can **never be more groups than points**.

The valves and the pump can be driven either through **existing ioBroker states** (from any adapter
that exposes the switches) or **directly on an ESP32** running the companion firmware.

## 2. Safety concept

An air compressor must **never run against fully closed valves** (dead-heading) – this causes
overpressure and can damage the pump. Therefore:

* While the pump runs, **at least one valve is always kept open** (configurable minimum).
* If that cannot be guaranteed, the **emergency valve is opened** and, if the pump is controllable,
  the **pump is switched off**.
* Valve switching uses **make-before-break** (the next valve opens before the previous one closes),
  so there is never a moment with all valves closed.

> 💡 **Wiring recommendation:** use a **normally-open (NO)** emergency valve so it opens on power
> loss (fail-safe). When the hardware runs on an ESP32, the same interlock also runs locally on the
> device, so a network or ioBroker outage cannot damage the pump.

## 3. Requirements

* Node.js ≥ 22
* js-controller ≥ 6.0.11, admin ≥ 7.6.20
* One or more valves reachable as ioBroker states, or an ESP32 with the companion firmware.

## 4. Installation

Install the adapter from the ioBroker admin (or, during development, from the GitHub repository)
and create an instance. Open the instance settings to configure it.

## 5. Configuration overview

The settings page grows with the milestones. Planned sections: general/backend, aeration points,
control (schedule/round-robin/groups), sensors, astro & location, feeder coupling, safety and
notifications. See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the full design.

## 6. Objects / data points

The adapter creates its data points from your configuration. Placeholders: `<n>` = aeration point
index (0–7), `<g>` = group index. Objects marked **(w)** are writable commands; all others are
read-only status values updated by the adapter.

**General**

| Object | Type | Role | Description |
|--------|------|------|-------------|
| `info.connection` | boolean | `indicator.connected` | Adapter running / configuration valid |
| `info.backend` | string | `text` | Active hardware backend (`iobroker` or `esp32`) |
| `info.activeMode` | string | `text` | Current operating mode |

**Control (writable commands)**

| Object | Type | Role | Description |
|--------|------|------|-------------|
| `control.enabled` | boolean (w) | `switch.enable` | Master enable |
| `control.mode` | string (w) | `text` | Operating mode: `auto`, `manual` or `off` |
| `control.allOff` | boolean (w) | `button` | Close all valves |
| `control.point.<n>.open` | boolean (w) | `switch` | Manually open the valve of point `<n>` |
| `control.group.<g>.active` | boolean (w) | `switch` | Manually activate group `<g>` |

**Aeration points** (one channel per configured point, named after the point)

| Object | Type | Role | Description |
|--------|------|------|-------------|
| `aeration.point.<n>.valveState` | boolean | `indicator` | Valve is open |
| `aeration.point.<n>.active` | boolean | `indicator` | Point is currently aerating |
| `aeration.point.<n>.runtimeTodaySec` | number | `value` | Runtime today (seconds) |
| `aeration.point.<n>.runtimeTotalH` | number | `value` | Total runtime (hours, for maintenance) |
| `aeration.point.<n>.lastChange` | number | `value.time` | Timestamp of the last valve change |
| `aeration.point.<n>.error` | string | `text` | Last error for this point |

**Groups**

| Object | Type | Role | Description |
|--------|------|------|-------------|
| `groups.<g>.members` | string | `json` | Member point indices |
| `groups.<g>.active` | boolean | `indicator` | Group is currently active |

**Safety**

| Object | Type | Role | Description |
|--------|------|------|-------------|
| `safety.interlockActive` | boolean | `indicator.alarm` | Safety interlock currently active |
| `safety.emergencyValve` | boolean | `indicator` | Emergency valve is open |
| `safety.pumpRunning` | boolean | `indicator` | Pump is running |
| `safety.openValveCount` | number | `value` | Number of open valves |
| `safety.lastTripReason` | string | `text` | Reason of the last interlock trip |

**Sensors** (only created when the corresponding monitoring is enabled)

| Object | Type | Role | Description |
|--------|------|------|-------------|
| `sensors.oxygen` | number | `value` | Dissolved oxygen (mg/l) |
| `sensors.oxygenSaturation` | number | `value` | Oxygen saturation (%) |
| `sensors.oxygenAlarm` | boolean | `indicator.alarm` | Oxygen below the low threshold |
| `sensors.airTemperature` | number | `value.temperature` | Air temperature (°C) |
| `sensors.waterTemperature` | number | `value.temperature` | Water temperature (°C) |
| `sensors.pressure` | number | `value.pressure` | System pressure (bar) |
| `sensors.pressureAlarm` | boolean | `indicator.alarm` | Pressure out of range |

**Astronomy & location**

| Object | Type | Role | Description |
|--------|------|------|-------------|
| `astro.sunrise` / `astro.sunset` / `astro.solarNoon` | string | `text` | Sun times for the location |
| `astro.isNight` | boolean | `indicator` | It is currently night |
| `location.latitude` / `location.longitude` | number | `value.gps.*` | Resolved coordinates |
| `location.resolvedAddress` | string | `text` | Resolved address |

**Feeder coupling** (only created when the feeder coupling is enabled)

| Object | Type | Role | Description |
|--------|------|------|-------------|
| `feeder.pauseActive` | boolean | `indicator` | Aeration paused for feeding |
| `feeder.pauseUntil` | number | `value.time` | Pause active until |
| `feeder.lastFeedStart` | number | `value.time` | Last feeding start |

**Statistics**

| Object | Type | Role | Description |
|--------|------|------|-------------|
| `statistics.compressorRuntimeTodayH` | number | `value` | Compressor runtime today (hours) |
| `statistics.switchCyclesToday` | number | `value` | Valve switch cycles today |

When a point, group or sensor is removed from the configuration, its objects are cleaned up
automatically.

## 7. Roadmap

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the complete, milestone-based implementation plan
(control engine, HAL backends, ESP32 firmware, monitoring, feeder coupling, winter mode and the
follow-up vis-2 widget adapter).

## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### 0.0.5 (2026-07-07)
* (ssbingo) Control engine: an arbiter drives the valves from the operating mode (`auto`/`manual`/`off`), time schedules, a cyclic round-robin and group activation (`control.mode`, `control.point.<n>.open`, `control.group.<g>.active`). Schedules take priority over the round-robin; valves switch make-before-break; the safety interlock runs on top of every result

### 0.0.4 (2026-07-07)
* (ssbingo) Dead-head safety interlock with a watchdog: while the pump runs, at least the configured minimum number of valves must stay open, otherwise the emergency valve is opened and (if controllable) the pump is stopped. Adds pure, unit-tested make-before-break and anti short-cycle helpers

### 0.0.3 (2026-07-07)
* (ssbingo) Hardware abstraction layer with an ioBroker backend: valves, pump and emergency valve are driven through existing ioBroker states (rule 1) and their status is mirrored into the data points; manual valve commands (`control.point.<n>.open`, `control.allOff`) are executed

### 0.0.2 (2026-07-07)
* (ssbingo) Configuration validation/normalization and the complete data-point model: all objects are created from the configuration and obsolete ones are cleaned up automatically
* (ssbingo) Enforced hard rule "never more groups than aeration points"; configurable emergency valve type (solenoid / motorized ball valve)

### 0.0.1 (2026-07-07)
* (ssbingo) Initial release (project scaffold)

---

[Older changelogs can be found there](CHANGELOG_OLD.md)

## Documentation

- 🇩🇪 [Deutsche Dokumentation](doc/de/README.md)
- 🇷🇺 [Документация на русском](doc/ru/README.md)
- 🇳🇱 [Nederlandse documentatie](doc/nl/README.md)
- 🇫🇷 [Documentation française](doc/fr/README.md)
- 🇮🇹 [Documentazione italiana](doc/it/README.md)
- 🇪🇸 [Documentación en español](doc/es/README.md)
- 🇵🇱 [Dokumentacja polska](doc/pl/README.md)
- 🇵🇹 [Documentação portuguesa](doc/pt/README.md)
- 🇺🇦 [Документація українською](doc/uk/README.md)
- 🇨🇳 [简体中文文档](doc/zh-cn/README.md)

## License
MIT License

Copyright (c) 2026 ssbingo <s.sternitzke@online.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
