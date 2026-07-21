#!/usr/bin/env bash

set -Eeuo pipefail

URL='https://hr.ttfic.com.tw/public/release.zip'
FILENAME='release.zip'

usage() {
    echo "Usage: $0 [--target-dir DIRECTORY] [--preserve-launcher]" >&2
    exit 1
}

fail() {
    echo "[ERROR] $1" >&2
    exit 1
}

TARGET_DIR="$PWD"
PRESERVE_LAUNCHER=false
while [ "$#" -gt 0 ]; do
    case "$1" in
        --target-dir)
            [ "$#" -ge 2 ] || usage
            TARGET_DIR="$2"
            shift 2
            ;;
        --preserve-launcher)
            PRESERVE_LAUNCHER=true
            shift
            ;;
        *)
            usage
            ;;
    esac
done

[ -d "$TARGET_DIR" ] || fail "Target directory does not exist: $TARGET_DIR"
TARGET_DIR="$(cd -- "$TARGET_DIR" && pwd -P)"
[ -w "$TARGET_DIR" ] || fail "Target directory is not writable: $TARGET_DIR"
TEMP_ARCHIVE=$(mktemp "$TARGET_DIR/.release.zip.XXXXXX")

cleanup() {
    rm -f "$TEMP_ARCHIVE"
}
trap cleanup EXIT

if command -v 7z >/dev/null 2>&1; then
    EXTRACTOR='7z'
elif command -v 7za >/dev/null 2>&1; then
    EXTRACTOR='7za'
elif command -v unzip >/dev/null 2>&1; then
    EXTRACTOR='unzip'
else
    fail 'A ZIP extractor is required: 7z, 7za, or unzip.'
fi

if command -v curl >/dev/null 2>&1; then
    DOWNLOADER='curl'
elif command -v wget >/dev/null 2>&1; then
    DOWNLOADER='wget'
else
    fail 'A downloader is required: curl or wget.'
fi

echo "Downloading and extracting into: $TARGET_DIR"
echo 'Archive contents will overwrite files with the same names.'
echo "Downloading $URL ..."

if [ "$DOWNLOADER" = 'curl' ]; then
    curl --fail --location --show-error --retry 3 --connect-timeout 15 --max-time 300 --output "$TEMP_ARCHIVE" "$URL" || fail "Failed to download $URL"
else
    wget --tries=3 --timeout=15 --output-document="$TEMP_ARCHIVE" "$URL" || fail "Failed to download $URL"
fi

[ -s "$TEMP_ARCHIVE" ] || fail 'Downloaded archive is empty.'

if [ "$EXTRACTOR" = 'unzip' ]; then
    unzip -t "$TEMP_ARCHIVE" >/dev/null || fail 'Downloaded archive is not a valid ZIP file.'
    ARCHIVE_ENTRIES=$(unzip -Z1 "$TEMP_ARCHIVE") || fail 'Unable to inspect ZIP archive paths.'
else
    "$EXTRACTOR" t "$TEMP_ARCHIVE" >/dev/null || fail 'Downloaded archive is not a valid ZIP file.'
    ARCHIVE_ENTRIES=$("$EXTRACTOR" l -slt "$TEMP_ARCHIVE" | grep '^Path = ' | cut -d' ' -f3-) || fail 'Unable to inspect ZIP archive paths.'
fi

while IFS= read -r entry; do
    if [[ "$entry" == /* || "$entry" =~ ^[A-Za-z]:[\\/] || "$entry" =~ (^|/|\\)\.\.($|/|\\) ]]; then
        fail "Archive contains an unsafe path: $entry"
    fi
done <<< "$ARCHIVE_ENTRIES"

echo "Extracting $FILENAME ..."
if [ "$PRESERVE_LAUNCHER" = true ]; then
    staging_dir=$(mktemp -d "$TARGET_DIR/.release-extract.XXXXXX")
    cleanup() {
        rm -f "$TEMP_ARCHIVE"
        rm -rf "$staging_dir"
    }

    if [ "$EXTRACTOR" = 'unzip' ]; then
        unzip -o "$TEMP_ARCHIVE" -d "$staging_dir"
    else
        "$EXTRACTOR" x "$TEMP_ARCHIVE" -o"$staging_dir" -y
    fi

    rm -f "$staging_dir/start.sh" "$staging_dir/download_and_extract.sh" "$staging_dir/docker-compose.yml" "$staging_dir/.env.example"
    cp -a "$staging_dir/." "$TARGET_DIR/"
    rm -rf "$staging_dir"
else
    if [ "$EXTRACTOR" = 'unzip' ]; then
        unzip -o "$TEMP_ARCHIVE" -d "$TARGET_DIR"
    else
        "$EXTRACTOR" x "$TEMP_ARCHIVE" -o"$TARGET_DIR" -y
    fi
fi

mv -f "$TEMP_ARCHIVE" "$TARGET_DIR/$FILENAME"
chmod a+r "$TARGET_DIR/$FILENAME"
TEMP_ARCHIVE=''
echo 'Done.'
