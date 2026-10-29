#!/bin/sh
# Build the APK without GitHub Actions (Linux). Needs Java 17+ and network access to dl.google.com, maven.google.com,
# repo.maven.apache.org (repo1.maven.org) and plugins.gradle.org. Output: ButsukariYusha.apk in the repo root.
set -e
cd "$(dirname "$0")/.."
SDK=${ANDROID_HOME:-$HOME/android-sdk}
if [ ! -x "$SDK/cmdline-tools/latest/bin/sdkmanager" ]; then
  mkdir -p "$SDK/cmdline-tools" && cd /tmp
  curl -sSLo clt.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  unzip -q -o clt.zip -d "$SDK/tmpc" && rm -rf "$SDK/cmdline-tools/latest" && mv "$SDK/tmpc/cmdline-tools" "$SDK/cmdline-tools/latest"
  cd - >/dev/null
fi
yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null 2>&1 || true
"$SDK/cmdline-tools/latest/bin/sdkmanager" "platforms;android-35" "build-tools;34.0.0" >/dev/null
echo "sdk.dir=$SDK" > local.properties
GRADLE=$(command -v gradle || echo /opt/gradle/bin/gradle)   # Gradle 8.14.x
ANDROID_HOME="$SDK" "$GRADLE" assembleRelease --no-daemon -q
cp app/build/outputs/apk/release/app-release.apk ButsukariYusha.apk
echo "built ButsukariYusha.apk (signed with app/debug.keystore, same key as the CI builds -> installs over the old app)"
