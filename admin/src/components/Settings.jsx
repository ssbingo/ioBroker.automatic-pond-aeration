import React, { useState } from 'react';
import {
	Box,
	Tabs,
	Tab,
	TextField,
	Switch,
	FormControlLabel,
	Select,
	MenuItem,
	InputLabel,
	FormControl,
	Button,
	IconButton,
	Typography,
	Table,
	TableHead,
	TableRow,
	TableCell,
	TableBody,
	Checkbox,
	FormGroup,
	Alert,
	Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { I18n } from '@iobroker/adapter-react-v5';
import { FIRMWARE_RECOMMENDED, FIRMWARE_RELEASES, SUPPORTED_PROTOCOL } from '../../../lib/firmware-compat';
import ObjectSelect from './ObjectSelect';
import LocationPicker from './LocationPicker';
import FeederTab from './FeederTab';
import NotifyTab from './NotifyTab';

const MAX_POINTS = 8;

// A leap year so 29.02. is selectable; only day+month are stored (recurring "MM-DD").
const WINTER_REF_YEAR = 2024;

/** Parse a stored recurring "MM-DD" into a dayjs date (fixed reference year), or null. */
function mdToDayjs(md) {
	const m = typeof md === 'string' && md.match(/^(\d{1,2})-(\d{1,2})$/);
	if (!m) {
		return null;
	}
	const d = dayjs(`${WINTER_REF_YEAR}-${String(Number(m[1])).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`);
	return d.isValid() ? d : null;
}
/** Format a dayjs date back to the stored "MM-DD" (empty string when null/invalid). */
function dayjsToMD(d) {
	return d && d.isValid() ? d.format('MM-DD') : '';
}
/** Parse a stored "HH:mm" into a dayjs time (today's date), or null. */
function hhmmToDayjs(hhmm) {
	const m = typeof hhmm === 'string' && hhmm.match(/^(\d{1,2}):(\d{2})$/);
	if (!m) {
		return null;
	}
	const d = dayjs().hour(Number(m[1])).minute(Number(m[2])).second(0).millisecond(0);
	return d.isValid() ? d : null;
}
/** Format a dayjs time back to the stored "HH:mm" (empty string when null/invalid). */
function dayjsToHHmm(d) {
	return d && d.isValid() ? d.format('HH:mm') : '';
}
const WEEKDAYS = [
	{ v: 1, l: 'Mon' },
	{ v: 2, l: 'Tue' },
	{ v: 3, l: 'Wed' },
	{ v: 4, l: 'Thu' },
	{ v: 5, l: 'Fri' },
	{ v: 6, l: 'Sat' },
	{ v: 0, l: 'Sun' },
];

/** A number field; empty maps to `null` when `nullable`, otherwise to `0`. */
function Num({ label, value, onChange, nullable, min, max }) {
	const inputProps = {};
	if (min !== undefined) {
		inputProps.min = min;
	}
	if (max !== undefined) {
		inputProps.max = max;
	}
	return (
		<TextField
			variant="standard"
			type="number"
			label={label}
			value={value === null || value === undefined ? '' : value}
			inputProps={Object.keys(inputProps).length ? inputProps : undefined}
			onChange={e => onChange(e.target.value === '' ? (nullable ? null : 0) : Number(e.target.value))}
			sx={{ minWidth: 150 }}
		/>
	);
}

/** A checkbox row bound to a boolean native attribute. */
function Sw({ label, checked, onChange }) {
	return <FormControlLabel control={<Switch checked={!!checked} onChange={e => onChange(e.target.checked)} />} label={label} />;
}

/** A labelled select. */
function Sel({ label, value, onChange, options, sx }) {
	return (
		<FormControl variant="standard" sx={{ minWidth: 200, ...(sx || {}) }}>
			<InputLabel>{label}</InputLabel>
			<Select value={value} onChange={e => onChange(e.target.value)}>
				{options.map(o => (
					<MenuItem key={o.value} value={o.value} disabled={!!o.disabled}>
						{o.label}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	);
}

/** An outlined card that groups a set of fields under an optional heading. */
function Section({ title, desc, children }) {
	return (
		<Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
			{title ? (
				<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: desc ? 0.5 : 1.5 }}>
					{title}
				</Typography>
			) : null}
			{desc ? (
				<Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
					{desc}
				</Typography>
			) : null}
			{children}
		</Paper>
	);
}

/** An input with a small explanatory caption underneath (used on the Safety tab). */
function Field({ help, children }) {
	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', maxWidth: 320 }}>
			{children}
			<Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, lineHeight: 1.3 }}>
				{help}
			</Typography>
		</Box>
	);
}

/** The heading shown at the top of each tab. */
function TabTitle({ children }) {
	return (
		<Typography variant="h6" sx={{ mb: 2 }}>
			{children}
		</Typography>
	);
}

/**
 * Full configuration UI for the pond aeration adapter.
 *
 * @param {object} props - native config, onChange, socket, theme…
 * @returns {React.JSX.Element} the settings page
 */
function Settings(props) {
	const native = props.native || {};
	const set = (attr, value) => props.onChange(attr, value);
	const [tab, setTab] = useState(0);
	// Live "test connection" to the ESP32 (via the running instance; browsers cannot reach the
	// device directly due to CORS). Confirms host + port are right and shows the firmware version.
	const [espTest, setEspTest] = useState(null);
	const [espTesting, setEspTesting] = useState(false);
	const testEsp32 = async () => {
		setEspTesting(true);
		setEspTest(null);
		try {
			const r = await props.socket.sendTo(props.instanceId, 'testEsp32', {
				host: native.esp32Host,
				port: native.esp32Port || 80,
				token: native.esp32AuthToken || '',
			});
			if (r && r.ok) {
				setEspTest({
					ok: true,
					msg: `${I18n.t('Connected')}: ${r.device || 'ESP32'} — Firmware v${r.fw || '?'} (${I18n.t('protocol')} ${r.protocol})${r.compatible ? '' : ' — ' + I18n.t('incompatible protocol!')}`,
					license: r.license || null,
				});
			} else {
				setEspTest({ ok: false, msg: `${I18n.t('Not reachable')}${r && r.error ? ` (${r.error})` : ''}` });
			}
		} catch {
			setEspTest({ ok: false, msg: I18n.t('Not reachable — is the adapter instance running?') });
		} finally {
			setEspTesting(false);
		}
	};

	const points = Array.isArray(native.points) ? native.points : [];
	const groups = Array.isArray(native.groups) ? native.groups : [];
	const schedules = Array.isArray(native.schedules) ? native.schedules : [];
	const objProps = { socket: props.socket, theme: props.theme, themeName: props.themeName, themeType: props.themeType };

	// --- ESP32 relay-channel helpers (shared by the General + Safety pump/emergency pickers) -------
	// The ESP32 has 8 relay channels (0–7). A channel drives exactly one thing, so the pump and the
	// emergency valve must not collide with each other or with an aeration valve. These build the
	// same reserved/in-use drop-down the aeration-point channel picker uses.
	const espChValue = v => (Number.isInteger(v) && v >= 0 && v < 8 ? v : '');
	const espChannelUsedByPoint = ch => points.some(p => p.backendType === 'esp32' && Number(p.espChannel) === ch);
	/** Options for a pump/emergency relay select: `otherVal` (the other role's channel) is reserved,
	 *  channels taken by an aeration point are "in use"; the current value always stays selectable. */
	const espRelayOptions = (currentVal, otherVal, otherLabelKey) =>
		Array.from({ length: 8 }, (_, ch) => {
			let label = String(ch);
			let disabled = false;
			if (ch !== currentVal) {
				if (ch === otherVal) {
					label = `${ch} — ${I18n.t(otherLabelKey)}`;
					disabled = true;
				} else if (espChannelUsedByPoint(ch)) {
					label = `${ch} — ${I18n.t('in use')}`;
					disabled = true;
				}
			}
			return { value: ch, label, disabled };
		});

	const updatePoint = (i, key, value) => set('points', points.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)));
	const addPoint = () => {
		if (points.length >= MAX_POINTS) {
			return;
		}
		set('points', [
			...points,
			{ id: `pt-${points.length}`, name: `Point ${points.length + 1}`, enabled: true, backendType: native.controlBackend || 'iobroker', objectId: '', espChannel: points.length, onValue: true, offValue: false },
		]);
	};
	const removePoint = i => set('points', points.filter((_p, idx) => idx !== i));

	const updateGroup = (i, key, value) => set('groups', groups.map((g, idx) => (idx === i ? { ...g, [key]: value } : g)));
	const addGroup = () => set('groups', [...groups, { id: `grp-${groups.length}`, name: `Group ${groups.length + 1}`, members: [] }]);
	const removeGroup = i => set('groups', groups.filter((_g, idx) => idx !== i));

	const updateSchedule = (i, key, value) => set('schedules', schedules.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));
	const addSchedule = () => set('schedules', [...schedules, { id: `sch-${schedules.length}`, enabled: true, targets: [], days: [], from: '08:00', to: '18:00' }]);
	const removeSchedule = i => set('schedules', schedules.filter((_s, idx) => idx !== i));

	const sequenceSteps = Array.isArray(native.sequenceSteps) ? native.sequenceSteps : [];
	const updateStep = (i, key, value) => set('sequenceSteps', sequenceSteps.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));
	const addStep = () => set('sequenceSteps', [...sequenceSteps, { targetId: (points[0] && points[0].id) || '', dwellSec: null }]);
	const removeStep = i => set('sequenceSteps', sequenceSteps.filter((_s, idx) => idx !== i));
	const moveStep = (i, delta) => {
		const j = i + delta;
		if (j < 0 || j >= sequenceSteps.length) {
			return;
		}
		const next = sequenceSteps.slice();
		[next[i], next[j]] = [next[j], next[i]];
		set('sequenceSteps', next);
	};

	const toggleInArray = (arr, value) => (arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value]);

	/** A row of point checkboxes bound to an array of 0-based point indices (empty = all). */
	const PointPicker = ({ selected, onChange }) => (
		<FormGroup row>
			{points.map((p, pi) => (
				<FormControlLabel
					key={pi}
					control={<Checkbox size="small" checked={(selected || []).includes(pi)} onChange={() => onChange(toggleInArray(selected || [], pi))} />}
					label={p.name || `#${pi}`}
				/>
			))}
		</FormGroup>
	);

	// ================= TAB CONTENTS =================
	const general = (
		<Box>
			<TabTitle>{I18n.t('General')}</TabTitle>
			<Section>
				<Sw label={I18n.t('Master enable')} checked={native.masterEnable} onChange={v => set('masterEnable', v)} />
				<Box sx={{ mt: 1 }}>
					<Sw label={I18n.t('Dry-run (log only, do not switch hardware)')} checked={native.dryRun} onChange={v => set('dryRun', v)} />
				</Box>
				{native.dryRun ? (
					<Alert severity="warning" sx={{ mt: 1 }}>
						{I18n.t('In dry-run the adapter only logs the intended valve and pump actions — no hardware is switched.')}
					</Alert>
				) : null}
			</Section>
			<Section title={I18n.t('Hardware backend')}>
				<Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
					<Sel
						label={I18n.t('Backend')}
						value={native.controlBackend || 'iobroker'}
						onChange={v => set('controlBackend', v)}
						options={[
							{ value: 'iobroker', label: I18n.t('Existing ioBroker states') },
							{ value: 'esp32', label: I18n.t('ESP32 (direct)') },
						]}
					/>
					<Num label={I18n.t('Poll interval (s)')} value={native.pollIntervalSec} onChange={v => set('pollIntervalSec', v)} min={1} />
				</Box>
				{native.controlBackend === 'esp32' ? (
					<>
						<Box sx={{ mt: 2, p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
							<Typography variant="body2">
								🔌 {I18n.t('This backend requires the ESP32 reference firmware.')}{' '}
								{I18n.t('Recommended firmware for this adapter version:')} <b>v{FIRMWARE_RECOMMENDED}</b>{' '}
								({I18n.t('protocol')} {SUPPORTED_PROTOCOL}).{' '}
								<a href={FIRMWARE_RELEASES} target="_blank" rel="noopener noreferrer">
									{I18n.t('Firmware & releases ↗')}
								</a>
							</Typography>
							<Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
								{I18n.t('The device must speak the same protocol version. The connected firmware version and a compatibility flag are published under info.deviceFirmware / info.firmwareCompatible, and any mismatch is written to the log.')}
							</Typography>
						</Box>
						<Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
							<TextField variant="standard" label={I18n.t('ESP32 host / IP')} value={native.esp32Host || ''} onChange={e => set('esp32Host', e.target.value)} />
							<Num label={I18n.t('ESP32 port')} value={native.esp32Port} onChange={v => set('esp32Port', v)} min={1} />
							<Button variant="outlined" size="small" onClick={testEsp32} disabled={!native.esp32Host || espTesting}>
								{espTesting ? I18n.t('Testing…') : I18n.t('Test connection')}
							</Button>
						</Box>
						<Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
							{I18n.t('Host / IP is the ESP32 address on your network (find it in your router or on the device screen). The reference firmware always serves on port 80 — leave the port at 80 unless you run a reverse proxy in front of the device. Use “Test connection” to confirm the device is reachable and see its firmware version.')}
						</Typography>
						{native.esp32Port && Number(native.esp32Port) !== 80 ? (
							<Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
								{I18n.t('Warning: the firmware only listens on port 80. A different port will not connect unless a reverse proxy forwards it.')}
							</Typography>
						) : null}
						{espTest ? (
							<Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }} color={espTest.ok ? 'success.main' : 'error.main'}>
								{espTest.ok ? '✓ ' : '✗ '}
								{espTest.msg}
							</Typography>
						) : null}
						{espTest && espTest.ok && espTest.license ? (
							<Box sx={{ mt: 1, p: 1.2, borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
								<Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
									{I18n.t('Licence')}: {espTest.license.tier || 'free'}
									{espTest.license.trial ? ` — ${I18n.t('Trial — %s days left', espTest.license.trialDaysLeft)}` : ''}
								</Typography>
								<Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
									{I18n.t('Device code (give this when unlocking)')}: <b>{espTest.license.deviceCode || '—'}</b>
								</Typography>
								{!espTest.license.controlAllowed ? (
									<Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.3 }}>
										{I18n.t('This device is not licensed for control — monitoring only. Enter an activation key on the device page /license.')}
									</Typography>
								) : null}
							</Box>
						) : null}
						<Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
							<Sel label={I18n.t('Emergency-valve relay (0–7)')} value={espChValue(native.esp32EmergencyRelay ?? 6)} onChange={v => set('esp32EmergencyRelay', v)} sx={{ minWidth: 200 }} options={espRelayOptions(native.esp32EmergencyRelay ?? 6, native.esp32PumpRelay ?? 7, 'pump (reserved)')} />
							<Sel label={I18n.t('Pump relay (0–7)')} value={espChValue(native.esp32PumpRelay ?? 7)} onChange={v => set('esp32PumpRelay', v)} sx={{ minWidth: 200 }} options={espRelayOptions(native.esp32PumpRelay ?? 7, native.esp32EmergencyRelay ?? 6, 'emergency valve (reserved)')} />
						</Box>
						<Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
							{I18n.t('The aeration-point valves use the relay channel set per point; here you map the emergency valve and the pump. The firmware runs an on-device failsafe from these settings.')}
						</Typography>
						<Box sx={{ mt: 1.5 }}>
							<Sw label={I18n.t('Autonomous schedule (run without ioBroker)')} checked={native.esp32AutonomousEnabled} onChange={v => set('esp32AutonomousEnabled', v)} />
						</Box>
						<Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
							{I18n.t('If the adapter connection drops, the ESP32 keeps running your time schedules on its own using its NTP clock — the dead-head safety interlock still applies. The cyclic sequence is not run autonomously; it stays with the adapter.')}
						</Typography>
					</>
				) : null}
			</Section>
		</Box>
	);

	const pointsTab = (
		<Box>
			<TabTitle>{I18n.t('Aeration points')}</TabTitle>
			<Section desc={native.controlBackend === 'esp32'
				? I18n.t('Up to 8 aeration points. On the ESP32 backend each valve is a relay channel; the pump and emergency-valve channels are reserved and cannot be picked here. When no channel is left, add further points as ioBroker states via the Backend column.')
				: I18n.t('Up to 8 aeration points. Each valve is an existing ioBroker state or an ESP32 channel.')}>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>{I18n.t('Name')}</TableCell>
							<TableCell>{I18n.t('Enabled')}</TableCell>
							<TableCell>{I18n.t('Backend')}</TableCell>
							<TableCell>{I18n.t('Valve state / channel')}</TableCell>
							<TableCell>{I18n.t('Override button')}</TableCell>
							<TableCell />
						</TableRow>
					</TableHead>
					<TableBody>
						{points.map((p, i) => {
							// A manual override button is only allowed on an aeration-valve channel. On the
							// ESP32 pump / emergency-valve relay channels it is force-disabled in lib/config.js;
							// mirror that here by greying the control out (defaults must match the backend: 7/6).
							// ESP32 relay channels may only be picked when the ESP32 backend is selected; with the
							// ioBroker-state backend a point always maps to an ioBroker state (see lib/config.js).
							const espBackend = native.controlBackend === 'esp32';
							const pumpCh = native.esp32PumpRelay ?? 7;
							const emergencyCh = native.esp32EmergencyRelay ?? 6;
							const buttonReserved =
								espBackend && p.backendType === 'esp32' && (p.espChannel === pumpCh || p.espChannel === emergencyCh);
							return (
							<TableRow key={p.id || i}>
								<TableCell>
									<TextField variant="standard" value={p.name || ''} onChange={e => updatePoint(i, 'name', e.target.value)} />
								</TableCell>
								<TableCell>
									<Switch checked={p.enabled !== false} onChange={e => updatePoint(i, 'enabled', e.target.checked)} />
								</TableCell>
								<TableCell>
									{espBackend ? (
										<Sel
											label=""
											value={p.backendType || 'iobroker'}
											onChange={v => updatePoint(i, 'backendType', v)}
											sx={{ minWidth: 110 }}
											options={[
												{ value: 'iobroker', label: 'ioBroker' },
												{ value: 'esp32', label: 'ESP32' },
											]}
										/>
									) : (
										<Typography variant="body2" color="text.secondary">
											{I18n.t('ioBroker state')}
										</Typography>
									)}
								</TableCell>
								<TableCell sx={{ minWidth: 240 }}>
									{espBackend && p.backendType === 'esp32' ? (
										<Sel
											label={I18n.t('Channel')}
											value={Number.isInteger(p.espChannel) && p.espChannel >= 0 && p.espChannel < 8 ? p.espChannel : ''}
											onChange={v => updatePoint(i, 'espChannel', v)}
											sx={{ minWidth: 200 }}
											options={Array.from({ length: 8 }, (_, ch) => {
												// Reserve the pump / emergency-valve relays and channels already taken by
												// other ESP32 points; the current row's own channel always stays selectable.
												const isCurrent = ch === p.espChannel;
												const usedByOther = points.some(
													(q, j) => j !== i && q.backendType === 'esp32' && Number(q.espChannel) === ch,
												);
												let label = String(ch);
												let disabled = false;
												if (!isCurrent) {
													if (ch === pumpCh) {
														label = `${ch} — ${I18n.t('pump (reserved)')}`;
														disabled = true;
													} else if (ch === emergencyCh) {
														label = `${ch} — ${I18n.t('emergency valve (reserved)')}`;
														disabled = true;
													} else if (usedByOther) {
														label = `${ch} — ${I18n.t('in use')}`;
														disabled = true;
													}
												}
												return { value: ch, label, disabled };
											})}
										/>
									) : (
										<ObjectSelect label="" value={p.objectId} onChange={v => updatePoint(i, 'objectId', v)} {...objProps} />
									)}
								</TableCell>
								<TableCell sx={{ minWidth: 210 }}>
									<Switch
										checked={!buttonReserved && !!p.buttonEnabled}
										disabled={buttonReserved}
										onChange={e => updatePoint(i, 'buttonEnabled', e.target.checked)}
									/>
									{buttonReserved ? (
										<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
											{I18n.t(
												'Buttons are only available on aeration-valve channels — this channel drives the pump or the emergency valve.',
											)}
										</Typography>
									) : p.buttonEnabled ? (
										<ObjectSelect label={I18n.t('Button state')} value={p.buttonObjectId} onChange={v => updatePoint(i, 'buttonObjectId', v)} {...objProps} />
									) : null}
								</TableCell>
								<TableCell>
									<IconButton size="small" onClick={() => removePoint(i)}>
										<DeleteIcon fontSize="small" />
									</IconButton>
								</TableCell>
							</TableRow>
							);
						})}
					</TableBody>
				</Table>
				<Button startIcon={<AddIcon />} onClick={addPoint} disabled={points.length >= MAX_POINTS} sx={{ mt: 1 }}>
					{I18n.t('Add point')}
				</Button>
				<Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
					{I18n.t('Override button: an optional physical push-button (e.g. an ESP32 digital input or any boolean state). It works as a toggle — one press forces the point on with priority over the automatic control; only the master switch or a safety trip overrides it. Press again to release. Buttons are only available for aeration valves — a point that sits on the ESP32 pump or emergency-valve relay channel cannot have one.')}
				</Typography>
			</Section>
		</Box>
	);

	const groupsTab = (
		<Box>
			<TabTitle>{I18n.t('Groups')}</TabTitle>
			{groups.length > points.length ? <Alert severity="error" sx={{ mb: 2 }}>{I18n.t('There are more groups than points.')}</Alert> : null}
			<Section desc={I18n.t('Group aeration points to control them together. There can never be more groups than points.')}>
				{groups.map((g, i) => (
					<Box key={g.id || i} sx={{ border: '1px solid rgba(128,128,128,0.3)', p: 1, mb: 1, borderRadius: 1 }}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<TextField variant="standard" label={I18n.t('Name')} value={g.name || ''} onChange={e => updateGroup(i, 'name', e.target.value)} />
							<IconButton size="small" onClick={() => removeGroup(i)}>
								<DeleteIcon fontSize="small" />
							</IconButton>
						</Box>
						<FormGroup row>
							{points.map((p, pi) => (
								<FormControlLabel
									key={pi}
									control={<Checkbox checked={(g.members || []).includes(pi)} onChange={() => updateGroup(i, 'members', toggleInArray(g.members || [], pi))} />}
									label={p.name || `#${pi}`}
								/>
							))}
						</FormGroup>
					</Box>
				))}
				<Button startIcon={<AddIcon />} onClick={addGroup} disabled={groups.length >= points.length} sx={{ mt: 1 }}>
					{I18n.t('Add group')}
				</Button>
			</Section>
		</Box>
	);

	const targetOptions = [
		...points.map(p => ({ id: p.id, label: p.name })),
		...groups.map(g => ({ id: g.id, label: `${I18n.t('Group')}: ${g.name}` })),
	];
	const controlTab = (
		<Box>
			<TabTitle>{I18n.t('Control')}</TabTitle>
			<Section title={I18n.t('Cyclic round-robin')}>
				<Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
					<Sw label={I18n.t('Enabled')} checked={native.roundRobinEnabled} onChange={v => set('roundRobinEnabled', v)} />
					<Num label={I18n.t('Dwell per point (s)')} value={native.roundRobinDwellSec} onChange={v => set('roundRobinDwellSec', v)} min={1} />
				</Box>
				{native.roundRobinEnabled ? (
					<Box sx={{ mt: 2 }}>
						<Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{I18n.t('Sequence (points and groups)')}</Typography>
						<Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
							{I18n.t('Optional ordered cycle over points and/or groups (mixed). Leave empty to rotate through all points.')}
						</Typography>
						{sequenceSteps.map((s, i) => (
							<Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mb: 1, flexWrap: 'wrap' }}>
								<Typography variant="caption" sx={{ width: 24, textAlign: 'right' }}>{i + 1}.</Typography>
								<Sel
									label={I18n.t('Target')}
									value={targetOptions.some(t => t.id === s.targetId) ? s.targetId : ''}
									onChange={v => updateStep(i, 'targetId', v)}
									sx={{ minWidth: 180 }}
									options={targetOptions.map(t => ({ value: t.id, label: t.label }))}
								/>
								<Num label={I18n.t('Dwell (s, optional)')} value={s.dwellSec} onChange={v => updateStep(i, 'dwellSec', v)} nullable min={1} />
								<IconButton size="small" onClick={() => moveStep(i, -1)} disabled={i === 0}><ArrowUpwardIcon fontSize="small" /></IconButton>
								<IconButton size="small" onClick={() => moveStep(i, 1)} disabled={i === sequenceSteps.length - 1}><ArrowDownwardIcon fontSize="small" /></IconButton>
								<IconButton size="small" onClick={() => removeStep(i)}><DeleteIcon fontSize="small" /></IconButton>
							</Box>
						))}
						<Button startIcon={<AddIcon />} onClick={addStep} disabled={targetOptions.length === 0} sx={{ mt: 1 }}>
							{I18n.t('Add step')}
						</Button>
					</Box>
				) : null}
			</Section>
			<Section title={I18n.t('Schedules')}>
				{schedules.map((s, i) => (
					<Box key={s.id || i} sx={{ border: '1px solid rgba(128,128,128,0.3)', p: 1, mb: 1, borderRadius: 1 }}>
						<Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
							<Switch checked={s.enabled !== false} onChange={e => updateSchedule(i, 'enabled', e.target.checked)} />
							<TimePicker
								label={I18n.t('From')}
								ampm={false}
								format="HH:mm"
								value={hhmmToDayjs(s.from)}
								onChange={v => updateSchedule(i, 'from', dayjsToHHmm(v))}
								slotProps={{ textField: { variant: 'standard', size: 'small', sx: { width: 120 } } }}
							/>
							<TimePicker
								label={I18n.t('To')}
								ampm={false}
								format="HH:mm"
								value={hhmmToDayjs(s.to)}
								onChange={v => updateSchedule(i, 'to', dayjsToHHmm(v))}
								slotProps={{ textField: { variant: 'standard', size: 'small', sx: { width: 120 } } }}
							/>
							<IconButton size="small" onClick={() => removeSchedule(i)}>
								<DeleteIcon fontSize="small" />
							</IconButton>
						</Box>
						<FormGroup row>
							{WEEKDAYS.map(d => (
								<FormControlLabel
									key={d.v}
									control={<Checkbox size="small" checked={(s.days || []).includes(d.v)} onChange={() => updateSchedule(i, 'days', toggleInArray(s.days || [], d.v))} />}
									label={I18n.t(d.l)}
								/>
							))}
						</FormGroup>
						<Typography variant="caption">{I18n.t('Targets')}:</Typography>
						<FormGroup row>
							{targetOptions.map(t => (
								<FormControlLabel
									key={t.id}
									control={<Checkbox size="small" checked={(s.targets || []).includes(t.id)} onChange={() => updateSchedule(i, 'targets', toggleInArray(s.targets || [], t.id))} />}
									label={t.label}
								/>
							))}
						</FormGroup>
					</Box>
				))}
				<Button startIcon={<AddIcon />} onClick={addSchedule} sx={{ mt: 1 }}>
					{I18n.t('Add schedule')}
				</Button>
			</Section>
			<Section title={I18n.t('Winter / ice-free mode')} desc={I18n.t('Keep an ice-free hole open during the cold season by forcing the selected points on.')}>
				<Sw label={I18n.t('Enabled')} checked={native.winterEnabled} onChange={v => set('winterEnabled', v)} />
				{native.winterEnabled ? (
					<Box sx={{ mt: 1 }}>
						<Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
							<DatePicker
								label={I18n.t('Winter start')}
								views={['month', 'day']}
								format="DD.MM"
								value={mdToDayjs(native.winterStart)}
								onChange={v => set('winterStart', dayjsToMD(v))}
								slotProps={{ textField: { variant: 'standard', size: 'small', sx: { width: 160 } } }}
							/>
							<DatePicker
								label={I18n.t('Winter end')}
								views={['month', 'day']}
								format="DD.MM"
								value={mdToDayjs(native.winterEnd)}
								onChange={v => set('winterEnd', dayjsToMD(v))}
								slotProps={{ textField: { variant: 'standard', size: 'small', sx: { width: 160 } } }}
							/>
						</Box>
						<Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
							{I18n.t('Only day and month are used (recurring every year).')}
						</Typography>
						<Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
							<Sw label={I18n.t('Only when it is cold (frost protection)')} checked={native.winterFrostProtect} onChange={v => set('winterFrostProtect', v)} />
							{native.winterFrostProtect ? (
								<Num label={I18n.t('Air temperature threshold (°C)')} value={native.winterAirTempThreshold} onChange={v => set('winterAirTempThreshold', v)} />
							) : null}
						</Box>
						{native.winterFrostProtect && !native.airTempEnabled ? (
							<Alert severity="warning" sx={{ mt: 1 }}>{I18n.t('Frost protection needs air-temperature monitoring (Sensors tab).')}</Alert>
						) : null}
						<Typography variant="caption" sx={{ display: 'block', mt: 1 }}>{I18n.t('Points kept open (empty = all)')}:</Typography>
						<PointPicker selected={native.winterAffectedPoints} onChange={v => set('winterAffectedPoints', v)} />
					</Box>
				) : null}
			</Section>
		</Box>
	);

	const sensorBlock = (enabledKey, idKey, label, extra) => (
		<Section title={label}>
			<Sw label={I18n.t('Enabled')} checked={native[enabledKey]} onChange={v => set(enabledKey, v)} />
			{native[enabledKey] ? (
				<Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end', mt: 1 }}>
					<Box sx={{ minWidth: 260 }}>
						<ObjectSelect label={I18n.t('Source state')} value={native[idKey]} onChange={v => set(idKey, v)} {...objProps} />
					</Box>
					{extra}
				</Box>
			) : null}
		</Section>
	);
	const sensorsTab = (
		<Box>
			<TabTitle>{I18n.t('Sensors')}</TabTitle>
			{sensorBlock('o2Enabled', 'o2ObjectId', I18n.t('Dissolved oxygen'), (
				<>
					<Num label={I18n.t('Low threshold')} value={native.o2LowThreshold} onChange={v => set('o2LowThreshold', v)} nullable />
					<Num label={I18n.t('Target')} value={native.o2TargetThreshold} onChange={v => set('o2TargetThreshold', v)} nullable />
					<Num label={I18n.t('Hysteresis')} value={native.o2Hysteresis} onChange={v => set('o2Hysteresis', v)} min={0} />
				</>
			))}
			{native.o2Enabled ? (
				<Section title={I18n.t('Oxygen closed loop')} desc={I18n.t('Force aeration on while the oxygen is below the low threshold, until it recovers to the target.')}>
					<Sw label={I18n.t('Enabled')} checked={native.o2ControlEnabled} onChange={v => set('o2ControlEnabled', v)} />
					{native.o2ControlEnabled ? (
						<Box sx={{ mt: 1 }}>
							<Typography variant="caption" sx={{ display: 'block' }}>{I18n.t('Boosted points (empty = all)')}:</Typography>
							<PointPicker selected={native.o2AffectedPoints} onChange={v => set('o2AffectedPoints', v)} />
						</Box>
					) : null}
				</Section>
			) : null}
			{sensorBlock('airTempEnabled', 'airTempObjectId', I18n.t('Air temperature'))}
			{sensorBlock('waterTempEnabled', 'waterTempObjectId', I18n.t('Water temperature'))}
			{sensorBlock('pressureEnabled', 'pressureObjectId', I18n.t('Pressure'), (
				<>
					<Num label={I18n.t('Min')} value={native.pressureMin} onChange={v => set('pressureMin', v)} nullable />
					<Num label={I18n.t('Max')} value={native.pressureMax} onChange={v => set('pressureMax', v)} nullable />
				</>
			))}
		</Box>
	);

	const locationTab = (
		<Box>
			<TabTitle>{I18n.t('Location')}</TabTitle>
			<Section>
				<Sel
					label={I18n.t('Location source')}
					value={native.locationMode || 'system'}
					onChange={v => set('locationMode', v)}
					options={[
						{ value: 'system', label: I18n.t('ioBroker system location') },
						{ value: 'shared', label: I18n.t('Custom location (below)') },
					]}
				/>
				{native.locationMode === 'shared' ? (
					<Box sx={{ mt: 2 }}>
						<LocationPicker
							latitude={native.latitude}
							longitude={native.longitude}
							address={native.address}
							instanceId={props.instanceId}
							socket={props.socket}
							onChange={upd => {
								if (upd.latitude !== undefined) {
									set('latitude', upd.latitude);
								}
								if (upd.longitude !== undefined) {
									set('longitude', upd.longitude);
								}
								if (upd.address !== undefined) {
									set('address', upd.address);
								}
							}}
						/>
					</Box>
				) : (
					<Alert severity="info" sx={{ mt: 2 }}>{I18n.t('The coordinates from the ioBroker system settings are used.')}</Alert>
				)}
			</Section>
		</Box>
	);

	const feederTab = (
		<Box>
			<TabTitle>{I18n.t('Feeder')}</TabTitle>
			<Section>
				<FeederTab native={native} set={set} socket={props.socket} points={points} />
			</Section>
		</Box>
	);

	const safetyTab = (
		<Box>
			<TabTitle>{I18n.t('Safety')}</TabTitle>
			<Alert severity="warning" sx={{ mb: 2 }}>
				{I18n.t('These settings protect the pump and the animals. Read the notes and test on your own hardware before unattended use.')}
			</Alert>
			<Section title={I18n.t('Dead-head interlock')} desc={I18n.t('An air pump must never run against fully closed valves (dead-heading) — it overheats and can be damaged.')}>
				<Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
					<Field help={I18n.t('While the pump runs, at least this many valves are always kept open. If that cannot be reached, the emergency valve opens and the pump is switched off. Higher = safer against dead-heading, but forces more points open.')}>
						<Num label={I18n.t('Min. open valves while pump runs')} value={native.minOpenValves} onChange={v => set('minOpenValves', v)} min={1} />
					</Field>
					<Field help={I18n.t('How often the interlock is re-checked (seconds). Smaller = reacts faster to a dangerous state, but a little more load. 5 s is a good default.')}>
						<Num label={I18n.t('Watchdog interval (s)')} value={native.watchdogIntervalSec} onChange={v => set('watchdogIntervalSec', v)} min={1} />
					</Field>
					<Field help={I18n.t('When switching from one point to the next, the new valve opens this many seconds before the old one closes (make-before-break), so there is never a moment with everything shut. 0 disables the overlap.')}>
						<Num label={I18n.t('Make-before-break overlap (s)')} value={native.overlapSec} onChange={v => set('overlapSec', v)} min={0} />
					</Field>
				</Box>
			</Section>
			<Section title={I18n.t('Pump')} desc={I18n.t('Tell the adapter about your air pump. If it is controllable, the interlock may switch it off in an emergency; if it is only observed, the emergency valve alone protects it.')}>
				<Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
					<Field help={I18n.t('On: the adapter may switch the pump off (needs the pump state below). Off: the pump is only observed — the adapter never switches it, and relies on the emergency valve.')}>
						<Sw label={I18n.t('Pump is controllable')} checked={native.pumpControllable} onChange={v => set('pumpControllable', v)} />
					</Field>
					<Field help={native.controlBackend === 'esp32'
						? I18n.t('With the ESP32 backend the pump is an ESP32 relay channel — the same one set under General → Hardware backend. Changing it here changes it there too.')
						: I18n.t('The ioBroker state that reports (and, if controllable, switches) the pump. Leave empty if you have no pump signal.')}>
						{native.controlBackend === 'esp32' ? (
							<Sel label={I18n.t('Pump relay (0–7)')} value={espChValue(native.esp32PumpRelay ?? 7)} onChange={v => set('esp32PumpRelay', v)} sx={{ minWidth: 200 }} options={espRelayOptions(native.esp32PumpRelay ?? 7, native.esp32EmergencyRelay ?? 6, 'emergency valve (reserved)')} />
						) : (
							<Box sx={{ minWidth: 260 }}>
								<ObjectSelect label={I18n.t('Pump state')} value={native.pumpObjectId} onChange={v => set('pumpObjectId', v)} {...objProps} />
							</Box>
						)}
					</Field>
					<Field help={I18n.t('Anti short-cycle: once ON, the pump stays on at least this long before it may be switched off (protects the motor). 0 = no limit.')}>
						<Num label={I18n.t('Min. on-time (s)')} value={native.pumpMinOnSec} onChange={v => set('pumpMinOnSec', v)} min={0} />
					</Field>
					<Field help={I18n.t('Anti short-cycle: once OFF, the pump stays off at least this long before it may restart. 0 = no limit. (An emergency stop always bypasses this.)')}>
						<Num label={I18n.t('Min. off-time (s)')} value={native.pumpMinOffSec} onChange={v => set('pumpMinOffSec', v)} min={0} />
					</Field>
				</Box>
			</Section>
			<Section title={I18n.t('Emergency valve')} desc={I18n.t('The relief valve the interlock opens when too few normal valves are open. Wire it normally-open (NO) so it opens by itself on a power cut.')}>
				<Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
					<Field help={native.controlBackend === 'esp32'
						? I18n.t('With the ESP32 backend the emergency valve is an ESP32 relay channel — the same one set under General → Hardware backend. Changing it here changes it there too.')
						: I18n.t('The ioBroker state that opens/closes the emergency valve.')}>
						{native.controlBackend === 'esp32' ? (
							<Sel label={I18n.t('Emergency-valve relay (0–7)')} value={espChValue(native.esp32EmergencyRelay ?? 6)} onChange={v => set('esp32EmergencyRelay', v)} sx={{ minWidth: 200 }} options={espRelayOptions(native.esp32EmergencyRelay ?? 6, native.esp32PumpRelay ?? 7, 'pump (reserved)')} />
						) : (
							<Box sx={{ minWidth: 260 }}>
								<ObjectSelect label={I18n.t('Emergency valve state')} value={native.emergencyObjectId} onChange={v => set('emergencyObjectId', v)} {...objProps} />
							</Box>
						)}
					</Field>
					<Field help={I18n.t('On (recommended): the valve is open without power (fail-safe) — on a power cut the pump can always vent. Off: it is closed without power.')}>
						<Sw label={I18n.t('Normally open (fail-safe)')} checked={native.emergencyNormallyOpen} onChange={v => set('emergencyNormallyOpen', v)} />
					</Field>
					<Field help={I18n.t('Solenoid = opens/closes almost instantly. Motorized ball valve (e.g. CWX-15N) needs a travel time and does not spring open on power loss — the dead-head protection then relies on the pump also losing power.')}>
						<Sel
							label={I18n.t('Valve type')}
							value={native.emergencyValveType || 'solenoid'}
							onChange={v => set('emergencyValveType', v)}
							options={[
								{ value: 'solenoid', label: I18n.t('Solenoid') },
								{ value: 'motorBallValve', label: I18n.t('Motorized ball valve') },
							]}
						/>
					</Field>
					{native.emergencyValveType === 'motorBallValve' ? (
						<Field help={I18n.t('How long the motor valve needs to travel fully open/closed. The safety logic waits this long instead of assuming an instant reaction.')}>
							<Num label={I18n.t('Motor travel time (s)')} value={native.emergencyMotorTravelSec} onChange={v => set('emergencyMotorTravelSec', v)} min={0} />
						</Field>
					) : null}
				</Box>
			</Section>
		</Box>
	);

	const notifyTab = (
		<Box>
			<TabTitle>{I18n.t('Notifications')}</TabTitle>
			<Section>
				<NotifyTab native={native} set={set} socket={props.socket} />
			</Section>
		</Box>
	);

	const tabs = [
		{ label: I18n.t('General'), content: general },
		{ label: I18n.t('Aeration points'), content: pointsTab },
		{ label: I18n.t('Groups'), content: groupsTab },
		{ label: I18n.t('Control'), content: controlTab },
		{ label: I18n.t('Sensors'), content: sensorsTab },
		{ label: I18n.t('Location'), content: locationTab },
		{ label: I18n.t('Feeder'), content: feederTab },
		{ label: I18n.t('Safety'), content: safetyTab },
		{ label: I18n.t('Notifications'), content: notifyTab },
	];

	return (
		<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={I18n.getLanguage()}>
			<Box sx={{ p: 2, pb: 12 }}>
				<Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
					{tabs.map((t, i) => (
						<Tab key={i} label={t.label} />
					))}
				</Tabs>
				{/* pb leaves room so the last controls are not hidden behind the Save/Close bar */}
				<Box sx={{ mt: 2, maxWidth: 900 }}>{tabs[tab].content}</Box>
			</Box>
		</LocalizationProvider>
	);
}

export default Settings;
