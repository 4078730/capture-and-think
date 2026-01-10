# Capture & Think MCP Server

MCP (Model Context Protocol) server for Claude Desktop.

For GPTs and Gemini Gems, see [LLM Integration Guide](../docs/llm-integration.md).

## Claude Desktop Setup

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "capture-and-think": {
      "command": "npx",
      "args": ["tsx", "/path/to/capture-and-think/mcp-server/index.ts"],
      "env": {
        "NB_DIR": "/path/to/your/notes"
      }
    }
  }
}
```

## Running Manually

```bash
NB_DIR=/path/to/notes npx tsx mcp-server/index.ts
```

## Available Tools

### Note Operations

| Tool | Description |
|------|-------------|
| `create_note` | Create a new note |
| `list_notes` | List notes with filters |
| `get_note` | Get a note by ID |
| `update_note` | Update note content |
| `search_notes` | Search notes by query |

### Task Operations

| Tool | Description |
|------|-------------|
| `list_tasks` | Get all tasks grouped by bucket |
| `toggle_task` | Toggle task completion status |

## Tool Parameters

### create_note
- `body` (required): Note content (Markdown)
- `bucket` (optional): Category (management, rfa, cxc, paper, video, life, game)
- `memo` (optional): Additional context
- `due_date` (optional): ISO 8601 date

### list_notes
- `bucket` (optional): Filter by bucket
- `status` (optional): "active" or "archived"
- `limit` (optional): Max results (default: 50)
- `q` (optional): Search query

### get_note
- `id` (required): Note ID

### update_note
- `id` (required): Note ID
- `body` (optional): New content
- `bucket` (optional): New bucket
- `memo` (optional): New memo
- `due_date` (optional): New due date

### search_notes
- `query` (required): Search query
- `limit` (optional): Max results (default: 20)

### list_tasks
No parameters required.

### toggle_task
- `itemId` (required): Note ID containing the task
- `lineIndex` (required): Line number of the task in note body
