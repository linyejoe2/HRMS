#!/bin/bash
PAYLOAD=$(cat)
TOOL=$(echo "$PAYLOAD" | jq -r '.tool_name')

if [[ "$TOOL" == "Bash" ]]; then
  TARGET=$(echo "$PAYLOAD" | jq -r '.tool_input.command')
else
  TARGET=$(echo "$PAYLOAD" | jq -r '.tool_input.file_path // .tool_input.path // ""')
fi

PATTERN='\.env|id_rsa|\.pem$|\.key$|credentials\.json|secrets/|/\.aws/|/\.ssh/|\.netrc|\.npmrc.*_authToken'

if echo "$TARGET" | grep -qE "$PATTERN"; then
  jq -n --arg reason "Blocked by protect-env hook" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
fi

exit 0
