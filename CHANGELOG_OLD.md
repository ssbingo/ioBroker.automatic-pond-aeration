# Older changelog entries

<!--
	This file holds changelog entries that were moved out of README.md once it
	kept only the 10 most recent versions. It is maintained by
	@alcalzone/release-script.
-->

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
