#!/usr/bin/env bash

set -e

# Resolve PERL5LIB dynamically relative to the exiftool binary location
EXIFTOOL_BIN=$(command -v exiftool 2>/dev/null || true)
if [ -n "$EXIFTOOL_BIN" ]; then
    APT_USR_DIR=$(cd "$(dirname "$EXIFTOOL_BIN")/.." && pwd)
    export PERL5LIB="$PERL5LIB:$APT_USR_DIR/share/perl5:$APT_USR_DIR/share/perl/5.38:$APT_USR_DIR/share/perl/5.38.2"
fi

# Output directly into dist/
DB_FILE="dist/images.db"
TMP_JSON="temp_exif.json"
IMAGE_DIR="dist/images"

# Check if required commands are installed
if ! command -v exiftool &> /dev/null; then
    echo "⚠️  WARNING: 'exiftool' is not installed. Skipping EXIF DB generation."
    exit 0
fi

if ! command -v sqlite3 &> /dev/null; then
    echo "⚠️  WARNING: 'sqlite3' is not installed. Skipping EXIF DB generation."
    exit 0
fi

# Ensure dist/ directory exists
mkdir -p dist

# Remove existing DB file if rebuilding
rm -f "$DB_FILE" "$TMP_JSON"

echo "Extracting EXIF & GPS data recursively from $IMAGE_DIR..."

# Extract metadata with signed decimal coordinates
exiftool -r -json \
  -c "%.6f" \
  -FileName \
  -FilePath \
  -DateTimeOriginal \
  -ImageWidth \
  -ImageHeight \
  -Make \
  -Model \
  -ISO \
  -FNumber \
  -ExposureTime \
  -GPSLatitude# \
  -GPSLongitude# \
  -GPSAltitude \
  -ext jpg -ext jpeg -ext png -ext webp -ext heic "$IMAGE_DIR" > "$TMP_JSON"

echo "Creating SQLite database: $DB_FILE..."

sqlite3 "$DB_FILE" <<EOF
-- Create destination table with GPS fields
CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    filepath TEXT,
    date_taken TEXT,
    width INTEGER,
    height INTEGER,
    make TEXT,
    model TEXT,
    iso INTEGER,
    f_number REAL,
    exposure_time TEXT,
    latitude REAL,
    longitude REAL,
    altitude REAL
);

-- Extract fields into database table, filtering out missing DateTimeOriginal
INSERT INTO images (
    filename, 
    filepath, 
    date_taken, 
    width, 
    height, 
    make, 
    model, 
    iso, 
    f_number, 
    exposure_time,
    latitude,
    longitude,
    altitude
)
SELECT 
    json_extract(value, '$.FileName'),
    json_extract(value, '$.FilePath'),
    json_extract(value, '$.DateTimeOriginal'),
    json_extract(value, '$.ImageWidth'),
    json_extract(value, '$.ImageHeight'),
    json_extract(value, '$.Make'),
    json_extract(value, '$.Model'),
    json_extract(value, '$.ISO'),
    json_extract(value, '$.FNumber'),
    json_extract(value, '$.ExposureTime'),
    CAST(json_extract(value, '$.GPSLatitude') AS REAL),
    CAST(json_extract(value, '$.GPSLongitude') AS REAL),
    CAST(json_extract(value, '$.GPSAltitude') AS REAL)
FROM json_each(readfile('$TMP_JSON'))
WHERE json_extract(value, '$.DateTimeOriginal') IS NOT NULL 
  AND json_extract(value, '$.DateTimeOriginal') != '';

-- Create indexes for chronological and spatial/location queries
CREATE INDEX IF NOT EXISTS idx_date_taken ON images(date_taken);
CREATE INDEX IF NOT EXISTS idx_coords ON images(latitude, longitude);
EOF

# Clean up temporary JSON dump
rm -f "$TMP_JSON"

echo "Done! Generated $DB_FILE (skipped images without DateTimeOriginal)."