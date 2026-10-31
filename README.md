# Kripto

Kripto is a cryptocurrency tracker built with Expo, React Native and TypeScript. It combines Supabase accounts, a personal watchlist, Binance spot prices, explainable hourly signals and local price alerts.

The app does not execute trades, manage wallets or hold funds. Price movements, signal labels and activity categories describe market data.

## Screens

The bottom tabs appear in this order: **Markets → Signals → Alerts → Profile**.

| Screen | Behavior |
| --- | --- |
| Markets | Start with the personal watchlist, browse the full-screen All markets catalog, search/filter/sort spot pairs, follow or unfollow them, and tap a row to open asset analysis. |
| Signals | View hourly SMA5/SMA10 readings for followed pairs and tap an available reading to open its result, explanation, averages, timestamps and historical chart. |
| Alerts | View the latest ten price alerts, load more, filter upward/downward events, inspect saved events with historical charts, pause monitoring and enable price notifications. |
| Profile | Edit the display name, review watchlist activity and pair count, open Markets to manage followed pairs, change appearance, configure signal alerts and sign out. |

A new profile starts with an empty watchlist. Signals and the empty Markets watchlist suggest up to ten USDT pairs ranked by 24-hour quote volume. Following a suggestion requires a user action.

Light and dark appearance use a preference saved on the current device. Profile's **Manage watchlist** link opens followed pairs across all quote currencies and clears the search filter.

## Setup

Use a supported Node.js 24 release, Git and npm. Development checks have run with Node 24.16.0. The runtime is [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), React Native 0.86 and React 19.2.

From the repository root, install dependencies and prepare the local environment file:

```bash
npm ci
cp .env.example .env
```

Fill in `.env` and configure the Supabase schema below before starting the app. If a local `.env` already exists, keep it and compare its variable names with [.env.example](.env.example) instead of copying over it.

The installation commands use the committed `package-lock.json`. When adding an Expo package, use `npx expo install <package> --npm` to retain SDK compatibility and update the same lockfile.

### Environment and Supabase

The committed `.env.example` contains empty placeholders. Set your own project URL and client publishable key in the ignored local `.env`:

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

For a new Supabase database, run [001_create_profiles.sql](supabase/migrations/001_create_profiles.sql) once in the Supabase SQL editor before signing in. It creates `public.profiles`, the allowed `risk_profile` values and Row Level Security policies restricting reads, inserts, updates and deletes to the authenticated user's own row.

This is an initial migration, not an idempotent update. If `public.profiles` already exists, including in the shared SignalDesk project, compare its schema and policies with the migration instead of rerunning it. The app does not execute migrations automatically; after sign-in it loads the user's existing profile or creates a missing row. Client-side route protection is not a substitute for database policies.

If Supabase requires email confirmation, confirm the email and return to Login. Registration opens Profile immediately only when Supabase returns a session. A complete mobile confirmation-link callback is not implemented.

After configuring the environment and database, start the development server:

```bash
npm start
```

### Local simulator and browser

The reviewed native device is the **iPhone 17 Pro simulator** running iOS 26.5 with an Expo Go client compatible with SDK 57. For a shared localhost workflow on macOS:

```bash
NODE_OPTIONS=--dns-result-order=ipv4first npm start -- --web --localhost --port 8094
```

Open `exp://localhost:8094` in the simulator's Expo Go client. The browser is available at `http://localhost:8094`. Use another free port when necessary.

The IPv4 setting keeps the localhost server reachable through the address advertised to the simulator. Native notification support depends on the client and OS permissions.

For Android, configure [Android Studio and the emulator](https://docs.expo.dev/workflow/android-studio-emulator/), JDK 17, Android SDK Platform 36 and SDK platform-tools. Set `JAVA_HOME` and `ANDROID_HOME` for your installation. The reviewed device is a **Pixel 8 / Android 14 (API 34)** virtual device named `Pixel_8`; the emulator OS is separate from the SDK used to compile the app. Start that device and run:

```bash
npm run android -- --device Pixel_8 --port 8094
```

Expo generates the ignored `android/` directory, compiles the native modules and installs Kripto on the emulator. The first build downloads the required build tools. Expo Go 57 on Android fails at startup when this notification package imports the missing `ExpoTopicSubscriptionModule`; the app's own debug build includes that module. This does not require disabling notifications or changing their behavior.

Use one Metro server per port. With the server running, use `s` to select the development build before opening Android with `a`, or Expo Go before opening iOS with `i`. Switching the launch target does not disconnect an already running app.

The project previously encountered an [initial-link state update before mounting on Android](https://github.com/expo/expo/issues/49378) with Expo Router 57.0.28. It now uses the compatible 57.0.29 patch without package patches or warning suppression; the original Android scenario has not been rechecked after this update.

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

Markets opens **My watchlist** across all quote currencies. **All markets** opens a full-screen catalog with compact rows and no bottom tabs. Search, quote, sorting and change-period selections are independent in the two views. Closing the catalog returns to the existing watchlist view; reopening it retains its selections and scroll position while Markets remains mounted. These view preferences are not persisted across app restarts.

Both views share the same price snapshots and saved watchlist. Following or unfollowing a pair updates both views; browsing or clearing filters does not change saved entries. Catalog rows allow extra height for **Both** and larger system text, while watchlist rows retain their card layout.

The catalog combines active spot symbols from Binance `/api/v3/exchangeInfo` with rolling summaries from `/api/v3/ticker/24hr`. Catalog metadata is cached in memory for five minutes.

Selecting gainers or losers captures a ranking from the currently displayed snapshot. Prices keep updating, but their 24h changes do not reorder the rows until a sort option is selected again. The **Ranked** timestamp identifies that snapshot. Search, quote and watchlist filters retain the selected ranking; choosing A-Z clears it. Ranking is unavailable until the first snapshot loads.

Empty watchlist views distinguish no followed pairs, filters with no matches and followed pairs unavailable in the current catalog. **Clear filters** resets search and quote currency to all pairs while retaining the watchlist view and ranking. **All markets** opens the catalog when the watchlist is empty or its pairs remain unavailable without filters. The catalog close button returns to the watchlist; Android Back closes an open options panel before closing the catalog.

- Prices refresh every 60 seconds while the authenticated app is active, including from other main tabs.
- Backgrounding pauses polling and cancels the current request. Foreground resume requests a fresh snapshot.
- Requests have a 15-second deadline. Failed refreshes retain the last snapshot; data becomes stale after two minutes.
- HTTP 429/418 responses establish one provider retry window shared by Markets, Signals and asset charts.
- Pull-to-refresh requests a manual price update in either list. A failed request also offers Retry. Automatic updates do not activate the pull-to-refresh indicator.

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

Alerts initially displays the ten most recent events, ordered by observation receipt time. **Show 10 more** reveals the next page, or the remaining count when fewer than ten are left. Selecting All, Up or Down returns the visible count to ten. This display limit is separate from the 100-event storage limit. Opening and closing an event detail retains the selected filter and visible count.

## Asset analysis

Markets, Signals and Alerts share a full-screen analysis view with up to 24 closed hourly candles, SMA5/SMA10 overlays and base-asset volume from Binance. Charts use `react-native-gifted-charts` with `react-native-svg`.

| Opened from | Detail content and time window |
| --- | --- |
| My watchlist / All markets | The selected ticker snapshot and rolling 24h statistics, plus the latest closed hourly candles and their OHLC, volume and averages. Ticker source time, candle time and chart load time are shown separately. |
| Signals | The selected reading's original result, explanation, SMA values, closed-candle time and check time. The chart ends at that reading's closed candle. Saved readings and refresh failures keep their status visible. |
| Alerts | The saved reference price, observed price, percentage movement, observation/receipt/creation times and notification status. The chart includes only candles closed by the event's source time, excluding the later close of an hour that was still open when the event occurred. |

Historical signal and alert details do not display current ticker prices or rolling 24h statistics as event values. Missing catalog metadata leaves the saved symbol and event available without guessing its base or quote currency. An alert's price-movement trigger remains separate from an SMA crossover.

Detail prices, averages and alert-row prices share a formatter with up to ten significant digits. Nonzero values below `0.0000001` use scientific notation. Chart-axis precision follows the displayed price range so neighboring labels remain distinct in flat markets; its reserved width accounts for label length and system text scale. Detail timestamps include the year and seconds in UTC.

Chart history loads when the detail opens, with a 10-second deadline and a one-minute in-memory cache bounded to 20 entries. Latest and historical windows have separate cache entries. Manual refresh bypasses the fresh cache while retaining a historical event's original cutoff. Request failures preserve any previously loaded chart and the selected event's original data. Chart requests share the catalog's provider rate-limit window.

Closing the detail cancels its request. Returning to All markets retains the catalog's filters and scroll position; returning to Alerts retains its filter and visible count. Opening or refreshing a detail does not update stored signal readings, change alert references or replay notifications. The analysis view loads as a separate web chunk when opened.

## Hourly signals and notifications

Signals covers followed pairs present in the market catalog. Readings refresh when available after the screen mounts, when the watchlist changes, on manual refresh and on foreground resume. The market's 60-second polling timer does not recalculate hourly signals.

The engine requests 20 hourly candles, excludes unfinished candles and requires at least 11 completed candles.

| State | Display | Condition |
| --- | --- | --- |
| `BUY` | Bullish crossover | Previous SMA5 was at or below SMA10; current SMA5 is above SMA10. |
| `SELL` | Bearish crossover | Previous SMA5 was at or above SMA10; current SMA5 is below SMA10. |
| `NEUTRAL` | No new crossover | Neither crossover occurred. Being above or below an average alone is not a new signal. |

Tapping a reading opens the shared analysis modal with its saved result, closed-candle timestamp, separate check time and averages in the pair's quote currency. Small prices retain significant digits rather than rounding to zero.

Requests run in groups of at most three, with a 10-second limit per market request and a 15-second batch deadline. Their HTTP transport and provider retry window are shared with the market catalog and charts. A failed or timed-out pair does not discard completed readings. Failed pairs retain their saved reading when available. A batch timeout or provider rate limit stops later batches in that refresh; retry checks them again. Unavailable catalog pairs are identified separately.

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
| `src/components/` | Shared forms, controls, market/signal/alert rows, analysis modals and charts. |
| `src/context/` | Session, profile, theme, shared market snapshots and notifications. |
| `src/hooks/` | Screen access, market-list filters and ranking, and signal/activity lifecycles. |
| `src/api/signalApi.ts` | Pure SMA crossover calculation. |
| `src/services/` | Shared Binance transport and rate-limit handling, API requests, calculations, local storage and notification delivery. |
| `src/lib/` | Supabase client, session storage, theme definitions and shared price/status presentation. |
| `src/types/` | Shared data contracts. |
| `supabase/migrations/` | Initial profile schema and per-user database access policies. |

## Validation

```bash
npm run lint
npm run typecheck
npx expo install --check
npx expo-doctor
```

Market-list and shared-analysis changes have passed iOS/Android Hermes and static-web exports during development. The latest shared price-formatting and chart-axis refinement also passed an iOS export. The commands are:

```bash
npx expo export --platform ios --output-dir dist/ios --max-workers 2
npx expo export --platform android --output-dir dist/android --max-workers 2
npx expo export --platform web --output-dir dist/web --max-workers 2
```

The generated `dist/` output is ignored by Git. These checks validate JavaScript and asset bundling; device interaction and installation checks are listed separately below. A local Android debug build also compiled successfully and was installed on the Pixel 8 emulator; its generated native files remain ignored. Manual review on the Pixel 8 confirmed that the app opens and navigates through Markets and All markets with the unmodified Expo Router package.

The iPhone 17 Pro workflow has been checked for persisted sessions and appearance, loading real followed pairs, signal analysis modals, watchlist navigation, activity persistence and price-alert history. The full-screen catalog, its options panel and all three change periods have been visually reviewed, including light and dark appearance. Catalog search was checked with the software keyboard, including its Search key dismissing the keyboard. Manual review also confirmed swipe scrolling and retaining the position after closing and reopening the catalog. Increasing system text size while the catalog is open now remeasures its content, keeping filter labels and explanatory text readable without reopening it. Controlled regression checks have exercised cancellation, partial failures/timeouts, rate limits, cache migration, account isolation and duplicate-notification prevention.

The authenticated web catalog has been checked for scrolling and position restoration, normalized pair search, quote filters, ranking, all three change periods, empty-search recovery and independent watchlist filters. Escape closes the options panel before closing the catalog. The reviewed mobile-width viewport had no horizontal page overflow. Manual iPhone review confirmed that pull-to-refresh shows an indicator, completes and leaves both lists usable.

Market-list regression checks cover independent view filters, captured rankings with live prices, catalog reopen state, options-first Back handling, empty/error states, rapid follow guards, row layouts across all three periods and four text scales, and scroll-position conversion when row height changes. They also check that system text-size changes remount the content without replacing its filter model or losing the saved row position. Refresh checks cover the manual indicator lifecycle, no indicator for automatic or other-view refreshes, pause/loading/rate-limit guards and cleanup after a rejected reload. Manual Pixel 8 review confirmed that Back closes catalog options before closing the catalog, searching for SOL with the software keyboard and clearing the query works, and pull-to-refresh completes in both My watchlist and All markets.

The shared analysis view has been visually checked on the iPhone 17 Pro from Markets, Signals and Alerts, including historical event times and returning to the underlying view. The latest precision refinement was also inspected in the SOL/USDT market detail. Controlled checks cover historical cutoff requests, excluding future candle closes, separating cache windows, cancellation and late responses, preserving saved events after request failures, missing metadata, and distinct price/axis labels for small values and flat markets. Shared-transport checks also cover cross-flow 429/418 blocking, numeric/date Retry-After headers, cooldown expiry, cancellation and concurrent responses that must not shorten an existing wait. These regression checks were run with local scripts outside the repository.

These checks do not establish end-to-end RLS isolation, full Android interaction coverage, production readiness or guaranteed OS banner delivery. Android interaction review of the new Signals/Alerts analysis view remains unverified. There is no committed `npm test` suite.

A manual walkthrough:

1. Sign in with a demo account and open Markets. In All markets, follow a pair and close the catalog to see it in My watchlist.
2. Set different filters in each view. Open an asset detail, close it and reopen the catalog to check retained selections and scroll position.
3. Open Signals and tap an available reading. Inspect the original result, SMA values, candle time and check time alongside its historical chart.
4. Open Alerts, choose a direction filter and use Show more when available. Open an event and distinguish its saved prices and source time from the chart load time; closing the detail retains the filter and visible count.
5. Open Profile, review watchlist activity, edit or cancel the display name, use Manage watchlist and change appearance. Restart the app to inspect session and appearance persistence.

Use a demo account for changes to account data. Signals needs enough closed candles; an alert is not expected on every refresh.

## Limits and troubleshooting

There is no background worker, remote push service, trading execution or wallet integration. Standalone release builds, fresh-clone installation and two-account database isolation still need end-to-end verification. A mobile email-confirmation callback is not implemented.

The compatible SDK 57 patch updates do not resolve every transitive dependency advisory. Routing and build-tool dependencies still require a separate compatibility review; the project does not force a different SDK or override incompatible transitive versions.

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
