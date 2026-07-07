![Logo](../../admin/automatic-pond-aeration.png)
# ioBroker.automatic-pond-aeration

<p align="center">
  <a href="https://www.buymeacoffee.com/ssbingo"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=ssbingo&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" /></a>
</p>

## 用于 ioBroker 的 automatic-pond-aeration 适配器

本适配器**控制并监测一套池塘增氧（曝气）系统**。一台气泵/压缩机通过阀门（电磁阀）将空气送到池塘中**最多 8 个增氧点**。
适配器按照**时间计划**、**循环轮询（round-robin）**或**分组程序**来切换这些阀门，并通过**安全联锁**保护气泵：只要气泵
运行，就始终保持至少一个阀门开启——否则会打开**应急阀**，并（如果气泵作为数据点可用）关闭气泵。

它还可以选配监测**溶解氧**、**气温和水温**以及**压力**，根据你的**地理位置**计算**天文时间**，**直接在 ESP32 上**驱动
硬件（无需额外的 ioBroker 实例），并在安装了
[ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder) 时，于投喂期间暂停选定的增氧点。

> ⚠️ **项目状态：开发进行中。** 配置模型和完整的数据点模型均已就绪：适配器会校验你的配置，并据此创建（以及清理）它的所有对象。
> 控制引擎、硬件后端和监测功能正在按里程碑逐步添加。目前尚不适用于生产环境。

---

## 目录

1. [适配器的功能](#1-适配器的功能)
2. [安全概念](#2-安全概念)
3. [前提条件](#3-前提条件)
4. [安装](#4-安装)
5. [配置概览](#5-配置概览)
6. [对象 / 数据点](#6-对象--数据点)
7. [路线图](#7-路线图)

---

## 1. 适配器的功能

池塘增氧把来自一台气泵的空气分配到多个散气器/气石。哪些点获得空气，由**电磁阀**决定。本适配器决定**每个阀门何时**开启：

* **时间计划** – 在按星期几配置的时间窗口内开启某个点/组。
* **循环轮询（round-robin）** – 轮流切换各个点，每个点开启一段可配置的保持时间。
* **分组** – 将多个点一起控制；**分组数量永远不能多于点的数量**。

阀门和气泵既可以通过**现有的 ioBroker 状态**（来自任何提供开关的适配器）驱动，也可以**直接在 ESP32 上**运行配套固件来驱动。

## 2. 安全概念

空气压缩机**绝不能在阀门全部关闭的情况下运行**（憋压 / dead-heading）——这会产生过压并可能损坏气泵。因此：

* 只要气泵运行，就**始终保持至少一个阀门开启**（最小值可配置）。
* 如果无法保证这一点，则**打开应急阀**，并且在气泵可控时**关闭气泵**。
* 阀门切换采用**先通后断（make-before-break）**（下一个阀门先开启，上一个阀门才关闭），因此绝不会出现所有阀门都关闭的瞬间。

> 💡 **接线建议：** 使用**常开（NO）**应急阀，使其在断电时打开（故障安全）。当硬件运行在 ESP32 上时，同样的联锁也在设备
> 本地运行，因此网络或 ioBroker 故障不会损坏气泵。

## 3. 前提条件

* Node.js ≥ 22
* js-controller ≥ 6.0.11、admin ≥ 7.6.20
* 一个或多个可作为 ioBroker 状态访问的阀门，或一块带有配套固件的 ESP32。

## 4. 安装

从 ioBroker 管理界面（或在开发阶段从 GitHub 仓库）安装适配器并创建一个实例。打开实例设置进行配置。

## 5. 配置概览

设置页面会随着里程碑不断扩展。计划中的部分：常规/后端、增氧点、控制（时间计划/round-robin/分组）、传感器、天文与位置、
feeder 联动、安全和通知。完整设计参见 [PROJECT_PLAN.md](../../PROJECT_PLAN.md)。

## 6. 对象 / 数据点

适配器会根据你的配置创建其数据点。占位符：`<n>` = 增氧点索引（0–7），`<g>` = 分组索引。标有 **(w)** 的对象是可写命令；其余均为由适配器更新的只读状态值。

**常规**

| 对象 | 类型 | 角色 | 说明 |
|------|------|------|------|
| `info.connection` | boolean | `indicator.connected` | 适配器正在运行 / 配置有效 |
| `info.backend` | string | `text` | 当前硬件后端（`iobroker` 或 `esp32`） |
| `info.activeMode` | string | `text` | 当前运行模式 |

**控制（可写命令）**

| 对象 | 类型 | 角色 | 说明 |
|------|------|------|------|
| `control.enabled` | boolean (w) | `switch.enable` | 主使能 |
| `control.mode` | string (w) | `text` | 运行模式：`auto`、`manual` 或 `off` |
| `control.allOff` | boolean (w) | `button` | 关闭所有阀门 |
| `control.point.<n>.open` | boolean (w) | `switch` | 手动打开点 `<n>` 的阀门 |
| `control.group.<g>.active` | boolean (w) | `switch` | 手动激活组 `<g>` |

**增氧点**（每个已配置的点一个通道，以该点命名）

| 对象 | 类型 | 角色 | 说明 |
|------|------|------|------|
| `aeration.point.<n>.valveState` | boolean | `indicator` | 阀门已打开 |
| `aeration.point.<n>.active` | boolean | `indicator` | 该点当前正在增氧 |
| `aeration.point.<n>.runtimeTodaySec` | number | `value` | 今日运行时长（秒） |
| `aeration.point.<n>.runtimeTotalH` | number | `value` | 总运行时长（小时，用于维护） |
| `aeration.point.<n>.lastChange` | number | `value.time` | 上次阀门变更的时间戳 |
| `aeration.point.<n>.error` | string | `text` | 该点的最近错误 |

**分组**

| 对象 | 类型 | 角色 | 说明 |
|------|------|------|------|
| `groups.<g>.members` | string | `json` | 成员点的索引 |
| `groups.<g>.active` | boolean | `indicator` | 该组当前处于激活状态 |

**安全**

| 对象 | 类型 | 角色 | 说明 |
|------|------|------|------|
| `safety.interlockActive` | boolean | `indicator.alarm` | 安全联锁当前已激活 |
| `safety.emergencyValve` | boolean | `indicator` | 应急阀已打开 |
| `safety.pumpRunning` | boolean | `indicator` | 气泵正在运行 |
| `safety.openValveCount` | number | `value` | 打开的阀门数量 |
| `safety.lastTripReason` | string | `text` | 上次联锁触发的原因 |

**传感器**（仅在启用相应监测时创建）

| 对象 | 类型 | 角色 | 说明 |
|------|------|------|------|
| `sensors.oxygen` | number | `value` | 溶解氧（mg/l） |
| `sensors.oxygenSaturation` | number | `value` | 氧饱和度（%） |
| `sensors.oxygenAlarm` | boolean | `indicator.alarm` | 氧含量低于下限阈值 |
| `sensors.airTemperature` | number | `value.temperature` | 气温（°C） |
| `sensors.waterTemperature` | number | `value.temperature` | 水温（°C） |
| `sensors.pressure` | number | `value.pressure` | 系统压力（bar） |
| `sensors.pressureAlarm` | boolean | `indicator.alarm` | 压力超出范围 |

**天文与位置**

| 对象 | 类型 | 角色 | 说明 |
|------|------|------|------|
| `astro.sunrise` / `astro.sunset` / `astro.solarNoon` | string | `text` | 该位置的太阳时刻 |
| `astro.isNight` | boolean | `indicator` | 当前为夜间 |
| `location.latitude` / `location.longitude` | number | `value.gps.*` | 解析出的坐标 |
| `location.resolvedAddress` | string | `text` | 解析出的地址 |

**feeder 联动**（仅在启用 feeder 联动时创建）

| 对象 | 类型 | 角色 | 说明 |
|------|------|------|------|
| `feeder.pauseActive` | boolean | `indicator` | 因投喂而暂停增氧 |
| `feeder.pauseUntil` | number | `value.time` | 暂停持续至 |
| `feeder.lastFeedStart` | number | `value.time` | 上次投喂开始时间 |

**统计**

| 对象 | 类型 | 角色 | 说明 |
|------|------|------|------|
| `statistics.compressorRuntimeTodayH` | number | `value` | 今日压缩机运行时长（小时） |
| `statistics.switchCyclesToday` | number | `value` | 今日阀门切换次数 |

当从配置中移除某个点、组或传感器时，其对象会被自动清理。

## 7. 路线图

完整的、基于里程碑的实现计划（控制引擎、HAL 后端、ESP32 固件、监测、feeder 联动、冬季模式以及随后的 vis-2 小部件适配器）
参见 [PROJECT_PLAN.md](../../PROJECT_PLAN.md)。

---

📖 [主文档（英文）](../../README.md)
