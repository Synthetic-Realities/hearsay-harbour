#!/bin/zsh
# Double-click to start Hearsay Harbour and open it in your browser.
# Close this Terminal window (or press Ctrl+C) to stop the game.

cd "${0:A:h}"
PORT=3000
URL="http://localhost:$PORT/"

# Prefer Node 22 if Homebrew has it; Node 20 works too.
for d in /opt/homebrew/opt/node@22/bin /usr/local/opt/node@22/bin; do
  [[ -d $d ]] && export PATH="$d:$PATH"
done
export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin"

if ! command -v npm >/dev/null; then
  echo "Node.js isn't installed. Install it from https://nodejs.org, then double-click this again."
  read -k1 "?Press any key to close."
  exit 1
fi

# Already running? Just open it.
if lsof -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Hearsay Harbour is already running. Opening $URL"
  open "$URL"
  exit 0
fi

if [[ ! -d node_modules ]]; then
  echo "First run: installing (this takes a minute)…"
  npm install || { read -k1 "?Install failed. Press any key to close."; exit 1 }
fi

echo "Starting Hearsay Harbour on $URL …"
( for i in {1..60}; do
    sleep 1
    curl -s -o /dev/null "$URL" && { open "$URL"; break }
  done ) &

npx nuxt dev --port $PORT
