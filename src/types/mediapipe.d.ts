declare module '@mediapipe/hands' {
  export interface NormalizedLandmark {
    x: number;
    y: number;
    z: number;
  }

  export interface Results {
    multiHandLandmarks?: NormalizedLandmark[][];
    multiHandedness?: any[];
    image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement;
  }

  export interface HandsOptions {
    maxNumHands?: number;
    modelComplexity?: number;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }

  export class Hands {
    constructor(config: {
      locateFile: (file: string) => string;
    });
    
    setOptions(options: HandsOptions): void;
    onResults(callback: (results: Results) => void): void;
    send(inputs: { image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement }): Promise<void>;
    close(): void;
  }
}

declare module '@mediapipe/camera_utils' {
  export interface CameraOptions {
    onFrame: () => Promise<void> | void;
    width?: number;
    height?: number;
  }

  export class Camera {
    constructor(
      videoElement: HTMLVideoElement,
      options: CameraOptions
    );
    
    start(): Promise<void>;
    stop(): void;
  }
}

declare module '@mediapipe/drawing_utils' {
  export interface DrawingOptions {
    color?: string;
    lineWidth?: number;
    radius?: number;
  }

  export function drawConnectors(
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    connections: any[],
    options?: DrawingOptions
  ): void;

  export function drawLandmarks(
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    options?: DrawingOptions
  ): void;
}