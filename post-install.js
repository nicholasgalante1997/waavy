#!/usr/bin/env node

import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

try {
  await import('dotenv/config.js')
} catch (error) {/** Fail silently */}

// Skip install in local development environments
if (
  process.env.WAAVY_SKIP_POSTINSTALL === "true"
) {
  console.log("Skipping postinstall in local development environment");
  process.exit(0);
}

// Skip postinstall in CI environments
if (
    process.env.CI === "true" || 
    process.env.GITHUB_ACTIONS === "true"
  ) {
  console.log("Skipping postinstall in CI environment");
  process.exit(0);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const version = getVersion();

postinstall()
  .then(() => {
    console.log(`Waavy v${version} post-installation completed successfully.`);
  })
  .catch((error) => {
    console.error("Post-installation failed:", error.message);
    process.exit(1);
  });

async function postinstall() {
  try {
    await downloadBinary();
  } catch (error) {
    console.error("Error during post-installation:", error.message);
    process.exit(1);
  }
}

async function downloadBinary() {
  const platform = process.platform;
  const arch = process.arch;

  const platformMap = {
    linux: "waavy-linux-x64-modern",
    darwin: "waavy-macos-x64",
    win32: "waavy-windows-x64-modern.exe",
  };

  let binaryName = platformMap[platform];

  if (arch === "arm64") {
    binaryName =
      platform === "linux"
        ? "waavy-linux-arm64"
        : platform === "darwin"
          ? "waavy-macos-arm64"
          : null;
  }

  if (!binaryName) {
    console.error(`
        Unsupported platform: ${platform}
        
        Waavy only supports the following platforms:
        - Linux (x64, arm64)
        - macOS (x64, arm64)
        - Windows (x64)

        If you are on a different platform and you want to use waavy, please come drop a note in the GitHub repository:
        https://github.com/nicholasgalante1997/waavy/issues/new/

        If you are on a supported platform and still see this message, please check your Node.js version and ensure it is up to date.
        Supported Node.js versions: 20.x, 22.x, 24.x
        Supported Bun versions: 1.x
    `);
    process.exit(1);
  }

  const binDir = path.join(__dirname, "bin");
  const binaryPath = path.join(binDir, binaryName);

  if (fs.existsSync(binaryPath)) {
    console.log("Binary already exists, skipping download!");
    return;
  }

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  // https://github.com/nicholasgalante1997/waavy/releases/download/v0.1.2/waavy-linux-arm64
  const url = `https://github.com/nicholasgalante1997/waavy/releases/download/v${version}/${binaryName}`;

  console.log(`📦 Downloading ${binaryName} from ${url}...`);

  try {
    await downloadFileWithProgress(url, binaryPath);
    
    if (platform !== 'win32') {
      fs.chmodSync(binaryPath, '755');
    }
    
    console.log(`🚀 waavy binary installed successfully!`);
  } catch (error) {
    console.error('❌ Download failed:', error.message);
    process.exit(1);
  }

}

async function downloadFileWithProgress(url, binaryPath, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    function attemptDownload(currentUrl, redirectCount = 0) {
      https.get(currentUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          if (redirectCount >= maxRedirects) {
            reject(new Error('Too many redirects'));
            return;
          }
          
          const redirectUrl = response.headers.location;
          console.log(`Redirecting to: ${redirectUrl}`);
          attemptDownload(redirectUrl, redirectCount + 1);
          return;
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;
        
        const file = fs.createWriteStream(binaryPath);

        let lastProgress = 0;
        const startTime = Date.now();

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          
          if (totalSize) {
            const progress = Math.floor((downloadedSize / totalSize) * 100);
            
            // Only update every 1% to avoid spam
            if (progress >= lastProgress + 1 || progress === 100) {
              const elapsed = (Date.now() - startTime) / 1000;
              const speed = (downloadedSize / 1024 / 1024) / elapsed; // MB/s
              
              // Simple progress bar
              const barLength = 20;
              const filled = Math.floor((progress / 100) * barLength);
              const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
              
              // Clear line and show progress
              process.stdout.write(`\r[${bar}] ${progress}% (${speed.toFixed(1)} MB/s)`);
              
              lastProgress = progress;
            }
          } else {
            // No content-length, show bytes downloaded
            const mb = (downloadedSize / 1024 / 1024).toFixed(1);
            process.stdout.write(`\rDownloaded: ${mb} MB`);
          }
        });


        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`\nDownload completed: ${binaryPath}`);
          resolve();
        });
      }).on('error', (err) => {
        fs.unlinkSync(binaryPath, (err) => {
          if (err) console.error(`Error removing file: ${err.message}`);
          console.error(`Download failed: ${err.message}`);
        });

        if (fs.existsSync(binaryPath)) {
          fs.rmSync(binaryPath, { force: true });
        }

        reject(err);
      });
    }

    const maxRedirects = 5;
    attemptDownload(url);
  });
}

function getVersion() {
  const packageJsonPath = path.join(__dirname, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error("[waavy] package.json not found");
  }
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return packageJson.version;
}