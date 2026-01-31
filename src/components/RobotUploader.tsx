import { useState, useRef } from 'react';
import { Upload, X, Loader2, FileUp, Sparkles } from 'lucide-react';
import { ldrawParser } from '@/parsers/LDrawParser';
import { rigBuilder } from '@/core/RigBuilder';
import type { RiggedRobotData, RenderMode, LDrawLoadProgress } from '@/types';
import toast from 'react-hot-toast';

interface RobotUploaderProps {
  onRobotUploaded: (robot: RiggedRobotData) => void;
  onClose: () => void;
  renderMode?: RenderMode;
  onProgress?: (progress: LDrawLoadProgress) => void;
}

export function RobotUploader({ onRobotUploaded, onClose, renderMode = 'detailed', onProgress }: RobotUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [detailedProgress, setDetailedProgress] = useState<LDrawLoadProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ['.io', '.ldr', '.mpd'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      toast.error('Invalid file type. Please upload a .io, .ldr, or .mpd file');
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Parse the file
      setProgress('Parsing LDraw file...');
      const parsedModel = fileExtension === '.io'
        ? await ldrawParser.parseStudioFile(file)
        : await ldrawParser.parseLDraw(await file.text(), file.name);

      console.log('Parsed model:', parsedModel);

      // Step 2: Rig the robot
      setProgress('Analyzing robot structure...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX

      setProgress('Detecting motors and wheels...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setProgress(renderMode === 'detailed' ? 'Loading detailed LEGO geometry...' : 'Creating physics configuration...');

      // Progress callback for detailed loading
      const handleDetailedProgress = (p: LDrawLoadProgress) => {
        setDetailedProgress(p);
        onProgress?.(p);
      };

      const riggedRobot = await rigBuilder.rigRobot(
        parsedModel.parts,
        parsedModel.metadata.name,
        {
          renderMode,
          onProgress: renderMode === 'detailed' ? handleDetailedProgress : undefined
        }
      );

      console.log('Rigged robot:', riggedRobot);

      // Step 3: Physics hull
      setProgress('Generating physics hull...');
      setDetailedProgress(null);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Step 4: Complete
      setProgress('Robot ready!');
      await new Promise(resolve => setTimeout(resolve, 300));

      onRobotUploaded(riggedRobot);

    } catch (error: any) {
      console.error('Error processing robot:', error);
      toast.error(`Failed to process robot: ${error.message}`);
      setProgress('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files[0];
    if (file) {
      // Simulate file input change
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleFileSelect({ target: fileInputRef.current } as any);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Upload className="text-lego-yellow" size={24} />
            <h2 className="text-xl font-bold">Upload Robot Model</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-700 rounded transition disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isProcessing ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-600 rounded-lg p-12 text-center hover:border-lego-yellow transition cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp size={64} className="mx-auto mb-4 text-gray-500" />
              <h3 className="text-lg font-semibold mb-2">
                Drop your robot file here
              </h3>
              <p className="text-gray-400 mb-4">
                or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supported formats: .io (BrickLink Studio), .ldr, .mpd
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".io,.ldr,.mpd"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="py-12 text-center">
              <Loader2 size={64} className="mx-auto mb-4 text-lego-yellow animate-spin" />
              <h3 className="text-lg font-semibold mb-2">Processing Robot...</h3>
              <p className="text-gray-400">{progress}</p>

              {detailedProgress && (
                <p className="text-sm text-gray-500 mt-1">
                  {detailedProgress.currentPart
                    ? `Part: ${detailedProgress.currentPart}`
                    : detailedProgress.message}
                  {' '}({detailedProgress.loaded}/{detailedProgress.total})
                </p>
              )}

              <div className="mt-6 max-w-md mx-auto">
                <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-lego-yellow h-full transition-all duration-300"
                    style={{
                      width: detailedProgress
                        ? `${Math.round((detailedProgress.loaded / Math.max(detailedProgress.total, 1)) * 100)}%`
                        : '60%'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          {!isProcessing && (
            <div className="mt-6 bg-gray-900 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-sm">How to export from BrickLink Studio:</h4>
              <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                <li>Open your robot design in BrickLink Studio</li>
                <li>Go to File → Export As...</li>
                <li>Choose "Studio File (.io)" format</li>
                <li>Save the file and upload it here</li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
