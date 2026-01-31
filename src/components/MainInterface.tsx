import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Square, Upload, Code, Settings, Cpu, Save, FolderOpen, LogIn, Settings2, Sparkles } from 'lucide-react';
import { SimulationScene } from './SimulationScene';
import { CodeEditor } from './CodeEditor';
import { SensorPanel } from './SensorPanel';
import { RobotUploader } from './RobotUploader';
import { AuthModal } from './AuthModal';
import { ProjectsPanel } from './ProjectsPanel';
import { UserMenu } from './UserMenu';
import { RobotDiagnosticsPanel } from './RobotDiagnosticsPanel';
import { useAuth } from '@/contexts/AuthContext';
import { saveProjectCode, createAutoSave } from '@/services/projectService';
import type { RiggedRobotData, RobotInstance, SensorReading, Project, RenderMode, LDrawLoadProgress } from '@/types';
import { codeInterpreter } from '@/core/CodeInterpreter';
import { rigBuilder } from '@/core/RigBuilder';
import { TestRobotGenerator } from '@/utils/TestRobotGenerator';
import toast from 'react-hot-toast';

// Create auto-save instance
const autoSave = createAutoSave(3000);

export function MainInterface() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // UI State
  const [riggedRobot, setRiggedRobot] = useState<RiggedRobotData | null>(null);
  const [pythonCode, setPythonCode] = useState(DEFAULT_PYTHON_CODE);
  const [isRunning, setIsRunning] = useState(false);
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<string[]>([]);
  const [isRobotReady, setIsRobotReady] = useState(false);

  // Auth & Projects State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProjectsPanel, setShowProjectsPanel] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Render mode state
  const [renderMode, setRenderMode] = useState<RenderMode>('simple');
  const [isLoadingDetailed, setIsLoadingDetailed] = useState(false);
  const [loadProgress, setLoadProgress] = useState<LDrawLoadProgress | null>(null);

  const robotInstanceRef = useRef<RobotInstance | null>(null);

  // Auto-save when code changes (only if project is loaded)
  useEffect(() => {
    if (currentProject && user && pythonCode !== currentProject.code) {
      setHasUnsavedChanges(true);
      autoSave(currentProject.id, user.id, pythonCode);
    }
  }, [pythonCode, currentProject, user]);

  // Handle loading a project
  const handleLoadProject = useCallback((project: Project) => {
    setCurrentProject(project);
    setPythonCode(project.code);
    setHasUnsavedChanges(false);
    toast.success(`Loaded "${project.name}"`);
  }, []);

  // Handle manual save
  const handleSaveProject = async () => {
    if (!currentProject || !user) {
      toast.error('No project to save');
      return;
    }

    setIsSaving(true);
    try {
      await saveProjectCode(currentProject.id, user.id, pythonCode);
      setCurrentProject({ ...currentProject, code: pythonCode });
      setHasUnsavedChanges(false);
      toast.success('Project saved!');
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle new project (reset to default)
  const handleNewProject = () => {
    setCurrentProject(null);
    setPythonCode(DEFAULT_PYTHON_CODE);
    setHasUnsavedChanges(false);
  };

  // Handle robot upload
  const handleRobotUploaded = useCallback((robot: RiggedRobotData) => {
    setRiggedRobot(robot);
    setShowUploader(false);
    setIsRobotReady(false); // Reset ready state
    setLoadProgress(null); // Clear loading progress overlay
    toast.success(`Robot "${robot.name}" loaded successfully!`);
  }, []);

  // Handle test robot generation
  const handleLoadTestRobot = async () => {
    try {
      console.log('🧪 Generating test robot...');
      toast('Generating test robot...', { icon: '🧪' });

      const testModel = TestRobotGenerator.generateMinimalRobot();
      console.log('✅ Test model generated:', testModel);

      const riggedRobot = await rigBuilder.rigRobot(
        testModel.parts,
        testModel.metadata.name || 'Test Robot',
        {
          renderMode,
          onProgress: setLoadProgress
        }
      );
      console.log('✅ Test robot rigged:', riggedRobot);

      setRiggedRobot(riggedRobot);
      setIsRobotReady(false); // Reset ready state
      setLoadProgress(null);
      toast.success('Test robot loaded! Initializing physics...');
    } catch (error: any) {
      console.error('❌ Failed to load test robot:', error);
      toast.error(`Failed to load test robot: ${error.message}`);
      setLoadProgress(null);
    }
  };

  // Handle render mode toggle
  const handleToggleRenderMode = async () => {
    if (!riggedRobot) {
      // Just toggle the mode for future loads
      const newMode = renderMode === 'simple' ? 'detailed' : 'simple';
      setRenderMode(newMode);
      toast.success(`Render mode: ${newMode === 'detailed' ? 'High Quality' : 'Simple'}`);
      return;
    }

    // Re-rig the robot with the new render mode
    const newMode = renderMode === 'simple' ? 'detailed' : 'simple';

    if (newMode === 'detailed') {
      setIsLoadingDetailed(true);
      toast('Loading high quality model...', { icon: '✨' });
    }

    try {
      // We need to re-rig from the original parts
      // For now, we'll just notify the user they need to reload
      setRenderMode(newMode);

      if (newMode === 'detailed') {
        toast.success('High Quality mode enabled. Reload robot to apply.', { icon: '✨' });
      } else {
        toast.success('Simple mode enabled. Reload robot to apply.');
      }
    } catch (error: any) {
      console.error('❌ Failed to change render mode:', error);
      toast.error(`Failed to change render mode: ${error.message}`);
    } finally {
      setIsLoadingDetailed(false);
    }
  };

  // Handle robot ready (physics initialized)
  const handleRobotReady = useCallback((robot: RobotInstance) => {
    robotInstanceRef.current = robot;
    setIsRobotReady(true);
    console.log('✅ Robot ready for code execution:', robot);
    toast.success('Robot ready! You can now run code.', { icon: '🤖' });
  }, []);

  // Handle sensor updates
  const handleSensorUpdate = useCallback((readings: SensorReading[]) => {
    setSensorReadings(readings);
  }, []);

  // Run Python code
  const handleRunCode = async () => {
    if (!riggedRobot) {
      toast.error('Please upload a robot model first');
      setExecutionOutput(['❌ Error: No robot loaded. Please upload a robot model first.']);
      return;
    }

    if (!robotInstanceRef.current) {
      toast.error('Robot not ready. Please wait 3-5 seconds...');
      setExecutionOutput([
        '❌ Error: Robot physics not initialized yet.',
        '',
        '💡 Tip: Wait 3-5 seconds after loading a robot before running code.',
        '📊 Check console (F12) for initialization logs.',
        '✅ Look for: "Motors initialized: 2"'
      ]);
      return;
    }

    setIsRunning(true);
    setExecutionOutput(['⏳ Running code...']);

    try {
      console.log('🚀 Starting code execution...');
      const result = await codeInterpreter.executePython(pythonCode);

      if (result.success) {
        toast.success(`Code executed in ${result.executionTime}ms`);
        setExecutionOutput(result.output.length > 0 ? result.output : ['✅ Code executed successfully (no output)']);
      } else {
        toast.error('Execution failed - check console');
        setExecutionOutput(['❌ Execution failed:', '', ...result.errors, '', '--- Output ---', ...result.output]);
      }
    } catch (error: any) {
      console.error('Code execution error:', error);
      toast.error(`Error: ${error.message}`);
      setExecutionOutput(['❌ Fatal error:', error.toString()]);
    } finally {
      setIsRunning(false);
    }
  };

  // Stop execution
  const handleStopCode = () => {
    codeInterpreter.stop();
    setIsRunning(false);

    // Stop all motors
    if (robotInstanceRef.current) {
      robotInstanceRef.current.motorControllers.forEach(motor => {
        motor.stop();
      });
    }

    toast('Execution stopped', { icon: '⏹️' });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-lego-black border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-lego-yellow rounded"></div>
              <h1 className="text-2xl font-bold">Lego Master</h1>
            </div>
            <span className="text-gray-400 text-sm">FLL Simulator</span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Projects button (only if authenticated) */}
            {isAuthenticated && (
              <button
                onClick={() => setShowProjectsPanel(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
                title="My Projects"
              >
                <FolderOpen size={18} />
                <span className="hidden md:inline">Projects</span>
              </button>
            )}

            {/* Save button (only if project loaded) */}
            {currentProject && isAuthenticated && (
              <button
                onClick={handleSaveProject}
                disabled={isSaving || !hasUnsavedChanges}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition"
                title={hasUnsavedChanges ? 'Save changes (Ctrl+S)' : 'No unsaved changes'}
              >
                <Save size={18} className={hasUnsavedChanges ? 'text-yellow-400' : ''} />
                <span className="hidden md:inline">{isSaving ? 'Saving...' : 'Save'}</span>
              </button>
            )}

            <button
              onClick={handleLoadTestRobot}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition"
              title="Load a minimal test robot for development"
            >
              <Cpu size={18} />
              <span className="hidden md:inline">Test Robot</span>
            </button>

            <button
              onClick={() => setShowUploader(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-lego-blue hover:bg-blue-700 rounded transition"
            >
              <Upload size={18} />
              <span className="hidden md:inline">Upload Robot</span>
            </button>

            {/* Diagnostics button (visible when robot loaded) */}
            {riggedRobot && (
              <button
                onClick={() => setShowDiagnostics(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
                title="Robot Diagnostics"
              >
                <Settings2 size={18} />
                <span className="hidden md:inline">Diagnostics</span>
              </button>
            )}

            {/* High Quality Render Toggle */}
            <button
              onClick={handleToggleRenderMode}
              disabled={isLoadingDetailed}
              className={`flex items-center space-x-2 px-4 py-2 rounded transition ${renderMode === 'detailed'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-gray-700 hover:bg-gray-600'
                } ${isLoadingDetailed ? 'opacity-50 cursor-wait' : ''}`}
              title={renderMode === 'detailed' ? 'High Quality mode (slower loading)' : 'Simple mode (fast loading)'}
            >
              <Sparkles size={18} className={renderMode === 'detailed' ? 'text-yellow-200' : ''} />
              <span className="hidden md:inline">
                {isLoadingDetailed ? 'Loading...' : renderMode === 'detailed' ? 'HQ' : 'Simple'}
              </span>
            </button>

            <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition">
              <Settings size={20} />
            </button>

            {/* Auth: User menu or Login button */}
            {isAuthenticated ? (
              <UserMenu onOpenProjects={() => setShowProjectsPanel(true)} />
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-lego-yellow text-black font-semibold rounded hover:bg-yellow-500 transition"
              >
                <LogIn size={18} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Code Editor */}
        <div className="w-1/3 border-r border-gray-700 flex flex-col">
          <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Code size={18} />
              <span className="font-semibold">
                {currentProject ? currentProject.name : 'Python Code'}
              </span>
              {hasUnsavedChanges && (
                <span className="text-yellow-400 text-xs">*</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Robot status indicator */}
              {riggedRobot && (
                <div className="flex items-center space-x-1 text-xs">
                  <div className={`w-2 h-2 rounded-full ${isRobotReady ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                  <span className="text-gray-400">
                    {isRobotReady ? 'Ready' : 'Initializing...'}
                  </span>
                </div>
              )}

              {!isRunning ? (
                <button
                  onClick={handleRunCode}
                  disabled={!riggedRobot || !isRobotReady}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition"
                  title={!isRobotReady ? 'Wait for robot to initialize...' : 'Run Python code'}
                >
                  <Play size={16} />
                  <span>Run</span>
                </button>
              ) : (
                <button
                  onClick={handleStopCode}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
                >
                  <Square size={16} />
                  <span>Stop</span>
                </button>
              )}
            </div>
          </div>

          <CodeEditor
            value={pythonCode}
            onChange={setPythonCode}
            language="python"
          />

          {/* Output Console */}
          <div className="bg-gray-950 border-t border-gray-700 p-4 h-32 overflow-y-auto font-mono text-xs">
            <div className="text-gray-400 mb-2">Output:</div>
            {executionOutput.length === 0 ? (
              <div className="text-gray-600 italic">No output yet. Run your code to see results.</div>
            ) : (
              executionOutput.map((line, i) => {
                // Check if line is an error (contains common error keywords)
                const isError = line.includes('Error') || line.includes('Exception') ||
                  line.includes('Traceback') || line.includes('Line');
                return (
                  <div key={i} className={isError ? "text-red-400" : "text-green-400"}>
                    {line}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center Panel - 3D Simulation */}
        <div className="flex-1 relative">
          {riggedRobot ? (
            <SimulationScene
              riggedRobot={riggedRobot}
              onRobotReady={handleRobotReady}
              onSensorUpdate={handleSensorUpdate}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-800">
              <div className="text-center">
                <Upload size={64} className="mx-auto mb-4 text-gray-600" />
                <h2 className="text-xl font-semibold mb-2">No Robot Loaded</h2>
                <p className="text-gray-400 mb-4">
                  Upload a robot model from BrickLink Studio to begin
                </p>
                <div className="flex flex-col items-center space-y-3">
                  <button
                    onClick={() => setShowUploader(true)}
                    className="px-6 py-3 bg-lego-yellow text-black font-semibold rounded hover:bg-yellow-500 transition"
                  >
                    Upload Robot Model
                  </button>
                  {/* Render mode indicator */}
                  <div className="text-xs text-gray-500">
                    Mode: {renderMode === 'detailed' ? 'High Quality' : 'Simple'} render
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading overlay for detailed geometry */}
          {loadProgress && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center space-x-3 mb-4">
                  <Sparkles className="text-amber-400 animate-pulse" size={24} />
                  <h3 className="text-lg font-semibold">Loading High Quality Model</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>{loadProgress.message}</span>
                    <span>{loadProgress.loaded}/{loadProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(loadProgress.loaded / loadProgress.total) * 100}%` }}
                    />
                  </div>
                  {loadProgress.currentPart && (
                    <div className="text-xs text-gray-500 truncate">
                      Part: {loadProgress.currentPart}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Sensor Data & Info */}
        <div className="w-80 border-l border-gray-700 bg-gray-800 overflow-y-auto">
          <SensorPanel sensorReadings={sensorReadings} robot={riggedRobot} />
        </div>
      </div>

      {/* Robot Uploader Modal */}
      {showUploader && (
        <RobotUploader
          onRobotUploaded={handleRobotUploaded}
          onClose={() => setShowUploader(false)}
          renderMode={renderMode}
          onProgress={setLoadProgress}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Projects Panel */}
      <ProjectsPanel
        isOpen={showProjectsPanel}
        onClose={() => setShowProjectsPanel(false)}
        currentCode={pythonCode}
        onLoadProject={handleLoadProject}
        onNewProject={handleNewProject}
      />

      {/* Robot Diagnostics Panel */}
      <RobotDiagnosticsPanel
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        robot={riggedRobot}
      />
    </div>
  );
}

const DEFAULT_PYTHON_CODE = `# Lego Master - FLL Robot Simulator
# Write your robot code here

# Your code here:
print_robot("Starting robot program...")

# Drive forward
motor_run('A', 50)
motor_run('B', 50)
wait(2000)

# Stop
motor_stop('A')
motor_stop('B')

print_robot("Program complete!")
`;
