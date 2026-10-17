# Kripto

Kripto is a cryptocurrency tracker built with Expo, React Native and TypeScript. It combines Supabase accounts, a personal watchlist, Binance spot prices, explainable hourly signals and local price alerts.

The app does not execute trades, manage wallets or hold funds. Price movements, signal labels and activity categories describe market data.

## Screens

The bottom tabs appear in this order: **Markets → Signals → Alerts → Profile**.

| Screen | Behavior |
| --- | --- |
| Markets | Search spot pairs, filter by quote currency, sort by name or 24h change, and manage the watchlist. |
| Signals | View hourly SMA5/SMA10 crossovers for followed pairs and expand their explanations, averages and timestamps. |
| Alerts | Inspect price-movement history, filter upward/downward events, pause monitoring and enable price notifications. |
| Profile | Edit the display name, review watchlist activity and pair count, open Markets to manage followed pairs, change appearance, configure signal alerts and sign out. |

A new profile starts with an empty watchlist. Signals and the empty Markets watchlist suggest up to ten USDT pairs ranked by 24-hour quote volume. Following a suggestion requires a user action.

Light and dark appearance use a preference saved on the current device. Profile's **Manage watchlist** link opens followed pairs across all quote currencies and clears the search filter.

## Setup

Use a supported Node.js 24 release, Git and npm. Development checks have run with Node 24.16.0. The runtime is [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), React Native 0.86 and React 19.2.

From the repository root:

```bash
npm ci
npm start
```

The installation commands use the committed `package-lock.json`. When adding an Expo package, use `npx expo install <package> --npm` to retain SDK compatibility and update the same lockfile.

### Environment and Supabase

Create an ignored local `.env` containing your own project URL and client publishable key:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Both variables are required. There are no fallback credentials. These public values are embedded in the application bundle; never supply a service-role key, database password or session token. Restart Metro after changing them.

Enable email/password authentication in the Supabase project. Kripto uses the existing `public.profiles` table with these columns:

| Column | Purpose |
| --- | --- |
| `id` | Authenticated user's ID. |
| `display_name` | Editable display name. |
| `risk_profile` | `conservative`, `balanced` or `aggressive`. |
| `watchlist` | Array of followed spot-pair symbols. |
| `updated_at` | Last profile update. |

The app loads the existing profile or creates a missing row after sign-in. It does not apply database migrations. Row Level Security must restrict profile reads, inserts and updates to `auth.uid() = id`; client-side route protection is not a substitute for those policies.

If Supabase requires email confirmation, confirm the email and return to Login. Registration opens Profile immediately only when Supabase returns a session. A complete mobile confirmation-link callback is not implemented.

### Local simulator and browser

The reviewed native device is the **iPhone 17 Pro simulator** running iOS 26.5 with an Expo Go client compatible with SDK 57. For a shared localhost workflow on macOS:

```bash
NODE_OPTIONS=--dns-result-order=ipv4first npm start -- --web --localhost --port 8094
```

Open `exp://localhost:8094` in the simulator's Expo Go client. The browser is available at `http://localhost:8094`. Use another free port when necessary.

The IPv4 setting keeps the localhost server reachable through the address advertised to the simulator. Android and standalone development/production builds require separate verification. Native notification support depends on the client and OS permissions.

## Accounts and persistence

Guest screens offer registration and login. Authenticated navigation opens Profile first and prevents returning to guest screens through the signed-in history.

Native sessions use an encrypted SecureStore adapter that splits larger values into small chunks. Web sessions use browser localStorage. Native token refresh follows the foreground lifecycle.

Display name and watchlist are stored in Supabase. Profile's name editor supports Save and Cancel: cancelling discards the draft, while a failed save keeps it available for retry. Watchlist changes are managed in Markets. The existing `risk_profile` value is retained for compatibility, without an editable selector, and does not change the signal algorithm.

Sign out clears this installation's session without signing out other devices or applications, and stays available if profile loading or saving fails. During profile refresh, previously loaded details remain visible with editing temporarily disabled.

| Data | Native storage | Browser storage |
| --- | --- | --- |
| Authentication session | SecureStore | localStorage |
| Display name, watchlist and legacy risk value | Supabase | Supabase |
| Hourly readings and processed signal observations | SQLite key-value records per account | localStorage per account |
| Price-alert history, cooldowns and notification preferences | SQLite key-value records per account | localStorage per account |
| Watchlist activity | SQLite key-value record per account | localStorage per account |
| Light/dark appearance | SQLite key-value record per device | localStorage per browser |

Hourly cache migration reads validated older SecureStore records and retains the originals. Migration and new writes are serialized so an old snapshot cannot overwrite newer readings.

Signing out does not erase account-scoped market history. Another account uses separate storage keys. Local history and appearance are not synchronized through Supabase.

## Markets and price alerts

The catalog combines active spot symbols from Binance `/api/v3/exchangeInfo` with rolling summaries from `/api/v3/ticker/24hr`. Catalog metadata is cached in memory for five minutes.

Selecting gainers or losers captures a ranking from the currently displayed snapshot. Prices keep updating, but their 24h changes do not reorder the rows until a sort option is selected again. The **Ranked** timestamp identifies that snapshot. Search, quote and watchlist filters retain the selected ranking; choosing A-Z clears it. Ranking is unavailable until the first snapshot loads.

Empty watchlist views distinguish no followed pairs, filters with no matches and followed pairs unavailable in the current catalog. **Clear filters** resets search and quote currency to all pairs while retaining the watchlist view and ranking. **All markets** returns to the market browser when the watchlist is empty or its pairs remain unavailable without filters. These actions do not change saved watchlist entries.

- Prices refresh every 60 seconds while the authenticated app is active, including from other main tabs.
- Backgrounding pauses polling and cancels the current request. Foreground resume requests a fresh snapshot.
- Requests have a 15-second deadline. Failed refreshes retain the last snapshot; data becomes stale after two minutes.
- HTTP 429/418 responses establish a provider retry window.
- Manual refresh and pull-to-refresh are available. Automatic updates do not activate the pull-to-refresh indicator.

Markets offers **24h**, **Last update** and **Both** change views. The initial selection is 24h. Its percentage comes from Binance's rolling summary. Last update compares consecutive accepted prices no more than two minutes apart and shows the comparison interval. The first observation, including after foreground resume, establishes a new reference and displays **Waiting**. Neither percentage is the reference used for price alerts.

Last-update percentages use four decimal places; 24h percentages use two. Smaller nonzero changes use scientific notation rather than rounding to zero.

Price monitoring evaluates followed pairs independently of hourly signals:

| Rule | Behavior |
| --- | --- |
| First observation | Establishes a silent reference price. |
| Threshold | An absolute move of at least 1% from the reference can create an event. |
| Cooldown | Five minutes between events for the same pair. Ordinary updates do not move the reference. |
| Accepted event | The observed price becomes the next reference. |
| Pause or restart | Resets the reference while retaining cooldown state and history; the next accepted observation is silent. |
| History | The latest 100 events are retained locally per account, including events for subsequently unfollowed pairs. |

Monitoring is initially enabled; price notifications are initially disabled. Pausing alerts does not stop Markets from refreshing.

## Hourly signals and notifications

Signals covers followed pairs present in the market catalog. Readings refresh when available after the screen mounts, when the watchlist changes, on manual refresh and on foreground resume. The market's 60-second polling timer does not recalculate hourly signals.

The engine requests 20 hourly candles, excludes unfinished candles and requires at least 11 completed candles.

| State | Display | Condition |
| --- | --- | --- |
| `BUY` | Bullish crossover | Previous SMA5 was at or below SMA10; current SMA5 is above SMA10. |
| `SELL` | Bearish crossover | Previous SMA5 was at or above SMA10; current SMA5 is below SMA10. |
| `NEUTRAL` | No new crossover | Neither crossover occurred. Being above or below an average alone is not a new signal. |

Each expandable reading shows its closed-candle timestamp, separate check time and averages in the pair's quote currency. Small prices retain significant digits rather than rounding to zero.

Requests run in groups of at most three, with a 10-second limit per market request and a 15-second batch deadline. A failed or timed-out pair does not discard completed readings. Failed pairs retain their saved reading when available. A batch timeout or provider rate limit stops later batches in that refresh; retry checks them again. Unavailable catalog pairs are identified separately.

Only fresh readings are considered for signal notifications while Signals is focused and the app is active. Enable signal alerts in Profile; price notifications have a separate switch in Alerts.

- The first successful observation of each pair is silent.
- A newer closed-candle `BUY` or `SELL` can notify only for a still-followed pair, with the preference enabled and OS permission granted.
- Repeated candles, `NEUTRAL` readings, restored cache and previous price history are not replayed.
- Observation state or price events are saved before scheduling to prevent duplicate retries.
- Account changes, sign out, backgrounding, disabling notifications and removing a pair suppress ineligible pending work.

Local notifications are best effort. **Scheduled** means the OS accepted a scheduling request, not that a banner appeared or was read. Failed or interrupted deliveries can be missed and are not replayed automatically. Web adapters do not invoke native notification APIs.

## Watchlist activity

Profile summarizes the median rolling 24-hour range of followed pairs:

```text
pair range (%) = (high24h - low24h) / ((high24h + low24h) / 2) * 100
watchlist range = median of the pair ranges
```

Below 3% is **Low range**, 3% to below 10% is **Moderate range**, and 10% or more is **High range**. These descriptive categories do not change the legacy risk value, signal algorithm or alert settings.

Every followed pair needs a valid range; missing data is not treated as zero. A matching result is reused for less than six hours. An expired result or changed watchlist is recalculated from the next eligible current snapshot.

Paused, stale or failed market data does not produce a fresh calculation. A matching stored result can be displayed as saved while current prices are unavailable. There is no scheduler running while the app is closed.

## Structure

| Path | Responsibility |
| --- | --- |
| `app/(auth)/` | Login and registration routes. |
| `app/(tabs)/` | Markets, Signals, Alerts and Profile routes. |
| `src/components/` | Shared forms, controls, market rows and expandable signal views. |
| `src/context/` | Session, profile, theme, shared market snapshots and notifications. |
| `src/hooks/` | Screen access and signal/activity lifecycles. |
| `src/api/signalApi.ts` | Pure SMA crossover calculation. |
| `src/services/` | API requests, calculations, local storage and notification delivery. |
| `src/lib/` | Supabase client, session storage and theme definitions. |
| `src/types/` | Shared data contracts. |

## Validation

```bash
npm run lint
npm run typecheck
npx expo install --check
npx expo-doctor
```

The iPhone 17 Pro workflow has been checked for persisted sessions and appearance, loading real followed pairs, expandable signal details, watchlist navigation, activity persistence and price-alert history. Controlled regression checks have exercised cancellation, partial failures/timeouts, rate limits, cache migration, account isolation and duplicate-notification prevention.

These checks do not establish end-to-end RLS isolation, Android behavior, production readiness or guaranteed OS banner delivery. There is no committed `npm test` suite.

A manual walkthrough is to sign in, open Markets, follow a pair, inspect Signals and its details, review Alerts, and open Profile's activity and Manage watchlist link. Use a demo account for changes to account data; an alert is not expected on every refresh.

## Limits and troubleshooting

There is no background worker, remote push service, trading execution, wallet integration or price-chart detail screen. Android and standalone builds, fresh-clone installation and two-account database isolation still need end-to-end verification. A mobile email-confirmation callback remains a separate feature.

| Symptom | Check |
| --- | --- |
| Missing configuration | Set both required environment variables and restart Metro. |
| Profile unavailable | Check the session, profile table and RLS policies; retry loading or sign out. |
| Followed pair missing | Clear quote/search filters, or use Manage watchlist to open all followed quotes. |
| Saved or outdated readings | Check connectivity and refresh; keep candle time separate from check time. |
| Provider limit | Wait for the displayed retry window; repeated requests do not bypass the limit. |
| No notification | Check the watchlist, preference, OS permission, initial baseline, threshold and cooldown. |
| Localhost unavailable in the simulator | Use the IPv4 localhost command above and confirm the chosen port is free. |

## License

[MIT](LICENSE)
