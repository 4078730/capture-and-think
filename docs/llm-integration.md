# LLM Integration Guide

Capture & Think supports integration with Claude, ChatGPT (GPTs), and Gemini (Gems).

## Authentication

Set `MCP_API_KEY` environment variable. All requests require:

```
Authorization: Bearer <your-api-key>
```

## Claude Desktop (MCP)

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

## ChatGPT (GPTs)

1. Create a new GPT at https://chat.openai.com/gpts/editor
2. Go to **Configure** → **Actions** → **Create new action**
3. Import schema from URL: `https://your-domain.com/openapi.yaml`
4. Set Authentication:
   - Type: **API Key**
   - Auth Type: **Bearer**
   - Enter your `MCP_API_KEY` value

### GPT Instructions (example)

```
You are a note-taking assistant connected to the user's Capture & Think notes.

Available actions:
- listNotes: List notes with filters (bucket, status, pinned)
- createNote: Create a new note
- getNote: Get note details by ID
- updateNote: Update note content
- searchNotes: Search notes by keyword
- listTasks: Get all tasks from notes
- toggleTask: Mark task as complete/incomplete

When user asks about their notes, use searchNotes or listNotes.
When user wants to add something, use createNote.
For tasks, use listTasks and toggleTask.

Always confirm destructive actions before executing.
```

## Gemini (Gems)

1. Go to https://gemini.google.com/gems
2. Create new Gem
3. Add Extension → **Custom API**
4. Import OpenAPI spec: `https://your-domain.com/openapi.yaml`
5. Set API Key header: `Authorization: Bearer <your-api-key>`

### Gem Instructions (example)

Same as GPT instructions above.

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mcp/items` | GET | List notes |
| `/api/mcp/items` | POST | Create note |
| `/api/mcp/items/{id}` | GET | Get note |
| `/api/mcp/items/{id}` | PATCH | Update note |
| `/api/mcp/items/{id}` | DELETE | Archive note |
| `/api/mcp/search?q=` | GET | Search notes |
| `/api/tasks` | GET | List tasks |
| `/api/tasks/toggle` | POST | Toggle task |

## OpenAPI Spec

Available at: `/openapi.yaml`

## Buckets

Available bucket values:
- `management` - Management tasks
- `rfa` - RFA related
- `cxc` - CXC related  
- `paper` - Academic papers
- `video` - Video content
- `life` - Personal life
- `game` - Gaming
