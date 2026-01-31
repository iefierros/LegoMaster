import { useState } from 'react';
import {
  X, ChevronDown, ChevronRight, Check, AlertTriangle,
  XCircle, Cpu, Circle, Eye, Box, Settings2
} from 'lucide-react';
import type { RiggedRobotData, MotorJoint, SensorConfig } from '@/types';

interface RobotDiagnosticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  robot: RiggedRobotData | null;
}

interface DiagnosticStatus {
  status: 'ok' | 'warning' | 'error';
  message: string;
}

export function RobotDiagnosticsPanel({ isOpen, onClose, robot }: RobotDiagnosticsPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['overview', 'motors', 'sensors'])
  );

  if (!isOpen) return null;

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Diagnostic checks
  const getDiagnostics = (): DiagnosticStatus[] => {
    if (!robot) {
      return [{ status: 'error', message: 'No robot loaded' }];
    }

    const diagnostics: DiagnosticStatus[] = [];

    // Check parts
    if (robot.partCount === 0) {
      diagnostics.push({ status: 'error', message: 'No parts detected in robot' });
    } else if (robot.partCount < 5) {
      diagnostics.push({ status: 'warning', message: `Only ${robot.partCount} parts detected (very simple robot)` });
    } else {
      diagnostics.push({ status: 'ok', message: `${robot.partCount} parts loaded` });
    }

    // Check motors
    if (robot.motorJoints.length === 0) {
      diagnostics.push({ status: 'error', message: 'No motors detected - robot cannot move' });
    } else if (robot.motorJoints.length === 1) {
      diagnostics.push({ status: 'warning', message: 'Only 1 motor detected - limited movement' });
    } else {
      diagnostics.push({ status: 'ok', message: `${robot.motorJoints.length} motors configured` });
    }

    // Check wheels
    const totalWheels = robot.motorJoints.reduce((sum, m) => sum + m.wheelPartIds.length, 0);
    if (totalWheels === 0) {
      diagnostics.push({ status: 'warning', message: 'No wheels connected to motors' });
    } else if (totalWheels < 2) {
      diagnostics.push({ status: 'warning', message: 'Less than 2 wheels - unstable' });
    } else {
      diagnostics.push({ status: 'ok', message: `${totalWheels} wheels connected` });
    }

    // Check sensors
    if (robot.sensors.length === 0) {
      diagnostics.push({ status: 'warning', message: 'No sensors detected' });
    } else {
      diagnostics.push({ status: 'ok', message: `${robot.sensors.length} sensors configured` });
    }

    // Check mass
    if (robot.chassis.mass < 0.1) {
      diagnostics.push({ status: 'warning', message: 'Robot mass very low - may behave unrealistically' });
    } else if (robot.chassis.mass > 5) {
      diagnostics.push({ status: 'warning', message: 'Robot mass over 5kg - exceeds FLL limit' });
    } else {
      diagnostics.push({ status: 'ok', message: `Mass: ${(robot.chassis.mass * 1000).toFixed(0)}g` });
    }

    return diagnostics;
  };

  const StatusIcon = ({ status }: { status: 'ok' | 'warning' | 'error' }) => {
    switch (status) {
      case 'ok':
        return <Check className="text-green-500" size={16} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={16} />;
      case 'error':
        return <XCircle className="text-red-500" size={16} />;
    }
  };

  const SectionHeader = ({ id, title, icon: Icon, count }: { id: string; title: string; icon: any; count?: number }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-650 rounded-lg transition"
    >
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-lego-yellow" />
        <span className="font-semibold">{title}</span>
        {count !== undefined && (
          <span className="text-xs bg-gray-600 px-2 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {expandedSections.has(id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
    </button>
  );

  const diagnostics = getDiagnostics();
  const overallStatus = diagnostics.some(d => d.status === 'error')
    ? 'error'
    : diagnostics.some(d => d.status === 'warning')
      ? 'warning'
      : 'ok';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Settings2 className="text-lego-yellow" size={24} />
            <div>
              <h2 className="text-xl font-bold">Robot Diagnostics</h2>
              {robot && (
                <p className="text-sm text-gray-400">{robot.name}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)] space-y-4">
          {!robot ? (
            <div className="text-center py-8">
              <Box className="mx-auto text-gray-500 mb-4" size={48} />
              <p className="text-gray-400">No robot loaded</p>
              <p className="text-sm text-gray-500 mt-2">
                Upload a robot file or click "Test Robot" to load one
              </p>
            </div>
          ) : (
            <>
              {/* Overall Status */}
              <div className={`p-4 rounded-lg ${
                overallStatus === 'ok' ? 'bg-green-900/30 border border-green-700' :
                overallStatus === 'warning' ? 'bg-yellow-900/30 border border-yellow-700' :
                'bg-red-900/30 border border-red-700'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <StatusIcon status={overallStatus} />
                  <span className="font-semibold">
                    {overallStatus === 'ok' ? 'Robot Ready' :
                     overallStatus === 'warning' ? 'Robot Loaded (with warnings)' :
                     'Robot Has Issues'}
                  </span>
                </div>
                <ul className="space-y-1 text-sm">
                  {diagnostics.map((d, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <StatusIcon status={d.status} />
                      <span className={
                        d.status === 'ok' ? 'text-green-400' :
                        d.status === 'warning' ? 'text-yellow-400' :
                        'text-red-400'
                      }>{d.message}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Overview Section */}
              <div>
                <SectionHeader id="overview" title="Overview" icon={Box} />
                {expandedSections.has('overview') && (
                  <div className="mt-2 p-3 bg-gray-750 rounded-lg space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-700 p-2 rounded">
                        <div className="text-gray-400 text-xs">Robot ID</div>
                        <div className="font-mono text-xs truncate">{robot.id}</div>
                      </div>
                      <div className="bg-gray-700 p-2 rounded">
                        <div className="text-gray-400 text-xs">Parts</div>
                        <div className="font-semibold">{robot.partCount}</div>
                      </div>
                      <div className="bg-gray-700 p-2 rounded">
                        <div className="text-gray-400 text-xs">Mass</div>
                        <div className="font-semibold">{(robot.chassis.mass * 1000).toFixed(0)}g</div>
                      </div>
                      <div className="bg-gray-700 p-2 rounded">
                        <div className="text-gray-400 text-xs">Collision Shape</div>
                        <div className="font-semibold">{robot.chassis.collisionShape.type}</div>
                      </div>
                    </div>
                    <div className="bg-gray-700 p-2 rounded">
                      <div className="text-gray-400 text-xs">Center of Mass</div>
                      <div className="font-mono text-xs">
                        X: {robot.chassis.centerOfMass.x.toFixed(3)}m,
                        Y: {robot.chassis.centerOfMass.y.toFixed(3)}m,
                        Z: {robot.chassis.centerOfMass.z.toFixed(3)}m
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Motors Section */}
              <div>
                <SectionHeader id="motors" title="Motors" icon={Cpu} count={robot.motorJoints.length} />
                {expandedSections.has('motors') && (
                  <div className="mt-2 space-y-2">
                    {robot.motorJoints.length === 0 ? (
                      <div className="p-3 bg-gray-750 rounded-lg text-center text-gray-400">
                        No motors detected
                      </div>
                    ) : (
                      robot.motorJoints.map((motor: MotorJoint, i: number) => (
                        <div key={i} className="p-3 bg-gray-750 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-lego-blue rounded-lg flex items-center justify-center font-bold">
                                {motor.port}
                              </div>
                              <div>
                                <div className="font-semibold">Motor Port {motor.port}</div>
                                <div className="text-xs text-gray-400">Part: {motor.motorPartId}</div>
                              </div>
                            </div>
                            <div className="text-right text-xs">
                              <div className="text-gray-400">Gear Ratio</div>
                              <div>{motor.gearRatio}:1</div>
                            </div>
                          </div>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Axle Position:</span>
                              <span className="font-mono">
                                ({motor.axlePosition.x.toFixed(2)}, {motor.axlePosition.y.toFixed(2)}, {motor.axlePosition.z.toFixed(2)})
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Connected Wheels:</span>
                              <span>{motor.wheelPartIds.length}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Sensors Section */}
              <div>
                <SectionHeader id="sensors" title="Sensors" icon={Eye} count={robot.sensors.length} />
                {expandedSections.has('sensors') && (
                  <div className="mt-2 space-y-2">
                    {robot.sensors.length === 0 ? (
                      <div className="p-3 bg-gray-750 rounded-lg text-center text-gray-400">
                        No sensors detected
                      </div>
                    ) : (
                      robot.sensors.map((sensor: SensorConfig, i: number) => (
                        <div key={i} className="p-3 bg-gray-750 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                                sensor.type === 'color' ? 'bg-purple-600' :
                                sensor.type === 'ultrasonic' ? 'bg-cyan-600' :
                                sensor.type === 'gyro' ? 'bg-orange-600' :
                                'bg-gray-600'
                              }`}>
                                {sensor.port}
                              </div>
                              <div>
                                <div className="font-semibold capitalize">{sensor.type} Sensor</div>
                                <div className="text-xs text-gray-400">Port {sensor.port}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Circle size={8} className="text-green-500 fill-green-500" />
                              <span className="text-xs text-green-400">Ready</span>
                            </div>
                          </div>
                          <div className="mt-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Position:</span>
                              <span className="font-mono">
                                ({sensor.position.x.toFixed(2)}, {sensor.position.y.toFixed(2)}, {sensor.position.z.toFixed(2)})
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Direction:</span>
                              <span className="font-mono">
                                ({sensor.direction.x.toFixed(1)}, {sensor.direction.y.toFixed(1)}, {sensor.direction.z.toFixed(1)})
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Visual Mesh Info */}
              <div>
                <SectionHeader id="visual" title="Visual Mesh" icon={Box} />
                {expandedSections.has('visual') && (
                  <div className="mt-2 p-3 bg-gray-750 rounded-lg text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-700 p-2 rounded">
                        <div className="text-gray-400 text-xs">Children</div>
                        <div className="font-semibold">{robot.visualMesh.children.length}</div>
                      </div>
                      <div className="bg-gray-700 p-2 rounded">
                        <div className="text-gray-400 text-xs">Type</div>
                        <div className="font-semibold">{robot.visualMesh.type}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
