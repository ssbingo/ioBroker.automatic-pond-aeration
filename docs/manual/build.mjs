#!/usr/bin/env node
// ============================================================================
//  Builds the "Automatic Pond Aeration" user manual to PDF (EN + DE) with typst.
//
//  typst is a single, statically-linked binary (no system libraries needed),
//  which is why it is used here instead of a headless-browser pipeline. The
//  binary is downloaded on demand into ./.cache (git-ignored). Fonts live in
//  ./fonts and are passed via --font-path so the build is reproducible.
//
//  Usage:  node build.mjs          (from docs/manual/)
//          npm run build           (same)
// ============================================================================
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cache = join(here, '.cache');
const TYPST_VERSION = 'v0.12.0';

/** Map Node's platform/arch to the typst release asset triple. */
function typstTriple() {
	const p = process.platform;
	const a = process.arch;
	if (p === 'linux' && a === 'x64') {
		return 'x86_64-unknown-linux-musl';
	}
	if (p === 'linux' && a === 'arm64') {
		return 'aarch64-unknown-linux-musl';
	}
	if (p === 'darwin' && a === 'arm64') {
		return 'aarch64-apple-darwin';
	}
	if (p === 'darwin' && a === 'x64') {
		return 'x86_64-apple-darwin';
	}
	if (p === 'win32' && a === 'x64') {
		return 'x86_64-pc-windows-msvc';
	}
	throw new Error(`Unsupported platform ${p}/${a} — install typst manually and put it at .cache/typst`);
}

/** Ensure the typst binary exists in ./.cache, downloading it if necessary. */
function ensureTypst() {
	const isWin = process.platform === 'win32';
	const bin = join(cache, isWin ? 'typst.exe' : 'typst');
	if (existsSync(bin)) {
		return bin;
	}
	mkdirSync(cache, { recursive: true });
	const triple = typstTriple();
	const ext = isWin ? 'zip' : 'tar.xz';
	const url = `https://github.com/typst/typst/releases/download/${TYPST_VERSION}/typst-${triple}.${ext}`;
	console.log(`Downloading typst ${TYPST_VERSION} (${triple}) …`);
	const archive = join(cache, `typst.${ext}`);
	execFileSync('curl', ['-sL', '--fail', '--max-time', '180', '-o', archive, url], { stdio: 'inherit' });
	if (isWin) {
		execFileSync('tar', ['-xf', archive, '-C', cache], { stdio: 'inherit' }); // bsdtar on win10+
	} else {
		execFileSync('tar', ['-xf', archive, '-C', cache, '--strip-components=1', `typst-${triple}/typst`], {
			stdio: 'inherit',
		});
	}
	if (!isWin) {
		chmodSync(bin, 0o755);
	}
	if (!existsSync(bin)) {
		throw new Error('typst download/extract failed');
	}
	return bin;
}

function build() {
	const typst = ensureTypst();
	const targets = [
		['manual.en.typ', 'pond-aeration-manual.en.pdf'],
		['manual.de.typ', 'pond-aeration-manual.de.pdf'],
	];
	for (const [src, out] of targets) {
		if (!existsSync(join(here, src))) {
			console.warn(`skip: ${src} not found`);
			continue;
		}
		console.log(`typst compile ${src} -> ${out}`);
		execFileSync(typst, ['compile', '--font-path', 'fonts', src, out], { cwd: here, stdio: 'inherit' });
	}
	console.log('Manual PDFs built.');
}

build();
