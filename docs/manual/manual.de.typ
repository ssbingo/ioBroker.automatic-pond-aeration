#import "template.typ": *

#show: manual.with(
  title: "Automatic Pond Aeration",
  subtitle: "Das vollständige Handbuch",
  lang: "de",
  version: "0.0.14",
  date: "8. Juli 2026",
  edition: "Deutsche Ausgabe",
  tagline: "Eine Teichbelüftung mit ioBroker steuern und überwachen — vom allerersten Schritt an.",
  tocTitle: "Inhalt",
  warnTitle: "WARNUNG — bitte vor dem Start lesen",
  warnBody: [
    Dieser Adapter befindet sich *noch in der Entwicklung* und ist *für den unbeaufsichtigten Betrieb
    noch nicht freigegeben*. Er steuert ein *lebenserhaltendes System für lebende Tiere*. Eine
    Fehlfunktion, eine falsche Einstellung oder ein Fehler kann die Belüftung stoppen und *die
    Gesundheit und das Leben Ihrer Fische gefährden* (Sauerstoffmangel, kein eisfreies Loch im
    Winter, eine überhitzende Pumpe). *Verlassen Sie sich nicht ungeprüft darauf:* beobachten Sie ihn
    genau, überprüfen Sie jede Funktion auf Ihrer eigenen Hardware und halten Sie eine unabhängige,
    bewährte Belüftung/Notabsicherung bereit. *Nutzung auf eigene Gefahr.*
  ],
)

= Willkommen

Dieses Handbuch erklärt den Adapter *ioBroker.automatic-pond-aeration* von Grund auf. Es ist für
Leserinnen und Leser *ohne Vorkenntnisse* geschrieben — wenn Sie ioBroker noch nie verwendet und noch
nie ein Ventil verdrahtet haben, sind Sie hier genau richtig. Am Ende können Sie den Adapter
installieren, ihn mit Ihrer Belüftungshardware verbinden, ihn sicher konfigurieren und ihn von Ihrem
Smartphone oder Computer aus bedienen.

== Was dieser Adapter leistet

Eine Teichbelüftung drückt Luft von einer Pumpe durch Schläuche zu *Ausströmern (Diffusoren)* am
Teichboden. Die aufsteigenden Bläschen fügen Sauerstoff hinzu und halten das Wasser in Bewegung.
Dieser Adapter entscheidet, *wann* und *wo* die Luft strömt, indem er *Ventile* öffnet und schließt —
ein Ventil pro _Belüftungspunkt_ (bis zu 8). Er kann:

- die Belüftungspunkte nach einem *Wochenplan*, in einer *zyklischen Sequenz* (Round-Robin über
  Punkte und/oder Gruppen) oder in *Gruppen* schalten;
- die Pumpe mit einer *Sicherheitsverriegelung* schützen, sodass sie niemals gegen geschlossene
  Ventile läuft;
- optional den gelösten Sauerstoff, die Luft-/Wassertemperatur und den Luftleitungsdruck
  *überwachen* und Alarme auslösen;
- ein *eisfreies Loch* im Winter halten und die *Belüftung verstärken, wenn der Sauerstoff niedrig
  ist*;
- die Belüftung *pausieren*, während Ihre Fische gefüttert werden (Kopplung an den
  automatic-feeder-Adapter);
- *Benachrichtigungen* (z. B. Telegram) senden und *Laufzeitstatistiken* sammeln.

#figure(
  image("assets/system-overview.svg", width: 100%),
  caption: [Wie die Teile zusammenpassen: Der Adapter (das „Gehirn“) entscheidet, welche Ventile
  öffnen; die Pumpe speist Luft durch den Verteiler; jedes offene Ventil sendet Luft zu einem
  Diffusor im Teich. Der direkte ESP32-Pfad ist geplant #src(3).],
)

== Wer welchen Teil lesen sollte

#steps(
  [*Wollen Sie es nur verstehen?* Lesen Sie die Kapitel 1–3.],
  [*Richten Sie es ein?* Folgen Sie den Kapiteln 4–6 der Reihe nach.],
  [*Betreiben Sie es im Alltag?* Kapitel 7 und die FAQ (Kapitel 10).],
  [*Etwas funktioniert nicht?* Springen Sie zur Fehlerbehebung (Kapitel 11).],
)

= Wie eine Teichbelüftung funktioniert (die Grundlagen)

Auch wenn das alles neu für Sie ist — die Idee ist einfach.

== Die physischen Bestandteile

#spec(
  ([Luftpumpe / Kompressor], [Erzeugt den Luftstrom. Oft eine lineare Membranpumpe. Läuft bei
    niedrigem Druck (typischerweise wenige kPa bis ~30 kPa).]),
  ([Verteiler + Schläuche], [Verteilen die Luft auf mehrere Punkte im Teich.]),
  ([Ventile (Magnetventile)], [Eines pro Belüftungspunkt. Offen = Luft strömt zu diesem Diffusor;
    geschlossen = nicht. Diese schaltet der Adapter.]),
  ([Diffusoren / Ausströmer], [Verwandeln den Luftstrom unter Wasser in feine Bläschen.]),
  ([Notventil], [Eine Sicherheitsentlastung, damit die Pumpe immer irgendwohin blasen kann, selbst
    wenn jedes normale Ventil geschlossen ist.]),
)

== Warum Belüftung für die Tiere wichtig ist

Fische und Teichleben brauchen *gelösten Sauerstoff* im Wasser. Warme Sommernächte, Algen und
verrottendes Material können ihn aufzehren; eine dicke Eisdecke im Winter schließt giftige Gase ein.
Die Belüftung fügt Sauerstoff hinzu, durchmischt das Wasser und hält — im Winter — ein kleines
*eisfreies Loch* offen, damit Gase entweichen können #src(2). Weil die Tiere davon abhängen, gehen
*Zuverlässigkeit und Sicherheit vor* — deshalb ist dieser Adapter um eine harte
Sicherheitsverriegelung herum aufgebaut (Kapitel 3).

= Sicherheitskonzept (das wichtigste Kapitel)

Eine Luftpumpe darf *niemals gegen vollständig geschlossene Ventile laufen* („Dead-Heading“): Der
Druck kann nirgendwo hin, die Pumpe überhitzt und kann beschädigt werden. Der Adapter verhindert dies
jederzeit.

#safety("Die Dead-Head-Verriegelung")[
  Während die Pumpe läuft, wird stets mindestens ein Ventil *offen gehalten* (das Minimum legen Sie
  fest). Wenn das nicht gewährleistet werden kann, *öffnet der Adapter das Notventil* und — falls die
  Pumpe steuerbar ist — *schaltet die Pumpe ab*.
]

Zwei weitere Sicherheitsmechanismen arbeiten daneben:

- *Make-before-break-Schaltung:* Wenn die Belüftung von einem Punkt zum nächsten wechselt, öffnet das
  neue Ventil, *bevor* das alte schließt, sodass es nie einen Moment gibt, in dem alles geschlossen
  ist.
- *Watchdog:* Die Verriegelung wird auf einem kurzen Timer erneut geprüft, nicht nur, wenn sich etwas
  ändert.

#tipbox("Empfehlung zur Verdrahtung")[
  Verwenden Sie ein *stromlos offenes (NO)* Notventil, damit es sich bei einem Stromausfall von selbst
  öffnet — eine echte Notabsicherung. Wenn Sie die Hardware später auf einem ESP32 betreiben, läuft
  dieselbe Verriegelung auch *auf dem Gerät*, sodass ein Netzwerk- oder ioBroker-Ausfall der Pumpe
  nicht schaden kann #src(3).
]

= Was Sie benötigen

#spec(
  ([Eine ioBroker-Installation], [Der Smart-Home-Server, in dem dieser Adapter läuft #src(1).
    Version: js-controller ≥ 6.0.11, admin ≥ 7.6.20.]),
  ([Node.js ≥ 22], [Vom Adapter vorausgesetzt.]),
  ([Mindestens ein schaltbares Ventil], [In ioBroker als *State* erreichbar — z. B. von einer
    Relaisplatine, einer smarten Steckdose oder einem KNX-/Zigbee-Aktor. Der Adapter schaltet diese
    vorhandenen States.]),
  ([Optional], [Eine steuerbare Pumpe, ein Notventil und Sensoren für Sauerstoff / Temperatur /
    Druck — siehe Kapitel 9.]),
)

#notebox("Noch kein ioBroker?")[
  Installieren Sie zuerst ioBroker (siehe die offizielle Dokumentation #src(1)). Es läuft auf einem
  Raspberry Pi, einem NAS, einem kleinen PC oder einer virtuellen Maschine. Sobald sich der
  ioBroker-Admin in Ihrem Browser öffnet, kommen Sie hierher zurück.
]

= Den Adapter installieren

#steps(
  [Öffnen Sie den *ioBroker-Admin* in Ihrem Browser (üblicherweise `http://<your-server>:8081`).],
  [Gehen Sie zu *Adapter*, klicken Sie auf das Symbol *GitHub / eigene Installation* (die
    Katze/Octocat) und geben Sie die Repository-URL
    `https://github.com/ssbingo/ioBroker.automatic-pond-aeration` ein #src(2). (Sobald der Adapter im
    offiziellen Repository ist, suchen Sie einfach nach „pond aeration“.)],
  [Bestätigen Sie die Installation und warten Sie, bis sie abgeschlossen ist.],
  [Klicken Sie auf *Instanz hinzufügen*. Eine neue Instanz `automatic-pond-aeration.0` wird erstellt
    und ihre Einstellungsseite öffnet sich.],
)

#okbox("Fertig")[
  Sie haben nun eine Instanz. Es wird noch nichts gesteuert — der *Hauptschalter* ist an, aber Sie
  haben ihm noch keine Ventile mitgeteilt. Das ist das nächste Kapitel.
]

= Den Adapter konfigurieren, Reiter für Reiter

Die Einstellungsseite ist in Reiter gegliedert. Sie füllen nur die Teile aus, die Sie verwenden.
Klicken Sie auf *Speichern* (oder *Speichern und schließen*), wenn Sie fertig sind.

== Allgemein

- *Hauptfreigabe* — der Ein-/Ausschalter für den gesamten Adapter. Aus = es wird nichts gesteuert.
- *Trockenlauf (nur Log)* — ein *Testmodus*: Die gesamte Logik läuft und die Datenpunkte
  aktualisieren sich, aber es wird kein echtes Ventil und keine echte Pumpe geschaltet — die
  beabsichtigten Aktionen werden nur ins Log geschrieben (`[DRY-RUN] would …`). Perfekt, um eine
  Konfiguration sicher auszuprobieren, bevor Sie sie verdrahten.
- *Backend* — `Existing ioBroker states` (Standard) steuert Ihre Hardware über die States anderer
  Adapter. `ESP32 (direct)` ist *geplant* (Kapitel 9) und noch nicht aktiv.

== Belüftungspunkte

Das ist das Herzstück der Einrichtung. Fügen Sie *bis zu 8* Punkte hinzu; jeder ist ein Ventil.

#steps(
  [Klicken Sie auf *Punkt hinzufügen*.],
  [Geben Sie ihm einen *Namen* (z. B. „Steg“, „Tiefzone“).],
  [Lassen Sie *Backend* auf `ioBroker`.],
  [Wählen Sie unter *Valve state* den ioBroker-State, der dieses Ventil öffnet (der Objektbrowser
    lässt Sie Ihre vorhandenen States durchsuchen).],
)

#safety("Jeder aktivierte Punkt braucht einen Ventil-State")[
  Wenn ein Punkt aktiviert ist, aber kein State zugeordnet wurde, warnt der Adapter im Log und kann
  ihn nicht schalten.
]

== Gruppen

Fassen Sie mehrere Punkte zusammen, um sie gemeinsam zu steuern (z. B. öffnet ein Schalter drei
Diffusoren). Geben Sie der Gruppe einen Namen und haken Sie ihre Mitgliederpunkte an.

#notebox("Feste Regel")[
  Es kann *niemals mehr Gruppen als Punkte* geben. Der Admin und der Adapter erzwingen dies beide.
]

== Steuerung

Hier entscheiden Sie, *wann* die Belüftung automatisch läuft.

- *Zyklisches Round-Robin* — rotieren Sie durch die Punkte, jeder offen für die *Verweilzeit*
  (Sekunden).
  - *Sequenz (Punkte und Gruppen)* — definieren Sie optional einen *geordneten Zyklus von Schritten*,
    wobei jeder Schritt einen einzelnen Punkt *oder* eine ganze Gruppe anspricht, mit eigener
    optionaler Verweilzeit. So können Sie z. B. _Gruppe 1 → Gruppe 3 → Punkt 1 → …_ ausführen und
    Punkte und Gruppen frei mischen. Ordnen Sie Schritte mit den Pfeilen nach oben/unten neu. Eine
    leere Sequenz rotiert einfach durch alle Punkte.
- *Zeitpläne* — öffnen Sie ausgewählte Punkte/Gruppen während der Zeitfenster an Wochentagen
  (`From`/`To`, z. B. `08:00`–`18:00`; über Nacht reichende Fenster wie `22:00`–`06:00` funktionieren
  ebenfalls). *Ein aktiver Zeitplan hat Vorrang vor dem Round-Robin / der Sequenz.*
- *Winter- / Eisfrei-Modus* — während einer Saison, die Sie als wiederkehrendes `MM-DD`-Fenster
  festlegen (z. B. `11-01`–`03-15`, was korrekt über den Jahreswechsel läuft), werden die gewählten
  Punkte zwangsweise eingeschaltet, um ein eisfreies Loch offen zu halten. Haken Sie optional *„nur
  wenn es kalt ist“* an und setzen Sie einen Lufttemperaturschwellwert, sodass der Teich nur belüftet
  wird, solange es tatsächlich friert (erfordert die Lufttemperaturüberwachung). Lassen Sie die
  Punktauswahl leer, um den ganzen Teich zu belüften.

== Sensoren

Optionale Überwachung. Haken Sie für jeden Sensor *Enabled* an und wählen Sie den *Source state*.

- *Gelöster Sauerstoff* — mit einem unteren Schwellwert (löst einen Alarm aus), einem Zielwert und
  einer Hysterese. Die *Sauerstoffsättigung %* wird aus der Wassertemperatur berechnet.
  - *Sauerstoff-Regelkreis* — wenn aktiviert, *erzwingt der Adapter die Belüftung*, solange der
    Sauerstoff unter dem unteren Schwellwert liegt, bis er sich auf den Zielwert erholt. Ein
    Sicherheitsnetz für die Fische.
- *Luft- / Wassertemperatur.*
- *Druck* — mit einem Min-/Max-Bereich; das Verlassen des Bereichs löst einen Druckalarm aus.
  Nützlich, um einen blockierten Diffusor (Druck steigt) oder einen geplatzten Schlauch (Druck fällt)
  zu erkennen.

== Standort

Nur für die astronomischen Zeiten (Sonnenaufgang/Sonnenuntergang/Nacht) nötig. Wählen Sie den
ioBroker-Systemstandort oder geben Sie eine eigene Adresse ein — die Karte geocodiert sie bei Bedarf
über OpenStreetMap/Nominatim #src(15).

== Feeder

Pausieren Sie ausgewählte Belüftungspunkte, während der _automatic-feeder_-Adapter #src(13) füttert,
damit das Futter nicht herumgewirbelt wird. Wählen Sie die Feeder-Instanz (automatisch erkannt) und
die zu beobachtenden Schalter, wählen Sie einen *Dauer-Modus* (messen/Puls) und einen *Offset*
(zusätzliche Pause nach dem Füttern — mindestens die durchschnittliche Zeit, die die Tiere zum Fressen
benötigen).

== Sicherheit

- *Min. offene Ventile, während die Pumpe läuft* — der Dead-Head-Schutz (Standard 1).
- *Watchdog-Intervall* und *Make-before-break-Überlappung*.
- *Pumpe* — ob sie steuerbar ist (dann darf die Verriegelung sie abschalten), ihr State und die
  Anti-Kurzzyklus-Ein-/Ausschaltzeiten.
- *Notventil* — sein State, ob es *stromlos offen* (Notabsicherung) ist, der *Ventiltyp*
  (Magnetventil oder motorisiertes Kugelventil) und, bei einem Motorventil, seine Laufzeit.

== Benachrichtigungen

Aktivieren Sie Benachrichtigungen und wählen Sie eine *Messaging-Instanz* (jeder Adapter vom Typ
`messaging`, z. B. Telegram oder Pushover). Der Adapter sendet dann eine kurze Nachricht, wenn die
Sicherheitsverriegelung auslöst oder sich löst, wenn der Sauerstoffalarm ausgelöst wird oder sich
erholt und wenn der Druck seinen Bereich verlässt oder wieder erreicht.

= Den Adapter im Alltag nutzen

Der Adapter stellt *Datenpunkte* (States) bereit, die Sie lesen und ansteuern können — aus dem
ioBroker-Admin, aus Skripten oder aus einer Visualisierung. Die wichtigsten Befehle:

#spec(
  ([`control.enabled`], [Haupt-Ein/Aus.]),
  ([`control.mode`], [`auto` (Zeitpläne/Sequenz/Winter/Sauerstoff laufen automatisch), `manual` (Sie
    öffnen Punkte von Hand) oder `off` (alles geschlossen).]),
  ([`control.allOff`], [Sofort jedes Ventil schließen.]),
  ([`control.point.<n>.open`], [Einen Punkt von Hand öffnen/schließen (wirkt nur im `manual`-Modus).]),
  ([`control.group.<g>.active`], [Eine Gruppe aktivieren.]),
)

#tipbox("Wie die Modi zusammenwirken")[
  Im `auto`-Modus entscheiden die automatischen Programme (Zeitplan, Sequenz, Winter, Sauerstoff-Boost)
  über die Ventile; die Sicherheitsverriegelung läuft immer obendrauf, und eine Feeder-Pause gewinnt
  stets. Im `manual`-Modus haben Sie die Kontrolle, aber Sicherheit und Feeder-Pause gelten weiterhin.
]

= Referenz der Datenpunkte

Der Adapter erstellt diese States aus Ihrer Konfiguration. `<n>` = Punktindex (0–7), `<g>` =
Gruppenindex. Mit *(w)* markierte Einträge sind beschreibbare Befehle; der Rest sind schreibgeschützte
Statuswerte.

#table(columns: (auto, 1fr), fill: (_, y) => if y == 0 { ink } else if calc.odd(y) { sky } else { white },
  [Objekt], [Bedeutung],
  [`info.connection`], [Adapter läuft / Konfiguration gültig],
  [`info.activeMode`], [Aktueller Betriebsmodus],
  [`info.dryRun`], [Trockenlauf aktiv (keine Hardware geschaltet)],
  [`control.enabled` *(w)*], [Hauptfreigabe],
  [`control.mode` *(w)*], [`auto` / `manual` / `off`],
  [`aeration.point.<n>.valveState`], [Ventil ist offen],
  [`aeration.point.<n>.active`], [Punkt belüftet gerade],
  [`aeration.point.<n>.runtimeTodaySec` / `.runtimeTotalH`], [Laufzeit heute / gesamt],
  [`safety.interlockActive`], [Sicherheitsverriegelung gerade aktiv],
  [`safety.emergencyValve`], [Notventil ist offen],
  [`safety.openValveCount`], [Anzahl offener Ventile],
  [`sensors.oxygen` / `.oxygenSaturation` / `.oxygenAlarm`], [Sauerstoffwert / Sättigung % / unterer Alarm],
  [`sensors.oxygenBoostActive`], [Sauerstoff-Regelkreis erzwingt Belüftung],
  [`sensors.pressure` / `.pressureAlarm`], [Druckwert / Bereichsüberschreitungsalarm],
  [`winter.active` / `.frostActive`], [Winter-Modus erzwingt Ein / Frostschutz aktiv],
  [`statistics.compressorRuntimeTodayH`], [Kompressorlaufzeit heute],
  [`statistics.switchCyclesToday`], [Ventilschaltzyklen heute],
)

= Hardware & Verdrahtung (Referenzaufbau)

Heute steuert der Adapter Ihre Ventile und die Pumpe über *vorhandene ioBroker-States*, sodass jede
Relaisplatine oder smarte Steckdose funktioniert. Ein *direkter ESP32-Aufbau* ist geplant, damit Sie
keinen zusätzlichen PC brauchen — dieser Abschnitt ist die Referenz für diesen Aufbau.

== Controller-Board

Der Referenz-Controller ist das *Waveshare ESP32-S3-POE-ETH-8DI-8RO* #src(3): 8 Relais (für die
Ventile, das Notventil und die Pumpe), 8 digitale Eingänge und Ethernet mit *Power-over-Ethernet* —
ein Kabel für Strom und Daten.

== Referenzsensoren (alle optional)

#spec(
  ([Wassertemperatur], [*DS18B20* wasserdichte Sonde (1-Wire). ~3 € von einem seriösen Händler
    #src(16). Kaufen Sie bei einem autorisierten Distributor — die meisten billigen Klone sind
    Fälschungen #src(12).]),
  ([Luftleitungsdruck], [*CFSensor XGZP6897D…KPDG* (I²C), Relativdruck-Typ, standardmäßig 0–100 kPa
    #src(7). Nur über AliExpress/Alibaba erhältlich; die Firmware erkennt die beiden Bus-Varianten
    automatisch (0x6D / 0x58).]),
  ([Gelöster Sauerstoff], [*Optional und teuer.* Budget: *DFRobot SEN0237-A* (~176 €) #src(6).
    Premium: *Atlas EZO-DO*-Stack (~450 €) #src(4), der eine galvanisch getrennte Trägerplatine
    benötigt #src(5).]),
)

Vollständige Teilenummern, Preise, Verdrahtung, die I²C-Adresstabelle und alle Vorbehalte finden Sie
in `dev/hardware/sensors.md` im Repository.

#safety("Sauerstoffmessung ist wartungsintensiv")[
  Beide Sauerstoffoptionen verwenden eine galvanische Sonde mit einer Membran/einem Elektrolyten, die
  regelmäßig gewartet werden muss und einen Wasserfluss über sie hinweg benötigt. Behandeln Sie
  Sauerstoff als optionale, fortgeschrittene Ergänzung.
]

= FAQ

/ Brauche ich einen ESP32, um den Adapter zu nutzen?: Nein. Heute steuert er Ventile und die Pumpe
  über vorhandene ioBroker-States. Der ESP32-Aufbau ist eine geplante Erleichterung, keine
  Voraussetzung.

/ Nichts schaltet — habe ich etwas kaputtgemacht?: Prüfen Sie, dass der *Hauptschalter* an ist, der
  *Modus* `auto` ist (oder `manual` mit einem geöffneten Punkt) und jeder aktivierte Punkt einen
  *Ventil-State* zugeordnet hat. Im *Trockenlauf* wird bewusst nichts geschaltet.

/ Kann ich nur ein winterliches eisfreies Loch betreiben?: Ja. Aktivieren Sie den *Winter- /
  Eisfrei-Modus* mit Ihrem Saisonfenster und (optional) dem Frostschutz und lassen Sie den
  automatischen Zeitplan leer.

/ Ist die Sauerstoffüberwachung erforderlich?: Nein, sie ist völlig optional — und der teuerste,
  wartungsintensivste Teil. Viele Teiche laufen mit einem Zeitplan plus der Sicherheitsverriegelung
  einwandfrei.

/ Hält es meine Fische von allein sicher?: *Noch nicht — siehe die Warnung auf dem Deckblatt.* Es ist
  noch in Entwicklung. Beaufsichtigen Sie es stets und halten Sie eine unabhängige Notabsicherung
  bereit.

= Fehlerbehebung

#spec(
  ([Die Admin-Seite ist leer / alt], [Führen Sie nach einem Update `iobroker upload
    automatic-pond-aeration` aus und laden Sie den Browser mit Strg+F5 neu. Die Admin-Dateien sind
    im Cache.]),
  ([Die Adresssuche meldet „no address found“], [Die Adapter-*Instanz* muss laufen, um die Abfrage zu
    beantworten, und sie muss eine aktuelle Version sein. Starten Sie die Instanz und versuchen Sie es
    erneut.]),
  ([Die Sicherheitsverriegelung löst ständig aus], [Die Pumpe wird als laufend erkannt, während zu
    wenige Ventile offen sind. Prüfen Sie die Zuordnung des Pumpen-States, erhöhen Sie die Zahl der
    geplanten/offenen Punkte oder überprüfen Sie die Verdrahtung des Notventils.]),
  ([Der Sauerstoffwert sieht falsch aus], [Speisen Sie den Sensor mit der *Wassertemperatur* (er
    kompensiert darüber), stellen Sie sicher, dass es einen *Fluss* über die Sonde gibt, und prüfen Sie
    die Membran/den Elektrolyten. Billige Klone driften stark.]),
  ([Der Druckwert springt umher], [Feuchte Luft kann am Drucksensor kondensieren. Montieren Sie ihn
    oberhalb des Verteilers mit einer Totleitung und einer Feuchtefalle, den Stutzen nach unten
    zeigend #src(7).]),
)

Wenn Sie weiterhin nicht weiterkommen, eröffnen Sie ein Issue im Projekt-Repository #src(2) mit Ihrer
Adapterversion, Ihrer Konfiguration und den relevanten Log-Zeilen (setzen Sie den Log-Level der
Instanz auf `debug`).

= Referenzen

#let rf(n, body) = block(above: 5pt, below: 5pt)[
  #grid(columns: (26pt, 1fr), gutter: 6pt, text(fill: teal, weight: "bold")[[#n]], body)
]

#rf(1)[ioBroker — offizielle Dokumentation — #link("https://www.iobroker.net/#en/documentation/")] <ref-1>
#rf(2)[ioBroker.automatic-pond-aeration — Projekt-Repository — #link("https://github.com/ssbingo/ioBroker.automatic-pond-aeration")] <ref-2>
#rf(3)[Waveshare ESP32-S3-POE-ETH-8DI-8RO — Produkt-Wiki — #link("https://www.waveshare.com/wiki/ESP32-S3-POE-ETH-8DI-8RO")] <ref-3>
#rf(4)[Atlas Scientific EZO-DO — Datenblatt der Sauerstoff-Messschaltung — #link("https://files.atlas-scientific.com/DO_EZO_Datasheet.pdf")] <ref-4>
#rf(5)[Atlas Scientific — Electrically Isolated EZO Carrier Board — #link("https://atlas-scientific.com/carrier-boards/electrically-isolated-ezo-carrier-board-gen-2/")] <ref-5>
#rf(6)[DFRobot Gravity — Analog Dissolved Oxygen Sensor (SEN0237-A) — #link("https://wiki.dfrobot.com/sen0237-a/")] <ref-6>
#rf(7)[CFSensor XGZP6897D — I²C-Drucksensor — #link("https://cfsensor.com/product/xgzp6897d/")] <ref-7>
#rf(8)[fanfanlatulipe26/XGZP6897D — Arduino-Bibliothek — #link("https://github.com/fanfanlatulipe26/XGZP6897D")] <ref-8>
#rf(9)[ESPHome — xgzp68xx sensor component — #link("https://esphome.io/components/sensor/xgzp68xx/")] <ref-9>
#rf(10)[Analog Devices — DS18B20 Datenblatt — #link("https://www.analog.com/media/en/technical-documentation/data-sheets/ds18b20.pdf")] <ref-10>
#rf(11)[Maxim AN148 — zuverlässige 1-Wire-Netze über lange Leitungen — #link("https://www.analog.com/en/resources/technical-articles/guidelines-for-reliable-long-line-1wire-networks.html")] <ref-11>
#rf(12)[cpetrich/counterfeit_DS18B20 — wie man Fälschungen erkennt — #link("https://github.com/cpetrich/counterfeit_DS18B20")] <ref-12>
#rf(13)[ioBroker.automatic-feeder — der gekoppelte Feeder-Adapter — #link("https://github.com/ssbingo/ioBroker.automatic-feeder")] <ref-13>
#rf(14)[SunCalc — Bibliothek für Sonnenstand / -zeiten — #link("https://github.com/mourner/suncalc")] <ref-14>
#rf(15)[OpenStreetMap Nominatim — Nutzungsrichtlinie für Geocoding — #link("https://operations.osmfoundation.org/policies/nominatim/")] <ref-15>
#rf(16)[BerryBase — DS18B20 wasserdichte Sonde (seriöse EU-Quelle) — #link("https://www.berrybase.de/ds18b20-ic-digitaler-temperatursensor-wasserdicht")] <ref-16>
