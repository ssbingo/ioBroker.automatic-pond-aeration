import React from 'react';
import { Box, FormControlLabel, Switch, Typography, Alert } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';

/**
 * Early scaffold settings page. The full configuration (aeration points, groups,
 * schedules, sensors, ESP32 backend and feeder coupling) is added in later milestones,
 * reusing the feeder's LocationPicker and ObjectSelect components.
 *
 * @param {object} props - component props
 * @param {Record<string, any>} props.native - the adapter native configuration
 * @param {(attr: string, value: any) => void} props.onChange - change handler
 * @returns {React.JSX.Element} the settings page
 */
function Settings(props) {
	const native = props.native || {};

	return (
		<Box sx={{ p: 2, maxWidth: 760 }}>
			<Typography variant="h6" gutterBottom>
				{I18n.t('General settings')}
			</Typography>

			<FormControlLabel
				control={
					<Switch
						checked={!!native.masterEnable}
						onChange={e => props.onChange('masterEnable', e.target.checked)}
					/>
				}
				label={I18n.t('Master enable')}
			/>

			<Alert severity="info" sx={{ mt: 2 }}>
				{I18n.t('scaffold_notice')}
			</Alert>
		</Box>
	);
}

export default Settings;
