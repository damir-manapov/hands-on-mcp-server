# Task Manager MCP Server

A creative Model Context Protocol (MCP) server with an in-memory database for task management. This server provides tools, resources, and prompts for managing users, projects, tasks, tags, and comments.

## Features

- 🗄️ **In-Memory Database**: Fast, lightweight data storage using JavaScript objects
- 🛠️ **Rich Tool Set**: 20+ tools for CRUD operations, search, and analytics
- 📚 **Resources**: Access to users, projects, tasks, tags, and statistics
- 💬 **Prompts**: Pre-built templates for common operations
- 🧪 **Fully Tested**: Comprehensive test suite with Vitest
- 📝 **Type-Safe**: Full TypeScript support with strict typing

## Tech Stack

- **TypeScript** - Type-safe development
- **pnpm** - Fast, efficient package manager
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Vitest** - Testing framework
- **tsx** - TypeScript execution
- **@modelcontextprotocol/sdk** - MCP SDK

## Installation

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run in development mode
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Format code
pnpm format

# Lint code
pnpm lint
```

## Data Models

### User
- `id`: Unique identifier
- `name`: Full name
- `email`: Email address
- `role`: admin | user | viewer
- `createdAt`, `updatedAt`: Timestamps

### Project
- `id`: Unique identifier
- `name`: Project name
- `description`: Project description
- `ownerId`: Owner user ID
- `status`: active | archived | completed
- `createdAt`, `updatedAt`: Timestamps

### Task
- `id`: Unique identifier
- `title`: Task title
- `description`: Task description
- `projectId`: Associated project ID
- `assigneeId`: Assigned user ID (nullable)
- `status`: todo | in-progress | review | done
- `priority`: low | medium | high | urgent
- `dueDate`: Due date (nullable)
- `tags`: Array of tag IDs
- `createdAt`, `updatedAt`: Timestamps

### Tag
- `id`: Unique identifier
- `name`: Tag name
- `color`: Hex color code
- `createdAt`: Timestamp

### Comment
- `id`: Unique identifier
- `taskId`: Associated task ID
- `userId`: Comment author ID
- `content`: Comment text
- `createdAt`, `updatedAt`: Timestamps

## Tools

### User Management
- `create_user` - Create a new user
- `get_user` - Get user by ID
- `list_users` - List all users

### Project Management
- `create_project` - Create a new project
- `get_project` - Get project by ID
- `list_projects` - List all projects (optionally filtered by owner)

### Task Management
- `create_task` - Create a new task
- `get_task` - Get task by ID
- `list_tasks` - List tasks with filters (project, assignee, status, tag)
- `update_task` - Update task properties
- `delete_task` - Delete a task
- `search_tasks` - Search tasks by title/description

### Tag Management
- `create_tag` - Create a new tag
- `list_tags` - List all tags

### Comments
- `add_comment` - Add a comment to a task
- `get_task_comments` - Get all comments for a task

### Analytics
- `get_task_statistics` - Get overall task statistics
- `get_project_statistics` - Get statistics for a specific project

## Resources

Access data through MCP resources:

- `task-manager://users` - All users
- `task-manager://projects` - All projects
- `task-manager://tasks` - All tasks
- `task-manager://tags` - All tags
- `task-manager://statistics` - Task statistics

## Prompts

Pre-built prompts for common operations:

1. **create_task_template** - Template for creating tasks with best practices
2. **task_status_update** - Template for updating task status with validation
3. **project_summary** - Generate comprehensive project summary
4. **user_workload** - Analyze user workload and task distribution
5. **urgent_tasks_report** - Generate report of urgent and overdue tasks

## Usage Example

The server comes pre-populated with sample data:
- 2 users (Alice and Bob)
- 1 project (Web Application)
- 2 tasks (Design UI, Fix login bug)
- 3 tags (frontend, backend, bug)
- 1 comment

You can interact with the server using any MCP-compatible client.

## Development

### Project Structure

```
src/
  ├── index.ts          # Main MCP server implementation
  ├── database.ts       # In-memory database with all operations
  ├── types.ts          # TypeScript type definitions
  └── database.test.ts  # Test suite
```

### Adding New Features

1. Add types to `src/types.ts` if needed
2. Add database operations to `src/database.ts`
3. Add tools/resources/prompts to `src/index.ts`
4. Add tests to `src/database.test.ts`

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

### Testing with MCP Inspector

You can test the MCP server interactively using the MCP Inspector tool:

```bash
pnpm build && npx @modelcontextprotocol/inspector node dist/index.js
```

**Note:** When using the inspector, always use the built server (`node dist/index.js`) rather than `pnpm dev`, as pnpm's output can interfere with JSON-RPC communication over stdio.

The inspector will open a web interface where you can:
- Browse all available tools
- Test tools with different parameters
- View resources
- Try prompts
- See request/response details

## License

MIT

