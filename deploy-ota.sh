#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  Brain Match - OTA Deploy Script (Capgo)
#  Usage:
#    ./deploy-ota.sh            -> auto-increment patch (1.0.1 -> 1.0.2)
#    ./deploy-ota.sh 1.1.0      -> use an explicit version
# ============================================================

APP_ID="com.salemalyahyaee.mined.and.puzzle.game"
CHANNEL="production"
VERSION_FILE=".ota-version"

cd "$(dirname "$0")"

if [[ $# -ge 1 ]]; then
  VERSION="$1"
else
  if [[ -f "$VERSION_FILE" ]]; then
    LAST="$(tr -d '[:space:]' < "$VERSION_FILE")"
  else
    LAST="1.0.0"
  fi
  IFS='.' read -r major minor patch <<< "$LAST"
  patch=$((patch + 1))
  VERSION="$major.$minor.$patch"
fi

echo ""
echo "🚀 Deploying OTA bundle  v$VERSION  ->  channel '$CHANNEL'"
echo "============================================================"

echo "📦 Building web assets (npm run build)..."
npm run build

echo "⬆️  Uploading to Capgo..."
capgo bundle upload "$APP_ID" --channel "$CHANNEL" --bundle "$VERSION" --comment "OTA $VERSION"

echo "$VERSION" > "$VERSION_FILE"

echo ""
echo "✅ Done! Bundle v$VERSION is now LIVE on the '$CHANNEL' channel."
echo "   Users get it automatically on their next app launch."
echo ""
