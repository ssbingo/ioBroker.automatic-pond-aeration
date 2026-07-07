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
		}

		/** A group of aeration points. There must never be more groups than points. */
		interface AerationGroupConfig {
			id: string;
			name: string;
			/** Indices (0-based) of the aeration points that belong to this group. */
			members: number[];
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

			/** Minimum number of valves that must stay open while the pump runs (>= 1). */
			minOpenValves: number;
			/** Safety watchdog interval in seconds. */
			watchdogIntervalSec: number;
			/** Overlap in seconds for make-before-break valve switching. */
			overlapSec: number;

			/** Cyclic round-robin base program enabled. */
			roundRobinEnabled: boolean;
			/** Dwell time per point in the round-robin (seconds). */
			roundRobinDwellSec: number;

			/** Dissolved-oxygen monitoring. */
			o2Enabled: boolean;
			o2ObjectId: string;
			o2LowThreshold: number | null;
			o2TargetThreshold: number | null;
			o2Hysteresis: number;

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

			/** Winter / ice-free mode. */
			winterEnabled: boolean;
			/** Winter start as recurring "MM-DD". */
			winterStart: string;
			/** Winter end as recurring "MM-DD". */
			winterEnd: string;

			/** Feeder coupling (ioBroker.automatic-feeder): pause aeration during feeding. */
			feederEnabled: boolean;
			/** Selected feeder instance, e.g. "automatic-feeder.0". */
			feederInstance: string;
			/** Selected feeder switch state ids to watch. */
			feederSwitches: string[];
			/** Offset in seconds added after feeding ends before aeration resumes. */
			feederOffsetSec: number;
			/** How the feeding duration is determined. */
			feederDurationMode: 'measure' | 'configured' | 'pulse';
			/** Indices (0-based) of aeration points switched off during feeding. */
			feederAffectedPoints: number[];

			/** Notifications via a messaging adapter (Telegram/Pushover). */
			notifyEnabled: boolean;
			messagingInstance: string;

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
