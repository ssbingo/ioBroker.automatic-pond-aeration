'use strict';

/*
 * Single source of truth for adapter ↔ ESP32-firmware compatibility.
 *
 * The *hard* contract between the two is the PROTOCOL version (`protocol` in the firmware's
 * GET /api/info, mirrored by SUPPORTED_PROTOCOL here): a protocol mismatch means "incompatible".
 * On top of that this adapter version declares the *recommended* and *minimum* firmware semver so
 * the admin, the runtime check and the docs can show "which firmware belongs to this adapter"
 * without hard-pinning every patch release. Update the three FIRMWARE_* values on a release when the
 * recommendation changes; the protocol only changes when the wire format breaks.
 *
 * Pure module (no adapter/no I/O) so it can be unit-tested and bundled into the React admin.
 */

const { SUPPORTED_PROTOCOL } = require('./hal/esp32-protocol');

/** Firmware repository (reference firmware for the Waveshare ESP32-S3-POE-ETH-8DI-8RO). */
const FIRMWARE_REPO = 'https://github.com/ssbingo/pond-aeration-esp32-firmware';
/** Releases page (used by the admin link and the on-device "check for updates"). */
const FIRMWARE_RELEASES = `${FIRMWARE_REPO}/releases`;
/** Firmware version recommended for THIS adapter version (keep in sync on release). */
const FIRMWARE_RECOMMENDED = '1.2.2';
/** Oldest firmware this adapter version is happy with; below it → "please update" warning. */
const FIRMWARE_MINIMUM = '1.0.0';

/**
 * Parse an "x.y.z" semver (a leading "v" and any pre-release/build suffix are ignored).
 *
 * @param {unknown} v - the version string
 * @returns {[number, number, number] | null} the numeric triple, or null if unparseable
 */
function parseSemver(v) {
	if (typeof v !== 'string') {
		return null;
	}
	const m = v
		.trim()
		.replace(/^v/i, '')
		.match(/^(\d+)\.(\d+)\.(\d+)/);
	return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/**
 * Compare two semver strings.
 *
 * @param {string} a - left version
 * @param {string} b - right version
 * @returns {number | null} -1 if a<b, 0 if equal, 1 if a>b; null if either is unparseable
 */
function compareSemver(a, b) {
	const pa = parseSemver(a);
	const pb = parseSemver(b);
	if (!pa || !pb) {
		return null;
	}
	for (let i = 0; i < 3; i++) {
		if (pa[i] !== pb[i]) {
			return pa[i] < pb[i] ? -1 : 1;
		}
	}
	return 0;
}

/**
 * Evaluate a connected device's firmware against this adapter's expectations.
 *
 * `compatible` is driven ONLY by the protocol (the hard contract); the firmware version drives an
 * advisory `level`:
 *   - `incompatible` — protocol mismatch (hard: the adapter may misbehave)
 *   - `unknown`      — no protocol/version reported yet
 *   - `outdated`     — protocol ok but firmware below the minimum → should update
 *   - `behind`       — firmware ok but below the recommended → update available
 *   - `newer`        — firmware newer than recommended (fine while the protocol matches)
 *   - `ok`           — firmware at/above the recommended
 *
 * @param {unknown} deviceFirmware - the device's reported `fw`
 * @param {unknown} deviceProtocol - the device's reported `protocol`
 * @returns {{ compatible: boolean, level: string, deviceFirmware: string, deviceProtocol: number|null,
 *   protocol: number, recommended: string, minimum: string, message: string }} the verdict
 */
function evaluateFirmware(deviceFirmware, deviceProtocol) {
	const fw = typeof deviceFirmware === 'string' ? deviceFirmware : '';
	const proto = deviceProtocol === undefined || deviceProtocol === null ? null : Number(deviceProtocol);
	const base = {
		deviceFirmware: fw,
		deviceProtocol: Number.isFinite(proto) ? proto : null,
		protocol: SUPPORTED_PROTOCOL,
		recommended: FIRMWARE_RECOMMENDED,
		minimum: FIRMWARE_MINIMUM,
	};

	if (base.deviceProtocol === null) {
		return { ...base, compatible: false, level: 'unknown', message: 'No firmware information yet.' };
	}
	if (base.deviceProtocol !== SUPPORTED_PROTOCOL) {
		return {
			...base,
			compatible: false,
			level: 'incompatible',
			message: `Firmware protocol ${base.deviceProtocol} does not match the adapter's protocol ${SUPPORTED_PROTOCOL}. Install firmware ≥ ${FIRMWARE_RECOMMENDED}.`,
		};
	}
	// Protocol matches → compatible; grade the version.
	const cmpMin = compareSemver(fw, FIRMWARE_MINIMUM);
	const cmpRec = compareSemver(fw, FIRMWARE_RECOMMENDED);
	if (cmpMin === null) {
		return { ...base, compatible: true, level: 'ok', message: 'Firmware protocol matches.' };
	}
	if (cmpMin < 0) {
		return {
			...base,
			compatible: true,
			level: 'outdated',
			message: `Firmware ${fw} is older than the minimum ${FIRMWARE_MINIMUM}; please update (recommended ${FIRMWARE_RECOMMENDED}).`,
		};
	}
	if (cmpRec !== null && cmpRec < 0) {
		return {
			...base,
			compatible: true,
			level: 'behind',
			message: `Firmware ${fw} works; the recommended version is ${FIRMWARE_RECOMMENDED}.`,
		};
	}
	if (cmpRec !== null && cmpRec > 0) {
		return {
			...base,
			compatible: true,
			level: 'newer',
			message: `Firmware ${fw} is newer than the recommended ${FIRMWARE_RECOMMENDED} (fine while the protocol matches).`,
		};
	}
	return { ...base, compatible: true, level: 'ok', message: `Firmware ${fw} matches the recommendation.` };
}

module.exports = {
	SUPPORTED_PROTOCOL,
	FIRMWARE_REPO,
	FIRMWARE_RELEASES,
	FIRMWARE_RECOMMENDED,
	FIRMWARE_MINIMUM,
	parseSemver,
	compareSemver,
	evaluateFirmware,
};
