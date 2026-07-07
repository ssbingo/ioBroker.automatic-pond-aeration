import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import L from 'leaflet';
import { Box, Button, TextField, CircularProgress, Typography } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';

// Fix the default marker icon (the bundler rewrites the relative asset paths) by pointing
// Leaflet to the CDN copies. The map tiles already require internet access.
L.Icon.Default.mergeOptions({
	iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
	iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const GERMANY_CENTER = [51.1657, 10.4515];

/**
 * Address search (via the adapter's Nominatim geocoder) plus an OpenStreetMap map with a
 * draggable marker to define the pond location. Plain Leaflet (no react-leaflet).
 *
 * @param {object} props - component props
 * @returns {React.JSX.Element} the location picker
 */
function LocationPicker(props) {
	const { latitude, longitude, address, onChange, socket, instanceId } = props;
	const [query, setQuery] = useState(address || '');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');

	const containerRef = useRef(null);
	const mapRef = useRef(null);
	const markerRef = useRef(null);
	const onChangeRef = useRef(onChange);
	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	const latNum = parseFloat(latitude);
	const lngNum = parseFloat(longitude);
	const hasPos = Number.isFinite(latNum) && Number.isFinite(lngNum);

	// create the map once
	useEffect(() => {
		if (mapRef.current || !containerRef.current) {
			return undefined;
		}
		const start = hasPos ? [latNum, lngNum] : GERMANY_CENTER;
		const map = L.map(containerRef.current).setView(start, hasPos ? 13 : 5);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		}).addTo(map);
		map.on('click', e => {
			onChangeRef.current({ latitude: e.latlng.lat.toFixed(6), longitude: e.latlng.lng.toFixed(6) });
		});
		mapRef.current = map;
		window.setTimeout(() => map.invalidateSize(), 0);
		return () => {
			map.remove();
			mapRef.current = null;
			markerRef.current = null;
		};
		// run only once on mount
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// keep the marker and view in sync with the coordinates
	useEffect(() => {
		const map = mapRef.current;
		if (!map) {
			return;
		}
		if (hasPos) {
			if (!markerRef.current) {
				const marker = L.marker([latNum, lngNum], { draggable: true }).addTo(map);
				marker.on('dragend', () => {
					const p = marker.getLatLng();
					onChangeRef.current({ latitude: p.lat.toFixed(6), longitude: p.lng.toFixed(6) });
				});
				markerRef.current = marker;
			} else {
				markerRef.current.setLatLng([latNum, lngNum]);
			}
			map.setView([latNum, lngNum], Math.max(map.getZoom(), 13));
		} else if (markerRef.current) {
			map.removeLayer(markerRef.current);
			markerRef.current = null;
		}
	}, [latNum, lngNum, hasPos]);

	const search = async () => {
		if (!query) {
			return;
		}
		setBusy(true);
		setError('');
		try {
			const res = await socket.sendTo(instanceId, 'geocodeAddress', { address: query });
			if (res && res.result) {
				onChange({
					latitude: String(res.result.latitude),
					longitude: String(res.result.longitude),
					address: res.result.displayName || query,
				});
			} else {
				setError((res && res.error) || I18n.t('No location found'));
			}
		} catch (e) {
			setError(`${I18n.t('Geocoding failed: instance must be running')} (${e})`);
		}
		setBusy(false);
	};

	return (
		<Box>
			<Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'flex-start' }}>
				<TextField
					variant="standard"
					fullWidth
					label={I18n.t('Address search')}
					value={query}
					onChange={e => setQuery(e.target.value)}
					onKeyDown={e => {
						if (e.key === 'Enter') {
							search();
						}
					}}
				/>
				<Button variant="contained" onClick={search} disabled={busy || !query} sx={{ mt: 1 }}>
					{busy ? <CircularProgress size={20} /> : I18n.t('Search')}
				</Button>
			</Box>
			{error ? (
				<Typography color="error" variant="body2" sx={{ mb: 1 }}>
					{error}
				</Typography>
			) : null}
			{/* responsive: full width on small screens, capped on wider ones */}
			<Box
				sx={{
					height: 320,
					width: '100%',
					maxWidth: { xs: '100%', sm: 480, md: 600 },
					mb: 1,
					border: '1px solid rgba(128,128,128,0.4)',
				}}
			>
				<div ref={containerRef} style={{ height: '100%', width: '100%' }} />
			</Box>
			<Typography variant="caption" color="textSecondary">
				{I18n.t('Click on the map or drag the marker to set the location.')}
			</Typography>
			<Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
				<TextField
					variant="standard"
					label={I18n.t('Latitude')}
					value={latitude || ''}
					onChange={e => onChange({ latitude: e.target.value })}
				/>
				<TextField
					variant="standard"
					label={I18n.t('Longitude')}
					value={longitude || ''}
					onChange={e => onChange({ longitude: e.target.value })}
				/>
			</Box>
		</Box>
	);
}

LocationPicker.propTypes = {
	latitude: PropTypes.string,
	longitude: PropTypes.string,
	address: PropTypes.string,
	onChange: PropTypes.func.isRequired,
	socket: PropTypes.object.isRequired,
	instanceId: PropTypes.string.isRequired,
};

export default LocationPicker;
