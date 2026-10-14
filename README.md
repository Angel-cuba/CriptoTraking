# Kripto

Expo SDK 57 application with email authentication and a persistent user profile.

## Run

```bash
npm ci
npx expo start
```

Configure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in your local environment before starting. Both variables are required; there are no fallback credentials. Use only the public publishable key in the mobile app. Local environment files are excluded from version control.

Kripto uses the existing Supabase project and its `public.profiles` table: `id`, `display_name`, `risk_profile`, `watchlist` and `updated_at`. Row Level Security must restrict reads, inserts and updates to `auth.uid() = id`. No database migration is applied by the app.

## Account workflow

- Guests can register or sign in with email and password.
- Registration requires matching passwords of at least 8 characters. If email confirmation is enabled in Supabase, confirm the email and then sign in. If Supabase returns a session immediately, registration opens the profile directly.
- Signed-in users enter their profile automatically. Protected navigation removes guest screens from the signed-in history and blocks the profile after logout.
- Sessions survive app restarts. Native sessions use encrypted SecureStore storage with small payload chunks; web sessions use browser local storage. Native token refresh follows the app's foreground state.
- The profile loads the existing account's preferences or creates its first profile row. Display name, risk level and watchlist are saved to Supabase. Existing preferences are preserved.
- Sign out clears the session for this app installation without signing out other devices or applications.
- Loading failures offer a retry, and sign out remains available when profile data cannot be loaded.

## Checks

```bash
npm run lint
npm run typecheck
npx expo export --platform web
```

Market data, signals and notifications are outside this account workflow.
