---
name: glitchtip
description: GlitchTip CLI for error tracking. Use when managing releases, uploading sourcemaps, debugging issues, or investigating errors in GlitchTip.
---

GlitchTip CLI (`glitchtip-cli`) is the command-line tool for GlitchTip, the self-hosted error tracking platform used by this project.

## Binary Location

`~/.cargo/bin/glitchtip-cli` (installed via cargo)

## Project Context

This project uses **Sentry SDK pointed at a self-hosted GlitchTip instance**:
- **Backend** (`backend/app/core/error_tracking.py`): `sentry-sdk` with `FastApiIntegration`, DSN from `settings.SENTRY_DSN`
- **Frontend** (`frontend/instrumentation-client.ts` + `frontend/instrumentation.ts`): `@sentry/nextjs` with DSN from `NEXT_PUBLIC_SENTRY_DSN`

## Common Workflows

### Check Configuration

```bash
~/.cargo/bin/glitchtip-cli info
```

Shows current auth status, configured URL, org, and project.

### Release Management

```bash
# List releases
~/.cargo/bin/glitchtip-cli releases list

# Create a new release
~/.cargo/bin/glitchtip-cli releases new <version>

# Associate commits with a release (auto-detect from git)
~/.cargo/bin/glitchtip-cli releases set-commits <version> --auto

# Finalize a release
~/.cargo/bin/glitchtip-cli releases finalize <version>

# Full release pipeline
~/.cargo/bin/glitchtip-cli releases new <version> && \
~/.cargo/bin/glitchtip-cli releases set-commits <version> --auto && \
~/.cargo/bin/glitchtip-cli releases finalize <version>
```

### Deploy Tracking

```bash
~/.cargo/bin/glitchtip-cli deploys --release <version> new -e <environment>
# Example:
~/.cargo/bin/glitchtip-cli deploys --release 1.0.0 new -e production
```

### Upload Source Maps

```bash
# Upload frontend sourcemaps for a release
~/.cargo/bin/glitchtip-cli sourcemaps upload --release <version> ./frontend/.next/static

# Inject debug IDs into source files and sourcemaps before upload
~/.cargo/bin/glitchtip-cli sourcemaps inject ./frontend/.next/static
```

### Investigate Issues

```bash
# List issues
~/.cargo/bin/glitchtip-cli issues list

# Resolve issues
~/.cargo/bin/glitchtip-cli issues resolve --all
~/.cargo/bin/glitchtip-cli issues resolve <issue-id>

# Mute (ignore) issues
~/.cargo/bin/glitchtip-cli issues mute <issue-id>
```

### View Events

```bash
~/.cargo/bin/glitchtip-cli events list
~/.cargo/bin/glitchtip-cli events list --show-user --show-tags
```

### View Logs (OpenTelemetry)

```bash
~/.cargo/bin/glitchtip-cli logs list
```

### Send Test Event

```bash
~/.cargo/bin/glitchtip-cli send-event -m "test message" -l info -E development
```

### Debug Files

```bash
# Upload native debug files (ELF/dSYM/PDB)
~/.cargo/bin/glitchtip-cli debug-files upload <path>

# Check if a debug file is usable
~/.cargo/bin/glitchtip-cli debug-files check <path>
```

## Configuration

Config is loaded in priority order:
1. **CLI flags**: `--url`, `--auth-token`, `--org`, `--project`
2. **Environment variables**: `SENTRY_URL`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_DSN`
3. **Local config**: `.sentryclirc` or `.glitchtip-cli.rc` (searched upward from cwd)
4. **Global config**: `~/.config/glitchtip-cli/config` or `~/.config/sentry/sentrycli.ini`

Config file format (INI):
```ini
[auth]
token=sntrys_xxx
dsn=https://key@your-glitchtip-instance.com/1

[defaults]
url=https://your-glitchtip-instance.com
org=my-org
project=my-project
```

## Usage with $ARGUMENTS

When invoked with arguments, execute the appropriate `glitchtip-cli` command based on the intent:
- "list issues" → `issues list`
- "create release X" → `releases new X`
- "upload sourcemaps for X" → `sourcemaps upload --release X ./frontend/.next/static`
- "deploy X to production" → `deploys --release X new -e production`
- "show errors" → `issues list`
