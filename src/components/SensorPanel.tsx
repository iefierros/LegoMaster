import { Activity, Eye, Gauge, Info } from 'lucide-react';
import type { SensorReading, RiggedRobotData, ColorSensorReading } from '@/types';

interface SensorPanelProps {
  sensorReadings: SensorReading[];
  robot: RiggedRobotData | null;
}

export function SensorPanel({ sensorReadings, robot }: SensorPanelProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Robot Info */}
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Info size={18} className="text-lego-yellow" />
          <h3 className="font-semibold">Robot Info</h3>
        </div>

        {robot ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Name:</span>
              <span className="font-medium">{robot.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Parts:</span>
              <span className="font-medium">{robot.partCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Mass:</span>
              <span className="font-medium">{robot.chassis.mass.toFixed(2)} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Motors:</span>
              <span className="font-medium">{robot.motorJoints.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Sensors:</span>
              <span className="font-medium">{robot.sensors.length}</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No robot loaded</p>
        )}
      </div>

      {/* Motor Status */}
      {robot && robot.motorJoints.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Gauge size={18} className="text-lego-blue" />
            <h3 className="font-semibold">Motors</h3>
          </div>

          <div className="space-y-3">
            {robot.motorJoints.map((motor, i) => (
              <div key={i} className="border-l-2 border-lego-blue pl-3">
                <div className="text-xs text-gray-400 mb-1">Port {motor.port}</div>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>Angle:</span>
                    <span className="font-mono">0°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Speed:</span>
                    <span className="font-mono">0 RPM</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sensor Readings */}
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Activity size={18} className="text-lego-red" />
          <h3 className="font-semibold">Sensors</h3>
        </div>

        {sensorReadings.length > 0 ? (
          <div className="space-y-3">
            {sensorReadings.map((reading, i) => (
              <SensorReading key={i} reading={reading} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No sensor data available</p>
        )}
      </div>

      {/* Legend */}
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Eye size={18} className="text-lego-yellow" />
          <h3 className="font-semibold">Controls</h3>
        </div>

        <div className="space-y-2 text-xs text-gray-400">
          <div>• <kbd className="bg-gray-800 px-2 py-1 rounded">Left Mouse</kbd> - Rotate view</div>
          <div>• <kbd className="bg-gray-800 px-2 py-1 rounded">Right Mouse</kbd> - Pan view</div>
          <div>• <kbd className="bg-gray-800 px-2 py-1 rounded">Scroll</kbd> - Zoom in/out</div>
        </div>
      </div>
    </div>
  );
}

function SensorReading({ reading }: { reading: SensorReading }) {
  const renderValue = () => {
    switch (reading.type) {
      case 'color': {
        const colorReading = reading as ColorSensorReading;
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span>Color:</span>
              <span className="font-semibold">{colorReading.value}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Reflectance:</span>
              <span className="font-mono text-xs">{colorReading.reflectance}%</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>RGB:</span>
              <span className="font-mono text-xs">
                ({colorReading.raw.r}, {colorReading.raw.g}, {colorReading.raw.b})
              </span>
            </div>
          </div>
        );
      }

      case 'ultrasonic':
        return (
          <div className="flex justify-between">
            <span>Distance:</span>
            <span className="font-mono">{reading.value} cm</span>
          </div>
        );

      case 'gyro':
        return (
          <div className="flex justify-between">
            <span>Angle:</span>
            <span className="font-mono">{reading.value}°</span>
          </div>
        );

      default:
        return <span className="font-mono">{String(reading.value)}</span>;
    }
  };

  const getSensorIcon = () => {
    switch (reading.type) {
      case 'color':
        return '🎨';
      case 'ultrasonic':
        return '📡';
      case 'gyro':
        return '🧭';
      default:
        return '📊';
    }
  };

  return (
    <div className="border-l-2 border-lego-red pl-3">
      <div className="text-xs text-gray-400 mb-1 flex items-center space-x-1">
        <span>{getSensorIcon()}</span>
        <span>{reading.type.toUpperCase()}</span>
      </div>
      <div className="text-sm">{renderValue()}</div>
    </div>
  );
}
