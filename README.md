# Kripto

Expo SDK 57 application with email authentication, a persistent user profile and hourly market signals.

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

## Market signals

- The protected Signals tab displays BTCUSDT, ETHUSDT and SOLUSDT using Binance spot market candles.
- Each signal compares SMA5 and SMA10 for the latest closed one-hour candle and its predecessor. BUY and SELL indicate a new crossover; NEUTRAL indicates no new crossover. Open candles are excluded.
- All signals and My watchlist filters use the preferences saved in the profile. Returning from Profile reloads the watchlist. Login and registration continue to open Profile first.
- Refresh signals requests new market data and reloads profile preferences. Initial loading, empty watchlists, profile failures and market failures have separate states and retry actions.
- Market requests run concurrently with a 10-second timeout. A failed asset does not hide successful results. If a complete refresh fails, the last in-memory results remain visible with an explicit warning.
- Successful market snapshots are saved locally per user and restored when the Signals screen opens again. Native storage is encrypted; web storage stays in the browser. The snapshot displays its fetch time and whether it was restored from this device.
- Saved results appear while fresh data is requested. If market requests fail, saved results remain visible with their original timestamp. A delayed cache read cannot replace a newer market response.
- Saved snapshots are validated before use. Corrupt, unsupported or mismatched-user entries are ignored. Storage failures do not prevent live results from being displayed.
- The cache remains available for the same account after logout and login on this device. Other accounts use separate storage keys. Watchlist preferences still load from Supabase; this does not provide offline profile editing.
- Notifications are outside this workflow.

## Checks

```bash
npm run lint
npm run typecheck
npx expo export --platform web
```

Local notifications are planned separately.
