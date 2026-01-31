/**
 * Project Service - CRUD operations for user projects
 * Handles saving and loading code projects from Supabase
 */

import { supabase } from '@/lib/supabase';
import type { Project, ProjectCreate, ProjectUpdate } from '@/types';

// ============ CREATE ============

/**
 * Create a new project
 */
export async function createProject(
  userId: string,
  project: ProjectCreate
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert([{
      user_id: userId,
      name: project.name,
      description: project.description || null,
      code: project.code,
      language: project.language,
      robot_model_id: project.robot_model_id || null,
      is_public: project.is_public ?? false,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    throw new Error(`Failed to create project: ${error.message}`);
  }

  return data;
}

// ============ READ ============

/**
 * Get all projects for a user
 */
export async function getUserProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching user projects:', error);
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Error fetching project:', error);
    throw new Error(`Failed to fetch project: ${error.message}`);
  }

  return data;
}

/**
 * Get public projects (for community/sharing features)
 */
export async function getPublicProjects(limit: number = 20): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching public projects:', error);
    throw new Error(`Failed to fetch public projects: ${error.message}`);
  }

  return data || [];
}

/**
 * Search projects by name
 */
export async function searchProjects(
  userId: string,
  query: string
): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', `%${query}%`)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error searching projects:', error);
    throw new Error(`Failed to search projects: ${error.message}`);
  }

  return data || [];
}

// ============ UPDATE ============

/**
 * Update an existing project
 */
export async function updateProject(
  projectId: string,
  userId: string,
  updates: ProjectUpdate
): Promise<Project> {
  // Build update object, only including defined fields
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.code !== undefined) updateData.code = updates.code;
  if (updates.robot_model_id !== undefined) updateData.robot_model_id = updates.robot_model_id;
  if (updates.is_public !== undefined) updateData.is_public = updates.is_public;

  const { data, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', projectId)
    .eq('user_id', userId) // Ensure user owns the project
    .select()
    .single();

  if (error) {
    console.error('Error updating project:', error);
    throw new Error(`Failed to update project: ${error.message}`);
  }

  return data;
}

/**
 * Save project code (quick save)
 */
export async function saveProjectCode(
  projectId: string,
  userId: string,
  code: string
): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({
      code,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error saving project code:', error);
    throw new Error(`Failed to save code: ${error.message}`);
  }
}

// ============ DELETE ============

/**
 * Delete a project
 */
export async function deleteProject(
  projectId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting project:', error);
    throw new Error(`Failed to delete project: ${error.message}`);
  }
}

// ============ DUPLICATE ============

/**
 * Duplicate a project (fork)
 */
export async function duplicateProject(
  projectId: string,
  userId: string,
  newName?: string
): Promise<Project> {
  // Get original project
  const original = await getProject(projectId);

  if (!original) {
    throw new Error('Project not found');
  }

  // Check if user can access (owner or public)
  if (original.user_id !== userId && !original.is_public) {
    throw new Error('Access denied');
  }

  // Create copy
  return createProject(userId, {
    name: newName || `${original.name} (Copy)`,
    description: original.description,
    code: original.code,
    language: original.language,
    robot_model_id: original.robot_model_id,
    is_public: false, // Copies are private by default
  });
}

// ============ EXPORT / IMPORT ============

/**
 * Export project as JSON (for local backup)
 */
export function exportProject(project: Project): string {
  const exportData = {
    name: project.name,
    description: project.description,
    code: project.code,
    language: project.language,
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import project from JSON
 */
export function parseImportedProject(jsonString: string): ProjectCreate {
  try {
    const data = JSON.parse(jsonString);

    if (!data.name || !data.code || !data.language) {
      throw new Error('Invalid project format');
    }

    return {
      name: data.name,
      description: data.description,
      code: data.code,
      language: data.language,
      is_public: false,
    };
  } catch (e) {
    throw new Error('Failed to parse project file');
  }
}

// ============ AUTO-SAVE ============

/**
 * Debounced auto-save function factory
 * Returns a function that will save after delay, canceling previous calls
 */
export function createAutoSave(delayMs: number = 2000) {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastSavedCode: string = '';

  return async function autoSave(
    projectId: string,
    userId: string,
    code: string
  ): Promise<boolean> {
    // Don't save if code hasn't changed
    if (code === lastSavedCode) {
      return false;
    }

    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    return new Promise((resolve) => {
      timeoutId = setTimeout(async () => {
        try {
          await saveProjectCode(projectId, userId, code);
          lastSavedCode = code;
          console.log('Auto-saved project');
          resolve(true);
        } catch (error) {
          console.error('Auto-save failed:', error);
          resolve(false);
        }
      }, delayMs);
    });
  };
}
