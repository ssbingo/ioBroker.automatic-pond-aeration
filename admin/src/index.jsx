import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import { Theme, Utils } from '@iobroker/adapter-react-v5';
import App from './app';

let themeName = Utils.getThemeName();
const container = document.getElementById('root');
const root = createRoot(container);

function build() {
	root.render(
		<StyledEngineProvider injectFirst>
			<ThemeProvider theme={Theme(themeName)}>
				<App
					adapterName="automatic-pond-aeration"
					onThemeChange={_theme => {
						themeName = _theme;
						build();
					}}
				/>
			</ThemeProvider>
		</StyledEngineProvider>,
	);
}

build();
