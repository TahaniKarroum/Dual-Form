# MOSA Form - Ministry of Social Affairs Survey

## Overview
Multi-step Arabic survey form application for social workers (SWs) from the Ministry of Social Affairs. Built with Angular frontend and Node.js/Express backend.

## Architecture
- **Frontend**: Angular 21 with standalone components, RTL Arabic layout
- **Backend**: Node.js/Express with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth (OpenID Connect)

## Project Structure
```
/
├── src/                          # Angular source
│   ├── index.html
│   ├── main.ts
│   ├── styles.css
│   └── app/
│       ├── app.component.ts
│       ├── app.config.ts
│       ├── app.routes.ts
│       ├── guards/auth.guard.ts
│       ├── services/
│       │   ├── auth.service.ts
│       │   └── form.service.ts
│       └── components/
│           ├── login/
│           └── survey/
├── server/                       # Express backend
│   ├── index.ts
│   ├── db.ts
│   ├── routes.ts
│   ├── storage.ts
│   └── replit_integrations/auth/
├── shared/
│   └── schema.ts                 # DB schema (Drizzle)
├── angular.json
├── tsconfig.json
├── tsconfig.app.json
├── drizzle.config.ts
└── package.json
```

## Key Features
1. **Step 1 - Consent**: Auto-populated SW fields (date, name), consent text, 2 required checkboxes
2. **Steps 2-5**: Family data, economic status, health/education, assistance needs
3. **Offline support**: Form data saved to localStorage when offline, synced when online
4. **Replit Auth**: Social workers login via Replit, identity auto-populated

## Commands
- `npm run build` - Build Angular app
- `npm run start` - Start Express server
- `npm run dev` - Build + start
- `npm run db:push` - Push DB schema

## Database Tables
- `sessions` - Auth sessions (required for Replit Auth)
- `users` - User accounts (required for Replit Auth)
- `form_submissions` - Survey form data with consent fields, step data (JSONB)

## Workflow
- **Start application**: `NG_CLI_ANALYTICS=false npm run build && npm run start` on port 5000
