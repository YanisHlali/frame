#!/bin/bash

capitalize_word() {
  echo "$1" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}'
}

parse_movie_year() {
  local input="$1"
  if [[ $input =~ \(?([0-9]{4})\)? ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo "Unknown"
  fi
}

build_movie_folder_name() {
  local filename="$1"
  local cleaned=$(echo "$filename" | tr '.' ' ' | tr '_' ' ' | tr '-' ' ')
  local year=""
  local title_words=()
  
  for word in $cleaned; do
    if [[ $word =~ ^[0-9]{4}$ ]] || [[ $word =~ ^\([0-9]{4}\)$ ]]; then
      year="$word"
      break
    else
      if [[ ! $word =~ ^(1080p|720p|BluRay|WEB|DL|x264|x265|HEVC|mkv|mp4)$ ]]; then
        title_words+=("$word")
      fi
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
  
  local year_cleaned=$(echo "$year" | tr -d '()')
  if [ -z "$year_cleaned" ]; then
    year_cleaned="Unknown"
  fi
  
  echo "${title_formatted}_${year_cleaned}"
}

if [ -z "$1" ]; then
  echo "Usage: $0 <video-file>"
  echo "Examples:"
  echo "  $0 Iron.Man.2008.1080p.BluRay.mkv"
  echo "  $0 Avengers (2012) [1080p].mp4"
  echo "  $0 Thor-2011-WEB-DL.mkv"
  exit 1
fi

VIDEO="$1"
BASENAME=$(basename "$VIDEO" | sed 's/\.[^.]*$//')

OUTPUT_DIR=$(build_movie_folder_name "$BASENAME")

echo "Detected movie: $BASENAME"
echo "Final folder name: $OUTPUT_DIR"

mkdir -p "$OUTPUT_DIR"

SUBTITLE_FILE="${BASENAME}.srt"

echo "Extracting subtitles from track 2 to $SUBTITLE_FILE..."
ffmpeg -y -i "$VIDEO" -map 0:2 -c:s srt "$SUBTITLE_FILE" 2>/dev/null || echo "No subtitles found, continuing without..."

echo "Detecting crop automatically..."
CROP=$(ffmpeg -ss 60 -t 30 -i "$VIDEO" -vf cropdetect=24:16:0 -f null - 2>&1 | \
  grep -o 'crop=[0-9]\+:[0-9]\+:[0-9]\+:[0-9]\+' | tail -1)

if [ -f "$SUBTITLE_FILE" ]; then
  if [ -z "$CROP" ]; then
    echo "No crop detected, extracting with subtitles."
    FILTERS="subtitles=${SUBTITLE_FILE},fps=1"
  else
    echo "Crop detected: $CROP"
    FILTERS="$CROP,subtitles=${SUBTITLE_FILE},fps=1"
  fi
else
  if [ -z "$CROP" ]; then
    echo "Extracting without crop or subtitles."
    FILTERS="fps=1"
  else
    echo "Crop detected: $CROP, extracting without subtitles."
    FILTERS="$CROP,fps=1"
  fi
fi

echo "Extracting frames into $OUTPUT_DIR..."
echo "This may take a while for a full movie..."

ffmpeg -y -i "$VIDEO" -vf "$FILTERS" "$OUTPUT_DIR/frame_%05d.png" \
  -progress pipe:1 2>/dev/null | grep -o "frame=[0-9]*" | tail -1

MAX_PER_DIR=100

echo "Distributing frames into subfolders of $MAX_PER_DIR images..."

cd "$OUTPUT_DIR" || exit 1

total_frames=$(ls frame_*.png 2>/dev/null | wc -l)
echo "Total frames extracted: $total_frames"

if [ "$total_frames" -eq 0 ]; then
  echo "No frames extracted. Please check your video file."
  exit 1
fi

part=1
count=0
mkdir -p "${OUTPUT_DIR}_${part}"

echo "Organizing into subfolders..."

for frame in frame_*.png; do
  mv "$frame" "${OUTPUT_DIR}_${part}/"
  count=$((count + 1))
  
  if [ $((count % 50)) -eq 0 ]; then
    echo "Folder ${OUTPUT_DIR}_${part}: $count frames"
  fi
  
  if [ "$count" -ge "$MAX_PER_DIR" ]; then
    echo "Folder ${OUTPUT_DIR}_${part} completed ($count frames)"
    part=$((part + 1))
    mkdir -p "${OUTPUT_DIR}_${part}"
    count=0
  fi
done

if [ "$count" -gt 0 ]; then
  echo "Folder ${OUTPUT_DIR}_${part} completed ($count frames)"
fi

echo ""
echo "Extraction complete!"
echo "$part folders created with $total_frames frames in total"
echo "Created structure:"
ls -la | grep "^d" | grep "${OUTPUT_DIR}_"

if [ -f "$SUBTITLE_FILE" ]; then
  echo "Clean up subtitle file? (y/N)"
  read -r cleanup
  if [[ $cleanup =~ ^[Yy]$ ]]; then
    rm "$SUBTITLE_FILE"
    echo "Subtitle file deleted"
  fi
fi