#!/usr/bin/env node

/**
 * GoShareX Setup Verification Script
 * Checks if all required configurations are in place
 */

const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

const symbols = {
    check: '✓',
    cross: '✗',
    warn: '⚠',
    info: 'ℹ',
};

function log(color, symbol, message) {
    console.log(`${colors[color]}${symbol} ${message}${colors.reset}`);
}

function separator() {
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

console.clear();
separator();
console.log(`${colors.cyan}GoShareX Google Sign-In Setup Verification${colors.reset}`);
separator();

// ─────────────────────────────────────────────────────────────────────────────
// 1. Check .env file
// ─────────────────────────────────────────────────────────────────────────────
console.log(`${colors.blue}1. Environment Configuration${colors.reset}\n`);

const envPath = path.join(__dirname, '../.env');
let envContent = '';

if (!fs.existsSync(envPath)) {
    log('red', symbols.cross, '.env file not found');
    process.exit(1);
}

log('green', symbols.check, '.env file exists');
envContent = fs.readFileSync(envPath, 'utf-8');

// Check required fields
const requiredFields = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
];

const optionalFields = [
    'GOOGLE_WEB_CLIENT_ID',
];

let allFieldsPresent = true;

console.log(`\n${colors.blue}Required Fields:${colors.reset}`);
for (const field of requiredFields) {
    const regex = new RegExp(`^${field}=(.+)$`, 'm');
    const match = envContent.match(regex);

    if (match && match[1].trim()) {
        log('green', symbols.check, `${field} is set`);
    } else {
        log('red', symbols.cross, `${field} is missing or empty`);
        allFieldsPresent = false;
    }
}

console.log(`\n${colors.blue}Optional Fields (Google Sign-In):${colors.reset}`);
for (const field of optionalFields) {
    const regex = new RegExp(`^${field}=(.+)$`, 'm');
    const match = envContent.match(regex);

    if (match && match[1].trim()) {
        log('green', symbols.check, `${field} is configured`);
    } else {
        log('yellow', symbols.warn, `${field} is not set yet`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Check npm dependencies
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${colors.blue}2. Dependencies${colors.reset}\n`);

const packageJsonPath = path.join(__dirname, '../package.json');
let packageJson = {};

try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    const requiredDeps = [
        '@react-native-google-signin/google-signin',
        'firebase',
        'expo',
    ];

    for (const dep of requiredDeps) {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
            log('green', symbols.check, `${dep} is in package.json`);
        } else {
            log('red', symbols.cross, `${dep} is missing from package.json`);
        }
    }
} catch (e) {
    log('red', symbols.cross, 'Failed to read package.json');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Check node_modules
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${colors.blue}3. Installation Status${colors.reset}\n`);

const nodeModulesPath = path.join(__dirname, '../node_modules');
if (fs.existsSync(nodeModulesPath)) {
    log('green', symbols.check, 'node_modules directory exists');

    if (fs.existsSync(path.join(nodeModulesPath, '@react-native-google-signin'))) {
        log('green', symbols.check, 'Google Sign-In library is installed');
    } else {
        log('yellow', symbols.warn, 'Google Sign-In library not found in node_modules');
    }
} else {
    log('red', symbols.cross, 'node_modules not found. Run: npm install');
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Check source files
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${colors.blue}4. Source Files${colors.reset}\n`);

const sourceFiles = [
    'src/services/firebase/googleAuthService.ts',
    'src/screens/auth/LoginScreen.tsx',
    'src/utils/validators.ts',
];

for (const file of sourceFiles) {
    const filePath = path.join(__dirname, '../', file);
    if (fs.existsSync(filePath)) {
        log('green', symbols.check, `${file}`);
    } else {
        log('red', symbols.cross, `${file} not found`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Summary and Next Steps
// ─────────────────────────────────────────────────────────────────────────────
separator();

if (!allFieldsPresent) {
    log('red', symbols.cross, 'Some required fields are missing in .env');
    process.exit(1);
}

// Check if Google Web Client ID is set
const googleWebClientIdMatch = envContent.match(/^GOOGLE_WEB_CLIENT_ID=(.+)$/m);
if (!googleWebClientIdMatch || !googleWebClientIdMatch[1].trim()) {
    console.log(`${colors.yellow}⚠️  Google Web Client ID not configured${colors.reset}\n`);
    console.log(`${colors.cyan}NEXT STEPS:${colors.reset}\n`);
    console.log('1. Go to: https://console.firebase.google.com/');
    console.log('2. Select your GoShareX project');
    console.log('3. Go to: Authentication → Web SDK configuration');
    console.log('4. Copy the Web Client ID');
    console.log('5. Add to .env: GOOGLE_WEB_CLIENT_ID=your-web-client-id\n');
    console.log(`${colors.cyan}Then run:${colors.reset}`);
    console.log('  npm run build:android   # Build Android APK');
    console.log('  npm run build:ios       # Build iOS app\n');
} else {
    console.log(`${colors.green}✓ All configurations ready!${colors.reset}\n`);
    console.log(`${colors.cyan}Ready to build:${colors.reset}`);
    console.log('  npm run build:android   # Build Android APK');
    console.log('  npm run build:ios       # Build iOS app\n');
}

separator();
