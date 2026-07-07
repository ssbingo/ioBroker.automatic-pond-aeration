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

> ⚠️ **Estado del proyecto: trabajo en curso.** El modelo de configuración y el modelo completo de
> puntos de datos ya están listos: el adaptador valida tu configuración y crea (y limpia) todos sus
> objetos en consecuencia. El motor de control, los backends de hardware y las funciones de
> supervisión se van añadiendo hito a hito. Todavía no está pensada para uso en producción.

---

## Índice

1. [Qué hace el adaptador](#1-qué-hace-el-adaptador)
2. [Concepto de seguridad](#2-concepto-de-seguridad)
3. [Requisitos](#3-requisitos)
4. [Instalación](#4-instalación)
5. [Resumen de la configuración](#5-resumen-de-la-configuración)
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

Las válvulas y la bomba se pueden controlar bien a través de **estados de ioBroker existentes** (de
cualquier adaptador que exponga los interruptores) o **directamente en un ESP32** que ejecute el
firmware complementario.

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
* Una o varias válvulas accesibles como estados de ioBroker, o un ESP32 con el firmware
  complementario.

## 4. Instalación

Instala el adaptador desde el admin de ioBroker (o, durante el desarrollo, desde el repositorio de
GitHub) y crea una instancia. Abre los ajustes de la instancia para configurarlo.

## 5. Resumen de la configuración

La página de ajustes crece con los hitos. Secciones previstas: general/backend, puntos de aireación,
control (horario/round-robin/grupos), sensores, astro y ubicación, acoplamiento con el feeder,
seguridad y notificaciones. Consulta [PROJECT_PLAN.md](../../PROJECT_PLAN.md) para el diseño completo.

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

**Estadísticas**

| Objeto | Tipo | Rol | Descripción |
|--------|------|-----|-------------|
| `statistics.compressorRuntimeTodayH` | number | `value` | Tiempo de funcionamiento del compresor de hoy (horas) |
| `statistics.switchCyclesToday` | number | `value` | Ciclos de conmutación de válvulas de hoy |

Cuando se elimina un punto, un grupo o un sensor de la configuración, sus objetos se limpian
automáticamente.

## 7. Hoja de ruta

Consulta [PROJECT_PLAN.md](../../PROJECT_PLAN.md) para el plan de implementación completo basado en
hitos (motor de control, backends HAL, firmware ESP32, supervisión, acoplamiento con el feeder, modo
invierno y el posterior adaptador de widgets vis-2).

---

📖 [Documentación principal (inglés)](../../README.md)
