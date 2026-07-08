![Logo](../../admin/automatic-pond-aeration.png)
# ioBroker.automatic-pond-aeration

<p align="center">
  <a href="https://www.buymeacoffee.com/ssbingo"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=ssbingo&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" /></a>
</p>

## Adapter automatic-pond-aeration dla ioBroker

Ten adapter **steruje systemem napowietrzania stawu i go monitoruje**. Pompa powietrza/sprężarka
tłoczy powietrze przez zawory (elektrozawory) do **maksymalnie 8 punktów napowietrzania** w stawie.
Adapter przełącza te zawory według **harmonogramu czasowego**, w **cyklicznej rotacji (round-robin)**
lub według **programu grupowego** oraz chroni pompę za pomocą **blokady bezpieczeństwa**: dopóki pompa
pracuje, zawsze pozostaje otwarty co najmniej jeden zawór – w przeciwnym razie otwierany jest **zawór
awaryjny**, a (jeśli pompa jest dostępna jako punkt danych) pompa zostaje wyłączona.

Opcjonalnie może monitorować **rozpuszczony tlen**, **temperaturę powietrza i wody** oraz
**ciśnienie**, obliczać **czasy astronomiczne** na podstawie Twojej **geolokalizacji**, sterować
sprzętem **bezpośrednio na ESP32** (bez dodatkowej instancji ioBroker) oraz wstrzymywać wybrane punkty
napowietrzania podczas karmienia, gdy zainstalowany jest
[ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder).

> 🛑 **OSTRZEŻENIE — STATUS ROZWOJU, DOBROSTAN ZWIERZĄT (przeczytaj).**
> Ten adapter jest **wciąż w aktywnym rozwoju i NIE został jeszcze zweryfikowany do pracy bez
> nadzoru.** Steruje **systemem podtrzymywania życia żywych zwierząt** – awaria, błędna konfiguracja
> lub błąd oprogramowania może zatrzymać napowietrzanie i **zagrozić zdrowiu i życiu Twoich ryb oraz
> pozostałego życia w stawie** (niedobór tlenu, brak przerębli wolnej od lodu zimą, pompa pracująca
> przy zamkniętych zaworach). **Nie używaj go bez kontroli:** przed jakąkolwiek pracą bez nadzoru
> **obserwuj go uważnie i sprawdź każdą funkcję** na własnym sprzęcie przez znaczący okres oraz
> utrzymuj niezależne, sprawdzone napowietrzanie/zabezpieczenie awaryjne. **Używasz na własne
> ryzyko.** *(Niniejsza informacja obowiązuje do chwili jej wyraźnego odwołania.)*

> ⚠️ **Status projektu.** W pełni zaimplementowane i konfigurowalne z panelu admin: sterowanie
> zaworami (harmonogram, cykliczna rotacja round-robin, grupy), **blokada bezpieczeństwa** przeciw
> pracy przy zamkniętych zaworach (dead-heading), **monitorowanie** (tlen, temperatura
> powietrza/wody, ciśnienie z alarmami), **czasy astronomiczne i geolokalizacja**, **sprzężenie z
> feederem**, **tryb zimowy / bez lodu**, **zamknięta pętla tlenowa**, **powiadomienia przez adapter
> messaging**, **statystyki czasu pracy**, **testowy tryb dry-run**, **przyciski wymuszenia** na każdy
> punkt oraz bezpośredni sprzętowy backend **ESP32** (komunikuje się przez HTTP z osobnym
> [oprogramowaniem referencyjnym](https://github.com/ssbingo/pond-aeration-esp32-firmware); firmware
> jest wciąż finalizowane). Domyślny backend steruje Twoimi zaworami i pompą przez istniejące stany
> ioBroker, więc działa dowolna płytka przekaźników.

> 📘 **Kompletny przewodnik krok po kroku (PDF, dla początkujących — ze schematami połączeń, FAQ i
> rozwiązywaniem problemów):** English → [../../docs/manual/pond-aeration-manual.en.pdf](../../docs/manual/pond-aeration-manual.en.pdf) ·
> Deutsch → [../../docs/manual/pond-aeration-manual.de.pdf](../../docs/manual/pond-aeration-manual.de.pdf)
> (źródło i kompilacja w [../../docs/manual/](../../docs/manual/)).

---

## Spis treści

1. [Co robi adapter](#1-co-robi-adapter)
2. [Koncepcja bezpieczeństwa](#2-koncepcja-bezpieczeństwa)
3. [Wymagania](#3-wymagania)
4. [Instalacja](#4-instalacja)
5. [Konfiguracja](#5-konfiguracja)
6. [Obiekty / punkty danych](#6-obiekty--punkty-danych)
7. [Plan rozwoju](#7-plan-rozwoju)

---

## 1. Co robi adapter

Napowietrzanie stawu rozdziela powietrze z jednej pompy na kilka dyfuzorów/kamieni napowietrzających.
O tym, które punkty otrzymują powietrze, decydują **elektrozawory**. Ten adapter decyduje, **kiedy**
otwiera się każdy zawór:

* **Harmonogram** – otwieranie punktu/grupy w skonfigurowanych oknach czasowych dla dni tygodnia.
* **Cykliczna rotacja (round-robin)** – kolejne przełączanie punktów, każdy otwarty przez
  konfigurowalny czas przetrzymania.
* **Grupy** – sterowanie kilkoma punktami razem; **nigdy nie może być więcej grup niż punktów**.

Zawory i pompa są sterowane przez **istniejące stany ioBroker** (z dowolnego adaptera
udostępniającego przełączniki). Bezpośredni sprzętowy backend **ESP32** (bez dodatkowej instancji
ioBroker) jest planowany.

## 2. Koncepcja bezpieczeństwa

Sprężarka powietrza **nigdy nie może pracować przy całkowicie zamkniętych zaworach** (dead-heading) –
powoduje to nadciśnienie i może uszkodzić pompę. Dlatego:

* Dopóki pompa pracuje, **zawsze otwarty jest co najmniej jeden zawór** (konfigurowalne minimum).
* Jeśli nie można tego zagwarantować, **otwierany jest zawór awaryjny**, a jeśli pompą można
  sterować, **pompa zostaje wyłączona**.
* Przełączanie zaworów odbywa się według zasady **make-before-break** (następny zawór otwiera się,
  zanim zamknie się poprzedni), więc nigdy nie ma momentu, w którym wszystkie zawory są zamknięte.

> 💡 **Zalecenie dotyczące okablowania:** użyj zaworu awaryjnego **normalnie otwartego (NO)**, aby
> otwierał się przy zaniku zasilania (fail-safe). Gdy sprzęt działa na ESP32, ta sama blokada działa
> również lokalnie na urządzeniu, więc awaria sieci lub ioBroker nie może uszkodzić pompy.

## 3. Wymagania

* Node.js ≥ 22
* js-controller ≥ 6.0.11, admin ≥ 7.6.20
* Jeden lub więcej zaworów dostępnych jako stany ioBroker (np. adapter przekaźnika/inteligentnego gniazdka).

## 4. Instalacja

Zainstaluj adapter z panelu admin ioBroker (lub, na etapie rozwoju, z repozytorium GitHub) i utwórz
instancję. Otwórz ustawienia instancji, aby ją skonfigurować.

## 5. Konfiguracja

Strona ustawień jest podzielona na karty (zakładki). Nie musisz wypełniać wszystkiego – tylko te
części, których używasz.

### Ogólne
- **Główne włączenie** – przełącznik wł./wył. całego adaptera. Gdy jest wyłączony, nic nie jest
  sterowane.
- **Tryb dry-run (tylko log, bez przełączania sprzętu)** – cały mechanizm sterowania działa, a punkty
  danych są aktualizowane, ale polecenia zaworów/pompy są tylko zapisywane do logu
  (`[DRY-RUN] would …`) zamiast do rzeczywistych stanów. Idealne do uruchamiania i testowania
  konfiguracji przed jej podłączeniem.
- **Backend sprzętowy** – `Istniejące stany ioBroker` (domyślnie) steruje Twoimi zaworami/pompą przez
  stany innych adapterów. `ESP32 (bezpośrednio)` komunikuje się przez HTTP z
  [oprogramowaniem referencyjnym](https://github.com/ssbingo/pond-aeration-esp32-firmware) na
  Waveshare ESP32-S3-POE-ETH-8DI-8RO — ustaw **host/IP** oraz przypisz **przekaźnik zaworu awaryjnego**
  i **przekaźnik pompy** (0–7); punkty napowietrzania używają kanału przekaźnika ustawionego dla
  każdego punktu. Adapter wysyła konfigurację bezpieczeństwa oraz sygnał kontrolny (heartbeat), aby
  wbudowane w urządzenie zabezpieczenie firmware chroniło staw, nawet gdy ioBroker jest niedostępny.
  - **Autonomiczny harmonogram (działa bez ioBroker)** *(tylko ESP32, opcjonalnie)* – gdy włączone,
    adapter wysyła też Twoje harmonogramy do urządzenia; jeśli połączenie zostanie przerwane, ESP32
    samodzielnie kontynuuje ich realizację, korzystając z własnego zegara NTP (blokada
    bezpieczeństwa dead-head nadal obowiązuje). Sekwencja cykliczna pozostaje po stronie adaptera.
- **Interwał odpytywania (s)** – jak często odpytywany jest status backendu (np. `30`).

### Punkty napowietrzania
Serce konfiguracji. Dodaj **do 8** punktów; każdy punkt to jeden zawór. Dla każdego punktu:
- **Nazwa** – np. `Pier`, `Deep zone`.
- **Włączony** – uwzględnij ten punkt w sterowaniu.
- **Backend** – `ioBroker` (obcy stan) lub `ESP32` (kanał przekaźnika, planowany).
- **Stan zaworu / kanał** – dla backendu ioBroker wybierz stan przełącznika, który otwiera zawór
  (przez przeglądarkę obiektów); dla ESP32 numer kanału.
- **Przycisk wymuszenia (override)** *(opcjonalny)* – fizyczny przycisk na każdy punkt (np. wejście
  cyfrowe ESP32 lub dowolny stan logiczny). Działa jako **przełącznik (toggle)**: jedno naciśnięcie
  wymusza punkt **wł. z priorytetem nad sterowaniem automatycznym**
  (harmonogram/sekwencja/zima/tlen), a nawet nad pauzą feedera — *tylko główny wyłącznik lub
  zadziałanie zabezpieczenia go zastępują*. Naciśnij ponownie, aby zwolnić. (Planowane są kolejne
  tryby przycisku; pole jest na nie przygotowane.) Przycisk jest dostępny tylko dla **zaworu napowietrzania** — punkt znajdujący się na kanale przekaźnika ESP32 **pompy** lub **zaworu awaryjnego** nie może go mieć (opcja jest wyszarzona). W backendzie ESP32 przycisk naciśnięty **na urządzeniu** jest odzwierciedlany z powrotem w ioBroker (`aeration.point.<n>.buttonOn`) i otrzymuje ten sam priorytet.

### Grupy
Grupuj punkty, aby przełączać je razem (np. jeden przycisk otwiera kilka dyfuzorów). Nadaj grupie
nazwę i zaznacz jej punkty składowe. **Nigdy nie może być więcej grup niż punktów.**

### Sterowanie
- **Cykliczna rotacja (round-robin)** – kolejne przełączanie punktów, każdy otwarty przez **czas
  przetrzymania** (sekundy).
  * **Sekwencja (punkty i grupy)** – opcjonalnie zdefiniuj **uporządkowany cykl kroków**, gdzie każdy
    krok odnosi się do pojedynczego **punktu lub całej grupy** i może mieć własny czas przetrzymania.
    Pozwala to uruchomić np. *grupa 1 → grupa 3 → punkt 1 → …* i swobodnie **mieszać** punkty i grupy.
    Zmieniaj kolejność kroków strzałkami w górę/w dół w adminie. Pozostaw sekwencję pustą, aby wrócić
    do zwykłej rotacji round-robin po wszystkich punktach.
- **Harmonogramy** – otwieranie wybranych punktów/grup w oknie czasowym dla dnia tygodnia. **Od**/**Do**
  wybiera się za pomocą **selektora zegara** (godzina/minuta, 24 h; okna przechodzące przez noc, takie
  jak `22:00`–`06:00`, są obsługiwane). Aktywny harmonogram ma **priorytet nad rotacją round-robin /
  sekwencją**.
- **Tryb zimowy / bez lodu** – w skonfigurowanym sezonie (**Początek**/**Koniec** wybierane z
  **kalendarza** — liczą się tylko **dzień i miesiąc**, powtarzane co roku, np. 1 lis – 15 mar, z
  przejściem przez przełom roku) wybrane punkty są wymuszane na wł.,
  aby utrzymać otwartą przeręblę wolną od lodu. Opcjonalnie zaznacz **Tylko gdy jest zimno (ochrona
  przed mrozem)** i ustaw **próg temperatury powietrza**, aby staw był napowietrzany tylko wtedy, gdy
  faktycznie marznie (wymaga to monitorowania temperatury powietrza). Pozostaw **Punkty utrzymywane
  otwarte** puste, aby napowietrzać cały staw. Tryb zimowy działa w trybie pracy `auto` i, jak każdy
  program, nadal ustępuje blokadzie bezpieczeństwa oraz pauzie feedera.

### Czujniki
Opcjonalne monitorowanie. Dla każdego czujnika zaznacz **Włączony** i wybierz **stan źródłowy**:
- **Rozpuszczony tlen** – z dolnym progiem (wyzwala `sensors.oxygenAlarm`), wartością docelową i
  histerezą; **nasycenie tlenem %** jest obliczane z temperatury wody.
  * **Zamknięta pętla tlenowa** – po włączeniu adapter **wymusza napowietrzanie na wł.**, gdy tlen
    jest poniżej dolnego progu, i utrzymuje je do powrotu do wartości docelowej (lub
    `low + hysteresis`, gdy nie ustawiono wartości docelowej). Pozostaw **Punkty wzmacniane** puste,
    aby wzmocnić cały staw. Podobnie jak tryb zimowy, pętla działa w trybie `auto` i ustępuje
    blokadzie bezpieczeństwa oraz pauzom feedera.
- **Temperatura powietrza/wody**.
- **Ciśnienie** – z min/maks (poza zakresem wyzwala `sensors.pressureAlarm`).

### Lokalizacja
Potrzebna do czasów astronomicznych (wschód/zachód słońca/noc).
- **Źródło lokalizacji** – `Lokalizacja systemowa ioBroker` (używa współrzędnych systemu) lub `Własna
  lokalizacja`. Dla własnej lokalizacji wpisz adres i naciśnij **Szukaj** (geokodowany na żądanie
  przez OpenStreetMap/Nominatim) albo kliknij/przeciągnij znacznik na mapie.

### Feeder
Wstrzymuj wybrane punkty, gdy
[ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder) karmi, aby karma
nie była rozdmuchiwana.
- Wybierz **instancję feedera** (wykrywaną automatycznie) i zaznacz monitorowane **przełączniki
  feedera**.
- **Tryb czasu trwania** – `Pomiar` obserwuje przełącznik (pauza = karmienie + offset, bez
  wcześniejszej znajomości czasu karmienia); `Impuls` używa stałego czasu karmienia.
- **Offset (s)** – dodatkowa pauza po zakończeniu karmienia. **Powinien wynosić co najmniej średni
  czas, jakiego zwierzęta potrzebują na jedzenie** (przykład: 15 s karmienia + 60 s offsetu ⇒ 75 s
  wstrzymanego napowietrzania).
- **Punkty, których dotyczy** – które punkty są wstrzymywane podczas karmienia.

### Bezpieczeństwo
Każde pole na tej karcie zawiera **objaśnienie w adminie** tego, co robi, i jego skutku — przeczytaj
je, bo to karta, na której błędna wartość ma największe znaczenie.
- **Min. otwartych zaworów przy pracującej pompie** – zabezpieczenie przed pracą przy zamkniętych
  zaworach (domyślnie `1`).
- **Interwał watchdoga (s)** oraz **nakładanie make-before-break (s)**.
- **Pompa** – czy jest sterowalna (wtedy blokada może ją wyłączyć), jej stan oraz minimalne czasy
  wł./wył. przeciw zbyt częstemu taktowaniu.
- **Zawór awaryjny** – jego stan, czy jest **normalnie otwarty** (fail-safe), **typ** zaworu
  (elektrozawór lub silnikowy zawór kulowy) oraz, dla zaworu silnikowego, jego **czas przejścia**.

### Powiadomienia
Włącz powiadomienia i wybierz **instancję messaging** (dowolny adapter typu `messaging`, np. Telegram
lub Pushover), a następnie **zaznacz, które zdarzenia** mają wysyłać komunikat:
- **Blokada bezpieczeństwa** – gdy blokada przed pracą przy zamkniętych zaworach zadziała lub ustąpi;
- **Alarm tlenowy** – gdy rozpuszczony tlen spadnie za nisko lub wróci do normy;
- **Alarm ciśnienia** – gdy ciśnienie wyjdzie poza zakres lub do niego wróci.

Przy każdym zboczu (zadziałanie i ustąpienie) wysyłany jest krótki, zlokalizowany tekst. Gdy nie
zaznaczono żadnego zdarzenia, nic nie jest wysyłane.

## 6. Obiekty / punkty danych

Adapter tworzy swoje punkty danych na podstawie Twojej konfiguracji. Symbole zastępcze: `<n>` =
indeks punktu napowietrzania (0–7), `<g>` = indeks grupy. Obiekty oznaczone **(w)** to polecenia
zapisywalne; wszystkie pozostałe to wartości stanu tylko do odczytu aktualizowane przez adapter.

**Ogólne**

| Obiekt | Typ | Rola | Opis |
|--------|-----|------|------|
| `info.connection` | boolean | `indicator.connected` | Adapter działa / konfiguracja prawidłowa |
| `info.backend` | string | `text` | Aktywny backend sprzętowy (`iobroker` lub `esp32`) |
| `info.activeMode` | string | `text` | Bieżący tryb pracy |
| `info.dryRun` | boolean | `indicator` | Tryb dry-run aktywny (żaden sprzęt nie jest przełączany) |

**Sterowanie (polecenia zapisywalne)**

| Obiekt | Typ | Rola | Opis |
|--------|-----|------|------|
| `control.enabled` | boolean (w) | `switch.enable` | Główne włączenie |
| `control.mode` | string (w) | `text` | Tryb pracy: `auto`, `manual` lub `off` |
| `control.allOff` | boolean (w) | `button` | Zamknij wszystkie zawory |
| `control.point.<n>.open` | boolean (w) | `switch` | Ręcznie otwórz zawór punktu `<n>` |
| `control.group.<g>.active` | boolean (w) | `switch` | Ręcznie aktywuj grupę `<g>` |

**Punkty napowietrzania** (jeden kanał na każdy skonfigurowany punkt, nazwany według punktu)

| Obiekt | Typ | Rola | Opis |
|--------|-----|------|------|
| `aeration.point.<n>.valveState` | boolean | `indicator` | Zawór jest otwarty |
| `aeration.point.<n>.active` | boolean | `indicator` | Punkt obecnie napowietrza |
| `aeration.point.<n>.buttonOn` | boolean | `indicator` | Ręczny przycisk wymuszenia aktywny (tylko przy skonfigurowanym przycisku) |
| `aeration.point.<n>.runtimeTodaySec` | number | `value` | Dzisiejszy czas pracy (sekundy) |
| `aeration.point.<n>.runtimeTotalH` | number | `value` | Całkowity czas pracy (godziny, do konserwacji) |
| `aeration.point.<n>.lastChange` | number | `value.time` | Znacznik czasu ostatniej zmiany zaworu |
| `aeration.point.<n>.error` | string | `text` | Ostatni błąd dla tego punktu |

**Grupy**

| Obiekt | Typ | Rola | Opis |
|--------|-----|------|------|
| `groups.<g>.members` | string | `json` | Indeksy punktów należących do grupy |
| `groups.<g>.active` | boolean | `indicator` | Grupa jest obecnie aktywna |

**Bezpieczeństwo**

| Obiekt | Typ | Rola | Opis |
|--------|-----|------|------|
| `safety.interlockActive` | boolean | `indicator.alarm` | Blokada bezpieczeństwa obecnie aktywna |
| `safety.emergencyValve` | boolean | `indicator` | Zawór awaryjny jest otwarty |
| `safety.pumpRunning` | boolean | `indicator` | Pompa pracuje |
| `safety.openValveCount` | number | `value` | Liczba otwartych zaworów |
| `safety.lastTripReason` | string | `text` | Powód ostatniego zadziałania blokady |

**Czujniki** (tworzone tylko przy włączonym odpowiednim monitorowaniu)

| Obiekt | Typ | Rola | Opis |
|--------|-----|------|------|
| `sensors.oxygen` | number | `value` | Rozpuszczony tlen (mg/l) |
| `sensors.oxygenSaturation` | number | `value` | Nasycenie tlenem (%) |
| `sensors.oxygenAlarm` | boolean | `indicator.alarm` | Tlen poniżej dolnego progu |
| `sensors.airTemperature` | number | `value.temperature` | Temperatura powietrza (°C) |
| `sensors.waterTemperature` | number | `value.temperature` | Temperatura wody (°C) |
| `sensors.pressure` | number | `value.pressure` | Ciśnienie w systemie (bar) |
| `sensors.pressureAlarm` | boolean | `indicator.alarm` | Ciśnienie poza zakresem |
| `sensors.oxygenBoostActive` | boolean | `indicator` | Zamknięta pętla tlenowa wymusza napowietrzanie na wł. (tylko przy włączonej pętli) |

**Astronomia i lokalizacja**

| Obiekt | Typ | Rola | Opis |
|--------|-----|------|------|
| `astro.sunrise` / `astro.sunset` / `astro.solarNoon` | string | `text` | Czasy słońca dla lokalizacji |
| `astro.isNight` | boolean | `indicator` | Obecnie jest noc |
| `location.latitude` / `location.longitude` | number | `value.gps.*` | Ustalone współrzędne |
| `location.resolvedAddress` | string | `text` | Ustalony adres |

**Sprzężenie z feederem** (tworzone tylko przy włączonym sprzężeniu z feederem)

| Obiekt | Typ | Rola | Opis |
|--------|-----|------|------|
| `feeder.pauseActive` | boolean | `indicator` | Napowietrzanie wstrzymane na czas karmienia |
| `feeder.pauseUntil` | number | `value.time` | Pauza aktywna do |
| `feeder.lastFeedStart` | number | `value.time` | Ostatni początek karmienia |

**Tryb zimowy / bez lodu** (tworzony tylko przy włączonym trybie zimowym)

| Obiekt | Typ | Rola | Opis |
|--------|-----|------|------|
| `winter.active` | boolean | `indicator` | Tryb zimowy obecnie wymusza napowietrzanie na wł. |
| `winter.frostActive` | boolean | `indicator` | Ochrona przed mrozem jest włączona (wystarczająco zimno) |

**Statystyki**

| Obiekt | Typ | Rola | Opis |
|--------|-----|------|------|
| `aeration.point.<n>.runtimeTodaySec` | number | `value` | Dzisiejszy czas pracy punktu `<n>` (sekundy) |
| `aeration.point.<n>.runtimeTotalH` | number | `value` | Całkowity czas pracy punktu `<n>` (godziny) |
| `statistics.compressorRuntimeTodayH` | number | `value` | Dzisiejszy czas pracy sprężarki (godziny) |
| `statistics.switchCyclesToday` | number | `value` | Dzisiejsze cykle przełączeń zaworów |

Gdy punkt, grupa lub czujnik zostanie usunięty z konfiguracji, jego obiekty są automatycznie
czyszczone.

## 7. Plan rozwoju

Gotowe: interfejs konfiguracji, sterowanie zaworami (harmonogram/round-robin/grupy), blokada
bezpieczeństwa przeciw pracy przy zamkniętych zaworach, monitorowanie, astro i geolokalizacja,
sprzężenie z feederem, tryb zimowy / bez lodu, zamknięta pętla tlenowa, powiadomienia, statystyki
czasu pracy oraz testowy tryb dry-run. **Wciąż przed nami:**

* ukończenie **[oprogramowania referencyjnego](https://github.com/ssbingo/pond-aeration-esp32-firmware)**
  dla Waveshare ESP32-S3-POE-ETH-8DI-8RO — backend ESP32 po stronie adaptera jest już gotowy; podstawa
  firmware (Ethernet, przekaźniki, przyciski na wejściach cyfrowych, API HTTP/WS, wbudowane w
  urządzenie zabezpieczenie, przyjazny dla urządzeń mobilnych interfejs webowy na porcie 80) jest
  zatwierdzona, a kolejnym krokiem są czujniki referencyjne (rozpuszczony tlen, ciśnienie w linii
  powietrza, temperatura wody — zobacz [dev/hardware/sensors.md](../../dev/hardware/sensors.md));
* kolejny **adapter widżetów vis-2** do obsługi i monitorowania.

Pełny, oparty na kamieniach milowych plan znajdziesz w [PROJECT_PLAN.md](../../PROJECT_PLAN.md).

---

📖 [Dokumentacja główna (angielski)](../../README.md)
