# TickTick MCP Server

A remote [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for [TickTick](https://ticktick.com/) task management, hosted on Cloudflare Workers.

Provides 22 MCP tools for managing TickTick projects and tasks via any MCP client (Claude Desktop, etc.).

## Features

- **Project Management**: Create, read, delete projects
- **Task CRUD**: Create, read, update, complete, delete tasks
- **Search & Filter**: Search tasks, filter by priority, date ranges
- **GTD Support**: Engaged tasks, next tasks, batch creation, subtasks
- **Authentication**: GitHub OAuth for MCP clients, TickTick API token for backend

## Setup

### 1. Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- A [GitHub OAuth App](https://github.com/settings/developers)
- A [TickTick Developer App](https://developer.ticktick.com/manage)

### 2. Clone and Install

```bash
git clone https://github.com/k-wakamatsu-tms/ticktick-mcp-server.git
cd ticktick-mcp-server
npm install
```

### 3. Configure Secrets

```bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put GITHUB_ALLOWED_LOGINS
wrangler secret put COOKIE_ENCRYPTION_KEY
wrangler secret put TICKTICK_ACCESS_TOKEN
wrangler secret put TICKTICK_CLIENT_ID
wrangler secret put TICKTICK_CLIENT_SECRET
```

For local development, copy `.dev.vars.example` to `.dev.vars` and fill in the values.

### 4. Create KV Namespace

```bash
wrangler kv namespace create OAUTH_KV
```

Update the `id` in `wrangler.jsonc` with the returned namespace ID.

### 5. Deploy

```bash
npm run deploy
```

### 6. Connect from Claude Desktop

Add to your Claude Desktop MCP config:

```json
{
  "mcpServers": {
    "ticktick": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://ticktick-mcp-server.<your-subdomain>.workers.dev/mcp"
      ]
    }
  }
}
```

## Local Development

```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your credentials
npm run dev
```

## Available Tools (22)

### Projects (4)
| Tool | Description |
|------|-------------|
| `get_projects` | Get all projects |
| `get_project` | Get a specific project |
| `create_project` | Create a new project |
| `delete_project` | Delete a project |

### Task CRUD (6)
| Tool | Description |
|------|-------------|
| `get_project_tasks` | Get all tasks in a project |
| `get_task` | Get a specific task |
| `create_task` | Create a new task |
| `update_task` | Update an existing task |
| `complete_task` | Mark a task as complete |
| `delete_task` | Delete a task |

### Search & Filter (8)
| Tool | Description |
|------|-------------|
| `get_all_tasks` | Get all tasks from all projects |
| `search_tasks` | Search tasks by keyword |
| `get_tasks_by_priority` | Filter by priority level |
| `get_tasks_due_today` | Tasks due today |
| `get_tasks_due_tomorrow` | Tasks due tomorrow |
| `get_tasks_due_in_days` | Tasks due in N days |
| `get_tasks_due_this_week` | Tasks due this week |
| `get_overdue_tasks` | Overdue tasks |

### GTD & Batch (4)
| Tool | Description |
|------|-------------|
| `get_engaged_tasks` | High priority / due today / overdue |
| `get_next_tasks` | Medium priority / due tomorrow |
| `batch_create_tasks` | Create multiple tasks at once |
| `create_subtask` | Create a subtask under a parent |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `GITHUB_ALLOWED_LOGINS` | Comma-separated allowed GitHub usernames (unset denies all access) |
| `COOKIE_ENCRYPTION_KEY` | Random key for cookie signing |
| `TICKTICK_ACCESS_TOKEN` | TickTick API access token |
| `TICKTICK_CLIENT_ID` | TickTick app client ID (for future refresh) |
| `TICKTICK_CLIENT_SECRET` | TickTick app client secret (for future refresh) |

## License

MIT
