import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './database.js';

describe('InMemoryDatabase', () => {
  beforeEach(() => {
    // Reset database by creating a new instance
    // Note: In a real scenario, you'd want a reset method
    // For now, we'll work with the existing data
  });

  describe('User operations', () => {
    it('should create a user', () => {
      const user = db.createUser({
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      });

      expect(user.id).toBeDefined();
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('user');
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should get a user by ID', () => {
      const user = db.createUser({
        name: 'Get Test',
        email: 'get@example.com',
        role: 'user',
      });

      const retrieved = db.getUser(user.id);
      expect(retrieved).toEqual(user);
    });

    it('should return undefined for non-existent user', () => {
      const user = db.getUser('non-existent');
      expect(user).toBeUndefined();
    });

    it('should list all users', () => {
      const users = db.getAllUsers();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
    });

    it('should update a user', () => {
      const user = db.createUser({
        name: 'Update Test',
        email: 'update@example.com',
        role: 'user',
      });

      const updated = db.updateUser(user.id, { name: 'Updated Name', role: 'admin' });
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.role).toBe('admin');
      expect(updated?.email).toBe('update@example.com');
    });

    it('should delete a user', () => {
      const user = db.createUser({
        name: 'Delete Test',
        email: 'delete@example.com',
        role: 'user',
      });

      const deleted = db.deleteUser(user.id);
      expect(deleted).toBe(true);

      const retrieved = db.getUser(user.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Project operations', () => {
    it('should create a project', () => {
      const user = db.getAllUsers()[0];
      const project = db.createProject({
        name: 'Test Project',
        description: 'Test Description',
        ownerId: user.id,
        status: 'active',
      });

      expect(project.id).toBeDefined();
      expect(project.name).toBe('Test Project');
      expect(project.ownerId).toBe(user.id);
    });

    it('should get projects by owner', () => {
      const user = db.getAllUsers()[0];
      const project = db.createProject({
        name: 'Owner Project',
        description: 'Test',
        ownerId: user.id,
        status: 'active',
      });

      const ownerProjects = db.getProjectsByOwner(user.id);
      expect(ownerProjects.some(p => p.id === project.id)).toBe(true);
    });
  });

  describe('Task operations', () => {
    it('should create a task', () => {
      const project = db.getAllProjects()[0];
      const task = db.createTask({
        title: 'Test Task',
        description: 'Test Description',
        projectId: project.id,
        assigneeId: null,
        status: 'todo',
        priority: 'medium',
        dueDate: null,
        tags: [],
      });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.projectId).toBe(project.id);
    });

    it('should get tasks by project', () => {
      const project = db.getAllProjects()[0];
      const task = db.createTask({
        title: 'Project Task',
        description: 'Test',
        projectId: project.id,
        assigneeId: null,
        status: 'todo',
        priority: 'low',
        dueDate: null,
        tags: [],
      });

      const projectTasks = db.getTasksByProject(project.id);
      expect(projectTasks.some(t => t.id === task.id)).toBe(true);
    });

    it('should get tasks by status', () => {
      const project = db.getAllProjects()[0];
      const task = db.createTask({
        title: 'Status Task',
        description: 'Test',
        projectId: project.id,
        assigneeId: null,
        status: 'in-progress',
        priority: 'medium',
        dueDate: null,
        tags: [],
      });

      const inProgressTasks = db.getTasksByStatus('in-progress');
      expect(inProgressTasks.some(t => t.id === task.id)).toBe(true);
    });

    it('should update task status', () => {
      const project = db.getAllProjects()[0];
      const task = db.createTask({
        title: 'Update Task',
        description: 'Test',
        projectId: project.id,
        assigneeId: null,
        status: 'todo',
        priority: 'medium',
        dueDate: null,
        tags: [],
      });

      const updated = db.updateTask(task.id, { status: 'done' });
      expect(updated?.status).toBe('done');
    });

    it('should search tasks', () => {
      const project = db.getAllProjects()[0];
      const task = db.createTask({
        title: 'Searchable Task',
        description: 'This is a searchable description',
        projectId: project.id,
        assigneeId: null,
        status: 'todo',
        priority: 'low',
        dueDate: null,
        tags: [],
      });

      const results = db.searchTasks('Searchable');
      expect(results.some(t => t.id === task.id)).toBe(true);
    });
  });

  describe('Tag operations', () => {
    it('should create a tag', () => {
      const tag = db.createTag({
        name: 'test-tag',
        color: '#ff0000',
      });

      expect(tag.id).toBeDefined();
      expect(tag.name).toBe('test-tag');
      expect(tag.color).toBe('#ff0000');
    });

    it('should get tasks by tag', () => {
      const tag = db.createTag({
        name: 'filter-tag',
        color: '#00ff00',
      });

      const project = db.getAllProjects()[0];
      const task = db.createTask({
        title: 'Tagged Task',
        description: 'Test',
        projectId: project.id,
        assigneeId: null,
        status: 'todo',
        priority: 'low',
        dueDate: null,
        tags: [tag.id],
      });

      const taggedTasks = db.getTasksByTag(tag.id);
      expect(taggedTasks.some(t => t.id === task.id)).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should get task statistics', () => {
      const stats = db.getTaskStatistics();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byStatus');
      expect(stats).toHaveProperty('byPriority');
      expect(stats).toHaveProperty('overdue');
      expect(typeof stats.total).toBe('number');
    });

    it('should get project statistics', () => {
      const project = db.getAllProjects()[0];
      const stats = db.getProjectStatistics(project.id);
      expect(stats).toHaveProperty('totalTasks');
      expect(stats).toHaveProperty('completedTasks');
      expect(stats).toHaveProperty('inProgressTasks');
      expect(stats).toHaveProperty('teamMembers');
    });
  });
});
