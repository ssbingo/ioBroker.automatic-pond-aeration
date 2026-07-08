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
> invierno / libre de hielo**, el **lazo cerrado de oxígeno**, las **notificaciones a través de un
> adaptador de mensajería**, las **estadísticas de funcionamiento** y un **modo de prueba dry-run**.
> **Aún planificado:** el backend de hardware **ESP32** directo. Hasta que llegue el backend ESP32,
> las válvulas y la bomba se controlan a través de estados de ioBroker existentes.

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

Las válvulas y la bomba se controlan a través de **estados de ioBroker existentes** (de cualquier
adaptador que exponga los interruptores). Está previsto un backend de hardware **ESP32** directo (sin
una instancia adicional de ioBroker).

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
  válvulas/bomba a través de estados de otros adaptadores. `ESP32 (directo)` está *previsto* (M7) y
  todavía no está activo.
- **Intervalo de sondeo (s)** – con qué frecuencia se consulta el estado del backend (p. ej. `30`).

### Puntos de aireación
El núcleo de la configuración. Añade **hasta 8** puntos; cada punto es una válvula. Por cada punto:
- **Nombre** – p. ej. `Pier`, `Deep zone`.
- **Habilitado** – incluir este punto en el control.
- **Backend** – `ioBroker` (un estado externo) o `ESP32` (un canal de relé, previsto).
- **Estado de válvula / canal** – para el backend ioBroker, elige el estado interruptor que abre la
  válvula (mediante el explorador de objetos); para ESP32, el número de canal.
- **Botón de anulación** *(opcional)* – un pulsador físico por punto (p. ej. una entrada digital de
  un ESP32, o cualquier estado booleano). Funciona como **conmutador (toggle)**: una pulsación fuerza
  el punto **encendido con prioridad sobre el control automático**
  (horario/secuencia/invierno/oxígeno) e incluso sobre una pausa del feeder — *solo el interruptor
  principal o un disparo de seguridad lo anulan*. Pulsa de nuevo para soltarlo. (Se prevén más modos
  de botón; el campo está preparado para ellos.)

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
- **Bomba** – si es controlable (entonces el enclavamiento puede apagarla), su estado y los tiempos
  mínimos de encendido/apagado contra el ciclado demasiado frecuente.
- **Válvula de emergencia** – su estado, si es **normalmente abierta** (a prueba de fallos), el
  **tipo** de válvula (electroválvula o válvula de bola motorizada) y, para una válvula motorizada, su
  **tiempo de recorrido**.

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
feeder, el modo invierno / libre de hielo, el lazo cerrado de oxígeno, las notificaciones, las
estadísticas de funcionamiento y el modo de prueba dry-run. **Todavía pendiente:**

* el backend de hardware **ESP32** directo + firmware de referencia (Waveshare ESP32-S3-POE-ETH-8DI-8RO),
  incl. los sensores de referencia (oxígeno disuelto, presión de la línea de aire, temperatura del
  agua) cableados al ESP32 — consulta [dev/hardware/sensors.md](../../dev/hardware/sensors.md);
* una **página web apta para móviles servida directamente por el ESP32 (obligatoria en el puerto
  80)** para el control y la supervisión in situ desde un teléfono, sin necesidad de ioBroker para
  manejarla;
* un posterior **adaptador de widgets vis-2** para el manejo y la supervisión.

Consulta [PROJECT_PLAN.md](../../PROJECT_PLAN.md) para el plan completo basado en hitos.

---

📖 [Documentación principal (inglés)](../../README.md)
