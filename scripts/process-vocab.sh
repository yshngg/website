#!/bin/bash
set -euo pipefail

JSONL="data/vocabulary.jsonl"
OUTDIR="content/vocab"

mkdir -p "$OUTDIR"

# Remove any previously generated word files (but keep flashcard subdir)
find "$OUTDIR" -maxdepth 1 -name '*.md' -not -name '_index.md' -delete

# Generate _index.md with pagination
cat > "$OUTDIR/_index.md" << 'EOF'
+++
title = "Vocabulary"
template = "vocab.html"
paginate_by = 10
sort_by = "title"
+++
EOF

# Process each entry: dedup by lowercase word, sort alphabetically
jq -c -s '
  group_by(.word | ascii_downcase)
  | map(.[0])
  | sort_by(.word | ascii_downcase)
  | .[]
' "$JSONL" | while IFS= read -r line; do
  eval "$(
    echo "$line" | jq -r '
      @sh "WORD=\(.word)",
      @sh "UK_PRON=\(.data.pronunciation.uk // "")",
      @sh "US_PRON=\(.data.pronunciation.us // "")",
      @sh "UK_AUDIO=\(.data.audio.uk // "")",
      @sh "US_AUDIO=\(.data.audio.us // "")",
      @sh "SLUG=\(.word | ascii_downcase | gsub("[^a-z0-9]+"; "-") | gsub("^-+|-+$"; ""))"
    '
  )"

  # Sanitize WORD for TOML (escape backslashes and quotes)
  WORD_SAFE=$(echo "$WORD" | sed 's/\\/\\\\/g; s/"/\\"/g')

  {
    echo '+++'
    echo "title = \"$WORD_SAFE\""
    echo 'in_search_index = true'
    echo ''
    echo '[extra]'
    [ -n "$UK_PRON" ] && echo "uk_pron = \"$UK_PRON\""
    [ -n "$US_PRON" ] && echo "us_pron = \"$US_PRON\""
    [ -n "$UK_AUDIO" ] && echo "uk_audio = \"$UK_AUDIO\""
    [ -n "$US_AUDIO" ] && echo "us_audio = \"$US_AUDIO\""

    # Generate senses as TOML array-of-tables
    echo "$line" | jq -r '
      if (.data.senses | length) > 0 then
        [.data.senses[] |
          "[[extra.senses]]",
          ("pos = " + (.pos | tojson)),
          (if (.definitions | length) > 0 then
            [.definitions[] |
              "[[extra.senses.definitions]]",
              ("en = " + (.en | tojson)),
              ("zh = " + (.zh | tojson)),
              (if (.examples | length) > 0 then
                [.examples[] |
                  "[[extra.senses.definitions.examples]]",
                  ("en = " + (.en | tojson)),
                  ("zh = " + (.zh | tojson))
                ] | join("\n")
              else empty end)
            ] | join("\n")
          else empty end)
        ] | join("\n")
      else
        empty
      end
    ' 2>/dev/null || true

    echo '+++'
    echo ''

    # Body text for search index
    echo -n "$WORD"
    echo "$line" | jq -r '
      if (.data.senses | length) > 0 then
        " " + ([.data.senses[] |
          "(" + .pos + ") " +
          ([.definitions[] |
            .en + " " + .zh +
            (if (.examples | length) > 0 then
              " " + ([.examples[] | .en + " " + (.zh // "")] | join(" "))
            else "" end)
          ] | join(" "))
        ] | join(" "))
      else
        ""
      end
    ' 2>/dev/null || echo ''
  } > "$OUTDIR/$SLUG.md"
done

echo "Done. Generated $(find "$OUTDIR" -maxdepth 1 -name '*.md' -not -name '_index.md' | wc -l) vocab word files."
