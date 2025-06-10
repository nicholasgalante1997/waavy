import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const platform = process.platform;
const arch = process.arch;

const binaryPath = getBinaryPath();

if (fs.existsSync(binaryPath)) {
    console.log(`Binary found at ${binaryPath}`);
}

function getBinaryPath() {
    if (platform !== 'darwin' && platform !== 'linux' && platform !== 'win32') {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    if (arch !== 'x64' && arch !== 'arm64') {
        throw new Error(`Unsupported architecture: ${arch}`);
    }

    switch(platform) {
        case 'darwin': {
            return path.join(__dirname, `waavy-macos-${arch}`);
        };
        case 'linux': {
            return path.join(__dirname, `waavy-linux-${arch === 'x64' ? 'x64-modern' : arch}`);
        };
        case 'win32': {
            return path.join(__dirname, `waavy-windows-x64-modern.exe`);   
        };
    }
}
