import type { User, Project, Task, Tag, Comment, Database } from './types.js';

class InMemoryDatabase {
  private db: Database;

  constructor() {
    this.db = {
      users: new Map(),
      projects: new Map(),
      tasks: new Map(),
      tags: new Map(),
      comments: new Map(),
    };

    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Sample users
    const user1: User = {
      id: 'user-1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      role: 'admin',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const user2: User = {
      id: 'user-2',
      name: 'Bob Smith',
      email: 'bob@example.com',
      role: 'user',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    };

    this.db.users.set(user1.id, user1);
    this.db.users.set(user2.id, user2);

    // Sample tags
    const tag1: Tag = {
      id: 'tag-1',
      name: 'frontend',
      color: '#3b82f6',
      createdAt: new Date('2024-01-01'),
    };

    const tag2: Tag = {
      id: 'tag-2',
      name: 'backend',
      color: '#10b981',
      createdAt: new Date('2024-01-01'),
    };

    const tag3: Tag = {
      id: 'tag-3',
      name: 'bug',
      color: '#ef4444',
      createdAt: new Date('2024-01-01'),
    };

    this.db.tags.set(tag1.id, tag1);
    this.db.tags.set(tag2.id, tag2);
    this.db.tags.set(tag3.id, tag3);

    // Sample project
    const project1: Project = {
      id: 'project-1',
      name: 'Web Application',
      description: 'Building a modern web application',
      ownerId: user1.id,
      status: 'active',
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
    };

    this.db.projects.set(project1.id, project1);

    // Sample tasks
    const task1: Task = {
      id: 'task-1',
      title: 'Design user interface',
      description: 'Create mockups for the main dashboard',
      projectId: project1.id,
      assigneeId: user1.id,
      status: 'in-progress',
      priority: 'high',
      dueDate: new Date('2024-02-01'),
      tags: [tag1.id],
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-10'),
    };

    const task2: Task = {
      id: 'task-2',
      title: 'Fix login bug',
      description: 'Users cannot log in with email',
      projectId: project1.id,
      assigneeId: user2.id,
      status: 'todo',
      priority: 'urgent',
      dueDate: new Date('2024-01-20'),
      tags: [tag2.id, tag3.id],
      createdAt: new Date('2024-01-08'),
      updatedAt: new Date('2024-01-08'),
    };

    this.db.tasks.set(task1.id, task1);
    this.db.tasks.set(task2.id, task2);

    // Sample comments
    const comment1: Comment = {
      id: 'comment-1',
      taskId: task1.id,
      userId: user1.id,
      content: 'Working on the design system first',
      createdAt: new Date('2024-01-06'),
      updatedAt: new Date('2024-01-06'),
    };

    this.db.comments.set(comment1.id, comment1);
  }

  // User operations
  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
    const id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const now = new Date();
    const newUser: User = {
      ...user,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.db.users.set(id, newUser);
    return newUser;
  }

  getUser(id: string): User | undefined {
    return this.db.users.get(id);
  }

  getAllUsers(): User[] {
    return Array.from(this.db.users.values());
  }

  updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): User | null {
    const user = this.db.users.get(id);
    if (!user) return null;

    const updated: User = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };
    this.db.users.set(id, updated);
    return updated;
  }

  deleteUser(id: string): boolean {
    return this.db.users.delete(id);
  }

  // Project operations
  createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const id = `project-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const now = new Date();
    const newProject: Project = {
      ...project,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.db.projects.set(id, newProject);
    return newProject;
  }

  getProject(id: string): Project | undefined {
    return this.db.projects.get(id);
  }

  getAllProjects(): Project[] {
    return Array.from(this.db.projects.values());
  }

  getProjectsByOwner(ownerId: string): Project[] {
    return Array.from(this.db.projects.values()).filter(p => p.ownerId === ownerId);
  }

  updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Project | null {
    const project = this.db.projects.get(id);
    if (!project) return null;

    const updated: Project = {
      ...project,
      ...updates,
      updatedAt: new Date(),
    };
    this.db.projects.set(id, updated);
    return updated;
  }

  deleteProject(id: string): boolean {
    // Also delete associated tasks and comments
    const tasks = this.getTasksByProject(id);
    tasks.forEach(task => {
      this.deleteTask(task.id);
    });
    return this.db.projects.delete(id);
  }

  // Task operations
  createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const now = new Date();
    const newTask: Task = {
      ...task,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.db.tasks.set(id, newTask);
    return newTask;
  }

  getTask(id: string): Task | undefined {
    return this.db.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.db.tasks.values());
  }

  getTasksByProject(projectId: string): Task[] {
    return Array.from(this.db.tasks.values()).filter(t => t.projectId === projectId);
  }

  getTasksByAssignee(assigneeId: string): Task[] {
    return Array.from(this.db.tasks.values()).filter(t => t.assigneeId === assigneeId);
  }

  getTasksByStatus(status: Task['status']): Task[] {
    return Array.from(this.db.tasks.values()).filter(t => t.status === status);
  }

  getTasksByTag(tagId: string): Task[] {
    return Array.from(this.db.tasks.values()).filter(t => t.tags.includes(tagId));
  }

  updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Task | null {
    const task = this.db.tasks.get(id);
    if (!task) return null;

    const updated: Task = {
      ...task,
      ...updates,
      updatedAt: new Date(),
    };
    this.db.tasks.set(id, updated);
    return updated;
  }

  deleteTask(id: string): boolean {
    // Also delete associated comments
    const comments = this.getCommentsByTask(id);
    comments.forEach(comment => {
      this.db.comments.delete(comment.id);
    });
    return this.db.tasks.delete(id);
  }

  // Tag operations
  createTag(tag: Omit<Tag, 'id' | 'createdAt'>): Tag {
    const id = `tag-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const now = new Date();
    const newTag: Tag = {
      ...tag,
      id,
      createdAt: now,
    };
    this.db.tags.set(id, newTag);
    return newTag;
  }

  getTag(id: string): Tag | undefined {
    return this.db.tags.get(id);
  }

  getAllTags(): Tag[] {
    return Array.from(this.db.tags.values());
  }

  updateTag(id: string, updates: Partial<Omit<Tag, 'id' | 'createdAt'>>): Tag | null {
    const tag = this.db.tags.get(id);
    if (!tag) return null;

    const updated: Tag = {
      ...tag,
      ...updates,
    };
    this.db.tags.set(id, updated);
    return updated;
  }

  deleteTag(id: string): boolean {
    // Remove tag from all tasks
    const tasks = this.getTasksByTag(id);
    tasks.forEach(task => {
      const updatedTags = task.tags.filter(tagId => tagId !== id);
      this.updateTask(task.id, { tags: updatedTags });
    });
    return this.db.tags.delete(id);
  }

  // Comment operations
  createComment(comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Comment {
    const id = `comment-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const now = new Date();
    const newComment: Comment = {
      ...comment,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.db.comments.set(id, newComment);
    return newComment;
  }

  getComment(id: string): Comment | undefined {
    return this.db.comments.get(id);
  }

  getCommentsByTask(taskId: string): Comment[] {
    return Array.from(this.db.comments.values())
      .filter(c => c.taskId === taskId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  getCommentsByUser(userId: string): Comment[] {
    return Array.from(this.db.comments.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  updateComment(id: string, updates: Partial<Omit<Comment, 'id' | 'createdAt'>>): Comment | null {
    const comment = this.db.comments.get(id);
    if (!comment) return null;

    const updated: Comment = {
      ...comment,
      ...updates,
      updatedAt: new Date(),
    };
    this.db.comments.set(id, updated);
    return updated;
  }

  deleteComment(id: string): boolean {
    return this.db.comments.delete(id);
  }

  // Analytics and queries
  getTaskStatistics(): {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    overdue: number;
  } {
    const tasks = this.getAllTasks();
    const now = new Date();

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    let overdue = 0;

    tasks.forEach(task => {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;

      if (task.dueDate && task.dueDate < now && task.status !== 'done') {
        overdue++;
      }
    });

    return {
      total: tasks.length,
      byStatus,
      byPriority,
      overdue,
    };
  }

  getProjectStatistics(projectId: string): {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    teamMembers: string[];
  } {
    const tasks = this.getTasksByProject(projectId);
    const assigneeIds = new Set<string>();

    tasks.forEach(task => {
      if (task.assigneeId) {
        assigneeIds.add(task.assigneeId);
      }
    });

    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'done').length,
      inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
      teamMembers: Array.from(assigneeIds),
    };
  }

  searchTasks(query: string): Task[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTasks().filter(
      task =>
        task.title.toLowerCase().includes(lowerQuery) ||
        task.description.toLowerCase().includes(lowerQuery)
    );
  }
}

// Singleton instance
export const db = new InMemoryDatabase();
