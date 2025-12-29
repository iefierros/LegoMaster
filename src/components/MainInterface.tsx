import { useState, useRef, useCallback } from 'react';
import { Play, Square, Upload, Code, Settings } from 'lucide-react';
import { SimulationScene } from './SimulationScene';
import { CodeEditor } from './CodeEditor';
import { SensorPanel } from './SensorPanel';
import { RobotUploader } from './RobotUploader';
import type { RiggedRobotData, RobotInstance, SensorReading } from '@/types';
import { codeInterpreter } from '@/core/CodeInterpreter';
import toast from 'react-hot-toast';

export function MainInterface() {
  const [riggedRobot, setRiggedRobot] = useState<RiggedRobotData | null>(null);
  const [pythonCode, setPythonCode] = useState(DEFAULT_PYTHON_CODE);
  const [isRunning, setIsRunning] = useState(false);
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<string[]>([]);

  const robotInstanceRef = useRef<RobotInstance | null>(null);

  // Handle robot upload
  const handleRobotUploaded = useCallback((robot: RiggedRobotData) => {
    setRiggedRobot(robot);
    setShowUploader(false);
    toast.success(`Robot "${robot.name}" loaded successfully!`);
  }, []);

  // Handle robot ready (physics initialized)
  const handleRobotReady = useCallback((robot: RobotInstance) => {
    robotInstanceRef.current = robot;
    console.log('Robot ready:', robot);
  }, []);

  // Handle sensor updates
  const handleSensorUpdate = useCallback((readings: SensorReading[]) => {
    setSensorReadings(readings);
  }, []);

  // Run Python code
  const handleRunCode = async () => {
    if (!riggedRobot) {
      toast.error('Please upload a robot model first');
      return;
    }

    setIsRunning(true);
    setExecutionOutput([]);

    try {
      const result = await codeInterpreter.executePython(pythonCode);

      if (result.success) {
        toast.success(`Code executed in ${result.executionTime}ms`);
        setExecutionOutput(result.output);
      } else {
        toast.error('Execution failed');
        setExecutionOutput([...result.output, ...result.errors]);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      setExecutionOutput([error.toString()]);
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
            <button
              onClick={() => setShowUploader(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-lego-blue hover:bg-blue-700 rounded transition"
            >
              <Upload size={18} />
              <span>Upload Robot</span>
            </button>

            <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition">
              <Settings size={20} />
            </button>
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
              <span className="font-semibold">Python Code</span>
            </div>

            <div className="flex space-x-2">
              {!isRunning ? (
                <button
                  onClick={handleRunCode}
                  disabled={!riggedRobot}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition"
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
          <div className="bg-gray-950 border-t border-gray-700 p-4 h-32 overflow-y-auto">
            <div className="text-xs font-mono">
              <div className="text-gray-400 mb-2">Output:</div>
              {executionOutput.map((line, i) => (
                <div key={i} className="text-green-400">
                  {line}
                </div>
              ))}
            </div>
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
                <button
                  onClick={() => setShowUploader(true)}
                  className="px-6 py-3 bg-lego-yellow text-black font-semibold rounded hover:bg-yellow-500 transition"
                >
                  Upload Robot Model
                </button>
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
        />
      )}
    </div>
  );
}

const DEFAULT_PYTHON_CODE = `# Lego Master - FLL Robot Simulator
# Write your robot code here

# Example: Create motors
motor_a = Motor('A')
motor_b = Motor('B')

# Create drive base
drive = DriveBase('A', 'B')

# Create sensors
color_sensor = ColorSensor('1')
ultrasonic = UltrasonicSensor('2')

# Your code here:
print_robot("Starting robot program...")

# Drive forward
drive.drive_straight(50)
wait(2000)

# Stop
drive.stop()

print_robot("Program complete!")
`;
