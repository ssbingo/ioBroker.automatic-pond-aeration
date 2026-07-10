# Older changelog entries

<!--
	This file holds changelog entries that were moved out of README.md once it
	kept only the 10 most recent versions. It is maintained by
	@alcalzone/release-script.
-->

### 0.1.0 (2026-07-09)
* (ssbingo) **Milestone toward the first published release.** The ESP32 direct-control feature set (on-device web UI, autonomous schedule, OTA update, RTC-backed time) and the adapter↔firmware compatibility handling are considered feature-complete for a first pre-release. Also fixes an internal type-check error in the ESP32 backend. **The adapter is still in active development — please verify every function before unattended use** (see the warning at the top)

### 0.0.20 (2026-07-09)
* (ssbingo) **Firmware compatibility, made visible.** The adapter now declares, in one place (`lib/firmware-compat.js`), the ESP32 firmware it expects — the **protocol version** is the hard contract, plus a **recommended** (v1.1.0) and **minimum** (v1.0.0) firmware version. The ESP32 config tab shows a note with the recommended version and a link to the firmware releases. On connect the adapter reads the device's `GET /api/info`, publishes the reported version and a compatibility flag as **`info.deviceFirmware`** / **`info.firmwareCompatible`**, and logs an error on a protocol mismatch or a warning on outdated firmware. Pure/unit-tested `evaluateFirmware`; the manual and firmware repo gained a compatibility table. 5 new admin strings in 11 languages

### 0.0.19 (2026-07-08)
* (ssbingo) **Autonomous schedule on the ESP32.** A new *Autonomous schedule (run without ioBroker)* option (ESP32 backend) makes the adapter flatten your time schedules into per-relay-channel windows and push them to the device; if the adapter connection drops, the firmware **keeps running the schedule on its own** against its NTP clock instead of only failing safe — the pond stays aerated when ioBroker or the network is down. The on-device dead-head interlock still overrides everything and the pump only runs while at least `minOpen` valves are open; the cyclic round-robin sequence stays adapter-side. New `esp32AutonomousEnabled` config, extended `POST /api/config` (`autonomous`/`schedule`), pure/unit-tested `buildSchedulePayload`, admin toggle + 2 strings in 11 languages

### 0.0.18 (2026-07-08)
* (ssbingo) Override-button safety + ESP32 device web UI. The per-point manual override **push-button is now only allowed on an aeration-valve channel** — if a point sits on the ESP32 pump or emergency-valve relay channel the button is force-disabled and greyed out in the admin (those channels are safety-critical and must never be hand-toggled). A button wired to the ESP32 is now **reflected back into ioBroker**: pressing it at the device updates `aeration.point.<n>.buttonOn` and gets the same force-on priority in the arbiter. The companion reference firmware gained an on-device **web UI** (Settings: DHCP/static IP/DNS/hostname, NTP time, WS2812/buzzer; **OTA** firmware update with a GitHub version check; a device-info page), **SNTP** timekeeping (default `de.pool.ntp.org`) and **status LED/buzzer** signalling, plus a beginner install guide (EN/DE)

### 0.0.17 (2026-07-08)
* (ssbingo) Direct **ESP32 hardware backend** (M7): selecting `ESP32 (direct)` now drives a Waveshare ESP32-S3-POE-ETH-8DI-8RO through the separate reference firmware over HTTP (JSON, port 80) — `GET /api/info` protocol check, `POST /api/config` pushing the safety roles, relay commands, and a heartbeat that keeps the firmware's on-device failsafe disarmed while the adapter is healthy; the polled status is mirrored into the data points. New config `esp32EmergencyRelay`/`esp32PumpRelay`, pure/unit-tested `lib/hal/esp32-protocol.js` and `lib/hal/esp32-backend.js`, admin fields + 3 strings in 11 languages. The ioBroker-state backend remains the default

### 0.0.16 (2026-07-08)
* (ssbingo) Per-point manual override push-button (M7 groundwork): each aeration point can have a physical button (an ESP32 digital input or any boolean state). It toggles — one press forces the point on with **priority over the automatic control** (schedule/sequence/winter/oxygen) and even over a feeder pause; only the master switch or a safety trip overrides it. New per-point config (`buttonEnabled`/`buttonMode`/`buttonObjectId`), state `aeration.point.<n>.buttonOn`, pure/unit-tested `lib/control/button.js`, admin column and localized messages/strings in 11 languages. The button mode is an enum, so more behaviours can be added later

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

### 0.0.5 (2026-07-07)
* (ssbingo) Control engine: an arbiter drives the valves from the operating mode (`auto`/`manual`/`off`), time schedules, a cyclic round-robin and group activation (`control.mode`, `control.point.<n>.open`, `control.group.<g>.active`). Schedules take priority over the round-robin; valves switch make-before-break; the safety interlock runs on top of every result

### 0.0.3 (2026-07-07)
* (ssbingo) Hardware abstraction layer with an ioBroker backend: valves, pump and emergency valve are driven through existing ioBroker states (rule 1) and their status is mirrored into the data points; manual valve commands (`control.point.<n>.open`, `control.allOff`) are executed

### 0.0.2 (2026-07-07)
* (ssbingo) Configuration validation/normalization and the complete data-point model: all objects are created from the configuration and obsolete ones are cleaned up automatically
* (ssbingo) Enforced hard rule "never more groups than aeration points"; configurable emergency valve type (solenoid / motorized ball valve)

### 0.0.1 (2026-07-07)
* (ssbingo) Initial release (project scaffold)
