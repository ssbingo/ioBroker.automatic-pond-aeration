import React from 'react';
import { GenericApp } from '@iobroker/adapter-react-v5';

import Settings from './components/Settings';

import en from './i18n/en.json';
import de from './i18n/de.json';
import ru from './i18n/ru.json';
import pt from './i18n/pt.json';
import nl from './i18n/nl.json';
import fr from './i18n/fr.json';
import it from './i18n/it.json';
import es from './i18n/es.json';
import pl from './i18n/pl.json';
import uk from './i18n/uk.json';
import zhCn from './i18n/zh-cn.json';

class App extends GenericApp {
	constructor(props) {
		const extendedProps = {
			...props,
			encryptedFields: ['esp32AuthToken'],
			translations: {
				en,
				de,
				ru,
				pt,
				nl,
				fr,
				it,
				es,
				pl,
				uk,
				'zh-cn': zhCn,
			},
		};
		super(props, extendedProps);
	}

	render() {
		if (!this.state.loaded) {
			return super.render();
		}

		return (
			<div className="App" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
				<div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
					<Settings
						native={this.state.native}
						onChange={(attr, value) => this.updateNativeValue(attr, value)}
						socket={this.socket}
						theme={this.state.theme}
						themeType={this.state.themeType}
						themeName={this.state.themeName}
						instanceId={`${this.adapterName}.${this.instance}`}
					/>
				</div>
				{this.renderError()}
				{this.renderToast()}
				{this.renderSaveCloseButtons()}
			</div>
		);
	}
}

export default App;
