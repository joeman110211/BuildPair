# BuildPair OTA updates

BuildPair native Android and iOS builds use `expo-updates` with EAS Update.

## Channels

- `preview`: internal/test APKs and pre-release native builds.
- `production`: store builds after release approval.

The GitHub-built Android test APK sets `EXPO_UPDATES_CHANNEL=preview`.

## Required GitHub configuration

- Repository variable `EXPO_EAS_PROJECT_ID`: the public Expo/EAS project UUID.
- Repository secret `EXPO_TOKEN`: an Expo access token allowed to publish updates for the BuildPair project.

The project ID is read by `app.config.js`. When it is absent, OTA is disabled rather than producing a binary that points at an invalid update service. The Android APK workflow refuses to produce a new test APK until the project ID is present, so the downloadable test binary cannot accidentally be mistaken for an OTA-enabled build.

## Client behaviour

Native builds check for an update shortly after launch and when returning to the foreground, with a short cooldown. If a compatible update is available it is downloaded and the app reloads into it automatically. Update failures do not prevent the embedded application from loading.

Web builds use a no-op update manager and are unaffected.

## Runtime compatibility

`runtimeVersion` uses the Expo `appVersion` policy. Updates can only be served to a compatible runtime. Changes to native dependencies/configuration require a new binary and an app version bump rather than an OTA publication.

## Automatic preview publication

After the `Quality` workflow succeeds for a push to `main`, `.github/workflows/ota-update.yml` examines the changed files. It publishes to the `preview` channel only for app-runtime changes that do not alter native/build configuration.

Changes to package manifests, Expo/EAS config, native projects, build workflows, bundler config, or native app icon/splash assets are deliberately blocked from automatic OTA publication and require a fresh binary instead.
