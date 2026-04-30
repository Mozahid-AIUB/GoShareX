#!/bin/bash

###############################################################################
# GoShareX Google Sign-In Setup Script
# This script helps with Firebase configuration and app setup
###############################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  GoShareX Google Sign-In Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Check if .env exists
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[1/5] Checking environment file...${NC}"

if [ -f .env ]; then
    echo -e "${GREEN}✓ .env file found${NC}"
else
    echo -e "${YELLOW}ℹ .env file not found, creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ .env created from .env.example${NC}"
    else
        echo -e "${RED}✗ .env.example not found!${NC}"
        exit 1
    fi
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: npm install
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[2/5] Installing dependencies...${NC}"
echo -e "${BLUE}Running: npm install${NC}"
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ npm install failed!${NC}"
    exit 1
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Type checking
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[3/5] Running TypeScript type check...${NC}"
npm run type-check

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Type checking passed${NC}"
else
    echo -e "${RED}✗ Type checking failed!${NC}"
    exit 1
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Check .env configuration
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[4/5] Verifying .env configuration...${NC}"

# Check for required Firebase keys
FIREBASE_PROJECT_ID=$(grep -E "^FIREBASE_PROJECT_ID=" .env | cut -d '=' -f 2 | tr -d ' ')
GOOGLE_WEB_CLIENT_ID=$(grep -E "^GOOGLE_WEB_CLIENT_ID=" .env | cut -d '=' -f 2 | tr -d ' ')

if [ -z "$FIREBASE_PROJECT_ID" ] || [ "$FIREBASE_PROJECT_ID" = "" ]; then
    echo -e "${RED}✗ FIREBASE_PROJECT_ID not set in .env${NC}"
    echo -e "${YELLOW}  Please add your Firebase Project ID to .env${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Firebase Project ID found: $FIREBASE_PROJECT_ID${NC}"

if [ -z "$GOOGLE_WEB_CLIENT_ID" ] || [ "$GOOGLE_WEB_CLIENT_ID" = "" ]; then
    echo -e "${YELLOW}⚠ GOOGLE_WEB_CLIENT_ID not configured yet${NC}"
    echo -e "${YELLOW}  You'll need to add it after getting it from Firebase Console${NC}"
else
    echo -e "${GREEN}✓ Google Web Client ID configured${NC}"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: Display next steps
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ -z "$GOOGLE_WEB_CLIENT_ID" ] || [ "$GOOGLE_WEB_CLIENT_ID" = "" ]; then
    echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
    echo ""
    echo "1️⃣  Get Web Client ID from Firebase Console:"
    echo "   • Go to: https://console.firebase.google.com/"
    echo "   • Select your GoShareX project"
    echo "   • Go to: Authentication → Web SDK configuration"
    echo "   • Copy the Web Client ID (format: xxxxx.apps.googleusercontent.com)"
    echo ""
    echo "2️⃣  Update .env file with the Web Client ID:"
    echo "   • Open: .env"
    echo "   • Find: GOOGLE_WEB_CLIENT_ID="
    echo "   • Add your Web Client ID"
    echo ""
    echo "3️⃣  Build the development app:"
    echo "   • Run: npm run build:android"
    echo "   • Or:  npm run build:ios"
    echo ""
    echo "4️⃣  Test the login:"
    echo "   • Install the built APK on your device"
    echo "   • Tap 'Continue with Gmail'"
    echo "   • Sign in with your Gmail account"
    echo ""
else
    echo -e "${GREEN}✓ All configurations ready!${NC}"
    echo ""
    echo "Next: Build the development app"
    echo "  npm run build:android   # For Android"
    echo "  npm run build:ios       # For iOS"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "For detailed setup guide, see: docs/GOOGLE_SIGNIN_SETUP.md${NC}"
echo -e "${BLUE}========================================${NC}"
