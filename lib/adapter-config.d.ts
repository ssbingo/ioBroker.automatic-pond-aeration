// This file extends the AdapterConfig type from "@iobroker/types"
// with the actual configuration properties of this adapter
// in order to provide typings for adapter.config properties.

declare global {
	namespace ioBroker {
		/** One aeration point (a valve at a location in the pond). Max 8 points. */
		interface AerationPointConfig {
			/** Stable internal id used for the datapoint path (e.g. "pt-0"). Never derived from the name. */
			id: string;
			/** User defined name, used as tab label and as common.name of the channel. */
			name: string;
			enabled: boolean;
			/** Where this valve is driven: an ioBroker foreign state or an ESP32 output channel. */
			backendType: 'iobroker' | 'esp32';
			/** Foreign object/state id that switches the valve (used when backendType is "iobroker"). */
			objectId: string;
			/** ESP32 output channel index (used when backendType is "esp32"). */
			espChannel: number;
			/** Value written to open the valve (default true). */
			onValue: boolean | number | string;
			/** Value written to close the valve (default false). */
			offValue: boolean | number | string;
			/** A physical manual-override push-button is wired for this point (ESP32 DI / boolean state). */
			buttonEnabled: boolean;
			/** Button behaviour. Only "toggle" in v1; kept as an enum for future modes. */
			buttonMode: 'toggle';
			/** Foreign boolean state (or ESP32 DI) that reads the button; rising edge = press. */
			buttonObjectId: string;
		}

		/** A group of aeration points. There must never be more groups than points. */
		interface AerationGroupConfig {
			id: string;
			name: string;
			/** Indices (0-based) of the aeration points that belong to this group. */
			members: number[];
		}

		/** One step of the cyclic sequence: a point or group id, optionally with its own dwell. */
		interface AerationSequenceStep {
			/** Id of the targeted point or group. */
			targetId: string;
			/** Optional per-step dwell in seconds (falls back to roundRobinDwellSec). */
			dwellSec?: number;
		}

		/** A time-based on/off program targeting one or more points/groups. */
		interface AerationScheduleConfig {
			id: string;
			enabled: boolean;
			/** Target ids: point ids and/or group ids driven by this schedule. */
			targets: string[];
			/** Days of week the schedule is active (0 = Sunday .. 6 = Saturday). */
			days: number[];
			/** Window start as "HH:mm". */
			from: string;
			/** Window end as "HH:mm". */
			to: string;
		}

		interface AdapterConfig {
			/** Master enable switch for the whole adapter. */
			masterEnable: boolean;
			/** Dry-run: log the intended valve/pump actions instead of writing them (commissioning/test). */
			dryRun: boolean;
			/** Hardware backend: control existing ioBroker states or talk to an ESP32 directly. */
			controlBackend: 'iobroker' | 'esp32';
			/** ESP32 host/IP (used when controlBackend is "esp32"). */
			esp32Host: string;
			/** ESP32 HTTP port. */
			esp32Port: number;
			/** Use the ESP32 WebSocket status stream in addition to HTTP polling. */
			esp32UseWebsocket: boolean;
			/** Optional ESP32 auth token (encrypted). */
			esp32AuthToken: string;
			/** Polling interval for backend status in seconds. */
			pollIntervalSec: number;

			/** "system" = ioBroker system.config coordinates, "shared" = the latitude/longitude below. */
			locationMode: 'system' | 'shared';
			/** Latitude (used when locationMode is "shared"). */
			latitude: string;
			/** Longitude (used when locationMode is "shared"). */
			longitude: string;
			/** Last resolved address (display only). */
			address: string;

			/** Whether the pump can be switched off by the adapter (safety failsafe). */
			pumpControllable: boolean;
			/** Foreign state id of the pump/compressor. */
			pumpObjectId: string;
			/** Minimum on-time of the pump in seconds (anti short-cycle). */
			pumpMinOnSec: number;
			/** Minimum off-time of the pump in seconds (anti short-cycle). */
			pumpMinOffSec: number;

			/** Foreign state id of the emergency valve. */
			emergencyObjectId: string;
			/** Emergency valve is wired normally-open (opens on power loss / failsafe). */
			emergencyNormallyOpen: boolean;
			/**
			 * Emergency valve technology. A solenoid opens/closes practically instantly;
			 * a motorized ball valve (e.g. CWX-15N) needs a travel time and cannot be
			 * relied upon to open immediately.
			 */
			emergencyValveType: 'solenoid' | 'motorBallValve';
			/** Travel time in seconds for a motorized ball valve (emergencyValveType = "motorBallValve"). */
			emergencyMotorTravelSec: number;

			/** Minimum number of valves that must stay open while the pump runs (>= 1). */
			minOpenValves: number;
			/** Safety watchdog interval in seconds. */
			watchdogIntervalSec: number;
			/** Overlap in seconds for make-before-break valve switching. */
			overlapSec: number;

			/** Cyclic program enabled (round-robin over all points, or the sequence below). */
			roundRobinEnabled: boolean;
			/** Default dwell time per step in the cyclic program (seconds). */
			roundRobinDwellSec: number;
			/** Ordered cyclic sequence of points and/or groups (empty = plain round-robin over all points). */
			sequenceSteps: AerationSequenceStep[];

			/** Dissolved-oxygen monitoring. */
			o2Enabled: boolean;
			o2ObjectId: string;
			o2LowThreshold: number | null;
			o2TargetThreshold: number | null;
			o2Hysteresis: number;
			/** Oxygen closed loop: force aeration on while oxygen is below the low threshold. */
			o2ControlEnabled: boolean;
			/** Indices (0-based) of the points boosted by the oxygen loop (empty = all points). */
			o2AffectedPoints: number[];

			/** Air-temperature monitoring. */
			airTempEnabled: boolean;
			airTempObjectId: string;
			/** Water-temperature monitoring. */
			waterTempEnabled: boolean;
			waterTempObjectId: string;

			/** Pressure monitoring. */
			pressureEnabled: boolean;
			pressureObjectId: string;
			pressureMin: number | null;
			pressureMax: number | null;

			/** Winter / ice-free mode: force the selected points on during the cold season. */
			winterEnabled: boolean;
			/** Winter start as recurring "MM-DD". */
			winterStart: string;
			/** Winter end as recurring "MM-DD". */
			winterEnd: string;
			/** Only force aeration on while it is actually cold (needs air-temperature monitoring). */
			winterFrostProtect: boolean;
			/** Air temperature at/below which winter forcing is active (°C). */
			winterAirTempThreshold: number;
			/** Indices (0-based) of the points kept open in winter (empty = all points). */
			winterAffectedPoints: number[];

			/** Feeder coupling (ioBroker.automatic-feeder): pause aeration during feeding. */
			feederEnabled: boolean;
			/** Selected feeder instance, e.g. "automatic-feeder.0". */
			feederInstance: string;
			/** Selected feeder switch state ids to watch. */
			feederSwitches: string[];
			/** Offset in seconds added after feeding ends before aeration resumes. */
			feederOffsetSec: number;
			/** Feeding duration in seconds for the "pulse" mode (feeder only sends a short pulse). */
			feederFeedingDurationSec: number;
			/** How the feeding duration is determined. */
			feederDurationMode: 'measure' | 'configured' | 'pulse';
			/** Indices (0-based) of aeration points switched off during feeding. */
			feederAffectedPoints: number[];

			/** Notifications via a messaging adapter (Telegram/Pushover). */
			notifyEnabled: boolean;
			messagingInstance: string;
			/** Which event categories send a message ("interlock" | "oxygen" | "pressure"). */
			notifyEvents: string[];

			/** The configured aeration points (max 8). */
			points: AerationPointConfig[];
			/** The configured groups (never more than points). */
			groups: AerationGroupConfig[];
			/** The configured schedules. */
			schedules: AerationScheduleConfig[];
		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
