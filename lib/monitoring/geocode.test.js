'use strict';

const { expect } = require('chai');
const { buildNominatimUrl, parseNominatimResponse, mayGeocode } = require('./geocode');

describe('lib/monitoring/geocode – buildNominatimUrl', () => {
	it('URL-encodes the query and uses the search endpoint', () => {
		const url = buildNominatimUrl('Am Teich 1, Berlin');
		expect(url).to.contain('https://nominatim.openstreetmap.org/search?');
		expect(url).to.contain('format=json');
		expect(url).to.contain('limit=1');
		expect(url).to.contain('q=Am%20Teich%201%2C%20Berlin');
	});
});

describe('lib/monitoring/geocode – parseNominatimResponse', () => {
	it('extracts coordinates from the first hit', () => {
		const r = parseNominatimResponse([{ lat: '52.52', lon: '13.405', display_name: 'Berlin' }]);
		expect(r).to.deep.equal({ latitude: 52.52, longitude: 13.405, displayName: 'Berlin' });
	});
	it('returns null for an empty or malformed response', () => {
		expect(parseNominatimResponse([])).to.equal(null);
		expect(parseNominatimResponse(null)).to.equal(null);
		expect(parseNominatimResponse([{ lat: 'x', lon: 'y' }])).to.equal(null);
	});
});

describe('lib/monitoring/geocode – mayGeocode', () => {
	it('enforces a minimum interval between requests', () => {
		expect(mayGeocode(0, 5000, 1000)).to.equal(true);
		expect(mayGeocode(5000, 5500, 1000)).to.equal(false);
		expect(mayGeocode(5000, 6100, 1000)).to.equal(true);
	});
});
