#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(pwd)"
CLAUDE_DIR="$PROJECT_DIR/.claude"
HOOKS_DIR="$CLAUDE_DIR/hooks"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
HOOK_FILE="$HOOKS_DIR/protect-env.sh"
GITIGNORE_FILE="$PROJECT_DIR/.gitignore"
GITIGNORE_ENTRIES=(
  '.claude/settings.local.json'
  '.env'
  '.env.*'
)

mkdir -p "$HOOKS_DIR"

if [[ ! -f "$SETTINGS_FILE" ]]; then
  cat > "$SETTINGS_FILE" <<'EOF'
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./**/.env)",
      "Read(./**/.env.*)",
      "Read(./secrets/**)",
      "Read(./**/id_rsa)",
      "Read(./**/*.pem)",
      "Read(./**/*.key)",
      "Read(./**/credentials.json)",
      "Read(./**/.aws/**)",
      "Read(./**/.ssh/**)",
      "Bash(cat:*.env*)",
      "Bash(less:*.env*)",
      "Bash(more:*.env*)",
      "Bash(head:*.env*)",
      "Bash(tail:*.env*)",
      "Bash(grep:*.env*)",
      "Bash(curl:*)",
      "Bash(wget:*)",
      "Bash(dig:*)",
      "Bash(nslookup:*)"
    ],
    "ask": [
      "Bash(git push:*)",
      "Bash(rm -rf:*)"
    ],
    "defaultMode": "default"
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read|Edit|Write|Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-env.sh"
          }
        ]
      }
    ]
  }
}
EOF
fi

if [[ ! -f "$HOOK_FILE" ]]; then
  cat > "$HOOK_FILE" <<'EOF'
#!/bin/bash
set -euo pipefail

deny() {
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

PAYLOAD=$(cat) || deny "Blocked by protect-env hook: failed to read tool payload"
[[ -n "$PAYLOAD" ]] || deny "Blocked by protect-env hook: empty tool payload"
jq -e . >/dev/null 2>&1 <<<"$PAYLOAD" || deny "Blocked by protect-env hook: invalid tool payload"
TOOL=$(jq -er '.tool_name | strings | select(length > 0)' <<<"$PAYLOAD") || deny "Blocked by protect-env hook: invalid tool name"

if [[ "$TOOL" == "Bash" ]]; then
  TARGET=$(jq -er '.tool_input.command | strings' <<<"$PAYLOAD") || deny "Blocked by protect-env hook: invalid Bash command"
else
  TARGET=$(jq -er '.tool_input.file_path // .tool_input.path // "" | strings' <<<"$PAYLOAD") || deny "Blocked by protect-env hook: invalid tool path"
fi

PATTERN='\.env|id_rsa|\.pem$|\.key$|credentials\.json|secrets/|/\.aws/|/\.ssh/|\.netrc|\.npmrc.*_authToken'

if grep -qE "$PATTERN" <<<"$TARGET"; then
  deny "Blocked by protect-env hook"
fi

exit 0
EOF
fi

chmod +x "$HOOK_FILE"

touch "$GITIGNORE_FILE"
TEMP_FILE="$(mktemp)"
{
  printf '%s\n' "${GITIGNORE_ENTRIES[@]}"
  grep -Fvx \
    -e "${GITIGNORE_ENTRIES[0]}" \
    -e "${GITIGNORE_ENTRIES[1]}" \
    -e "${GITIGNORE_ENTRIES[2]}" \
    "$GITIGNORE_FILE" || true
} > "$TEMP_FILE"
mv "$TEMP_FILE" "$GITIGNORE_FILE"
