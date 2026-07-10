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
> via a messaging adapter, **runtime statistics**, a **dry-run** test mode, per-point **override
> buttons**, and the direct **ESP32** hardware backend (talks to the reference firmware over HTTP —
> flash it in your browser from the [firmware flash page](https://ssbingo.github.io/pond-aeration-flash/)).
> The default backend drives your valves and pump through existing ioBroker states, so any relay board
> works.

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

The valves and the pump are driven **either** through **existing ioBroker states** (from any adapter
that exposes the switches) **or directly on a dedicated ESP32 controller** running the reference
firmware — no extra ioBroker instance needed. You choose this under **Hardware backend** (General
tab); see [Configuration → General](#general).

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
  of other adapters. `ESP32 (direct)` talks to the reference firmware on a Waveshare
  ESP32-S3-POE-ETH-8DI-8RO over HTTP. Flash the firmware in your browser from the
  [firmware flash page](https://ssbingo.github.io/pond-aeration-flash/) (Chrome/Edge, no extra
  software), then set the **host/IP** and map the **emergency-valve relay** and **pump relay** (0–7);
  the aeration points use the relay channel set per point. The adapter pushes a safety config and a
  heartbeat so the firmware's on-device failsafe protects the pond even if ioBroker is down.
  - **Autonomous schedule (run without ioBroker)** *(ESP32 only, optional)* – when enabled, the adapter
    also pushes your time schedules to the device; if the connection drops, the ESP32 keeps running
    them on its own using its NTP clock (the dead-head safety interlock still applies). The cyclic
    sequence stays with the adapter.
  - **Firmware compatibility** – the adapter and the firmware are matched by a **protocol version**
    (the hard contract), not by exact release numbers. This adapter version speaks **protocol 1** and
    **recommends firmware v1.2.2** (minimum v1.0.0); the admin shows this and links to the releases.
    On connect, the device's version and a compatibility flag are published as `info.deviceFirmware`
    and `info.firmwareCompatible`, and any protocol mismatch is written to the log. See the
    compatibility table in the [manual](docs/manual/pond-aeration-manual.en.pdf) / firmware repo.
  - **Licensing** *(only if your firmware ships the optional licensing overlay)* – the device runs a
    tier: **free** (monitoring only), **community** (relay control) or **pro** (+ the autonomous
    standalone schedule); safety (failsafe, emergency valve, dead-head interlock, hand buttons) is
    always active regardless. A new device runs fully (**pro**) for a trial period, then falls back to
    free until an activation key is entered on the device's `/license` page. The adapter shows the
    status under `info.licenseTier` / `info.licenseTrialDaysLeft` / `info.deviceCode`; if the device is
    **not licensed for control**, monitoring keeps working and control is skipped (see
    `info.licenseControlBlocked`). Public firmware without the overlay is unaffected.
    *Re-flashing note:* the activation key is stored on the ESP and is **erased when you re-flash via
    the browser installer** (a fresh trial starts). The **device code is hardware-derived and never
    changes**, so the **same activation key can simply be re-entered** — no new key needed. A firmware
    **update via the device's Update page** (one-click online update or file upload) keeps the
    activation and all settings; only the installer resets it.
  - **Sensor mirroring** – each poll the adapter also pushes your configured sensor data points
    (oxygen, water/air temperature, pressure) to the device, so they appear on the **ESP's own web
    UI** (tagged *(ioBroker)*) even for sensors that are only ioBroker states and not wired to the ESP.
    A physically wired ESP sensor keeps priority; pushed values drop out after a few minutes. Needs
    firmware ≥ 1.1.7.
- **Poll interval (s)** – how often the backend status is polled (e.g. `30`).

### Aeration points
The heart of the configuration. Add **up to 8** points; each one is one valve. Per point:
- **Name** – e.g. `Pier`, `Deep zone`. With the **ESP32** backend this name is also **shown on the
  device's own web UI** (on the relay channel of the point) — a **licensed feature** (from tier
  **community**). `Ch 7 = Notventil` (emergency valve) and `Ch 8 = Pumpe` (pump) are fixed labels.
  See [Names on the ESP32 web UI](#names-on-the-esp32-web-ui).
- **Enabled** – include this point in the control.
- **Backend** – `ioBroker` (a foreign state) or `ESP32` (a relay channel on the device). The
  `ESP32` option only appears when the **Hardware backend** (General tab) is `ESP32 (direct)`.
- **Valve state / channel** – for the ioBroker backend, pick the switch state that opens the valve
  (via the object browser). For the ESP32 backend, choose the **relay channel** from a drop-down:
  the channels driving the **pump** and the **emergency valve** are shown as *reserved* and channels
  already taken by another point as *in use*, so you can only pick a free one. When no channel is
  left, add further points as **ioBroker states** via the Backend column.
- **Override button** *(optional)* – a physical push-button per point (e.g. an ESP32 digital input,
  or any boolean state). It works as a **toggle**: one press forces the point **on with priority over
  the automatic control** (schedule/sequence/winter/oxygen) and even over a feeder pause — *only the
  master switch or a safety trip overrides it*. Press again to release. (More button modes are
  planned; the field is prepared for them.) A button is only available for an **aeration valve** — a
  point that sits on the ESP32 **pump** or **emergency-valve** relay channel cannot have one (the
  option is greyed out). With the ESP32 backend, a button pressed **at the device** is reflected back
  into ioBroker (`aeration.point.<n>.buttonOn`) and gets the same priority.
- **Button name** *(ESP32 backend, optional)* – a friendly name for this point's override button,
  shown on the device web UI (see below). Empty → the button shows the point name.

#### Names on the ESP32 web UI

*(ESP32 backend, **licensed feature** — available from tier **community**.)* Give your channels and
buttons friendly names that appear on the device's own web pages instead of `Ch 1…8` / `DI 1…8`:

- The adapter **pushes each aeration point's Name** to its relay channel (Ch 1–6) and each point's
  optional **Button name** to the matching digital input (DI 1–8).
- **Ch 7 = Notventil** (emergency valve) and **Ch 8 = Pumpe** (pump) are **fixed** and cannot be renamed.
- **Standalone (no adapter):** the same names can be edited **on the device** under *Settings → Namen
  (Kanäle & Taster)* and are stored on the ESP (NVS); when the adapter is connected it overwrites them
  with the names configured here.
- On **free** (unlicensed) firmware the names are ignored and the pages show the default `Ch`/`DI` labels.

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
- **Pump** – whether it is **controllable**, the pump **signal**, and anti short-cycle min on/off
  times. When controllable, the adapter **drives the pump to follow the aeration demand** — it runs
  while at least the minimum valves are open and switches off when the pond is idle or on a dead-head
  trip (honouring the min on/off times); when *not* controllable the pump is only observed and the
  emergency valve alone protects it. *With the **ESP32** backend the pump signal is the **ESP32 relay
  channel** — the very same one set under General → Hardware backend, shown here so the two tabs can
  never disagree; with the **ioBroker** backend it is an ioBroker state.*
- **Emergency valve** – its **signal**, whether it is **normally open** (fail-safe), the valve
  **type** (solenoid or motorized ball valve) and, for a motor valve, its **travel time**. *With the
  ESP32 backend the signal is likewise the ESP32 emergency-valve relay channel (same as General).*

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

**ESP32 backend (info)** (only with the ESP32 hardware backend)

| Object | Type | Role | Description |
|--------|------|------|-------------|
| `info.deviceFirmware` | string | `text` | Firmware version reported by the ESP32 |
| `info.firmwareCompatible` | boolean | `indicator` | Firmware protocol is compatible with this adapter |
| `info.licenseTier` | string | `text` | Active licence tier: `free` (monitoring), `community` (relay control) or `pro` (+ standalone schedule); empty if the firmware is ungated |
| `info.licenseTrialDaysLeft` | number | `value` | Licence trial days remaining (0 = no trial running) |
| `info.deviceCode` | string | `text` | Device code — give this when unlocking to receive an activation key |
| `info.licenseControlBlocked` | boolean | `indicator` | The device rejected a control command (not licensed for control) |

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
| `aeration.point.<n>.buttonOn` | boolean | `indicator` | Manual override button active (only with a button configured) |
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
**oxygen closed loop**, **notifications**, **runtime statistics**, the **dry-run** test mode and the
direct **ESP32** hardware backend with its reference firmware (flash it in your browser from the
[firmware flash page](https://ssbingo.github.io/pond-aeration-flash/)).
**Still to come:**

* a follow-up **vis-2 widget adapter** for operation and monitoring.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the complete, milestone-based plan.

## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### 0.1.9 (2026-07-10)
* (ssbingo) **Custom channel & button names on the ESP32 web UI** (licensed, from tier **community**). Each aeration point's **Name** and an optional per-point **Button name** are pushed to the device and shown on its Home page instead of `Ch N` / `DI N`; `Ch 7 = Notventil` and `Ch 8 = Pumpe` stay fixed. In standalone the names are edited on the device (Settings → Namen) and persist in NVS; the adapter overwrites them when connected. Needs firmware **≥ 1.3.0**. Also documents the 0.1.8 pump behaviour (the pump now follows the aeration demand) across the README, all 10 translated docs and the EN/DE PDF manual. New per-point `buttonName` config + 1 admin string in 11 languages

### 0.1.8 (2026-07-10)
* (ssbingo) **Fix: the pump is now actually driven (both backends).** The adapter never had an ON-path for the pump — it only ever switched it *off* in an emergency — so on the ESP32 backend the pump relay stayed off forever. Now, when the pump is **controllable**, it **follows the aeration demand**: it runs while at least `minOpenValves` valves are open and switches off when the pond is idle or on a dead-head trip, honouring the anti short-cycle min on/off times. The interlock also now knows the ESP32 pump state is **monitored** (the relay is polled) instead of assuming the pump might always be running — this stops the emergency valve being held open unnecessarily. New unit-tested `pumpShouldRun` helper; pump-controllable help text clarified

### 0.1.7 (2026-07-10)
* (ssbingo) **Admin: the ESP32 pump & emergency-valve relays are now drop-downs.** On both the **General** and **Safety** tabs the ESP32 pump and emergency-valve relay channels are picked from a drop-down — just like the aeration-point channel — that **reserves** the other role’s channel and greys out channels already used by an aeration point, so the two can no longer silently collide. No functional change; reuses existing localized strings

### 0.1.6 (2026-07-10)
* (ssbingo) **Documentation refresh across the whole project.** The English README, all **10 translated docs** and the **EN/DE PDF manual** were brought fully up to date and made more beginner-friendly: the direct **ESP32 backend** is documented as available (no longer “planned”), the ESP32 **channel picker** (which reserves the pump/emergency relay channels) and the **Safety-tab relay-channel** behaviour are described, and the **licence re-flashing** and **sensor-mirroring** notes are included. The adapter now **recommends firmware v1.2.2** (`lib/firmware-compat.js`; minimum unchanged at v1.0.0). No change to the control engine

### 0.1.5 (2026-07-10)
* (ssbingo) **Admin consistency for the ESP32 backend.** On the **Safety** tab the pump and emergency valve are now shown as their **ESP32 relay channels** (the very same ones set under *General → Hardware backend*) instead of separate ioBroker states — the two tabs can no longer contradict each other. The **aeration-point channel picker** is now a dropdown that **reserves** the pump/emergency channels and greys out channels already used by other points; when no channel is left, further points are added as ioBroker states. 6 new admin strings localized in 11 languages

### 0.1.4 (2026-07-09)
* (ssbingo) The adapter now **mirrors the configured sensor data points** (oxygen, water/air temperature, pressure) to the ESP32's **own web UI** via `POST /api/sensors`, so they appear on the device's Home page — even for sensors that are only ioBroker states and not wired to the ESP. A physically wired ESP sensor keeps priority; pushed values are tagged **(ioBroker)** and drop out after a few minutes. Needs firmware ≥ 1.1.7

### 0.1.3 (2026-07-09)
* (ssbingo) **ESP32 firmware install & licence UX.** The reference firmware is now flashed **in the browser** from a new [flash page](https://ssbingo.github.io/pond-aeration-flash/) (ESP Web Tools) — no PlatformIO, no command line. The admin's **Test connection** now also shows the device's **licence status**: the active tier, trial days remaining, the **device code** (to give when unlocking) and a clear warning when the device is **not licensed for control** (monitoring keeps working). README, all 10 translated docs and the PDF manual (EN/DE) were rewritten to the browser-flash flow; 5 admin strings localized in 11 languages

### 0.1.2 (2026-07-09)
* (ssbingo) **ESP32 licence awareness.** The adapter now reads the device's licence status from `GET /api/info` — the active tier (`free` = monitoring, `community` = relay control, `pro` = + standalone schedule), the trial days remaining and the device code — and publishes them as `info.licenseTier`, `info.licenseTrialDaysLeft`, `info.deviceCode` and `info.licenseControlBlocked`. A device that is **not licensed for control** is handled gracefully: **monitoring keeps working**, control commands are skipped with a single clear hint (device code + how to unlock) instead of repeated errors. Public firmware without the optional licensing overlay is unaffected (control stays open). New unit-tested `parseLicense` helper; localized news in 11 languages

### 0.1.1 (2026-07-09)
* (ssbingo) **ESP32 configuration UX.** Aeration points now offer **ESP32 relay channels only when the ESP32 backend is selected** — with the ioBroker-state backend a point always maps to an ioBroker state (no more confusing/incorrect ESP options). A new **“Test connection”** button probes the device (via the running instance) and shows its firmware version, so you can immediately see whether **host and port** are right. The **port** field is now explained — the reference firmware **always serves on port 80** — and warns on any other value. The non-functional **“Use WebSocket”** toggle was removed (the adapter polls status over HTTP). New `testEsp32` admin message + explanations; 9 admin strings in 11 languages

### 0.1.0 (2026-07-09)
* (ssbingo) **Milestone toward the first published release.** The ESP32 direct-control feature set (on-device web UI, autonomous schedule, OTA update, RTC-backed time) and the adapter↔firmware compatibility handling are considered feature-complete for a first pre-release. Also fixes an internal type-check error in the ESP32 backend. **The adapter is still in active development — please verify every function before unattended use** (see the warning at the top)

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
