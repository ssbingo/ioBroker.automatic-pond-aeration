import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { TextField, IconButton, InputAdornment, Tooltip } from '@mui/material';
import ListIcon from '@mui/icons-material/List';
import ClearIcon from '@mui/icons-material/Clear';
import { DialogSelectID, I18n } from '@iobroker/adapter-react-v5';

/**
 * Text field plus a button that opens the ioBroker object browser to pick a state id.
 */
function ObjectSelect(props) {
	const { label, value, onChange, socket, theme, themeName, themeType, disabled, filterFunc } = props;
	const [open, setOpen] = useState(false);

	return (
		<>
			<TextField
				variant="standard"
				fullWidth
				label={label}
				value={value || ''}
				disabled={disabled}
				onChange={(e) => onChange(e.target.value)}
				slotProps={{
					input: {
						endAdornment: (
							<InputAdornment position="end">
								{value ? (
									<Tooltip title={I18n.t('Clear')}>
										<IconButton size="small" disabled={disabled} onClick={() => onChange('')}>
											<ClearIcon fontSize="small" />
										</IconButton>
									</Tooltip>
								) : null}
								<Tooltip title={I18n.t('Select object')}>
									<IconButton size="small" disabled={disabled} onClick={() => setOpen(true)}>
										<ListIcon fontSize="small" />
									</IconButton>
								</Tooltip>
							</InputAdornment>
						),
					},
				}}
			/>
			{open ? (
				<DialogSelectID
					imagePrefix="../.."
					socket={socket}
					theme={theme}
					themeName={themeName}
					themeType={themeType}
					selected={value || ''}
					// "filterFunc" and "types" are mutually exclusive in DialogSelectID
					{...(filterFunc ? { filterFunc } : { types: ['state'] })}
					onClose={() => setOpen(false)}
					onOk={(selected) => {
						const id = Array.isArray(selected) ? selected[0] : selected;
						onChange(id || '');
						setOpen(false);
					}}
				/>
			) : null}
		</>
	);
}

ObjectSelect.propTypes = {
	label: PropTypes.string,
	value: PropTypes.string,
	onChange: PropTypes.func.isRequired,
	socket: PropTypes.object.isRequired,
	theme: PropTypes.object.isRequired,
	themeName: PropTypes.string,
	themeType: PropTypes.string,
	disabled: PropTypes.bool,
	filterFunc: PropTypes.func,
};

export default ObjectSelect;
