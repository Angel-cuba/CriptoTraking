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

## Local signal alerts

- Enable or disable alerts in Profile. This opt-in preference is local to the current account and device. The app asks for OS permission only after Enable alerts is pressed.
- Alerts are evaluated after fresh market data arrives while Signals is open and the app is active. Restored cached data never triggers an alert. There is no background monitoring or remote push delivery.
- The first observation for each asset is silent. Later, a newer closed candle with BUY or SELL may notify only if its symbol is in the loaded watchlist. NEUTRAL, repeated candles and older responses are ignored.
- Observation timestamps are stored separately from the display cache and processed serially per account. Partial fetches retain the baseline for missing assets. Enabling alerts starts a new silent baseline.
- Observations are recorded before dispatch to prevent duplicate retries. A storage failure prevents dispatch and allows a later refresh to retry. A delivery failure can miss an alert: the candle remains recorded and is not replayed automatically. Both failures are reported without blocking the market feed.
- Permission denial leaves the market feed usable. Account changes, sign out and disabling alerts suppress pending delivery and clear this account's signal notifications. Web displays availability information without calling native notification APIs.
- Use an updated development build after adding the native notifications module. Lint, TypeScript and JS bundle export do not prove OS banner delivery; verify permission, Android channel behavior and presentation on an iOS/Android device before claiming native verification.

## Checks

```bash
npm run lint
npm run typecheck
npx expo export --platform web
```

A dynamic market catalog is planned separately.
