# Enterprise Production Guide — GoShareX

## 🚀 Overview

GoShareX is now enterprise-grade production-ready with comprehensive:
- ✅ Security hardening
- ✅ Error tracking & monitoring
- ✅ Analytics framework  
- ✅ Rate limiting
- ✅ Performance monitoring
- ✅ Input validation
- ✅ Enhanced Firebase rules

---

## 🔐 Security

### Firebase Rules
All Firestore & RTDB rules have been enhanced:
- ✅ Suspension checks (`isNotSuspended()`)
- ✅ Email validation
- ✅ Coordinate validation
- ✅ Anti-tampering for sensitive fields
- ✅ Immutable audit trails

**Deploy:**
```bash
firebase deploy --only firestore:rules
firebase deploy --only database
```

### Input Validation
Use centralized validation from `@/utils/validation`:

```tsx
import { isValidEmail, validateBatch, ValidationPresets } from '@/services/enterprise';

// Single field
if (!isValidAIUBEmail(email)) {
  throw new Error('Invalid AIUB email');
}

// Batch validation
const { valid, errors } = validateBatch(formData, {
  email: ValidationPresets.email,
  password: ValidationPresets.password,
  destination: ValidationPresets.destination,
});
```

### Password Requirements
- Minimum 8 characters
- At least one uppercase, one lowercase, one number, one special character
- Use `isStrongPassword()` to validate:

```tsx
const { valid, score, feedback } = isStrongPassword(password);
// score: 0-100, feedback: array of suggestions
```

---

## 🔍 Monitoring & Logging

### Error Tracking
Automatic global error handler + manual error capture:

```tsx
import { errorService, logError, logCritical } from '@/services/enterprise';

// Global setup (in App.tsx)
setupGlobalErrorHandlers();

// Manual error logging
try {
  await riskyOperation();
} catch (error) {
  await logError(error, 'ChatScreen', { chatId });
}

// Critical issues
await logCritical(error, 'LoginScreen', {}, 'CRITICAL_AUTH_FAILURE');
```

User-friendly error messages (never expose sensitive details):
```tsx
const userMessage = ErrorService.getUserMessage(error);
Alert.alert('Error', userMessage);
```

### Analytics
Track user behavior, business events, and performance:

```tsx
import { analyticsService, Events } from '@/services/enterprise';

// User action
analyticsService.trackEvent(Events.RIDE_CREATED, userId, { destination, fare });

// Business event (with value)
analyticsService.trackBusinessEvent(Events.RIDE_COMPLETED, userId, fareAmount);

// Technical event
analyticsService.trackTechnical('api_retry', { endpoint, attempt: 2 });

// Manually flush
await analyticsService.flush();
```

### Performance Monitoring
Track screen load times and API performance:

```tsx
import { performanceService } from '@/services/enterprise';

// In useEffect
useEffect(() => {
  performanceService.startScreenMeasure('ChatScreen');
  
  // After render complete
  const cleanup = performanceService.endScreenMeasure('ChatScreen');
  
  return cleanup;
}, []);

// API calls
const start = Date.now();
const response = await fetch(url);
performanceService.measureAPI(url, Date.now() - start);

// Component-level
performanceService.measureComponent('ChatScreen', 'MessageList', 350);
```

---

## 🚦 Rate Limiting

Prevent abuse and ensure fair resource usage:

```tsx
import { rateLimitService, checkRateLimit } from '@/services/enterprise';

// Check before action
try {
  await checkRateLimit('send_message', userId);
  await chatService.sendMessage(...);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    Alert.alert('Too many attempts', 'Please wait before sending another message');
  }
}

// Get status
const status = rateLimitService.getStatus('send_message', userId);
// { allowed, count, max, windowMs, remainingMs }
```

Default limits:
- Messages: 10/min, 200/hour
- Rides: 3/5min
- API: 100/min
- Login attempts: 5/15min

---

## 🎯 Configuration

### Enterprise Config
Centralized configuration in `src/config/enterprise.config.ts`:

```tsx
import { enterpriseConfig } from '@/services/enterprise';

// Access settings
const sessionTimeout = enterpriseConfig.security.sessionTimeoutMinutes;
const slowScreenThreshold = enterpriseConfig.performance.slowScreenThreshold;
const geofencingRadius = enterpriseConfig.geofencing.radius;
```

Environment-specific overrides:
- **Production**: Stricter limits, reduced event sampling, shorter sessions
- **Development**: Detailed errors, full event sampling, disabled maintenance mode

---

## 📊 Database Best Practices

### Firestore Queries
Use indexed fields for performance:

```tsx
// Good: Uses index
const rides = await getDocs(
  query(
    collection(db, 'rides'),
    where('rider1', '==', userId),
    where('status', '==', 'completed'),
    orderBy('completedAt', 'desc')
  )
);

// Avoid: Multiple OR conditions
// Create composite index if needed
```

### Realtime Database
Keep paths shallow and use indexing:

```json
{
  "active_riders": {
    ".indexOn": ["destination", "status"]
  }
}
```

### Data Retention
Auto-delete old data (implement in Cloud Functions):

```tsx
// Example: Delete chats older than 90 days
const cutoff = Date.now() - 90 * 24 * 3600 * 1000;
await batch.delete(oldChatRef);
```

---

## ☁️ Cloud Functions

Deploy essential functions:

```bash
cd functions
npm install
firebase deploy --only functions
```

Required functions:
1. `sendPushNotification` — FCM notifications
2. `onRideConfirmed` — Start ride tracking
3. `onRideCompleted` — Process rating/savings
4. `onPenaltyCheck` — Apply suspensions
5. `cleanupInactiveRiders` — Housekeeping

---

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests (Expo testing library)
```bash
npm run test:e2e
```

---

## 📈 Deployment Checklist

- [ ] All Firebase rules deployed
- [ ] Environment variables set (.env)
- [ ] Cloud Functions deployed
- [ ] Analytics enabled & sampling rate configured
- [ ] Error tracking setup (Sentry/Firebase)
- [ ] Performance monitoring active
- [ ] Rate limiting configured
- [ ] Database indexes created
- [ ] Backup enabled
- [ ] Monitoring alerts configured
- [ ] API versioning strategy defined
- [ ] Security headers enabled
- [ ] HTTPS/SSL enforced
- [ ] API rate limits configured
- [ ] Database backups scheduled

---

## 🎓 Architecture Decision Records (ADRs)

### ADR-001: Validation at Input Layer
**Decision:** Validate all user input at UI layer + server-side validation in Cloud Functions
**Rationale:** Immediate user feedback + protection against malicious API calls
**Trade-off:** Slightly more code duplication

### ADR-002: Analytics Sampling
**Decision:** 100% in dev, 50% in production
**Rationale:** Balance between insights and infrastructure cost
**Review:** Quarterly based on cost/insights ratio

### ADR-003: Error Reporting
**Decision:** Automatic for critical errors, manual for warnings
**Rationale:** Reduces noise, captures what matters
**Future:** ML-based anomaly detection

---

## 🐛 Debugging

### View Error Logs
```tsx
const logs = await errorService.getLocalLogs();
console.table(logs);
```

### View Analytics Queue
```tsx
const queueSize = analyticsService.getQueueSize();
console.log(`Pending events: ${queueSize}`);
```

### Performance Profiling
```tsx
const slowScreens = performanceService.getSlowestScreens(5);
console.table(slowScreens);

const avgAPI = performanceService.getAverageAPITime();
console.log(`Avg API: ${avgAPI}ms`);
```

---

## 📞 Support & Documentation

- API Docs: `/docs/API.md`
- Firebase Setup: `/docs/FIREBASE_SETUP.md`
- Contributing: `/docs/CONTRIBUTING.md`

---

**Version:** 1.0.0  
**Last Updated:** April 27, 2026  
**Maintained By:** GoShareX Engineering
