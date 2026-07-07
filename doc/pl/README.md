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

> ⚠️ **Status projektu: wczesny szkielet / prace w toku.** Ta wersja tworzy szkielet adaptera (cykl
> życia, obiekty podstawowe, model konfiguracji oraz podstawę blokady bezpieczeństwa). Silnik
> sterowania, backendy sprzętowe i funkcje monitorowania są dodawane etap po etapie (kamień milowy po
> kamieniu milowym). Nie jest jeszcze przeznaczona do użytku produkcyjnego.

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

| Obiekt | Typ | Rola | Opis |
|--------|-----|------|------|
| `info.connection` | boolean | `indicator.connected` | Adapter działa / konfiguracja prawidłowa |
| `control.enabled` | boolean (zapisywalny) | `switch.enable` | Główne włączenie (polecenie) |
| `safety.interlockActive` | boolean | `indicator.alarm` | Blokada bezpieczeństwa obecnie aktywna |

Kolejne punkty danych (dla każdego punktu napowietrzania, grup, czujników, bezpieczeństwa i statystyk)
będą dodawane w miarę wdrażania odpowiednich funkcji; każdy nowy stan zostanie tutaj udokumentowany.

## 7. Plan rozwoju

Pełny, oparty na kamieniach milowych plan wdrożenia (silnik sterowania, backendy HAL, firmware ESP32,
monitorowanie, sprzężenie z feederem, tryb zimowy oraz następujący po nim adapter widżetów vis-2)
znajdziesz w [PROJECT_PLAN.md](../../PROJECT_PLAN.md).

---

📖 [Dokumentacja główna (angielski)](../../README.md)
