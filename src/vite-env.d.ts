/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Extend Window interface for robot API
interface Window {
  robotAPI?: {
    motor: {
      run: (port: string, speed: number) => void;
      runForRotations: (port: string, rotations: number, speed?: number) => Promise<void>;
      stop: (port: string) => void;
      reset: (port: string) => void;
      getAngle: (port: string) => number;
      getSpeed: (port: string) => number;
    };
    sensor: {
      color: (port?: string) => string;
      ultrasonic: (port?: string) => number;
      reflectance: (port?: string) => number;
    };
    wait: (ms: number) => Promise<void>;
    print: (message: string) => void;
  };
  Sk?: any; // Skulpt Python interpreter
}
