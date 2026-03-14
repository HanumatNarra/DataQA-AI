# Repo Audit Commands

```bash
# Secrets / hardcoding quick scan
npx ripgrep -n --no-heading -e "sk-[a-zA-Z0-9]{20,}" -e "ghp_[A-Za-z0-9]{36,}" -e "AKIA[0-9A-Z]{16}" -e "service_role" -e "-----BEGIN (PRIVATE|RSA|OPENSSH) KEY-----" -g "!node_modules" -g "!out"

# Find inline endpoints/urls/hex colors
npx ripgrep -n -e "https?://[^\")'\s]+" -e "#[0-9A-Fa-f]{6}\b" -g "!node_modules" -g "!out"

# Env usage audit
npx ripgrep -n "process\\.env\\." -g "!node_modules" -g "!out"

# Unused deps & exports
npx depcheck || true
npx ts-prune || true

# ESLint strict
npm run lint || npx eslint . --ext .ts,.tsx --max-warnings=0

# Bundle analyzer (Next)
ANALYZE=true npm run build || true
```

Dangerous pattern scan:
- any type, // @ts-ignore, eval(, Function(, dangerouslySetInnerHTML, wide CORS, allowOrigins: ['*'], allowCredentials: true, NEXT_PUBLIC_* secrets on server, service_role in client.


