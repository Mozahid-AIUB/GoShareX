#!/bin/bash

#████████████████████████████████████████████████████████████████████████████
# GOSHAREX SECURITY VERIFICATION SCRIPT
# Verifies all production security fixes are deployed
#████████████████████████████████████████████████████████████████████████████

set -e  # Exit on error

echo "════════════════════════════════════════════════════════════════"
echo "🔐 GoShareX Security Verification"
echo "════════════════════════════════════════════════════════════════"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} File exists: $1"
        ((PASSED++))
    else
        echo -e "${RED}❌${NC} MISSING: $1"
        ((FAILED++))
    fi
}

# Function to check pattern in file
check_pattern() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} Pattern found in: $1"
        ((PASSED++))
    else
        echo -e "${RED}❌${NC} Pattern missing in: $1"
        ((FAILED++))
    fi
}

echo ""
echo "📋 CHECKING SECURITY FILES..."
echo "────────────────────────────────────────"

# 1. Firestore Rules
echo ""
echo "🔹 Firestore Security Rules:"
check_file "firestore/firestore.rules"
check_pattern "firestore/firestore.rules" "allow read:.*if isOwner"
check_pattern "firestore/firestore.rules" "match /active_riders"
check_pattern "firestore/firestore.rules" "match /fcm_tokens"

# 2. Storage Rules
echo ""
echo "🔹 Storage Rules:"
check_file "firebase/storage.rules"
check_pattern "firebase/storage.rules" "allow read.*if request.auth.uid == userId"

# 3. Client Utilities
echo ""
echo "🔹 Client-Side Security Utilities:"
check_file "src/utils/secureStorage.ts"
check_file "src/utils/rateLimitEnforcer.ts"
check_file "src/utils/auditLogger.ts"
check_file "src/utils/validators.ts"

# 4. Cloud Functions
echo ""
echo "🔹 Cloud Functions:"
check_file "functions/src/rateLimiter.ts"
check_file "functions/src/googleMapsProxy.ts"
check_file "functions/src/auditLogServer.ts"

# 5. Documentation
echo ""
echo "🔹 Documentation:"
check_file "docs/SECURITY_PRODUCTION_IMPLEMENTATION.md"
check_file "docs/SECURITY_IMPLEMENTATION_GUIDE.md"

# 6. Auth Service Suspension Check
echo ""
echo "🔹 Auth Service Suspension Check:"
check_pattern "src/services/firebase/authService.ts" "isSuspended"
check_pattern "src/services/firebase/authService.ts" "suspendedUntil"

# 7. Input Validation
echo ""
echo "🔹 Input Validation:"
check_pattern "src/utils/validators.ts" "sanitizeInput"
check_pattern "src/utils/validators.ts" "sanitizeDestination"
check_pattern "src/utils/validators.ts" "\\\\x00-\\\\x1F"  # Control chars

# 8. Encryption in dependencies
echo ""
echo "🔹 Dependencies:"
if grep -q "expo-secure-store" package.json 2>/dev/null; then
    echo -e "${GREEN}✅${NC} expo-secure-store installed"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️${NC} expo-secure-store not in package.json"
fi

if grep -q "crypto-js" package.json 2>/dev/null; then
    echo -e "${GREEN}✅${NC} crypto-js installed"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️${NC} crypto-js not in package.json"
fi

# 9. Firebase Config
echo ""
echo "🔹 Firebase Configuration:"
check_file "firebase.json"
check_file "firestore.indexes.json"

# 10. Test Files
echo ""
echo "🔹 Test Coverage:"
check_file "__tests__/unit/validators.test.ts"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📊 VERIFICATION RESULTS"
echo "════════════════════════════════════════════════════════════════"
echo -e "✅ Passed: ${GREEN}$PASSED${NC}"
echo -e "❌ Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ALL SECURITY CHECKS PASSED!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review docs/SECURITY_PRODUCTION_IMPLEMENTATION.md"
    echo "2. Deploy: firebase deploy --only firestore:rules,functions"
    echo "3. Test rate limiting and audit logs"
    echo "4. Monitor Firebase console for security alerts"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  SOME CHECKS FAILED${NC}"
    echo ""
    echo "Missing items must be implemented before production deployment"
    exit 1
fi
