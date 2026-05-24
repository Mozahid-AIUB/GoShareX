---
name: pre-test-reminder
description: User wants reminders before app build/test about deferred manual setup steps (Firebase deploy, icon PNG regen, EAS build). Don't auto-run these. List them when user says they're about to build/test.
metadata:
  type: feedback
---

When the user announces they're about to **build, test, deploy, or run on
a real device** (phrases like "build dimu", "test korbo", "EAS chalabo",
"prebuild", "publish"), remind them to do the manual setup steps in
[[pre_test_checklist]] before proceeding.

**Why:** Several setup steps can't be automated from the app code:
- Firebase Storage / Cloud Functions / Firestore rules deploy
  (require `firebase deploy` from terminal, not in commits)
- Icon PNG regeneration from SVG (sharp CLI or online tool)
- API key restrictions in Google Cloud Console
- EAS Build for FCM push testing

**How to apply:** When the user mentions build/test, paste the relevant
items from `docs/PRE_TEST_CHECKLIST.md`. Don't try to run the commands
yourself — just remind. The user explicitly said "agula later hsiave save
kore rakho test r age mone koraiba" (save these, remind me before testing).
