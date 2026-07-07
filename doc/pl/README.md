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

> ⚠️ **Status projektu: prace w toku.** Model konfiguracji i kompletny model punktów danych są
> gotowe: adapter sprawdza Twoją konfigurację i odpowiednio tworzy (oraz czyści) wszystkie swoje
> obiekty. Silnik sterowania, backendy sprzętowe i funkcje monitorowania są dodawane etap po etapie
> (kamień milowy po kamieniu milowym). Nie jest jeszcze przeznaczona do użytku produkcyjnego.

---

## Spis treści

1. [Co robi adapter](#1-co-robi-adapter)
2. [Koncepcja bezpieczeństwa](#2-koncepcja-bezpieczeństwa)
3. [Wymagania](#3-wymagania)
4. [Instalacja](#4-instalacja)
5. [Przegląd konfiguracji](#5-przegląd-konfiguracji)
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

Zaworami i pompą można sterować albo przez **istniejące stany ioBroker** (z dowolnego adaptera
udostępniającego przełączniki), albo **bezpośrednio na ESP32** z towarzyszącym firmware.

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
* Jeden lub więcej zaworów dostępnych jako stany ioBroker albo ESP32 z towarzyszącym firmware.

## 4. Instalacja

Zainstaluj adapter z panelu admin ioBroker (lub, na etapie rozwoju, z repozytorium GitHub) i utwórz
instancję. Otwórz ustawienia instancji, aby ją skonfigurować.

## 5. Przegląd konfiguracji

Strona ustawień rozrasta się wraz z kolejnymi kamieniami milowymi. Planowane sekcje: ogólne/backend,
punkty napowietrzania, sterowanie (harmonogram/round-robin/grupy), czujniki, astro i lokalizacja,
sprzężenie z feederem, bezpieczeństwo i powiadomienia. Pełny projekt znajdziesz w
[PROJECT_PLAN.md](../../PROJECT_PLAN.md).

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

**Statystyki**

| Obiekt | Typ | Rola | Opis |
|--------|-----|------|------|
| `statistics.compressorRuntimeTodayH` | number | `value` | Dzisiejszy czas pracy sprężarki (godziny) |
| `statistics.switchCyclesToday` | number | `value` | Dzisiejsze cykle przełączeń zaworów |

Gdy punkt, grupa lub czujnik zostanie usunięty z konfiguracji, jego obiekty są automatycznie
czyszczone.

## 7. Plan rozwoju

Pełny, oparty na kamieniach milowych plan wdrożenia (silnik sterowania, backendy HAL, firmware ESP32,
monitorowanie, sprzężenie z feederem, tryb zimowy oraz następujący po nim adapter widżetów vis-2)
znajdziesz w [PROJECT_PLAN.md](../../PROJECT_PLAN.md).

---

📖 [Dokumentacja główna (angielski)](../../README.md)
