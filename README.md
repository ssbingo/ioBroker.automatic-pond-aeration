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

> 🛑 **WARNING — DEVELOPMENT STATUS, ANIMAL WELFARE (please read).**
> This adapter is **still under active development and is NOT yet verified for unattended use.**
> It controls a **life-support system for living animals** — a malfunction, misconfiguration or
> bug can stop the aeration and **endanger the health and life of your fish and other pond life**
> (oxygen depletion, no ice-free hole in winter, a dead-headed pump). **Do not use it unchecked:**
> before any unattended operation, **observe it closely and verify every function** on your own
> hardware over a meaningful period, and keep an independent, proven aeration/failsafe in place.
> **Use at your own risk.** *(This notice remains until explicitly revoked.)*

> ⚠️ **Project status.** Fully implemented and configurable from the admin: valve control
> (schedule, cyclic round-robin, groups), the dead-head **safety interlock**, **monitoring**
> (oxygen, air/water temperature, pressure with alarms), **astronomical times & geolocation**, the
> **feeder coupling**, the **winter / ice-free mode**, the **oxygen closed loop**, **notifications**
> via a messaging adapter, **runtime statistics** and a **dry-run** test mode. **Still planned:** the
> direct **ESP32** hardware backend. Until the ESP32 backend ships, valves and the pump are driven
> through existing ioBroker states.

> 🇩🇪 Deutsche Anleitung: [doc/de/README.md](doc/de/README.md) · other languages: see
> [Documentation](#documentation) at the bottom.

> 📘 **Complete step-by-step manual (PDF, for beginners — with wiring diagrams, FAQ &
> troubleshooting):** English → [docs/manual/pond-aeration-manual.en.pdf](docs/manual/pond-aeration-manual.en.pdf) ·
> Deutsch → [docs/manual/pond-aeration-manual.de.pdf](docs/manual/pond-aeration-manual.de.pdf)
> (source & build under [docs/manual/](docs/manual/)).

---

## Table of contents

1. [What the adapter does](#1-what-the-adapter-does)
2. [Safety concept](#2-safety-concept)
3. [Requirements](#3-requirements)
4. [Installation](#4-installation)
5. [Configuration](#5-configuration)
6. [Objects / data points](#6-objects--data-points)
7. [Roadmap](#7-roadmap)

---

## 1. What the adapter does

A pond aeration distributes air from a single pump to several diffusers/air stones. Which points
receive air is decided by **solenoid valves**. This adapter decides **when** each valve opens:

* **Schedule** – open a point/group during configured weekday time windows.
* **Cyclic round-robin** – rotate through the points, each open for a configurable dwell time.
* **Groups** – control several points together; there can **never be more groups than points**.

The valves and the pump are driven through **existing ioBroker states** (from any adapter that
exposes the switches). A direct **ESP32** hardware backend (no extra ioBroker instance) is planned.

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
* One or more valves reachable as ioBroker states (e.g. a relay/smart-plug adapter).

## 4. Installation

Install the adapter from the ioBroker admin (or, during development, from the GitHub repository)
and create an instance. Open the instance settings to configure it.

## 5. Configuration

The settings page is organised into tabs. You do not have to fill in everything — only the parts
you use.

### General
- **Master enable** – the on/off switch for the whole adapter. When off, nothing is controlled.
- **Dry-run (log only, do not switch hardware)** – the whole control engine runs and the data points
  update, but valve/pump commands are only written to the log (`[DRY-RUN] would …`) instead of the
  real states. Ideal for commissioning and testing a configuration before wiring it up.
- **Hardware backend** – `Existing ioBroker states` (default) drives your valves/pump through states
  of other adapters. `ESP32 (direct)` is *planned* (M7) and not active yet.
- **Poll interval (s)** – how often the backend status is polled (e.g. `30`).

### Aeration points
The heart of the configuration. Add **up to 8** points; each one is one valve. Per point:
- **Name** – e.g. `Pier`, `Deep zone`.
- **Enabled** – include this point in the control.
- **Backend** – `ioBroker` (a foreign state) or `ESP32` (a relay channel, planned).
- **Valve state / channel** – for the ioBroker backend, pick the switch state that opens the valve
  (via the object browser); for ESP32, the channel number.

### Groups
Group points to switch them together (e.g. one button opens several diffusers). Give the group a
name and tick its member points. **There can never be more groups than points.**

### Control
- **Cyclic round-robin** – rotate through the points, each open for the **dwell time** (seconds).
  - **Sequence (points and groups)** – optionally define an **ordered cycle of steps**, where each
    step targets a single **point or a whole group** and may carry its own dwell time. This lets
    you run e.g. *group 1 → group 3 → point 1 → …* and freely **mix** points and groups. Reorder the
    steps with the up/down arrows. Leave the sequence empty to fall back to the plain round-robin
    over all points.
- **Schedules** – open selected points/groups during a weekday time window. Pick **From**/**To**
  from a **clock picker** (hour/minute, 24 h; overnight windows like `22:00`–`06:00` are supported).
  An active schedule has **priority over the round-robin / sequence**.
- **Winter / ice-free mode** – during the configured season (**Start**/**End** chosen from a
  **calendar** — only **day and month** count, recurring every year, e.g. 1 Nov – 15 Mar, wrapping
  across the new year) the selected points are forced on to keep an
  ice-free hole open. Optionally tick **Only when it is cold (frost protection)** and set an **air
  temperature threshold** so the pond is only aerated while it is actually freezing (this needs
  air-temperature monitoring). Leave **Points kept open** empty to aerate the whole pond. Winter mode
  runs in the `auto` operating mode and, like every program, still yields to the safety interlock and
  a feeder pause.

### Sensors
Optional monitoring. For each sensor tick **Enabled** and pick the **source state**:
- **Dissolved oxygen** – with a low threshold (raises `sensors.oxygenAlarm`), a target and a
  hysteresis; the oxygen **saturation %** is computed from the water temperature.
  - **Oxygen closed loop** – when enabled, the adapter **forces aeration on** while the oxygen is
    below the low threshold and keeps it on until it recovers to the target (or `low + hysteresis`
    when no target is set). Leave **Boosted points** empty to boost the whole pond. Like winter mode,
    the loop runs in the `auto` mode and yields to safety and feeder pauses.
- **Air / water temperature**.
- **Pressure** – with min/max (out of range raises `sensors.pressureAlarm`).

### Location
Needed for the astronomical times (sunrise/sunset/night).
- **Location source** – `ioBroker system location` (uses your system coordinates) or
  `Custom location`. For a custom location, type an address and press **Search** (geocoded via
  OpenStreetMap/Nominatim on demand) or click/drag the marker on the map.

### Feeder
Pause selected points while [ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder)
is feeding, so the food is not blown around.
- Pick the **feeder instance** (auto-discovered) and tick the **feeder switches** to watch.
- **Duration mode** – `Measure` watches the switch (pause = feeding + offset, without knowing the
  feeding duration in advance); `Pulse` uses a fixed feeding duration.
- **Offset (s)** – extra pause after feeding ends. **It should be at least the average time the
  animals need to eat** (example: 15 s feeding + 60 s offset ⇒ 75 s of paused aeration).
- **Affected points** – which points pause during feeding.

### Safety
Every field on this tab carries an **in-admin explanation** of what it does and its effect — read
them, because this is the tab where a wrong value matters most.
- **Min. open valves while pump runs** – the dead-head protection (default `1`).
- **Watchdog interval (s)** and **make-before-break overlap (s)**.
- **Pump** – whether it is controllable (then the interlock can switch it off), its state, and
  anti short-cycle min on/off times.
- **Emergency valve** – its state, whether it is **normally open** (fail-safe), the valve **type**
  (solenoid or motorized ball valve) and, for a motor valve, its **travel time**.

### Notifications
Enable notifications and pick a **messaging instance** (any adapter of type `messaging`, e.g.
Telegram or Pushover), then **tick which events** should send a message:
- **Safety interlock** – when the dead-head interlock trips or clears;
- **Oxygen alarm** – when dissolved oxygen drops too low or recovers;
- **Pressure alarm** – when the pressure leaves or re-enters its range.

A short, localized text is sent on each edge (raise and clear). With no event ticked, nothing is sent.

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
| `info.dryRun` | boolean | `indicator` | Dry-run active (no hardware is switched) |

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
| `sensors.oxygenBoostActive` | boolean | `indicator` | Oxygen closed loop is forcing aeration on (only with the loop enabled) |
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

**Winter / ice-free mode** (only created when winter mode is enabled)

| Object | Type | Role | Description |
|--------|------|------|-------------|
| `winter.active` | boolean | `indicator` | Winter mode is currently forcing aeration on |
| `winter.frostActive` | boolean | `indicator` | Frost protection is engaged (cold enough) |

**Statistics**

| Object | Type | Role | Description |
|--------|------|------|-------------|
| `aeration.point.<n>.runtimeTodaySec` | number | `value` | Runtime of point `<n>` today (seconds) |
| `aeration.point.<n>.runtimeTotalH` | number | `value` | Total runtime of point `<n>` (hours) |
| `statistics.compressorRuntimeTodayH` | number | `value` | Compressor runtime today (hours) |
| `statistics.switchCyclesToday` | number | `value` | Valve switch cycles today |

When a point, group or sensor is removed from the configuration, its objects are cleaned up
automatically.

## 7. Roadmap

Done: configuration UI, valve control (schedule/round-robin/groups), the dead-head safety
interlock, monitoring, astro & geolocation, the feeder coupling, the **winter / ice-free mode**, the
**oxygen closed loop**, **notifications**, **runtime statistics** and the **dry-run** test mode.
**Still to come:**

* the direct **ESP32** hardware backend + reference firmware (Waveshare ESP32-S3-POE-ETH-8DI-8RO),
  incl. the reference sensors (dissolved oxygen, air-line pressure, water temperature) wired to the
  ESP32 — see [dev/hardware/sensors.md](dev/hardware/sensors.md);
* a **mobile-friendly web page served directly by the ESP32 (mandatory on port 80)** for on-site
  control and monitoring from a phone — no ioBroker needed to operate it;
* a follow-up **vis-2 widget adapter** for operation and monitoring.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the complete, milestone-based plan.

## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### 0.0.15 (2026-07-08)
* (ssbingo) Admin usability: winter start/end are now picked from a **calendar** (day + month only, recurring); schedule From/To use a **clock (hour/minute) picker**; the Control page scrolls fully to the bottom; every **Safety** parameter now shows an inline explanation of what it does and its effect. **Notifications** let you choose **which events** are sent (safety interlock / oxygen alarm / pressure alarm) via a new `notifyEvents` option — before, only the messaging instance was selectable. New docs: the manual gained wiring diagrams (failsafe relay wiring, ESP32 sensor wiring), a quick-start and a glossary, and is linked (EN/DE PDF) from all READMEs

### 0.0.14 (2026-07-08)
* (ssbingo) Cyclic sequence over points AND groups (M11): the round-robin can now follow an ordered list of steps where each step targets a single point or a whole group, with an optional per-step dwell time and free mixing (e.g. group 1 → group 3 → point 1). Reorder in the admin; an empty sequence keeps the plain round-robin over all points. New `sequenceSteps` config, pure/unit-tested `lib/control/sequence.js`, admin builder and 5 new admin strings in 11 languages

### 0.0.13 (2026-07-07)
* (ssbingo) Winter/ice-free mode, oxygen closed loop, notifications, statistics and a dry-run test mode (M10). Winter mode forces the selected points on during a recurring season (`MM-DD` window, optional air-temperature frost gating). The oxygen closed loop boosts aeration while dissolved oxygen is low until it recovers to the target. Notifications go to any `messaging` adapter (Telegram/Pushover) on interlock, oxygen and pressure edges. Runtime statistics (per-point runtime, compressor hours, switch cycles) are accumulated with a daily reset. Dry-run runs the whole control engine but only logs the intended valve/pump actions. New states `winter.*`, `sensors.oxygenBoostActive`, `info.dryRun`; localized messages and admin strings in 11 languages

### 0.0.12 (2026-07-07)
* (ssbingo) Documentation & release hardening: the README and all 10 translated docs are now a full manual with a per-tab configuration guide; fixed the io-package.json placement of `encryptedNative`/`protectedNative` (root instead of `common`); new adapter icon; changelog trimmed to the 10 most recent entries (older ones moved to `CHANGELOG_OLD.md`)

### 0.0.11 (2026-07-07)
* (ssbingo) Address search diagnostics: the location search now distinguishes "no answer from the running instance" from "no result for the address", logs the raw response to the browser console and the geocode request to the adapter log — so a failing search (e.g. the instance is stopped, or an old adapter version is running) is easy to pinpoint

### 0.0.10 (2026-07-07)
* (ssbingo) Admin UI fixes and polish: the OpenStreetMap location map now renders correctly (the Leaflet stylesheet was missing) and is capped to one third of the page width; the Feeder and Notifications tabs now discover the available `automatic-feeder` / messaging instances via dropdowns (client-side, no running adapter required); clearer card-based layout with per-tab headings

### 0.0.9 (2026-07-07)
* (ssbingo) Full configuration UI (React admin): a tabbed settings page covering general/backend, aeration points, groups, control (round-robin + schedules), sensors, location (OpenStreetMap map + on-demand geocoding), feeder coupling (with switch discovery) and safety (pump + emergency valve). Everything built so far can now be configured and tested from the admin

### 0.0.8 (2026-07-07)
* (ssbingo) Feeder coupling (`ioBroker.automatic-feeder`): while a selected feeder is feeding, the chosen aeration points are paused (forced off) for the feeding time plus a configurable offset — `measure` mode watches the feeder switch, `pulse` mode uses a fixed feeding duration. The feeder switches can be auto-discovered from the admin (`discoverFeederSwitches`); the pause drives `feeder.pauseActive` / `feeder.pauseUntil` / `feeder.lastFeedStart`

### 0.0.7 (2026-07-07)
* (ssbingo) Monitoring, astronomical times and geolocation: oxygen, air/water temperature and pressure are read from foreign states and mirrored into `sensors.*`, with a low-oxygen alarm (hysteresis), a pressure-range alarm and a temperature-compensated oxygen saturation. Sunrise/sunset/solar-noon and the night flag are computed from the coordinates (ioBroker system config or an on-demand Nominatim address lookup, rule 12)

### 0.0.6 (2026-07-07)
* (ssbingo) Comprehensive, meaningful logging on all levels (error/warn/info/debug/silly). Operational INFO messages are localized to the ioBroker system language (`lib/messages.js`, 11 languages, English fallback); warnings, errors and debug output stay in English for log analysis

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
