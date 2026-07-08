# Older changelog entries

<!--
	This file holds changelog entries that were moved out of README.md once it
	kept only the 10 most recent versions. It is maintained by
	@alcalzone/release-script.
-->

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
