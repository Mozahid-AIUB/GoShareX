# Firebase Setup

This workspace uses Firebase for authentication, storage, live rider presence, and supporting product flows.

## Services Referenced In Code

- Authentication
- Firestore
- Realtime Database
- Storage
- Cloud Messaging
- Analytics wrapper
- Crashlytics wrapper

## Required Project Pieces

1. Create a Firebase project.
2. Enable `Email/Password` authentication.
3. Create Firestore.
4. Create Realtime Database.
5. Enable Cloud Messaging.
6. Add Android app package `com.aiub.rideshare`.
7. Download `google-services.json`.

Current app config reference:

- [app.json](/d:/Way_To_Job/GoShareX/app.json)

Current runtime config file:

- [src/config/env.ts](/d:/Way_To_Job/GoShareX/src/config/env.ts)

## Important Runtime Note

The repo does not currently rely on `.env` alone for Firebase runtime values.

Right now:

- Firebase values are hardcoded in `src/config/env.ts`
- some Firebase values also exist in `app.json`
- `.env.example` still documents the expected shape for consistency and future cleanup

So if you are onboarding this project, treat the docs as the desired config contract, but check the runtime files above for the current source of truth.
