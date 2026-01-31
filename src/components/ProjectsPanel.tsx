import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  Plus,
  Search,
  Trash2,
  Copy,
  Download,
  Upload,
  MoreVertical,
  Save,
  Clock,
  X,
  Loader2,
  FileCode
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserProjects,
  createProject,
  deleteProject,
  duplicateProject,
  exportProject,
  parseImportedProject
} from '@/services/projectService';
import type { Project, ProjectCreate } from '@/types';
import toast from 'react-hot-toast';

interface ProjectsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentCode: string;
  onLoadProject: (project: Project) => void;
  onNewProject: () => void;
}

export function ProjectsPanel({
  isOpen,
  onClose,
  currentCode,
  onLoadProject,
  onNewProject
}: ProjectsPanelProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const data = await getUserProjects(user.id);
      setProjects(data);
    } catch (error: any) {
      toast.error('Failed to load projects');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchProjects();
    }
  }, [isOpen, user, fetchProjects]);

  // Filter projects by search
  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle delete
  const handleDelete = async (project: Project) => {
    if (!user) return;

    const confirmed = window.confirm(`Delete "${project.name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteProject(project.id, user.id);
      setProjects(prev => prev.filter(p => p.id !== project.id));
      toast.success('Project deleted');
    } catch (error: any) {
      toast.error('Failed to delete project');
    }
    setActiveMenu(null);
  };

  // Handle duplicate
  const handleDuplicate = async (project: Project) => {
    if (!user) return;

    try {
      const newProject = await duplicateProject(project.id, user.id);
      setProjects(prev => [newProject, ...prev]);
      toast.success('Project duplicated');
    } catch (error: any) {
      toast.error('Failed to duplicate project');
    }
    setActiveMenu(null);
  };

  // Handle export
  const handleExport = (project: Project) => {
    const json = exportProject(project);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}.legomaster.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Project exported');
    setActiveMenu(null);
  };

  // Handle import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    try {
      const text = await file.text();
      const projectData = parseImportedProject(text);
      const newProject = await createProject(user.id, projectData);
      setProjects(prev => [newProject, ...prev]);
      toast.success('Project imported');
    } catch (error: any) {
      toast.error(error.message || 'Failed to import project');
    }

    // Reset input
    e.target.value = '';
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <FolderOpen className="text-lego-yellow" size={24} />
            <h2 className="text-xl font-bold text-white">My Projects</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-700">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-lego-yellow"
            />
          </div>

          {/* New Project */}
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-lego-yellow text-black font-semibold rounded-lg hover:bg-yellow-500 transition"
          >
            <Plus size={18} />
            New
          </button>

          {/* Import */}
          <label className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 cursor-pointer transition">
            <Upload size={18} />
            Import
            <input
              type="file"
              accept=".json,.legomaster.json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <FileCode className="mx-auto text-gray-600 mb-4" size={48} />
              <p className="text-gray-400">
                {searchQuery ? 'No projects found' : 'No projects yet'}
              </p>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="mt-4 text-lego-yellow hover:underline"
              >
                Create your first project
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProjects.map(project => (
                <div
                  key={project.id}
                  className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition group"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => {
                        onLoadProject(project);
                        onClose();
                      }}
                    >
                      <h3 className="font-semibold text-white group-hover:text-lego-yellow transition">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(project.updated_at)}
                        </span>
                        <span className="uppercase">{project.language}</span>
                        {project.is_public && (
                          <span className="bg-green-600/20 text-green-400 px-2 py-0.5 rounded">
                            Public
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions menu */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === project.id ? null : project.id)}
                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-600 transition"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {activeMenu === project.id && (
                        <div className="absolute right-0 top-full mt-1 bg-gray-900 rounded-lg shadow-xl border border-gray-700 py-1 z-10 w-40">
                          <button
                            onClick={() => handleDuplicate(project)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition"
                          >
                            <Copy size={16} />
                            Duplicate
                          </button>
                          <button
                            onClick={() => handleExport(project)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition"
                          >
                            <Download size={16} />
                            Export
                          </button>
                          <hr className="border-gray-700 my-1" />
                          <button
                            onClick={() => handleDelete(project)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Project Modal */}
        {showNewProjectModal && (
          <NewProjectModal
            currentCode={currentCode}
            onClose={() => setShowNewProjectModal(false)}
            onCreated={(project) => {
              setProjects(prev => [project, ...prev]);
              setShowNewProjectModal(false);
              onLoadProject(project);
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}

// New Project Modal
interface NewProjectModalProps {
  currentCode: string;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

function NewProjectModal({ currentCode, onClose, onCreated }: NewProjectModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [useCurrentCode, setUseCurrentCode] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const projectData: ProjectCreate = {
        name: name.trim(),
        description: description.trim() || undefined,
        code: useCurrentCode ? currentCode : DEFAULT_CODE,
        language: 'python',
        is_public: false,
      };

      const project = await createProject(user.id, projectData);
      toast.success('Project created!');
      onCreated(project);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-white mb-4">New Project</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Project Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Robot Program"
              required
              maxLength={100}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-lego-yellow"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this program do?"
              maxLength={500}
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-lego-yellow resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useCurrentCode"
              checked={useCurrentCode}
              onChange={(e) => setUseCurrentCode(e.target.checked)}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-lego-yellow focus:ring-lego-yellow"
            />
            <label htmlFor="useCurrentCode" className="text-sm text-gray-300">
              Use current code from editor
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="flex-1 py-2 bg-lego-yellow text-black font-semibold rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const DEFAULT_CODE = `# Lego Master - New Project
# Write your robot code here

print_robot("Hello, Robot!")

# Example: Drive forward
# motor_run('A', 50)
# motor_run('B', 50)
# wait(2000)
# motor_stop('A')
# motor_stop('B')
`;
