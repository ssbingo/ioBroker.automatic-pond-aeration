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

> ⚠️ **项目状态。** 已完整实现，并可从管理界面进行配置：阀门控制（时间计划、循环轮询 round-robin、分组）、防憋压的**安全联锁**、
> **监测**（溶解氧、气温/水温、带报警的压力）、**天文时间与地理位置**，以及 **feeder 联动**。**仍在计划中：** 直接的
> **ESP32** 硬件后端和**冬季 / 防结冰模式**（相应选项已出现在配置中，但尚未生效）。在 ESP32 后端发布之前，阀门和气泵通过现有的
> ioBroker 状态进行驱动。

---

## 目录

1. [适配器的功能](#1-适配器的功能)
2. [安全概念](#2-安全概念)
3. [前提条件](#3-前提条件)
4. [安装](#4-安装)
5. [配置](#5-配置)
6. [对象 / 数据点](#6-对象--数据点)
7. [路线图](#7-路线图)

---

## 1. 适配器的功能

池塘增氧把来自一台气泵的空气分配到多个散气器/气石。哪些点获得空气，由**电磁阀**决定。本适配器决定**每个阀门何时**开启：

* **时间计划** – 在按星期几配置的时间窗口内开启某个点/组。
* **循环轮询（round-robin）** – 轮流切换各个点，每个点开启一段可配置的保持时间。
* **分组** – 将多个点一起控制；**分组数量永远不能多于点的数量**。

阀门和气泵通过**现有的 ioBroker 状态**（来自任何提供开关的适配器）驱动。直接的 **ESP32** 硬件后端（无需额外的 ioBroker 实例）正在计划中。

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
* 一个或多个可作为 ioBroker 状态访问的阀门（例如继电器/智能插座适配器）。

## 4. 安装

从 ioBroker 管理界面（或在开发阶段从 GitHub 仓库）安装适配器并创建一个实例。打开实例设置进行配置。

## 5. 配置

设置页面按选项卡（Tab）组织。你不必填写全部内容，只需填写你使用的部分。

### 常规
- **主使能** – 整个适配器的开/关开关。关闭时不进行任何控制。
- **硬件后端** – `现有 ioBroker 状态`（默认）通过其他适配器的状态驱动你的阀门/气泵。`ESP32（直接）`为*计划中*（M7），尚未生效。
- **轮询间隔（s）** – 多久轮询一次后端状态（例如 `30`）。

### 增氧点
配置的核心。最多可添加 **8** 个点；每个点对应一个阀门。每个点：
- **名称** – 例如 `Pier`、`Deep zone`。
- **已启用** – 将该点纳入控制。
- **后端** – `ioBroker`（一个外部状态）或 `ESP32`（一个继电器通道，计划中）。
- **阀门状态 / 通道** – 对于 ioBroker 后端，选择打开阀门的开关状态（通过对象浏览器）；对于 ESP32，则填写通道编号。

### 分组
将多个点分组以便一起切换（例如一个按钮打开多个散气器）。为分组命名并勾选其成员点。**分组数量永远不能多于点的数量。**

### 控制
- **循环轮询（round-robin）** – 轮流切换各个点，每个点开启一段**保持时间**（秒）。
- **时间计划** – 在按星期几设置的时间窗口内开启选定的点/组（`从`/`到`，例如 `08:00`–`18:00`；支持像 `22:00`–`06:00` 这样跨夜的窗口）。生效的时间计划**优先于循环轮询**。

### 传感器
可选监测。为每个传感器勾选**已启用**并选择**源状态**：
- **溶解氧** – 带一个下限阈值（触发 `sensors.oxygenAlarm`）、一个目标值和一个滞回；**氧饱和度 %** 由水温计算得出。
- **气温/水温**。
- **压力** – 带最小/最大值（超出范围触发 `sensors.pressureAlarm`）。

### 位置
天文时间（日出/日落/夜间）所需。
- **位置来源** – `ioBroker 系统位置`（使用系统坐标）或`自定义位置`。对于自定义位置，输入地址并按**搜索**（按需通过 OpenStreetMap/Nominatim 地理编码），或在地图上点击/拖动标记。

### Feeder
当 [ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder) 正在投喂时暂停选定的点，以免饲料被吹散。
- 选择 **feeder 实例**（自动发现）并勾选要监视的 **feeder 开关**。
- **时长模式** – `测量`监视开关（暂停 = 投喂 + 偏移，无需预先知道投喂时长）；`脉冲`使用固定的投喂时长。
- **偏移（s）** – 投喂结束后的额外暂停。**它至少应等于动物进食所需的平均时间**（示例：15 s 投喂 + 60 s 偏移 ⇒ 75 s 暂停增氧）。
- **受影响的点** – 投喂期间哪些点会暂停。

### 安全
- **气泵运行时最少开启的阀门数** – 防憋压保护（默认 `1`）。
- **看门狗间隔（s）**和 **先通后断（make-before-break）重叠（s）**。
- **气泵** – 是否可控（可控时联锁可将其关闭）、其状态，以及防止频繁启停的最短开/关时间。
- **应急阀** – 其状态、是否为**常开**（故障安全）、阀门**类型**（电磁阀或电动球阀），以及电动阀的**行程时间**。

### 通知
启用通知并选择一个 **messaging 实例**（任何 `messaging` 类型的适配器，例如 Telegram）。*(发送功能已为后续里程碑做好准备。)*

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

已完成：配置界面、阀门控制（时间计划/round-robin/分组）、防憋压安全联锁、监测、天文与地理位置以及 feeder 联动。**仍待完成：**

* 直接的 **ESP32** 硬件后端 + 参考固件（Waveshare ESP32-S3-POE-ETH-8DI-8RO）；
* **冬季 / 防结冰模式**；
* 后续用于操作和监测的 **vis-2 小部件适配器**。

完整的、基于里程碑的计划参见 [PROJECT_PLAN.md](../../PROJECT_PLAN.md)。

---

📖 [主文档（英文）](../../README.md)
