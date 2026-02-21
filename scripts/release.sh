#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./package.json').version")
APP_NAME="Social Account Manager"
RELEASE_DIR="release"
APP_PATH="$RELEASE_DIR/mac-universal/$APP_NAME.app"
DMG_PATH="$RELEASE_DIR/$APP_NAME-$VERSION-universal.dmg"
ZIP_PATH="$RELEASE_DIR/$APP_NAME-$VERSION-universal-mac.zip"

echo -e "${BOLD}=== Social Account Manager Release Script ===${NC}"
echo -e "Version: ${YELLOW}v$VERSION${NC}"
echo ""

# --- Step 1: Build ---
echo -e "${BOLD}Step 1: Build, sign & notarize${NC}"
read -rp "Run npm run dist:mac:sign? [y/N] " ans
if [[ "$ans" =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Building... (this may take several minutes)${NC}"
  npm run dist:mac:sign
  echo ""
else
  echo -e "Skipping build. Using existing artifacts."
  echo ""
fi

# --- Step 2: Verify ---
echo -e "${BOLD}Step 2: Verification${NC}"

if [[ ! -d "$APP_PATH" ]]; then
  echo -e "${RED}ERROR: $APP_PATH not found. Did the build succeed?${NC}"
  exit 1
fi

echo -n "  Checking code signature... "
if codesign --verify --deep --strict "$APP_PATH" 2>/dev/null; then
  echo -e "${GREEN}OK${NC}"
else
  echo -e "${RED}FAILED${NC}"
  exit 1
fi

echo -n "  Checking signing authority... "
AUTHORITY=$(codesign -dvv "$APP_PATH" 2>&1 | grep "Authority=Developer ID Application" || true)
if [[ -n "$AUTHORITY" ]]; then
  echo -e "${GREEN}$AUTHORITY${NC}"
else
  echo -e "${RED}Not signed with Developer ID Application${NC}"
  exit 1
fi

echo -n "  Checking notarization... "
SPCTL=$(spctl --assess --type execute --verbose "$APP_PATH" 2>&1 || true)
if echo "$SPCTL" | grep -q "accepted"; then
  echo -e "${GREEN}Notarized${NC}"
else
  echo -e "${YELLOW}Not notarized (${SPCTL})${NC}"
  echo -e "  ${YELLOW}The app is signed but not notarized. Users will see a Gatekeeper warning.${NC}"
  read -rp "  Continue anyway? [y/N] " ans
  if [[ ! "$ans" =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo -n "  Checking DMG exists... "
if [[ -f "$DMG_PATH" ]]; then
  SIZE=$(du -h "$DMG_PATH" | cut -f1)
  echo -e "${GREEN}$DMG_PATH ($SIZE)${NC}"
else
  echo -e "${RED}$DMG_PATH not found${NC}"
  exit 1
fi

echo -n "  Checking ZIP exists... "
if [[ -f "$ZIP_PATH" ]]; then
  SIZE=$(du -h "$ZIP_PATH" | cut -f1)
  echo -e "${GREEN}$ZIP_PATH ($SIZE)${NC}"
else
  echo -e "${RED}$ZIP_PATH not found${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}All checks passed.${NC}"
echo ""

# --- Step 3: Publish ---
echo -e "${BOLD}Step 3: Publish to GitHub${NC}"
echo -e "  Tag: ${YELLOW}v$VERSION${NC}"
echo -e "  Assets: ${YELLOW}$(basename "$DMG_PATH"), $(basename "$ZIP_PATH")${NC}"

EXISTING_TAG=$(git tag -l "v$VERSION")
if [[ -n "$EXISTING_TAG" ]]; then
  echo -e "  ${YELLOW}Tag v$VERSION already exists.${NC}"
fi

read -rp "Create GitHub release v$VERSION? [y/N] " ans
if [[ "$ans" =~ ^[Yy]$ ]]; then
  if [[ -z "$EXISTING_TAG" ]]; then
    git tag "v$VERSION"
    echo -e "  Created tag ${GREEN}v$VERSION${NC}"
    git push origin "v$VERSION"
    echo -e "  Pushed tag to origin"
  fi

  gh release create "v$VERSION" \
    "$DMG_PATH" \
    "$ZIP_PATH" \
    "$RELEASE_DIR/latest-mac.yml" \
    --title "v$VERSION" \
    --generate-notes

  RELEASE_URL=$(gh release view "v$VERSION" --json url -q .url)
  echo ""
  echo -e "${GREEN}Release published: $RELEASE_URL${NC}"
else
  echo "Release skipped."
fi
