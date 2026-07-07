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
import { I18n } from '@iobroker/adapter-react-v5';
import ObjectSelect from './ObjectSelect';
import LocationPicker from './LocationPicker';
import FeederTab from './FeederTab';
import NotifyTab from './NotifyTab';

const MAX_POINTS = 8;
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
function Num({ label, value, onChange, nullable, min }) {
	return (
		<TextField
			variant="standard"
			type="number"
			label={label}
			value={value === null || value === undefined ? '' : value}
			inputProps={min !== undefined ? { min } : undefined}
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
					<MenuItem key={o.value} value={o.value}>
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

	const points = Array.isArray(native.points) ? native.points : [];
	const groups = Array.isArray(native.groups) ? native.groups : [];
	const schedules = Array.isArray(native.schedules) ? native.schedules : [];
	const objProps = { socket: props.socket, theme: props.theme, themeName: props.themeName, themeType: props.themeType };

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

	const toggleInArray = (arr, value) => (arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value]);

	// ================= TAB CONTENTS =================
	const general = (
		<Box>
			<TabTitle>{I18n.t('General')}</TabTitle>
			<Section>
				<Sw label={I18n.t('Master enable')} checked={native.masterEnable} onChange={v => set('masterEnable', v)} />
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
					<Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
						<TextField variant="standard" label={I18n.t('ESP32 host / IP')} value={native.esp32Host || ''} onChange={e => set('esp32Host', e.target.value)} />
						<Num label={I18n.t('ESP32 port')} value={native.esp32Port} onChange={v => set('esp32Port', v)} min={1} />
						<Sw label={I18n.t('Use WebSocket')} checked={native.esp32UseWebsocket} onChange={v => set('esp32UseWebsocket', v)} />
					</Box>
				) : null}
			</Section>
		</Box>
	);

	const pointsTab = (
		<Box>
			<TabTitle>{I18n.t('Aeration points')}</TabTitle>
			<Section desc={I18n.t('Up to 8 aeration points. Each valve is an existing ioBroker state or an ESP32 channel.')}>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>{I18n.t('Name')}</TableCell>
							<TableCell>{I18n.t('Enabled')}</TableCell>
							<TableCell>{I18n.t('Backend')}</TableCell>
							<TableCell>{I18n.t('Valve state / channel')}</TableCell>
							<TableCell />
						</TableRow>
					</TableHead>
					<TableBody>
						{points.map((p, i) => (
							<TableRow key={p.id || i}>
								<TableCell>
									<TextField variant="standard" value={p.name || ''} onChange={e => updatePoint(i, 'name', e.target.value)} />
								</TableCell>
								<TableCell>
									<Switch checked={p.enabled !== false} onChange={e => updatePoint(i, 'enabled', e.target.checked)} />
								</TableCell>
								<TableCell>
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
								</TableCell>
								<TableCell sx={{ minWidth: 240 }}>
									{p.backendType === 'esp32' ? (
										<Num label={I18n.t('Channel')} value={p.espChannel} onChange={v => updatePoint(i, 'espChannel', v)} min={0} />
									) : (
										<ObjectSelect label="" value={p.objectId} onChange={v => updatePoint(i, 'objectId', v)} {...objProps} />
									)}
								</TableCell>
								<TableCell>
									<IconButton size="small" onClick={() => removePoint(i)}>
										<DeleteIcon fontSize="small" />
									</IconButton>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				<Button startIcon={<AddIcon />} onClick={addPoint} disabled={points.length >= MAX_POINTS} sx={{ mt: 1 }}>
					{I18n.t('Add point')}
				</Button>
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
			</Section>
			<Section title={I18n.t('Schedules')}>
				{schedules.map((s, i) => (
					<Box key={s.id || i} sx={{ border: '1px solid rgba(128,128,128,0.3)', p: 1, mb: 1, borderRadius: 1 }}>
						<Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
							<Switch checked={s.enabled !== false} onChange={e => updateSchedule(i, 'enabled', e.target.checked)} />
							<TextField variant="standard" label={I18n.t('From')} value={s.from || ''} onChange={e => updateSchedule(i, 'from', e.target.value)} sx={{ width: 90 }} />
							<TextField variant="standard" label={I18n.t('To')} value={s.to || ''} onChange={e => updateSchedule(i, 'to', e.target.value)} sx={{ width: 90 }} />
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
			<Section>
				<Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
					<Num label={I18n.t('Min. open valves while pump runs')} value={native.minOpenValves} onChange={v => set('minOpenValves', v)} min={1} />
					<Num label={I18n.t('Watchdog interval (s)')} value={native.watchdogIntervalSec} onChange={v => set('watchdogIntervalSec', v)} min={1} />
					<Num label={I18n.t('Make-before-break overlap (s)')} value={native.overlapSec} onChange={v => set('overlapSec', v)} min={0} />
				</Box>
			</Section>
			<Section title={I18n.t('Pump')}>
				<Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
					<Sw label={I18n.t('Pump is controllable')} checked={native.pumpControllable} onChange={v => set('pumpControllable', v)} />
					<Box sx={{ minWidth: 260 }}>
						<ObjectSelect label={I18n.t('Pump state')} value={native.pumpObjectId} onChange={v => set('pumpObjectId', v)} {...objProps} />
					</Box>
					<Num label={I18n.t('Min. on-time (s)')} value={native.pumpMinOnSec} onChange={v => set('pumpMinOnSec', v)} min={0} />
					<Num label={I18n.t('Min. off-time (s)')} value={native.pumpMinOffSec} onChange={v => set('pumpMinOffSec', v)} min={0} />
				</Box>
			</Section>
			<Section title={I18n.t('Emergency valve')}>
				<Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
					<Box sx={{ minWidth: 260 }}>
						<ObjectSelect label={I18n.t('Emergency valve state')} value={native.emergencyObjectId} onChange={v => set('emergencyObjectId', v)} {...objProps} />
					</Box>
					<Sw label={I18n.t('Normally open (fail-safe)')} checked={native.emergencyNormallyOpen} onChange={v => set('emergencyNormallyOpen', v)} />
					<Sel
						label={I18n.t('Valve type')}
						value={native.emergencyValveType || 'solenoid'}
						onChange={v => set('emergencyValveType', v)}
						options={[
							{ value: 'solenoid', label: I18n.t('Solenoid') },
							{ value: 'motorBallValve', label: I18n.t('Motorized ball valve') },
						]}
					/>
					{native.emergencyValveType === 'motorBallValve' ? (
						<Num label={I18n.t('Motor travel time (s)')} value={native.emergencyMotorTravelSec} onChange={v => set('emergencyMotorTravelSec', v)} min={0} />
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
		<Box sx={{ p: 2 }}>
			<Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
				{tabs.map((t, i) => (
					<Tab key={i} label={t.label} />
				))}
			</Tabs>
			<Box sx={{ mt: 2, maxWidth: 900 }}>{tabs[tab].content}</Box>
		</Box>
	);
}

export default Settings;
