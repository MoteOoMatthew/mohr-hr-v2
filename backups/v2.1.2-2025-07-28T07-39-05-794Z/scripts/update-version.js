#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read package.json version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// Update frontend version config
const versionConfigPath = path.join(__dirname, '..', 'frontend', 'src', 'config', 'version.js');
let versionConfig = fs.readFileSync(versionConfigPath, 'utf8');

// Update the APP_VERSION constant
versionConfig = versionConfig.replace(
  /export const APP_VERSION = ['"`][^'"`]*['"`];/,
  `export const APP_VERSION = '${version}';`
);

// Update the version in the versionInfo object
versionConfig = versionConfig.replace(
  /version: ['"`][^'"`]*['"`],/,
  `version: '${version}',`
);

fs.writeFileSync(versionConfigPath, versionConfig);

console.log(`✅ Updated frontend version config to ${version}`);

// Also update the build date
const buildDate = new Date().toISOString();
versionConfig = versionConfig.replace(
  /buildDate: new Date\(\)\.toISOString\(\)/,
  `buildDate: '${buildDate}'`
);

fs.writeFileSync(versionConfigPath, versionConfig);

console.log(`✅ Updated build date to ${buildDate}`); 