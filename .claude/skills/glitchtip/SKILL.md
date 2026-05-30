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

## Configuration

**CLI 从 `~/.sentryclirc` 自动读取所有配置**（URL、token、org、project）。该文件在用户主目录，不被 Git 追踪。

**核心原则：CLI 自带认证，所有 CLI 命令无需手动传 token。只有 curl 调 REST API 时才需要手动带 Bearer token。**

### Verify Config

```bash
~/.cargo/bin/glitchtip-cli info
```

If this fails, `~/.sentryclirc` is missing or incomplete. It should contain:

```ini
[auth]
token=<your-glitchtip-auth-token>

[defaults]
url=<your-glitchtip-instance-url>
org=<your-org-slug>
project=<backend-project-slug>
```

### Discover Projects

Default project is backend. To find other project slugs (e.g. frontend), list projects:

```bash
~/.cargo/bin/glitchtip-cli info   # shows default org
# Then use REST API to list all projects (CLI has no "projects list" command)
TOKEN=$(grep '^token=' ~/.sentryclirc | cut -d= -f2)
URL=$(grep '^url=' ~/.sentryclirc | cut -d= -f2)
ORG=$(grep '^org=' ~/.sentryclirc | cut -d= -f2)
curl -s "${URL}/api/0/organizations/${ORG}/projects/" -H "Authorization: Bearer ${TOKEN}"
```

Switch project with `--project`:

```bash
~/.cargo/bin/glitchtip-cli issues list                       # backend (default)
~/.cargo/bin/glitchtip-cli --project <frontend-slug> issues list  # frontend
```

## Quick Start — Investigating Bugs

**When the user says "有 Bug" or asks to check GlitchTip, follow this workflow:**

### Step 1: List Issues

```bash
~/.cargo/bin/glitchtip-cli issues list                       # backend
~/.cargo/bin/glitchtip-cli --project <frontend-slug> issues list  # frontend
```

### Step 2: Filter Real Bugs from Noise

Skip these non-bug events:
- Titles containing "smoke test", "E2E test", "pipeline verification" — test events
- `info` level events with emoji in title — manual test events
- `OperationalError: connection to server` — transient DB issues (check if still recurring)

Focus on:
- `ProgrammingError` — schema mismatch, migration needed
- `Error: ./src/...` — frontend build/compile errors
- `TypeError`, `ReferenceError` — runtime JavaScript errors
- Issues with high count and recent lastSeen — recurring active bugs

### Step 3: Get Stack Traces

**CLI 没有 `show` 子命令**，无法直接查看 issue 详情。需要两步：

**3a. 获取 event ID：**
```bash
~/.cargo/bin/glitchtip-cli events list --show-tags
```
输出中的 `Event ID` 列是 UUID（如 `cc17d9b8827a40d587d435a06d3f482a`）。选一个你想深入调查的 event ID。

**3b. 获取完整堆栈（curl + REST API）：**

```bash
# 从配置文件获取 URL、org、token（curl 不像 CLI 自动带认证）
TOKEN=$(grep '^token=' ~/.sentryclirc | cut -d= -f2)
URL=$(grep '^url=' ~/.sentryclirc | cut -d= -f2)
ORG=$(grep '^org=' ~/.sentryclirc | cut -d= -f2)

# 用 event ID 获取完整 JSON
curl -s "${URL}/api/0/projects/${ORG}/<project>/events/<EVENT_ID>/" \
  -H "Authorization: Bearer ${TOKEN}"
```

**API path rules:**
- Use `/projects/{org}/{project}/events/{event_id}/` to get a single event
- Use `/projects/{org}/{project}/...` path, NOT `/organizations/{org}/projects/{project}/...` (404)

### Step 4: Parse Event JSON

Key fields in the response:
- `metadata.value` — full error message with surrounding code context
- `metadata.type` — exception type (Error, TypeError, ProgrammingError, etc.)
- `entries[type=exception].data.values[0].stacktrace.frames` — stack frames (last N are most relevant)
- `tags` — environment, browser, release info

### Step 5: Investigate Root Cause

After getting the stack trace, follow `superpowers:systematic-debugging` for root cause analysis.

## Common Workflows

```bash
# Check config
~/.cargo/bin/glitchtip-cli info

# Release management
~/.cargo/bin/glitchtip-cli releases list
~/.cargo/bin/glitchtip-cli releases new <version>
~/.cargo/bin/glitchtip-cli releases set-commits <version> --auto
~/.cargo/bin/glitchtip-cli releases finalize <version>

# Deploy tracking
~/.cargo/bin/glitchtip-cli deploys --release <version> new -e <environment>

# Upload source maps
~/.cargo/bin/glitchtip-cli sourcemaps upload --release <version> ./frontend/.next/static
~/.cargo/bin/glitchtip-cli sourcemaps inject ./frontend/.next/static

# Resolve issues
~/.cargo/bin/glitchtip-cli issues resolve --all
~/.cargo/bin/glitchtip-cli issues resolve <issue-id>
~/.cargo/bin/glitchtip-cli --project <project> issues resolve --all
~/.cargo/bin/glitchtip-cli issues mute <issue-id>

# View events
~/.cargo/bin/glitchtip-cli events list
~/.cargo/bin/glitchtip-cli events list --show-user --show-tags

# View logs (OpenTelemetry)
~/.cargo/bin/glitchtip-cli logs list

# Send test event
~/.cargo/bin/glitchtip-cli send-event -m "test message" -l info -E development
```

## REST API Reference

CLI 无法获取完整堆栈时，使用 curl 调 REST API（需手动传 Bearer token）。

### Endpoint Patterns

| Purpose | Endpoint |
|---------|----------|
| List orgs | `GET /organizations/` |
| List projects | `GET /organizations/{org}/projects/` |
| Single event | `GET /projects/{org}/{project}/events/{event_id}/` |

Sort options for issues: `last_seen`, `first_seen`, `count`, `priority` (prefix `-` for descending).

## Usage with $ARGUMENTS

When invoked with arguments, execute the appropriate `glitchtip-cli` command based on the intent:
- "list issues" → `issues list`
- "create release X" → `releases new X`
- "upload sourcemaps for X" → `sourcemaps upload --release X ./frontend/.next/static`
- "deploy X to production" → `deploys --release X new -e production`
- "show errors" → `issues list`
