import React, { useEffect, useState } from 'react';
import {
	Box,
	Switch,
	FormControlLabel,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Button,
	Typography,
	Checkbox,
	FormGroup,
	Alert,
	TextField,
	CircularProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { I18n } from '@iobroker/adapter-react-v5';

const toggle = (arr, value) => (arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value]);

/**
 * Feeder-coupling tab. Discovers the installed automatic-feeder instances and their switches
 * directly via the admin socket (works even when the adapters are not running), so the user
 * can pick the switches whose feeding pauses the selected aeration points.
 *
 * @param {object} props - native config, set (onChange), socket, points
 * @returns {React.JSX.Element} the feeder tab
 */
function FeederTab(props) {
	const { native, set, socket, points } = props;
	const enabled = !!native.feederEnabled;
	const [instances, setInstances] = useState(null);
	const [switches, setSwitches] = useState(null);
	const [busy, setBusy] = useState(false);

	const loadInstances = async () => {
		try {
			const list = await socket.getAdapterInstances('automatic-feeder');
			const ids = (list || [])
				.map(o => (o && o._id ? String(o._id).replace('system.adapter.', '') : null))
				.filter(Boolean);
			setInstances(ids);
		} catch {
			setInstances([]);
		}
	};

	const loadSwitches = async instance => {
		if (!instance) {
			setSwitches(null);
			return;
		}
		setBusy(true);
		try {
			const obj = await socket.getObject(`system.adapter.${instance}`);
			const sw = obj && obj.native && Array.isArray(obj.native.switches) ? obj.native.switches : [];
			setSwitches(
				sw
					.filter(s => s && s.id)
					.map(s => ({ value: `${instance}.switches.${s.id}.status.feedingActive`, label: s.name || s.id })),
			);
		} catch {
			setSwitches([]);
		}
		setBusy(false);
	};

	// Load the instance list when the coupling is enabled.
	useEffect(() => {
		if (enabled) {
			loadInstances();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabled]);

	// Load the switches whenever the selected instance changes.
	useEffect(() => {
		if (enabled && native.feederInstance) {
			loadSwitches(native.feederInstance);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabled, native.feederInstance]);

	return (
		<Box>
			<FormControlLabel
				control={<Switch checked={enabled} onChange={e => set('feederEnabled', e.target.checked)} />}
				label={I18n.t('Pause aeration during feeding (automatic-feeder)')}
			/>
			{enabled ? (
				<Box sx={{ ml: 2 }}>
					<Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
						<FormControl variant="standard" sx={{ minWidth: 220 }}>
							<InputLabel>{I18n.t('Feeder instance')}</InputLabel>
							<Select value={native.feederInstance || ''} onChange={e => set('feederInstance', e.target.value)}>
								{(instances || []).map(id => (
									<MenuItem key={id} value={id}>
										{id}
									</MenuItem>
								))}
							</Select>
						</FormControl>
						<Button
							startIcon={<RefreshIcon />}
							onClick={() => {
								loadInstances();
								loadSwitches(native.feederInstance);
							}}
						>
							{I18n.t('Refresh')}
						</Button>
						{busy ? <CircularProgress size={18} /> : null}
					</Box>
					{instances && instances.length === 0 ? (
						<Alert severity="warning" sx={{ mt: 1 }}>{I18n.t('No automatic-feeder instance found.')}</Alert>
					) : null}
					{switches ? (
						<Box sx={{ mt: 1 }}>
							<Typography variant="caption">{I18n.t('Feeder switches')}:</Typography>
							<FormGroup>
								{switches.length === 0 ? (
									<Typography variant="caption">{I18n.t('No switches found.')}</Typography>
								) : null}
								{switches.map(sw => (
									<FormControlLabel
										key={sw.value}
										control={
											<Checkbox
												checked={(native.feederSwitches || []).includes(sw.value)}
												onChange={() => set('feederSwitches', toggle(native.feederSwitches || [], sw.value))}
											/>
										}
										label={sw.label}
									/>
								))}
							</FormGroup>
						</Box>
					) : null}
					<Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap', mt: 1 }}>
						<FormControl variant="standard" sx={{ minWidth: 200 }}>
							<InputLabel>{I18n.t('Duration mode')}</InputLabel>
							<Select value={native.feederDurationMode || 'measure'} onChange={e => set('feederDurationMode', e.target.value)}>
								<MenuItem value="measure">{I18n.t('Measure (watch the switch)')}</MenuItem>
								<MenuItem value="pulse">{I18n.t('Pulse (fixed duration)')}</MenuItem>
							</Select>
						</FormControl>
						<TextField
							variant="standard"
							type="number"
							label={I18n.t('Offset (s)')}
							value={native.feederOffsetSec ?? ''}
							inputProps={{ min: 0 }}
							onChange={e => set('feederOffsetSec', e.target.value === '' ? 0 : Number(e.target.value))}
							sx={{ minWidth: 140 }}
						/>
						{native.feederDurationMode === 'pulse' ? (
							<TextField
								variant="standard"
								type="number"
								label={I18n.t('Feeding duration (s)')}
								value={native.feederFeedingDurationSec ?? ''}
								inputProps={{ min: 0 }}
								onChange={e => set('feederFeedingDurationSec', e.target.value === '' ? 0 : Number(e.target.value))}
								sx={{ minWidth: 160 }}
							/>
						) : null}
					</Box>
					<Alert severity="info" sx={{ mt: 1 }}>{I18n.t('The offset should be at least the average time the animals need to eat.')}</Alert>
					<Typography variant="caption">{I18n.t('Affected points')}:</Typography>
					<FormGroup row>
						{points.map((p, pi) => (
							<FormControlLabel
								key={pi}
								control={
									<Checkbox
										checked={(native.feederAffectedPoints || []).includes(pi)}
										onChange={() => set('feederAffectedPoints', toggle(native.feederAffectedPoints || [], pi))}
									/>
								}
								label={p.name || `#${pi}`}
							/>
						))}
					</FormGroup>
				</Box>
			) : null}
		</Box>
	);
}

export default FeederTab;
