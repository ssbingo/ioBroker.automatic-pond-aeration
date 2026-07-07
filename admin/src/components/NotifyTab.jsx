import React, { useEffect, useState } from 'react';
import { Box, Switch, FormControlLabel, Select, MenuItem, FormControl, InputLabel, Button, Alert } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { I18n } from '@iobroker/adapter-react-v5';

/**
 * Notifications tab. Discovers the installed messaging adapter instances (common.type ===
 * "messaging", e.g. telegram, pushover, signal-cmb) via the admin socket and offers them in a
 * dropdown instead of a free-text field.
 *
 * @param {object} props - native config, set (onChange), socket
 * @returns {React.JSX.Element} the notifications tab
 */
function NotifyTab(props) {
	const { native, set, socket } = props;
	const enabled = !!native.notifyEnabled;
	const [instances, setInstances] = useState(null);

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
				<Box sx={{ ml: 2, mt: 1, display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
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
			) : null}
		</Box>
	);
}

export default NotifyTab;
