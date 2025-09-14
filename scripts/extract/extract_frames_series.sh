#!/bin/bash

capitalize_word() {
  echo "$1" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}'
}

parse_season_episode() {
  local input="$1"
  if [[ $input =~ [sS]([0-9]{1,2})[eE]([0-9]{1,2}) ]]; then
    season=${BASH_REMATCH[1]}
    episode=${BASH_REMATCH[2]}
    printf "S%02d_E%02d" "$((10#$season))" "$((10#$episode))"
  else
    echo "S00_E00"
  fi
}

build_folder_name() {
  local filename="$1"
  local cleaned=$(echo "$filename" | tr '.' ' ' | tr '_' ' ')
  local season_episode=""
  local title_words=()
  for word in $cleaned; do
    if [[ $word =~ [sS][0-9]{1,2}[eE][0-9]{1,2} ]]; then
      season_episode="$word"
      break
    else
      title_words+=("$word")
    fi
  done
  local title_formatted=""
  for w in "${title_words[@]}"; do
    capitalized_word=$(capitalize_word "$w")
    if [ -z "$title_formatted" ]; then
      title_formatted="$capitalized_word"
    else
      title_formatted="${title_formatted}_$capitalized_word"
    fi
  done
  if [ -z "$season_episode" ]; then
    season_episode="S00E00"
  fi
  local season_episode_formatted=$(parse_season_episode "$season_episode")
  echo "${title_formatted}_${season_episode_formatted}"
}

if [ -z "$1" ]; then
  echo "Usage: $0 <video-file>"
  exit 1
fi

VIDEO="$1"
BASENAME=$(basename "$VIDEO" .mkv)

OUTPUT_DIR=$(build_folder_name "$BASENAME")

echo "Final folder name: $OUTPUT_DIR"

mkdir -p "$OUTPUT_DIR"

SUBTITLE_FILE="${BASENAME}.srt"

echo "Extracting subtitles from track 2 to $SUBTITLE_FILE..."
ffmpeg -y -i "$VIDEO" -map 0:2 -c:s srt "$SUBTITLE_FILE"

echo "Detecting crop automatically..."
CROP=$(ffmpeg -ss 0 -t 10 -i "$VIDEO" -vf cropdetect=24:16:0 -f null - 2>&1 | \
  grep -o 'crop=[0-9]\+:[0-9]\+:[0-9]\+:[0-9]\+' | tail -1)

if [ -z "$CROP" ]; then
  echo "No crop detected, extracting without crop."
  FILTERS="subtitles=${SUBTITLE_FILE},fps=1"
else
  echo "Crop detected: $CROP"
  FILTERS="$CROP,subtitles=${SUBTITLE_FILE},fps=1"
fi

echo "Extracting frames with burned-in subtitles into $OUTPUT_DIR..."
ffmpeg -y -i "$VIDEO" -vf "$FILTERS" "$OUTPUT_DIR/frame_%04d.png"

MAX_PER_DIR=100

echo "Distributing frames into subfolders of $MAX_PER_DIR images..."

cd "$OUTPUT_DIR" || exit 1

total_frames=$(ls frame_*.png | wc -l)
echo "Total frames extracted: $total_frames"

part=1
count=0
BASE_NAME=$(basename "$OUTPUT_DIR")
mkdir -p "${BASE_NAME}_${part}"

for frame in frame_*.png; do
  mv "$frame" "${BASE_NAME}_${part}/"
  count=$((count + 1))
  if [ "$count" -ge "$MAX_PER_DIR" ]; then
    part=$((part + 1))
    mkdir -p "${BASE_NAME}_${part}"
    count=0
  fi
done

if [ "$count" -eq 0 ] && [ "$part" -gt 1 ]; then
  rmdir "${BASE_NAME}_${part}" 2>/dev/null || true
  part=$((part - 1))
fi

echo "Done."
echo "Frames organized into $part folders of up to $MAX_PER_DIR frames each"
echo "Total frames: $total_frames"

cat > extraction_summary.json << EOF
{
  "episode": "$BASE_NAME",
  "totalFiles": $total_frames,
  "totalFolders": $part,
  "maxFramesPerFolder": $MAX_PER_DIR,
  "extractionDate": "$(date -Iseconds)"
}
EOF

echo "Summary saved to extraction_summary.json"