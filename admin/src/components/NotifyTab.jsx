import React, { useEffect, useState } from 'react';
import {
	Box,
	Switch,
	FormControlLabel,
	FormGroup,
	Checkbox,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Button,
	Alert,
	Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { I18n } from '@iobroker/adapter-react-v5';

/** The notification events the user can enable/disable, and what each one sends. */
const EVENTS = [
	{ key: 'interlock', label: 'Safety interlock', desc: 'when the dead-head interlock trips or clears' },
	{ key: 'oxygen', label: 'Oxygen alarm', desc: 'when dissolved oxygen drops too low or recovers' },
	{ key: 'pressure', label: 'Pressure alarm', desc: 'when the pressure leaves or re-enters its range' },
];
const ALL_EVENT_KEYS = EVENTS.map(e => e.key);

/**
 * Notifications tab. Discovers the installed messaging adapter instances (common.type ===
 * "messaging", e.g. telegram, pushover, signal-cmb) via the admin socket, and lets the user pick
 * WHICH events are sent (not just the instance).
 *
 * @param {object} props - native config, set (onChange), socket
 * @returns {React.JSX.Element} the notifications tab
 */
function NotifyTab(props) {
	const { native, set, socket } = props;
	const enabled = !!native.notifyEnabled;
	const [instances, setInstances] = useState(null);

	// Undefined = not configured yet → treat as "all events" (the adapter default).
	const selectedEvents = Array.isArray(native.notifyEvents) ? native.notifyEvents : ALL_EVENT_KEYS;
	const toggleEvent = key => {
		const next = selectedEvents.includes(key)
			? selectedEvents.filter(k => k !== key)
			: [...selectedEvents, key];
		set('notifyEvents', next);
	};

	const load = async () => {
		try {
			const all = await socket.getAdapterInstances();
			const ids = (all || [])
				.filter(o => o && o.common && o.common.type === 'messaging')
				.map(o => String(o._id).replace('system.adapter.', ''))
				.filter(Boolean);
			setInstances(ids);
		} catch {
			setInstances([]);
		}
	};

	useEffect(() => {
		if (enabled) {
			load();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabled]);

	return (
		<Box>
			<FormControlLabel
				control={<Switch checked={enabled} onChange={e => set('notifyEnabled', e.target.checked)} />}
				label={I18n.t('Send notifications')}
			/>
			{enabled ? (
				<Box sx={{ ml: 2, mt: 1 }}>
					<Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
						<FormControl variant="standard" sx={{ minWidth: 220 }}>
							<InputLabel>{I18n.t('Messaging instance')}</InputLabel>
							<Select value={native.messagingInstance || ''} onChange={e => set('messagingInstance', e.target.value)}>
								{(instances || []).map(id => (
									<MenuItem key={id} value={id}>
										{id}
									</MenuItem>
								))}
							</Select>
						</FormControl>
						<Button startIcon={<RefreshIcon />} onClick={load}>
							{I18n.t('Refresh')}
						</Button>
						{instances && instances.length === 0 ? (
							<Alert severity="warning">{I18n.t('No messaging instance found.')}</Alert>
						) : null}
					</Box>

					<Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 600 }}>
						{I18n.t('Which messages to send')}
					</Typography>
					<Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
						{I18n.t('Tick the events that should send a message to the selected instance. A short, localized text is sent on each edge (raise and clear).')}
					</Typography>
					<FormGroup>
						{EVENTS.map(ev => (
							<FormControlLabel
								key={ev.key}
								control={<Checkbox checked={selectedEvents.includes(ev.key)} onChange={() => toggleEvent(ev.key)} />}
								label={
									<span>
										{I18n.t(ev.label)}
										<Typography component="span" variant="caption" color="textSecondary" sx={{ ml: 1 }}>
											— {I18n.t(ev.desc)}
										</Typography>
									</span>
								}
							/>
						))}
					</FormGroup>
					{selectedEvents.length === 0 ? (
						<Alert severity="info" sx={{ mt: 1 }}>{I18n.t('No event selected — nothing will be sent.')}</Alert>
					) : null}
				</Box>
			) : null}
		</Box>
	);
}

export default NotifyTab;
