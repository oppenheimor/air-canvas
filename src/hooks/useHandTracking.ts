import { useEffect, useRef, useState } from 'react';
import { Hands } from '@mediapipe/hands';
import type { Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandResults {
  multiHandLandmarks: HandLandmark[][];
  multiHandedness: any[];
}

export const useHandTracking = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hands, setHands] = useState<Hands | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [results, setResults] = useState<HandResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onResults = (results: Results) => {
    setResults({
      multiHandLandmarks: results.multiHandLandmarks || [],
      multiHandedness: results.multiHandedness || []
    });
  };

  const initializeHandTracking = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('开始初始化手部追踪...');

      // 先检查摄像头权限
      console.log('检查摄像头权限...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      console.log('摄像头权限获取成功');

      // 初始化 MediaPipe Hands
      console.log('初始化 MediaPipe Hands...');
      const handsInstance = new Hands({
        locateFile: (file) => {
          // 尝试多个 CDN 源
          const cdnUrls = [
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
            `https://unpkg.com/@mediapipe/hands/${file}`,
            `https://cdn.skypack.dev/@mediapipe/hands/${file}`
          ];
          const url = cdnUrls[0]; // 先使用第一个
          console.log(`加载 MediaPipe 文件: ${url}`);
          return url;
        }
      });

      console.log('MediaPipe Hands 实例创建成功:', handsInstance);

      // 设置超时机制
      const initTimeout = setTimeout(() => {
        throw new Error('MediaPipe 初始化超时 (30秒)');
      }, 30000);

      // 等待 MediaPipe 初始化完成
      await new Promise<void>((resolve, reject) => {
        const checkInitialization = () => {
          try {
            handsInstance.setOptions({
              maxNumHands: 2,
              modelComplexity: 1,
              minDetectionConfidence: 0.5,
              minTrackingConfidence: 0.5
            });
            console.log('MediaPipe 选项设置完成');
            resolve();
          } catch (error) {
            console.log('MediaPipe 还未完全加载，等待中...');
            setTimeout(checkInitialization, 1000);
          }
        };
        checkInitialization();
      });

      handsInstance.onResults(onResults);
      setHands(handsInstance);

      // 初始化摄像头
      console.log('初始化摄像头...');
      if (videoRef.current) {
        // 先停止之前的流
        stream.getTracks().forEach(track => track.stop());
        
        const cameraInstance = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && handsInstance) {
              try {
                await handsInstance.send({ image: videoRef.current });
              } catch (frameError) {
                console.warn('发送帧数据失败:', frameError);
              }
            }
          },
          width: 640,
          height: 480
        });

        await cameraInstance.start();
        console.log('摄像头启动成功');
        setCamera(cameraInstance);
      }

      // 清除超时
      clearTimeout(initTimeout);
      
      console.log('手部追踪初始化完成');
      setIsLoading(false);
    } catch (err) {
      console.error('初始化失败:', err);
      const errorMessage = err instanceof Error ? err.message : '初始化手部追踪失败';
      
      // 提供更详细的错误信息
      let detailedError = errorMessage;
      if (errorMessage.includes('Permission denied')) {
        detailedError = '摄像头权限被拒绝，请允许访问摄像头';
      } else if (errorMessage.includes('MediaDevices')) {
        detailedError = '无法访问摄像头设备，请检查设备连接';
      } else if (errorMessage.includes('超时')) {
        detailedError = 'MediaPipe 模型加载超时，请检查网络连接';
      } else if (errorMessage.includes('https://')) {
        detailedError = 'MediaPipe 资源加载失败，请检查网络连接';
      }
      
      setError(detailedError);
      setIsLoading(false);
    }
  };

  const stopTracking = () => {
    if (camera) {
      camera.stop();
    }
    if (hands) {
      hands.close();
    }
  };

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [camera, hands]);

  return {
    videoRef,
    results,
    isLoading,
    error,
    initializeHandTracking,
    stopTracking
  };
};