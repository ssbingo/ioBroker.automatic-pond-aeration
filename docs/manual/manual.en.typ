#import "template.typ": *

#show: manual.with(
  title: "Automatic Pond Aeration",
  subtitle: "The complete user manual",
  lang: "en",
  version: "0.0.14",
  date: "8 July 2026",
  edition: "English edition",
  tagline: "Control and monitor a pond aeration system with ioBroker — from your very first step.",
  tocTitle: "Contents",
  warnTitle: "WARNING — please read before you start",
  warnBody: [
    This adapter is *still under development* and *not yet verified for unattended use*. It controls
    a *life-support system for living animals*. A malfunction, a wrong setting or a bug can stop the
    aeration and *endanger the health and life of your fish* (oxygen depletion, no ice-free hole in
    winter, an overheating pump). *Do not rely on it unchecked:* watch it closely, verify every
    function on your own hardware, and keep an independent, proven aeration/failsafe in place.
    *Use at your own risk.*
  ],
)

= Welcome

This manual explains the *ioBroker.automatic-pond-aeration* adapter from the ground up. It is
written for readers with *no prior knowledge* — if you have never used ioBroker and have never wired
a valve, you are in the right place. By the end you will be able to install the adapter, connect it
to your aeration hardware, configure it safely, and operate it from your phone or computer.

== What this adapter does

A pond aeration pushes air from a pump through hoses to *air stones (diffusers)* on the pond floor.
The rising bubbles add oxygen and keep the water moving. This adapter decides *when* and *where* the
air flows, by opening and closing *valves* — one valve per _aeration point_ (up to 8). It can:

- switch the aeration points by a *weekly schedule*, a *cyclic sequence* (round-robin over points
  and/or groups), or in *groups*;
- protect the pump with a *safety interlock* so it never runs against closed valves;
- optionally *monitor* dissolved oxygen, air/water temperature and air-line pressure, and raise
  alarms;
- keep an *ice-free hole* in winter and *boost aeration when oxygen is low*;
- *pause* the aeration while your fish are being fed (coupling to the automatic-feeder adapter);
- send *notifications* (e.g. Telegram) and collect *runtime statistics*.

#figure(
  image("assets/system-overview.svg", width: 100%),
  caption: [How the parts fit together: the adapter (the "brain") decides which valves open; the pump
  feeds air through the manifold; each open valve sends air to one diffuser in the pond. The direct
  ESP32 path is planned #src(3).],
)

== Who should read which part

#steps(
  [*Just want to understand it?* Read chapters 1–3.],
  [*Setting it up?* Follow chapters 4–6 in order.],
  [*Operating it day to day?* Chapter 7 and the FAQ (chapter 10).],
  [*Something not working?* Jump to Troubleshooting (chapter 11).],
)

= How a pond aeration works (the basics)

Even if this is all new to you, the idea is simple.

== The physical parts

#spec(
  ([Air pump / compressor], [Produces the airflow. Often a linear-diaphragm pump. Runs at low
    pressure (typically a few kPa up to ~30 kPa).]),
  ([Manifold + hoses], [Distribute the air to several points in the pond.]),
  ([Valves (solenoids)], [One per aeration point. Open = air flows to that diffuser; closed = it
    doesn't. These are what the adapter switches.]),
  ([Diffusers / air stones], [Turn the airflow into fine bubbles under water.]),
  ([Emergency valve], [A safety relief so the pump always has somewhere to blow, even if every normal
    valve is closed.]),
)

== Why aeration matters for the animals

Fish and pond life need *dissolved oxygen* in the water. Warm summer nights, algae and decaying
matter can deplete it; a thick ice sheet in winter traps toxic gases. Aeration adds oxygen, mixes
the water, and — in winter — keeps a small *ice-free hole* open so gases can escape #src(2). Because
the animals depend on it, *reliability and safety come first* — which is why this adapter is built
around a hard safety interlock (chapter 3).

= Safety concept (the most important chapter)

An air pump must *never run against fully closed valves* ("dead-heading"): the pressure has nowhere
to go, the pump overheats and can be damaged. The adapter prevents this at all times.

#safety("The dead-head interlock")[
  While the pump runs, at least one valve is *always kept open* (you set the minimum). If that cannot
  be guaranteed, the adapter *opens the emergency valve* and — if the pump is controllable — *switches
  the pump off*.
]

Two more safety mechanisms work alongside it:

- *Make-before-break switching:* when the aeration moves from one point to the next, the new valve
  opens *before* the old one closes, so there is never a moment with everything shut.
- *Watchdog:* the interlock is re-checked on a short timer, not only when something changes.

#tipbox("Wiring recommendation")[
  Use a *normally-open (NO)* emergency valve, so it opens by itself on a power cut — a true failsafe.
  When you later run the hardware on an ESP32, the same interlock also runs *on the device*, so a
  network or ioBroker outage cannot harm the pump #src(3).
]

= What you need

#spec(
  ([An ioBroker installation], [The smart-home server this adapter runs in #src(1). Version:
    js-controller ≥ 6.0.11, admin ≥ 7.6.20.]),
  ([Node.js ≥ 22], [Required by the adapter.]),
  ([At least one switchable valve], [Reachable in ioBroker as a *state* — e.g. from a relay board,
    smart plug or KNX/Zigbee actuator. The adapter switches these existing states.]),
  ([Optional], [A controllable pump, an emergency valve, and sensors for oxygen / temperature /
    pressure — see chapter 9.]),
)

#notebox("No ioBroker yet?")[
  Install ioBroker first (see the official documentation #src(1)). It runs on a Raspberry Pi, a NAS,
  a small PC or a virtual machine. Once the ioBroker admin opens in your browser, come back here.
]

= Installing the adapter

#steps(
  [Open the *ioBroker admin* in your browser (usually `http://<your-server>:8081`).],
  [Go to *Adapters*, click the *GitHub / custom install* icon (the cat/octocat), and enter the
    repository URL `https://github.com/ssbingo/ioBroker.automatic-pond-aeration` #src(2). (Once the
    adapter is in the official repository you will simply search for "pond aeration".)],
  [Confirm the install and wait until it finishes.],
  [Click *Add instance*. A new instance `automatic-pond-aeration.0` is created and its settings page
    opens.],
)

#okbox("Done")[
  You now have an instance. Nothing is controlled yet — the *master switch* is on, but you have not
  told it about any valves. That is the next chapter.
]

= Configuring the adapter, tab by tab

The settings page is organised into tabs. You only fill in the parts you use. Click *Save* (or
*Save and close*) when you are done.

== General

- *Master enable* — the on/off switch for the whole adapter. Off = nothing is controlled.
- *Dry-run (log only)* — a *test mode*: the whole logic runs and the data points update, but no
  real valve or pump is switched — the intended actions are only written to the log (`[DRY-RUN]
  would …`). Perfect for trying a configuration safely before wiring it up.
- *Backend* — `Existing ioBroker states` (default) drives your hardware through other adapters'
  states. `ESP32 (direct)` is *planned* (chapter 9) and not active yet.

== Aeration points

This is the heart of the setup. Add *up to 8* points; each one is one valve.

#steps(
  [Click *Add point*.],
  [Give it a *name* (e.g. "Pier", "Deep zone").],
  [Leave *Backend* on `ioBroker`.],
  [Under *Valve state*, pick the ioBroker state that opens this valve (the object browser lets you
    search your existing states).],
)

#safety("Each enabled point needs a valve state")[
  If a point is enabled but has no state mapped, the adapter warns in the log and cannot switch it.
]

== Groups

Group several points to control them together (e.g. one switch opens three diffusers). Give the
group a name and tick its member points.

#notebox("Hard rule")[
  There can *never be more groups than points*. The admin and the adapter both enforce this.
]

== Control

Here you decide *when* the aeration runs automatically.

- *Cyclic round-robin* — rotate through the points, each open for the *dwell time* (seconds).
  - *Sequence (points and groups)* — optionally define an *ordered cycle of steps*, where each step
    targets a single point *or* a whole group, with its own optional dwell time. This lets you run
    e.g. _group 1 → group 3 → point 1 → …_ and freely mix points and groups. Reorder steps with the
    up/down arrows. An empty sequence just rotates through all points.
- *Schedules* — open selected points/groups during weekday time windows (`From`/`To`, e.g.
  `08:00`–`18:00`; overnight windows like `22:00`–`06:00` work too). *An active schedule has priority
  over the round-robin / sequence.*
- *Winter / ice-free mode* — during a season you set as a recurring `MM-DD` window (e.g. `11-01`–
  `03-15`, which correctly wraps across New Year) the chosen points are forced on to keep an ice-free
  hole open. Optionally tick *"only when it is cold"* and set an air-temperature threshold so the pond
  is only aerated while it is actually freezing (needs air-temperature monitoring). Leave the point
  selection empty to aerate the whole pond.

== Sensors

Optional monitoring. For each sensor tick *Enabled* and pick the *source state*.

- *Dissolved oxygen* — with a low threshold (raises an alarm), a target and a hysteresis. The oxygen
  *saturation %* is computed from the water temperature.
  - *Oxygen closed loop* — when enabled, the adapter *forces aeration on* while the oxygen is below
    the low threshold, until it recovers to the target. A safety net for the fish.
- *Air / water temperature.*
- *Pressure* — with a min/max range; leaving the range raises a pressure alarm. Useful to spot a
  blocked diffuser (pressure rises) or a burst hose (pressure drops).

== Location

Needed only for the astronomical times (sunrise/sunset/night). Choose the ioBroker system location,
or enter a custom address — the map geocodes it via OpenStreetMap/Nominatim on demand #src(15).

== Feeder

Pause selected aeration points while the _automatic-feeder_ adapter #src(13) is feeding, so the food
is not blown around. Pick the feeder instance (auto-discovered) and the switches to watch, choose a
*duration mode* (measure/pulse) and an *offset* (extra pause after feeding — at least the average
time the animals need to eat).

== Safety

- *Min. open valves while the pump runs* — the dead-head protection (default 1).
- *Watchdog interval* and *make-before-break overlap*.
- *Pump* — whether it is controllable (then the interlock may switch it off), its state, and anti
  short-cycle on/off times.
- *Emergency valve* — its state, whether it is *normally open* (failsafe), the valve *type* (solenoid
  or motorised ball valve) and, for a motor valve, its travel time.

== Notifications

Enable notifications and pick a *messaging instance* (any adapter of type `messaging`, e.g. Telegram
or Pushover). The adapter then sends a short message when the safety interlock trips or clears, when
the oxygen alarm raises or recovers, and when the pressure leaves or re-enters its range.

= Using the adapter day to day

The adapter exposes *data points* (states) you can read and command — from the ioBroker admin, from
scripts, or from a visualization. The most important commands:

#spec(
  ([`control.enabled`], [Master on/off.]),
  ([`control.mode`], [`auto` (schedules/sequence/winter/oxygen run automatically), `manual` (you
    open points by hand), or `off` (all closed).]),
  ([`control.allOff`], [Close every valve immediately.]),
  ([`control.point.<n>.open`], [Open/close one point by hand (only takes effect in `manual` mode).]),
  ([`control.group.<g>.active`], [Activate a group.]),
)

#tipbox("How the modes interact")[
  In `auto` mode the automatic programs (schedule, sequence, winter, oxygen boost) decide the valves;
  the safety interlock always runs on top, and a feeder pause always wins. In `manual` mode you are in
  control, but safety and the feeder pause still apply.
]

= Data points reference

The adapter creates these states from your configuration. `<n>` = point index (0–7), `<g>` = group
index. Items marked *(w)* are writable commands; the rest are read-only status values.

#table(columns: (auto, 1fr), fill: (_, y) => if y == 0 { ink } else if calc.odd(y) { sky } else { white },
  [Object], [Meaning],
  [`info.connection`], [Adapter running / configuration valid],
  [`info.activeMode`], [Current operating mode],
  [`info.dryRun`], [Dry-run active (no hardware switched)],
  [`control.enabled` *(w)*], [Master enable],
  [`control.mode` *(w)*], [`auto` / `manual` / `off`],
  [`aeration.point.<n>.valveState`], [Valve is open],
  [`aeration.point.<n>.active`], [Point is currently aerating],
  [`aeration.point.<n>.runtimeTodaySec` / `.runtimeTotalH`], [Runtime today / total],
  [`safety.interlockActive`], [Safety interlock currently active],
  [`safety.emergencyValve`], [Emergency valve is open],
  [`safety.openValveCount`], [Number of open valves],
  [`sensors.oxygen` / `.oxygenSaturation` / `.oxygenAlarm`], [Oxygen value / saturation % / low alarm],
  [`sensors.oxygenBoostActive`], [Oxygen closed loop forcing aeration on],
  [`sensors.pressure` / `.pressureAlarm`], [Pressure value / out-of-range alarm],
  [`winter.active` / `.frostActive`], [Winter mode forcing on / frost protection engaged],
  [`statistics.compressorRuntimeTodayH`], [Compressor runtime today],
  [`statistics.switchCyclesToday`], [Valve switch cycles today],
)

= Hardware & wiring (reference build)

Today the adapter drives your valves and pump through *existing ioBroker states*, so any relay board
or smart plug works. A *direct ESP32 build* is planned so you need no extra PC — this section is the
reference for that build.

== Controller board

The reference controller is the *Waveshare ESP32-S3-POE-ETH-8DI-8RO* #src(3): 8 relays (for the
valves, emergency valve and pump), 8 digital inputs, and Ethernet with *Power-over-Ethernet* — one
cable for power and data.

== Reference sensors (all optional)

#spec(
  ([Water temperature], [*DS18B20* waterproof probe (1-Wire). ~€3 from a reputable shop #src(16). Buy
    from an authorised distributor — most cheap clones are counterfeit #src(12).]),
  ([Air-line pressure], [*CFSensor XGZP6897D…KPDG* (I²C), gauge type, 0–100 kPa default #src(7). Only
    available from AliExpress/Alibaba; the firmware auto-detects the two bus variants (0x6D / 0x58).]),
  ([Dissolved oxygen], [*Optional and costly.* Budget: *DFRobot SEN0237-A* (~€176) #src(6). Premium:
    *Atlas EZO-DO* stack (~€450) #src(4), which needs an electrical isolation carrier #src(5).]),
)

Full part numbers, prices, wiring, the I²C address map and all caveats are kept in
`dev/hardware/sensors.md` in the repository.

#safety("Oxygen sensing is maintenance-heavy")[
  Both oxygen options use a galvanic probe with a membrane/electrolyte that must be serviced
  regularly and needs water flow across it. Treat oxygen as an optional, advanced add-on.
]

= FAQ

/ Do I need an ESP32 to use the adapter?: No. Today it controls valves and the pump through existing
  ioBroker states. The ESP32 build is a planned convenience, not a requirement.

/ Nothing switches — did I break something?: Check that the *master switch* is on, the *mode* is
  `auto` (or `manual` with a point opened), and each enabled point has a *valve state* mapped. In
  *dry-run* nothing is switched by design.

/ Can I run just a winter ice-free hole?: Yes. Enable *Winter / ice-free mode* with your season
  window and (optionally) frost protection, and leave the automatic schedule empty.

/ Is oxygen monitoring required?: No, it is fully optional — and the most expensive, most
  maintenance-heavy part. Many ponds run fine on a schedule plus the safety interlock.

/ Will it keep my fish safe on its own?: *Not yet — see the warning on the cover.* It is still in
  development. Always supervise it and keep an independent failsafe.

= Troubleshooting

#spec(
  ([The admin page is empty / old], [After updating, run `iobroker upload automatic-pond-aeration`
    and reload the browser with Ctrl+F5. The admin files are cached.]),
  ([Address search says "no address found"], [The adapter *instance* must be running to answer the
    lookup, and it must be an up-to-date version. Start the instance and retry.]),
  ([The safety interlock keeps tripping], [The pump is seen as running while too few valves are open.
    Check the pump state mapping, raise the number of scheduled/open points, or verify the emergency
    valve wiring.]),
  ([Oxygen reading looks wrong], [Feed the sensor the *water temperature* (it compensates on that),
    make sure there is *flow* across the probe, and check the membrane/electrolyte. Cheap clones
    drift badly.]),
  ([Pressure value jumps around], [Humid air can condense on the pressure sensor. Mount it above the
    manifold with a dead-leg and a moisture trap, barb pointing down #src(7).]),
)

If you are still stuck, open an issue on the project repository #src(2) with your adapter version,
your configuration and the relevant log lines (set the instance log level to `debug`).

= References

#let rf(n, body) = block(above: 5pt, below: 5pt)[
  #grid(columns: (26pt, 1fr), gutter: 6pt, text(fill: teal, weight: "bold")[[#n]], body)
]

#rf(1)[ioBroker — official documentation — #link("https://www.iobroker.net/#en/documentation/")] <ref-1>
#rf(2)[ioBroker.automatic-pond-aeration — project repository — #link("https://github.com/ssbingo/ioBroker.automatic-pond-aeration")] <ref-2>
#rf(3)[Waveshare ESP32-S3-POE-ETH-8DI-8RO — product wiki — #link("https://www.waveshare.com/wiki/ESP32-S3-POE-ETH-8DI-8RO")] <ref-3>
#rf(4)[Atlas Scientific EZO-DO — dissolved-oxygen circuit datasheet — #link("https://files.atlas-scientific.com/DO_EZO_Datasheet.pdf")] <ref-4>
#rf(5)[Atlas Scientific — Electrically Isolated EZO Carrier Board — #link("https://atlas-scientific.com/carrier-boards/electrically-isolated-ezo-carrier-board-gen-2/")] <ref-5>
#rf(6)[DFRobot Gravity — Analog Dissolved Oxygen Sensor (SEN0237-A) — #link("https://wiki.dfrobot.com/sen0237-a/")] <ref-6>
#rf(7)[CFSensor XGZP6897D — I²C pressure sensor — #link("https://cfsensor.com/product/xgzp6897d/")] <ref-7>
#rf(8)[fanfanlatulipe26/XGZP6897D — Arduino library — #link("https://github.com/fanfanlatulipe26/XGZP6897D")] <ref-8>
#rf(9)[ESPHome — xgzp68xx sensor component — #link("https://esphome.io/components/sensor/xgzp68xx/")] <ref-9>
#rf(10)[Analog Devices — DS18B20 datasheet — #link("https://www.analog.com/media/en/technical-documentation/data-sheets/ds18b20.pdf")] <ref-10>
#rf(11)[Maxim AN148 — reliable long-line 1-Wire networks — #link("https://www.analog.com/en/resources/technical-articles/guidelines-for-reliable-long-line-1wire-networks.html")] <ref-11>
#rf(12)[cpetrich/counterfeit_DS18B20 — how to spot fakes — #link("https://github.com/cpetrich/counterfeit_DS18B20")] <ref-12>
#rf(13)[ioBroker.automatic-feeder — the coupled feeder adapter — #link("https://github.com/ssbingo/ioBroker.automatic-feeder")] <ref-13>
#rf(14)[SunCalc — sun position / times library — #link("https://github.com/mourner/suncalc")] <ref-14>
#rf(15)[OpenStreetMap Nominatim — geocoding usage policy — #link("https://operations.osmfoundation.org/policies/nominatim/")] <ref-15>
#rf(16)[BerryBase — DS18B20 waterproof probe (reputable EU source) — #link("https://www.berrybase.de/ds18b20-ic-digitaler-temperatursensor-wasserdicht")] <ref-16>
