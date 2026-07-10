![Logo](../../admin/automatic-pond-aeration.png)
# ioBroker.automatic-pond-aeration

<p align="center">
  <a href="https://www.buymeacoffee.com/ssbingo"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=ssbingo&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" /></a>
</p>

## Adaptador automatic-pond-aeration para ioBroker

Este adaptador **controla y supervisa un sistema de aireación de estanque**. Una bomba de aire/un
compresor suministra aire a través de válvulas (electroválvulas) hasta **un máximo de 8 puntos de
aireación** del estanque. El adaptador conmuta esas válvulas mediante un **horario programado**, un
**ciclo rotativo (round-robin)** o un **programa de grupos**, y protege la bomba con un
**enclavamiento de seguridad**: mientras la bomba funciona, siempre se mantiene abierta al menos una
válvula; de lo contrario, se abre la **válvula de emergencia** y (si la bomba está disponible como
punto de datos) se apaga la bomba.

Opcionalmente puede supervisar el **oxígeno disuelto**, la **temperatura del aire y del agua** y la
**presión**, calcular **horas astronómicas** a partir de tu **geolocalización**, controlar el hardware
**directamente en un ESP32** (sin necesidad de una instancia adicional de ioBroker) y pausar puntos de
aireación seleccionados durante la alimentación cuando
[ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder) está instalado.

> 🛑 **ADVERTENCIA — ESTADO DE DESARROLLO, BIENESTAR ANIMAL (por favor, léelo).**
> Este adaptador **todavía está en desarrollo activo y AÚN NO está verificado para el uso sin
> supervisión.** Controla un **sistema de soporte vital para animales vivos**: un fallo de
> funcionamiento, una configuración incorrecta o un error pueden detener la aireación y **poner en
> peligro la salud y la vida de tus peces y del resto de la vida del estanque** (agotamiento del
> oxígeno, ausencia de un agujero libre de hielo en invierno, una bomba trabajando contra válvulas
> cerradas). **No lo uses sin control:** antes de cualquier funcionamiento sin supervisión,
> **obsérvalo de cerca y verifica cada función** en tu propio hardware durante un periodo
> significativo, y mantén una aireación/salvaguarda independiente y probada. **Úsalo bajo tu propia
> responsabilidad.** *(Este aviso permanece hasta que se revoque explícitamente.)*

> ⚠️ **Estado del proyecto.** Totalmente implementado y configurable desde el admin: el control de las
> válvulas (horario programado, ciclo rotativo round-robin, grupos), el **enclavamiento de seguridad**
> contra el dead-heading, la **supervisión** (oxígeno, temperatura aire/agua, presión con alarmas),
> las **horas astronómicas y la geolocalización**, el **acoplamiento con el feeder**, el **modo
> invierno / libre de hielo**, el **lazo cerrado de oxígeno**, las **notificaciones** a través de un
> adaptador de mensajería, las **estadísticas de funcionamiento**, un **modo de prueba dry-run**, los
> **botones de anulación** por punto y el backend de hardware **ESP32** directo (se comunica por HTTP
> con el firmware de referencia — flaséalo en el navegador desde la
> [página de flasheo del firmware](https://ssbingo.github.io/pond-aeration-flash/)). El backend
> predeterminado controla tus válvulas y la bomba a través de estados de ioBroker existentes, así que
> funciona cualquier placa de relés.

> 📘 **Manual completo paso a paso (PDF, para principiantes — con diagramas de cableado, preguntas
> frecuentes y resolución de problemas):** English → [../../docs/manual/pond-aeration-manual.en.pdf](../../docs/manual/pond-aeration-manual.en.pdf) ·
> Deutsch → [../../docs/manual/pond-aeration-manual.de.pdf](../../docs/manual/pond-aeration-manual.de.pdf)
> (fuente y compilación en [../../docs/manual/](../../docs/manual/)).

---

## Índice

1. [Qué hace el adaptador](#1-qué-hace-el-adaptador)
2. [Concepto de seguridad](#2-concepto-de-seguridad)
3. [Requisitos](#3-requisitos)
4. [Instalación](#4-instalación)
5. [Configuración](#5-configuración)
6. [Objetos / puntos de datos](#6-objetos--puntos-de-datos)
7. [Hoja de ruta](#7-hoja-de-ruta)

---

## 1. Qué hace el adaptador

Una aireación de estanque distribuye el aire de una sola bomba a varios difusores/piedras de aire. Qué
puntos reciben aire lo deciden las **electroválvulas**. Este adaptador decide **cuándo** se abre cada
válvula:

* **Horario programado** – abrir un punto/grupo durante las franjas horarias configuradas por día de
  la semana.
* **Ciclo rotativo (round-robin)** – recorrer los puntos por turnos, cada uno abierto durante un
  tiempo de permanencia configurable.
* **Grupos** – controlar varios puntos juntos; **nunca puede haber más grupos que puntos**.

Las válvulas y la bomba se controlan **o bien** a través de **estados de ioBroker existentes** (de
cualquier adaptador que exponga los interruptores) **o bien directamente en un controlador ESP32
dedicado** que ejecuta el firmware de referencia — sin necesidad de una instancia adicional de
ioBroker. Esto se elige en **Backend de hardware** (pestaña General); consulta
[Configuración → General](#general).

## 2. Concepto de seguridad

Un compresor de aire **nunca debe funcionar contra válvulas completamente cerradas** (dead-heading),
ya que esto provoca sobrepresión y puede dañar la bomba. Por eso:

* Mientras la bomba funciona, **siempre se mantiene abierta al menos una válvula** (mínimo
  configurable).
* Si esto no puede garantizarse, se **abre la válvula de emergencia** y, si la bomba es controlable,
  se **apaga la bomba**.
* La conmutación de las válvulas usa el principio **make-before-break** (la siguiente válvula se abre
  antes de que la anterior se cierre), de modo que nunca hay un instante con todas las válvulas
  cerradas.

> 💡 **Recomendación de cableado:** utiliza una válvula de emergencia **normalmente abierta (NO)** para
> que se abra ante un corte de corriente (a prueba de fallos). Cuando el hardware funciona en un
> ESP32, el mismo enclavamiento también se ejecuta localmente en el dispositivo, de modo que un fallo
> de red o de ioBroker no puede dañar la bomba.

## 3. Requisitos

* Node.js ≥ 22
* js-controller ≥ 6.0.11, admin ≥ 7.6.20
* Una o varias válvulas accesibles como estados de ioBroker (p. ej. un adaptador de relé/enchufe
  inteligente).

## 4. Instalación

Instala el adaptador desde el admin de ioBroker (o, durante el desarrollo, desde el repositorio de
GitHub) y crea una instancia. Abre los ajustes de la instancia para configurarlo.

## 5. Configuración

La página de ajustes está organizada en pestañas. No tienes que rellenarlo todo, solo las partes que
uses.

### General
- **Habilitación principal** – el interruptor de encendido/apagado de todo el adaptador. Cuando está
  apagado, no se controla nada.
- **Dry-run (solo registro, no conmutar el hardware)** – todo el motor de control se ejecuta y los
  puntos de datos se actualizan, pero los comandos de válvula/bomba solo se escriben en el registro
  (`[DRY-RUN] would …`) en lugar de en los estados reales. Ideal para la puesta en marcha y para
  probar una configuración antes de cablearla.
- **Backend de hardware** – `Estados de ioBroker existentes` (predeterminado) controla tus
  válvulas/bomba a través de estados de otros adaptadores. `ESP32 (directo)` se comunica por HTTP con
  el firmware de referencia en un Waveshare ESP32-S3-POE-ETH-8DI-8RO. Flashea el firmware en el
  navegador desde la [página de flasheo del firmware](https://ssbingo.github.io/pond-aeration-flash/)
  (Chrome/Edge, sin software adicional), luego define el **host/IP** y asigna el **relé de la válvula
  de emergencia** y el **relé de la bomba** (0–7); los puntos de aireación usan el canal de relé
  configurado por punto. El adaptador envía una configuración de seguridad y un latido (heartbeat)
  para que el sistema de seguridad en el propio dispositivo del firmware proteja el estanque incluso
  si ioBroker está caído. Al dispositivo se accede por su **IP** — mediante **Ethernet/PoE** o
  **WiFi opcional** (que se habilita en la propia página de ajustes del dispositivo; el WiFi
  requiere la antena externa del dispositivo — consulta el manual). **Sin LAN en el estanque**, el
  dispositivo puede configurarse por completo por WiFi mediante su **punto de acceso de configuración**
  integrado (`pond-aeration-setup`, portal cautivo en `http://192.168.4.1/`) — consulta el manual.
  - **Programación autónoma (funciona sin ioBroker)** *(solo ESP32, opcional)* – cuando está
    activada, el adaptador también envía tus programaciones al dispositivo; si se pierde la
    conexión, el ESP32 sigue ejecutándolas por sí solo usando su reloj NTP (el enclavamiento de
    seguridad dead-head sigue aplicándose). La secuencia cíclica permanece en el adaptador.
  - **Compatibilidad del firmware** – el adaptador y el firmware se emparejan mediante una **versión
    del protocolo** (el contrato estricto), no por números de versión exactos. Esta versión del
    adaptador habla **protocolo 1** y **recomienda firmware v1.6.0** (mínimo v1.0.0); el admin lo
    muestra y enlaza a las publicaciones (releases). Al conectar, la versión del dispositivo y una
    marca de compatibilidad se publican como `info.deviceFirmware` e `info.firmwareCompatible`, y
    cualquier discrepancia de protocolo se escribe en el registro. Consulta la tabla de compatibilidad
    en el [manual](../../docs/manual/pond-aeration-manual.en.pdf) / repo del firmware.
  - **Licencia** *(solo si tu firmware incluye la capa de licencia opcional)* – el dispositivo
    ejecuta un nivel: **free** (solo supervisión), **community** (control de relés) o **pro** (+ la
    programación autónoma independiente); la seguridad (a prueba de fallos, válvula de emergencia,
    enclavamiento dead-head, botones manuales) está siempre activa con independencia de ello. Un
    dispositivo nuevo funciona por completo (**pro**) durante un periodo de prueba y luego vuelve a
    free hasta que se introduce una clave de activación en la página `/license` del dispositivo. El
    adaptador muestra el estado en `info.licenseTier` / `info.licenseTrialDaysLeft` /
    `info.deviceCode`; si el dispositivo **no tiene licencia para el control**, la supervisión sigue
    funcionando y el control se omite (consulta `info.licenseControlBlocked`). El firmware público
    sin la capa no se ve afectado.
    *Nota sobre el reflasheo:* la clave de activación se guarda en el ESP y se **borra al volver a
    flashear mediante el instalador del navegador** (comienza un nuevo periodo de prueba). El **código
    del dispositivo deriva del hardware y nunca cambia**, por lo que basta con **volver a introducir
    la misma clave de activación** — no hace falta una clave nueva. Una **actualización del firmware
    desde la página Update del dispositivo** (actualización online con un clic o subida de un archivo)
    conserva la activación y todos los ajustes; solo el instalador la restablece.
  - **Reflejo de sensores** – en cada sondeo el adaptador también envía tus puntos de datos de
    sensores configurados (oxígeno, temperatura agua/aire, presión) al dispositivo, de modo que
    aparezcan en la **propia interfaz web del ESP** (etiquetados como *(ioBroker)*) incluso para
    sensores que solo son estados de ioBroker y no están cableados al ESP. Un sensor del ESP cableado
    físicamente mantiene la prioridad; los valores enviados caducan al cabo de unos minutos. Requiere
    firmware ≥ 1.1.7.
- **Intervalo de sondeo (s)** – con qué frecuencia se consulta el estado del backend (p. ej. `30`).

### Puntos de aireación
El núcleo de la configuración. Añade **hasta 8** puntos; cada punto es una válvula. Por cada punto:
- **Nombre** – p. ej. `Pier`, `Deep zone`. Con el backend **ESP32** este nombre también se **muestra
  en la propia interfaz web del dispositivo** (en el canal de relé del punto) — una **función con
  licencia** (a partir del nivel **community**). `Ch 7 = Notventil` (válvula de emergencia) y
  `Ch 8 = Pumpe` (bomba) son etiquetas fijas. Consulta
  [Nombres en la interfaz web del ESP32](#nombres-en-la-interfaz-web-del-esp32).
- **Habilitado** – incluir este punto en el control.
- **Backend** – `ioBroker` (un estado externo) o `ESP32` (un canal de relé en el dispositivo). La
  opción `ESP32` solo aparece cuando el **Backend de hardware** (pestaña General) es `ESP32
  (directo)`.
- **Estado de válvula / canal** – para el backend ioBroker, elige el estado interruptor que abre la
  válvula (mediante el explorador de objetos). Para el backend ESP32, elige el **canal de relé** en un
  menú desplegable: los canales que controlan la **bomba** y la **válvula de emergencia** se muestran
  como *reservados* y los canales ya ocupados por otro punto como *en uso*, de modo que solo puedas
  elegir uno libre. Cuando no queda ningún canal, añade más puntos como **estados de ioBroker**
  mediante la columna Backend.
- **Botón de anulación** *(opcional)* – un pulsador físico por punto (p. ej. una entrada digital de
  un ESP32, o cualquier estado booleano). Funciona como **conmutador (toggle)**: una pulsación fuerza
  el punto **encendido con prioridad sobre el control automático**
  (horario/secuencia/invierno/oxígeno) e incluso sobre una pausa del feeder — *solo el interruptor
  principal o un disparo de seguridad lo anulan*. Pulsa de nuevo para soltarlo. (Se prevén más modos
  de botón; el campo está preparado para ellos.) Un botón solo está disponible para una **válvula de
  aireación** — un punto que se encuentra en el canal de relé ESP32 de la **bomba** o de la **válvula
  de emergencia** no puede tener uno (la opción aparece deshabilitada). Con el backend ESP32, un botón
  pulsado **en el dispositivo** se refleja de vuelta en ioBroker (`aeration.point.<n>.buttonOn`) y
  obtiene la misma prioridad.
- **Nombre del botón** *(backend ESP32, opcional)* – un nombre descriptivo para el botón de anulación
  de este punto, mostrado en la interfaz web del dispositivo (ver más abajo). Vacío → el botón muestra
  el nombre del punto.

#### Nombres en la interfaz web del ESP32

*(Backend ESP32, **función con licencia** — disponible a partir del nivel **community**.)* Da a tus
canales y botones nombres descriptivos que aparecen en las propias páginas web del dispositivo en
lugar de `Ch 1…8` / `DI 1…8`:

- El adaptador **envía el Nombre de cada punto de aireación** a su canal de relé (Ch 1–6) y el
  **Nombre del botón** opcional de cada punto a la entrada digital correspondiente (DI 1–8).
- **Ch 7 = Notventil** (válvula de emergencia) y **Ch 8 = Pumpe** (bomba) son **fijos** y no se pueden
  renombrar.
- **Autónomo (sin adaptador):** los mismos nombres se pueden editar **en el dispositivo** en *Ajustes
  → Namen (Kanäle & Taster)* y se almacenan en el ESP (NVS); cuando el adaptador está conectado los
  sobrescribe con los nombres configurados aquí.
- En el firmware **free** (sin licencia) los nombres se ignoran y las páginas muestran las etiquetas
  predeterminadas `Ch`/`DI`.

### Grupos
Agrupa puntos para conmutarlos juntos (p. ej. un botón abre varios difusores). Da un nombre al grupo
y marca sus puntos miembros. **Nunca puede haber más grupos que puntos.**

### Control
- **Ciclo rotativo (round-robin)** – recorrer los puntos por turnos, cada uno abierto durante el
  **tiempo de permanencia** (segundos).
  - **Secuencia (puntos y grupos)** – define opcionalmente un **ciclo ordenado de pasos**, donde cada
    paso apunta a un único **punto o a un grupo entero** y puede llevar su propio tiempo de
    permanencia. Esto permite ejecutar p. ej. *grupo 1 → grupo 3 → punto 1 → …* y **mezclar**
    libremente puntos y grupos. Reordena los pasos con las flechas arriba/abajo en el admin. Deja la
    secuencia vacía para volver al round-robin simple sobre todos los puntos.
- **Horarios** – abrir puntos/grupos seleccionados durante una franja horaria por día de la semana.
  **Desde**/**Hasta** se eligen con un **selector de reloj** (hora/minuto, 24 h; se admiten franjas
  nocturnas como `22:00`–`06:00`). Un horario activo tiene **prioridad sobre el round-robin / la
  secuencia**.
- **Modo invierno / libre de hielo** – durante la temporada configurada (**Inicio**/**Fin** elegidos
  con un **calendario** — solo cuentan el **día y el mes**, recurrente cada año, p. ej. 1 nov – 15 mar,
  cruzando el cambio de año) los puntos seleccionados se
  fuerzan a abrir para mantener un agujero libre de hielo. Opcionalmente marca **Solo cuando hace
  frío (protección contra heladas)** y define un **umbral de temperatura del aire** para que el
  estanque solo se airee mientras realmente está helando (esto requiere la supervisión de la
  temperatura del aire). Deja **Puntos que se mantienen abiertos** vacío para airear todo el
  estanque. El modo invierno se ejecuta en el modo de funcionamiento `auto` y, como todo programa,
  sigue cediendo ante el enclavamiento de seguridad y una pausa del feeder.

### Sensores
Supervisión opcional. Para cada sensor marca **Habilitado** y elige el **estado de origen**:
- **Oxígeno disuelto** – con un umbral bajo (activa `sensors.oxygenAlarm`), un valor objetivo y una
  histéresis; el **% de saturación** de oxígeno se calcula a partir de la temperatura del agua.
  - **Lazo cerrado de oxígeno** – cuando está habilitado, el adaptador **fuerza la aireación**
    mientras el oxígeno está por debajo del umbral bajo y la mantiene hasta que se recupera hasta el
    valor objetivo (o `low + hysteresis` cuando no se ha definido un objetivo). Deja **Puntos
    reforzados** vacío para reforzar todo el estanque. Como el modo invierno, el lazo se ejecuta en
    el modo `auto` y cede ante la seguridad y las pausas del feeder.
- **Temperatura del aire/agua**.
- **Presión** – con mín/máx (fuera de rango activa `sensors.pressureAlarm`).

### Ubicación
Necesaria para las horas astronómicas (amanecer/atardecer/noche).
- **Origen de la ubicación** – `Ubicación del sistema ioBroker` (usa las coordenadas de tu sistema) o
  `Ubicación personalizada`. Para una ubicación personalizada, escribe una dirección y pulsa
  **Buscar** (geocodificada a demanda mediante OpenStreetMap/Nominatim) o haz clic/arrastra el
  marcador en el mapa.

### Feeder
Pausar puntos seleccionados mientras
[ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder) está alimentando,
para que la comida no se disperse.
- Elige la **instancia del feeder** (detectada automáticamente) y marca los **interruptores del
  feeder** a vigilar.
- **Modo de duración** – `Medir` vigila el interruptor (pausa = alimentación + desfase, sin conocer de
  antemano la duración de la alimentación); `Pulso` usa una duración de alimentación fija.
- **Desfase (s)** – pausa adicional después de que termine la alimentación. **Debería ser al menos el
  tiempo medio que los animales necesitan para comer** (ejemplo: 15 s de alimentación + 60 s de
  desfase ⇒ 75 s de aireación en pausa).
- **Puntos afectados** – qué puntos se pausan durante la alimentación.

### Seguridad
Cada campo de esta pestaña incluye una **explicación en el admin** de lo que hace y su efecto — léelas,
porque esta es la pestaña donde un valor equivocado más importa.
- **Válvulas abiertas mín. mientras la bomba funciona** – la protección contra el dead-heading
  (predeterminado `1`).
- **Intervalo del watchdog (s)** y **solapamiento make-before-break (s)**.
- **Bomba** – si es **controlable**, la **señal** de la bomba y los tiempos mínimos de
  encendido/apagado contra el ciclado demasiado frecuente. Cuando es controlable, el adaptador
  **acciona la bomba para que siga la demanda de aireación** — funciona mientras al menos el mínimo de
  válvulas está abierto y se apaga cuando el estanque está inactivo o ante un disparo por dead-head
  (respetando los tiempos mínimos de encendido/apagado); cuando *no* es controlable, la bomba solo se
  observa y la válvula de emergencia la protege por sí sola. *Con el backend **ESP32** la señal de la
  bomba es el **canal de relé ESP32** — exactamente el mismo que se define en General → Backend de
  hardware, mostrado aquí para que las dos pestañas nunca puedan contradecirse; con el backend
  **ioBroker** es un estado de ioBroker.*
- **Válvula de emergencia** – su **señal**, si es **normalmente abierta** (a prueba de fallos), el
  **tipo** de válvula (electroválvula o válvula de bola motorizada) y, para una válvula motorizada, su
  **tiempo de recorrido**. *Con el backend ESP32 la señal es igualmente el canal de relé ESP32 de la
  válvula de emergencia (igual que en General).*

### Notificaciones
Habilita las notificaciones y elige una **instancia de mensajería** (cualquier adaptador de tipo
`messaging`, p. ej. Telegram o Pushover), luego **marca qué eventos** deben enviar un mensaje:
- **Enclavamiento de seguridad** – cuando el enclavamiento contra el dead-heading se dispara o se libera;
- **Alarma de oxígeno** – cuando el oxígeno disuelto baja demasiado o se recupera;
- **Alarma de presión** – cuando la presión sale o vuelve a entrar en su rango.

En cada flanco (activación y liberación) se envía un texto breve y localizado. Si no se marca ningún
evento, no se envía nada.

## 6. Objetos / puntos de datos

El adaptador crea sus puntos de datos a partir de tu configuración. Marcadores de posición: `<n>` =
índice del punto de aireación (0–7), `<g>` = índice de grupo. Los objetos marcados con **(w)** son
comandos escribibles; todos los demás son valores de estado de solo lectura que el adaptador
actualiza.

**General**

| Objeto | Tipo | Rol | Descripción |
|--------|------|-----|-------------|
| `info.connection` | boolean | `indicator.connected` | El adaptador funciona / configuración válida |
| `info.backend` | string | `text` | Backend de hardware activo (`iobroker` o `esp32`) |
| `info.activeMode` | string | `text` | Modo de funcionamiento actual |
| `info.dryRun` | boolean | `indicator` | Dry-run activo (no se conmuta ningún hardware) |

**Backend ESP32 (info)** (solo con el backend de hardware ESP32)

| Objeto | Tipo | Rol | Descripción |
|--------|------|-----|-------------|
| `info.deviceFirmware` | string | `text` | Versión de firmware reportada por el ESP32 |
| `info.firmwareCompatible` | boolean | `indicator` | El protocolo del firmware es compatible con este adaptador |
| `info.licenseTier` | string | `text` | Nivel de licencia activo: `free` (supervisión), `community` (control de relés) o `pro` (+ programación autónoma); vacío si el firmware no tiene restricción de licencia |
| `info.licenseTrialDaysLeft` | number | `value` | Días de prueba de la licencia restantes (0 = no hay periodo de prueba en curso) |
| `info.deviceCode` | string | `text` | Código del dispositivo — proporciónalo al desbloquear para recibir una clave de activación |
| `info.licenseControlBlocked` | boolean | `indicator` | El dispositivo rechazó un comando de control (sin licencia para el control) |

**Control (comandos escribibles)**

| Objeto | Tipo | Rol | Descripción |
|--------|------|-----|-------------|
| `control.enabled` | boolean (w) | `switch.enable` | Habilitación principal |
| `control.mode` | string (w) | `text` | Modo de funcionamiento: `auto`, `manual` u `off` |
| `control.allOff` | boolean (w) | `button` | Cerrar todas las válvulas |
| `control.point.<n>.open` | boolean (w) | `switch` | Abrir manualmente la válvula del punto `<n>` |
| `control.group.<g>.active` | boolean (w) | `switch` | Activar manualmente el grupo `<g>` |

**Puntos de aireación** (un canal por cada punto configurado, con el nombre del punto)

| Objeto | Tipo | Rol | Descripción |
|--------|------|-----|-------------|
| `aeration.point.<n>.valveState` | boolean | `indicator` | La válvula está abierta |
| `aeration.point.<n>.active` | boolean | `indicator` | El punto está aireando actualmente |
| `aeration.point.<n>.buttonOn` | boolean | `indicator` | Botón de anulación manual activo (solo con un botón configurado) |
| `aeration.point.<n>.runtimeTodaySec` | number | `value` | Tiempo de funcionamiento de hoy (segundos) |
| `aeration.point.<n>.runtimeTotalH` | number | `value` | Tiempo de funcionamiento total (horas, para mantenimiento) |
| `aeration.point.<n>.lastChange` | number | `value.time` | Marca de tiempo del último cambio de válvula |
| `aeration.point.<n>.error` | string | `text` | Último error de este punto |

**Grupos**

| Objeto | Tipo | Rol | Descripción |
|--------|------|-----|-------------|
| `groups.<g>.members` | string | `json` | Índices de los puntos miembros |
| `groups.<g>.active` | boolean | `indicator` | El grupo está actualmente activo |

**Seguridad**

| Objeto | Tipo | Rol | Descripción |
|--------|------|-----|-------------|
| `safety.interlockActive` | boolean | `indicator.alarm` | Enclavamiento de seguridad actualmente activo |
| `safety.emergencyValve` | boolean | `indicator` | La válvula de emergencia está abierta |
| `safety.pumpRunning` | boolean | `indicator` | La bomba está funcionando |
| `safety.openValveCount` | number | `value` | Número de válvulas abiertas |
| `safety.lastTripReason` | string | `text` | Motivo del último disparo del enclavamiento |

**Sensores** (creados solo cuando la supervisión correspondiente está habilitada)

| Objeto | Tipo | Rol | Descripción |
|--------|------|-----|-------------|
| `sensors.oxygen` | number | `value` | Oxígeno disuelto (mg/l) |
| `sensors.oxygenSaturation` | number | `value` | Saturación de oxígeno (%) |
| `sensors.oxygenAlarm` | boolean | `indicator.alarm` | Oxígeno por debajo del umbral bajo |
| `sensors.oxygenBoostActive` | boolean | `indicator` | El lazo cerrado de oxígeno está forzando la aireación (solo con el lazo habilitado) |
| `sensors.airTemperature` | number | `value.temperature` | Temperatura del aire (°C) |
| `sensors.waterTemperature` | number | `value.temperature` | Temperatura del agua (°C) |
| `sensors.pressure` | number | `value.pressure` | Presión del sistema (bar) |
| `sensors.pressureAlarm` | boolean | `indicator.alarm` | Presión fuera de rango |

**Astronomía y ubicación**

| Objeto | Tipo | Rol | Descripción |
|--------|------|-----|-------------|
| `astro.sunrise` / `astro.sunset` / `astro.solarNoon` | string | `text` | Horas solares para la ubicación |
| `astro.isNight` | boolean | `indicator` | Actualmente es de noche |
| `location.latitude` / `location.longitude` | number | `value.gps.*` | Coordenadas resueltas |
| `location.resolvedAddress` | string | `text` | Dirección resuelta |

**Acoplamiento con el feeder** (creado solo cuando el acoplamiento con el feeder está habilitado)

| Objeto | Tipo | Rol | Descripción |
|--------|------|-----|-------------|
| `feeder.pauseActive` | boolean | `indicator` | Aireación en pausa para la alimentación |
| `feeder.pauseUntil` | number | `value.time` | Pausa activa hasta |
| `feeder.lastFeedStart` | number | `value.time` | Último inicio de alimentación |

**Modo invierno / libre de hielo** (creado solo cuando el modo invierno está habilitado)

| Objeto | Tipo | Rol | Descripción |
|--------|------|-----|-------------|
| `winter.active` | boolean | `indicator` | El modo invierno está forzando actualmente la aireación |
| `winter.frostActive` | boolean | `indicator` | La protección contra heladas está activada (hace suficiente frío) |

**Estadísticas**

| Objeto | Tipo | Rol | Descripción |
|--------|------|-----|-------------|
| `aeration.point.<n>.runtimeTodaySec` | number | `value` | Tiempo de funcionamiento del punto `<n>` de hoy (segundos) |
| `aeration.point.<n>.runtimeTotalH` | number | `value` | Tiempo de funcionamiento total del punto `<n>` (horas) |
| `statistics.compressorRuntimeTodayH` | number | `value` | Tiempo de funcionamiento del compresor de hoy (horas) |
| `statistics.switchCyclesToday` | number | `value` | Ciclos de conmutación de válvulas de hoy |

Cuando se elimina un punto, un grupo o un sensor de la configuración, sus objetos se limpian
automáticamente.

## 7. Hoja de ruta

Hecho: interfaz de configuración, control de válvulas (horario/round-robin/grupos), el enclavamiento
de seguridad contra el dead-heading, la supervisión, astro y geolocalización, el acoplamiento con el
feeder, el **modo invierno / libre de hielo**, el **lazo cerrado de oxígeno**, las **notificaciones**,
las **estadísticas de funcionamiento**, el **modo de prueba dry-run** y el backend de hardware
**ESP32** directo con su firmware de referencia (que flasheas en el navegador desde la
[página de flasheo del firmware](https://ssbingo.github.io/pond-aeration-flash/)). **Todavía
pendiente:**

* un posterior **adaptador de widgets vis-2** para el manejo y la supervisión.

Consulta [PROJECT_PLAN.md](../../PROJECT_PLAN.md) para el plan completo basado en hitos.

---

📖 [Documentación principal (inglés)](../../README.md)
