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
> punkt oraz bezpośredni sprzętowy backend **ESP32** (komunikuje się przez HTTP z oprogramowaniem
> referencyjnym — wgraj je w przeglądarce ze [strony
> flashowania](https://ssbingo.github.io/pond-aeration-flash/)). Domyślny backend steruje Twoimi
> zaworami i pompą przez istniejące stany ioBroker, więc działa dowolna płytka przekaźników.

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

Zawory i pompa są sterowane **albo** przez **istniejące stany ioBroker** (z dowolnego adaptera
udostępniającego przełączniki), **albo bezpośrednio na dedykowanym kontrolerze ESP32** z uruchomionym
oprogramowaniem referencyjnym — bez dodatkowej instancji ioBroker. Wybierasz to w sekcji **Backend
sprzętowy** (zakładka „Ogólne"); zobacz [Konfiguracja → Ogólne](#ogólne).

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
  stany innych adapterów. `ESP32 (bezpośrednio)` komunikuje się przez HTTP z oprogramowaniem
  referencyjnym na Waveshare ESP32-S3-POE-ETH-8DI-8RO. Wgraj firmware w przeglądarce ze [strony
  flashowania](https://ssbingo.github.io/pond-aeration-flash/) (Chrome/Edge, bez dodatkowego
  oprogramowania), a następnie ustaw **host/IP** oraz przypisz **przekaźnik zaworu awaryjnego**
  i **przekaźnik pompy** (0–7); punkty napowietrzania używają kanału przekaźnika ustawionego dla
  każdego punktu. Adapter wysyła konfigurację bezpieczeństwa oraz sygnał kontrolny (heartbeat), aby
  wbudowane w urządzenie zabezpieczenie firmware chroniło staw, nawet gdy ioBroker jest niedostępny.
  Urządzenie jest dostępne przez swój **adres IP** — przez **Ethernet/PoE** lub **opcjonalne WiFi**
  (włączane na własnej stronie ustawień urządzenia; WiFi wymaga zewnętrznej anteny urządzenia — zobacz
  podręcznik). Gdy **przy stawie nie ma sieci LAN**, urządzenie można skonfigurować w całości przez WiFi
  za pomocą wbudowanego **hotspotu konfiguracyjnego** (`pond-aeration-setup`, portal przechwytujący pod
  adresem `http://192.168.4.1/`) — zobacz podręcznik.
  - **Autonomiczny harmonogram (działa bez ioBroker)** *(tylko ESP32, opcjonalnie)* – gdy włączone,
    adapter wysyła też Twoje harmonogramy do urządzenia; jeśli połączenie zostanie przerwane, ESP32
    samodzielnie kontynuuje ich realizację, korzystając z własnego zegara NTP (blokada
    bezpieczeństwa dead-head nadal obowiązuje). Sekwencja cykliczna pozostaje po stronie adaptera.
  - **Zgodność firmware** – adapter i firmware są dopasowywane za pomocą **wersji protokołu** (twardy
    kontrakt), a nie dokładnych numerów wydań. Ta wersja adaptera mówi **protokołem 1** i **zaleca
    firmware v1.7.10** (minimum v1.0.0); panel admin pokazuje to i odsyła do wydań. Po połączeniu
    wersja urządzenia i flaga zgodności są publikowane jako `info.deviceFirmware` i
    `info.firmwareCompatible`, a każda niezgodność protokołu jest zapisywana w dzienniku. Zobacz
    tabelę zgodności w [podręczniku](../../docs/manual/pond-aeration-manual.en.pdf) / repozytorium
    firmware.
  - **Licencjonowanie** *(tylko jeśli Twoje firmware zawiera opcjonalną nakładkę licencyjną)* –
    urządzenie działa na jednym z poziomów: **free** (tylko monitorowanie), **community** (sterowanie
    przekaźnikami) lub **pro** (+ autonomiczny, samodzielny harmonogram); bezpieczeństwo
    (zabezpieczenie awaryjne, zawór awaryjny, blokada dead-head, przyciski ręczne) jest zawsze
    aktywne, niezależnie od tego. Nowe urządzenie działa w pełni (**pro**) przez okres próbny, a
    następnie wraca do poziomu free, dopóki na stronie `/license` urządzenia nie zostanie
    wprowadzony klucz aktywacyjny. Adapter pokazuje status w `info.licenseTier` /
    `info.licenseTrialDaysLeft` / `info.deviceCode`; jeśli urządzenie **nie ma licencji na
    sterowanie**, monitorowanie nadal działa, a sterowanie jest pomijane (zobacz
    `info.licenseControlBlocked`). Publiczne firmware bez tej nakładki nie jest tym objęte.
    *Uwaga o ponownym flashowaniu:* klucz aktywacyjny jest przechowywany na ESP i **jest usuwany
    podczas ponownego flashowania przez instalator w przeglądarce** (rozpoczyna się nowy okres
    próbny). **Kod urządzenia wynika ze sprzętu i nigdy się nie zmienia**, więc **można po prostu
    wprowadzić ponownie ten sam klucz aktywacyjny** — nowy klucz nie jest potrzebny. Aktualizacja
    firmware **przez stronę Update urządzenia** (aktualizacja online jednym kliknięciem lub przesłanie
    pliku) zachowuje aktywację i wszystkie ustawienia; tylko instalator ją resetuje.
  - **Dublowanie czujników** – przy każdym odpytaniu adapter dodatkowo wysyła Twoje skonfigurowane
    punkty danych czujników (tlen, temperatura wody/powietrza, ciśnienie) do urządzenia, dzięki czemu
    pojawiają się we **własnym interfejsie webowym ESP** (oznaczone *(ioBroker)*) — nawet dla
    czujników, które są tylko stanami ioBroker i nie są podłączone do ESP. Fizycznie podłączony
    czujnik ESP zachowuje priorytet; przesłane wartości znikają po kilku minutach. Wymaga firmware
    ≥ 1.1.7.
- **Interwał odpytywania (s)** – jak często odpytywany jest status backendu (np. `30`).

### Punkty napowietrzania
Serce konfiguracji. Dodaj **do 8** punktów; każdy punkt to jeden zawór. Dla każdego punktu:
- **Nazwa** – np. `Pier`, `Deep zone`. W backendzie **ESP32** ta nazwa jest **wyświetlana także we
  własnym interfejsie webowym urządzenia** (na kanale przekaźnika danego punktu) — **funkcja
  licencjonowana** (od poziomu **community**). `Ch 7 = Notventil` (zawór awaryjny) oraz
  `Ch 8 = Pumpe` (pompa) to stałe etykiety. Zobacz [Nazwy w interfejsie webowym ESP32](#nazwy-w-interfejsie-webowym-esp32).
- **Włączony** – uwzględnij ten punkt w sterowaniu.
- **Backend** – `ioBroker` (obcy stan) lub `ESP32` (kanał przekaźnika na urządzeniu). Opcja `ESP32`
  pojawia się tylko wtedy, gdy **Backend sprzętowy** (zakładka „Ogólne") ma wartość
  `ESP32 (bezpośrednio)`.
- **Stan zaworu / kanał** – dla backendu ioBroker wybierz stan przełącznika, który otwiera zawór
  (przez przeglądarkę obiektów). Dla backendu ESP32 wybierz **kanał przekaźnika** z listy rozwijanej:
  kanały sterujące **pompą** i **zaworem awaryjnym** są pokazane jako *zarezerwowane*, a kanały już
  zajęte przez inny punkt jako *w użyciu*, więc można wybrać tylko wolny. Gdy nie zostanie żaden wolny
  kanał, dodaj kolejne punkty jako **stany ioBroker** przez kolumnę „Backend".
- **Przycisk wymuszenia (override)** *(opcjonalny)* – fizyczny przycisk na każdy punkt (np. wejście
  cyfrowe ESP32 lub dowolny stan logiczny). Działa jako **przełącznik (toggle)**: jedno naciśnięcie
  wymusza punkt **wł. z priorytetem nad sterowaniem automatycznym**
  (harmonogram/sekwencja/zima/tlen), a nawet nad pauzą feedera — *tylko główny wyłącznik lub
  zadziałanie zabezpieczenia go zastępują*. Naciśnij ponownie, aby zwolnić. (Planowane są kolejne
  tryby przycisku; pole jest na nie przygotowane.) Przycisk jest dostępny tylko dla **zaworu
  napowietrzania** — punkt znajdujący się na kanale przekaźnika ESP32 **pompy** lub **zaworu
  awaryjnego** nie może go mieć (opcja jest wyszarzona). W backendzie ESP32 przycisk naciśnięty **na
  urządzeniu** jest odzwierciedlany z powrotem w ioBroker (`aeration.point.<n>.buttonOn`) i otrzymuje
  ten sam priorytet.
- **Nazwa przycisku** *(backend ESP32, opcjonalnie)* – przyjazna nazwa przycisku wymuszenia dla tego
  punktu, wyświetlana w interfejsie webowym urządzenia (patrz niżej). Puste → przycisk pokazuje nazwę
  punktu.

#### Nazwy w interfejsie webowym ESP32

*(backend ESP32, **funkcja licencjonowana** — dostępna od poziomu **community**.)* Nadaj swoim
kanałom i przyciskom przyjazne nazwy, które pojawią się na własnych stronach webowych urządzenia
zamiast `Ch 1…8` / `DI 1…8`:

- Adapter **wysyła nazwę każdego punktu napowietrzania** na jego kanał przekaźnika (Ch 1–6), a
  opcjonalną **nazwę przycisku** każdego punktu na odpowiadające wejście cyfrowe (DI 1–8).
- **Ch 7 = Notventil** (zawór awaryjny) oraz **Ch 8 = Pumpe** (pompa) są **stałe** i nie można ich zmienić.
- **Samodzielnie (bez adaptera):** te same nazwy można edytować **na urządzeniu** w *Settings → Namen
  (Kanäle & Taster)* i są zapisywane na ESP (NVS); gdy adapter jest podłączony, nadpisuje je nazwami
  skonfigurowanymi tutaj.
- Na firmware **free** (bez licencji) nazwy są ignorowane, a strony pokazują domyślne etykiety `Ch`/`DI`.

### Grupy
Grupuj punkty, aby przełączać je razem (np. jeden przycisk otwiera kilka dyfuzorów). Nadaj grupie
nazwę i zaznacz jej punkty składowe. **Nigdy nie może być więcej grup niż punktów.**

### Sterowanie
- **Cykliczna rotacja (round-robin)** – kolejne przełączanie punktów, każdy otwarty przez **czas
  przetrzymania** (sekundy).
  - **Sekwencja (punkty i grupy)** – opcjonalnie zdefiniuj **uporządkowany cykl kroków**, gdzie każdy
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
  - **Zamknięta pętla tlenowa** – po włączeniu adapter **wymusza napowietrzanie na wł.**, gdy tlen
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
- **Pompa** – czy jest **sterowalna**, **sygnał** pompy oraz minimalne czasy wł./wył. przeciw zbyt
  częstemu taktowaniu. Gdy jest sterowalna, adapter **steruje pompą tak, aby podążała za
  zapotrzebowaniem na napowietrzanie** — pracuje, dopóki otwarty jest co najmniej minimalny zestaw
  zaworów, i wyłącza się, gdy staw jest bezczynny lub przy zadziałaniu zabezpieczenia dead-head (z
  zachowaniem minimalnych czasów wł./wył.); gdy *nie* jest sterowalna, pompa jest tylko obserwowana, a
  chroni ją sam zawór awaryjny. *W backendzie **ESP32** sygnałem pompy jest **kanał
  przekaźnika ESP32** — dokładnie ten sam, który ustawiono w Ogólne → Backend sprzętowy, pokazany
  tutaj, aby obie zakładki nigdy nie mogły sobie zaprzeczać; w backendzie **ioBroker** jest to stan
  ioBroker.*
- **Zawór awaryjny** – jego **sygnał**, czy jest **normalnie otwarty** (fail-safe), **typ** zaworu
  (elektrozawór lub silnikowy zawór kulowy) oraz, dla zaworu silnikowego, jego **czas przejścia**. *W
  backendzie ESP32 sygnałem jest również kanał przekaźnika zaworu awaryjnego ESP32 (tak samo jak w
  Ogólne).*

### Powiadomienia
Włącz powiadomienia i wybierz **instancję messaging** (dowolny adapter typu `messaging`, np. Telegram
lub Pushover), a następnie **zaznacz, które zdarzenia** mają wysyłać komunikat:
- **Blokada bezpieczeństwa** – gdy blokada przed pracą przy zamkniętych zaworach zadziała lub ustąpi;
- **Alarm tlenowy** – gdy rozpuszczony tlen spadnie za nisko lub wróci do normy;
- **Alarm ciśnienia** – gdy ciśnienie wyjdzie poza zakres lub do niego wróci.

Przy każdym zboczu (zadziałanie i ustąpienie) wysyłany jest krótki, zlokalizowany tekst. Gdy nie
zaznaczono żadnego zdarzenia, nic nie jest wysyłane.

**Karmienie nie zasypuje powiadomień o blokadzie.** Gdy feeder wstrzymuje punkty napowietrzania,
wszystkie zawory zamykają się, a zawór awaryjny się otwiera – to normalne, więc powiadomienie o
blokadzie jest **wstrzymywane na czas pauzy karmienia**. Prawdziwy problem i tak do Ciebie dotrze:
jeśli pompa naprawdę pracuje przy zamkniętych zaworach (dead-head), **alarm ciśnienia** wyzwoli się
samodzielnie. Jeśli mimo to chcesz otrzymywać powiadomienia o blokadzie podczas karmienia, włącz
**„Powiadamiaj o blokadzie także podczas karmienia"** (opcja `notifyInterlockDuringFeeding`,
wyświetlana pod zdarzeniem blokady).

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

**Backend ESP32 (info)** (tylko przy sprzętowym backendzie ESP32)

| Obiekt | Typ | Rola | Opis |
|--------|-----|------|------|
| `info.deviceFirmware` | string | `text` | Wersja firmware zgłoszona przez ESP32 |
| `info.firmwareCompatible` | boolean | `indicator` | Protokół firmware jest zgodny z tym adapterem |
| `info.licenseTier` | string | `text` | Aktywny poziom licencji: `free` (monitorowanie), `community` (sterowanie przekaźnikami) lub `pro` (+ autonomiczny harmonogram); puste, jeśli firmware nie jest objęte licencjonowaniem |
| `info.licenseTrialDaysLeft` | number | `value` | Pozostałe dni okresu próbnego licencji (0 = brak trwającego okresu próbnego) |
| `info.deviceCode` | string | `text` | Kod urządzenia — podaj go przy odblokowywaniu, aby otrzymać klucz aktywacyjny |
| `info.licenseControlBlocked` | boolean | `indicator` | Urządzenie odrzuciło polecenie sterujące (brak licencji na sterowanie) |

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
| `sensors.oxygenBoostActive` | boolean | `indicator` | Zamknięta pętla tlenowa wymusza napowietrzanie na wł. (tylko przy włączonej pętli) |
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
sprzężenie z feederem, **tryb zimowy / bez lodu**, **zamknięta pętla tlenowa**, **powiadomienia**,
**statystyki czasu pracy**, **testowy tryb dry-run** oraz bezpośredni sprzętowy backend **ESP32** z
jego oprogramowaniem referencyjnym (które wgrywasz w przeglądarce ze [strony
flashowania](https://ssbingo.github.io/pond-aeration-flash/)). **Wciąż przed nami:**

* kolejny **adapter widżetów vis-2** do obsługi i monitorowania.

Pełny, oparty na kamieniach milowych plan znajdziesz w [PROJECT_PLAN.md](../../PROJECT_PLAN.md).

---

📖 [Dokumentacja główna (angielski)](../../README.md)
