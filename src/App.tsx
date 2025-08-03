import { useState, useRef, useEffect } from 'react';
import { useHandTracking } from './hooks/useHandTracking';
import { recognizeGesture, GestureStabilizer, ShapeRecognizer } from './utils/gestureRecognition';
import type { GestureResult } from './utils/gestureRecognition';
import Canvas from './components/Canvas';
import type { DrawingSettings, VectorShape } from './components/Canvas';
import ControlPanel from './components/ControlPanel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './components/ThemeToggle';
import { AlertCircle, Camera, Loader2, Palette } from 'lucide-react';

function App() {
  const { videoRef, results, isLoading, error, initializeHandTracking, stopTracking } = useHandTracking();
  const [isTracking, setIsTracking] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<GestureResult>({ type: 'none', position: { x: 0, y: 0 }, confidence: 0 });
  const gestureStabilizer = useRef(new GestureStabilizer());
  const shapeRecognizer = useRef(new ShapeRecognizer());
  
  const [drawingSettings, setDrawingSettings] = useState<DrawingSettings>({
    color: '#000000',
    brushSize: 5,
    eraserSize: 20,
    vectorMode: false
  });

  const [vectorShapes, setVectorShapes] = useState<VectorShape[]>([]);

  // 处理手势识别
  useEffect(() => {
    if (results && results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0]; // 使用第一只检测到的手
      const gesture = recognizeGesture(landmarks);
      const stabilizedGesture = gestureStabilizer.current.addGesture(gesture);
      setCurrentGesture(stabilizedGesture);
    } else {
      setCurrentGesture({ type: 'none', position: { x: 0, y: 0 }, confidence: 0 });
    }
  }, [results]);

  const handleToggleTracking = async () => {
    if (isTracking) {
      stopTracking();
      setIsTracking(false);
      gestureStabilizer.current.reset();
    } else {
      await initializeHandTracking();
      setIsTracking(true);
    }
  };

  const handleClearCanvas = () => {
    // 直接获取canvas元素并清空
    const canvasElement = document.querySelector('.drawing-canvas') as HTMLCanvasElement;
    if (canvasElement) {
      const context = canvasElement.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvasElement.width, canvasElement.height);
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvasElement.width, canvasElement.height);
      }
    }
    
    // 清空矢量图形
    setVectorShapes([]);
    
    // 重置形状识别器
    shapeRecognizer.current.clearTrack();
  };

  const handleShapeComplete = (shape: VectorShape) => {
    setVectorShapes(prev => [...prev, shape]);
    console.log('形状绘制完成:', shape);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 relative overflow-hidden">
      {/* 标题和主题切换 */}
      <div className="absolute top-4 left-4 z-50 flex flex-col sm:flex-row gap-2 sm:gap-4">
        <Card className="backdrop-blur-sm bg-background/95">
          <CardContent className="p-3 sm:p-4">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              空中画布
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">用手势在空中绘画</p>
          </CardContent>
        </Card>
        <div className="flex items-start">
          <ThemeToggle />
        </div>
      </div>

      {/* 控制面板 */}
      <ControlPanel
        drawingSettings={drawingSettings}
        onSettingsChange={setDrawingSettings}
        onClearCanvas={handleClearCanvas}
        isTracking={isTracking}
        onToggleTracking={handleToggleTracking}
        currentGesture={currentGesture.type}
        gestureConfidence={currentGesture.confidence}
      />

      {/* 主画布区域 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <Canvas
          width={Math.min(800, window.innerWidth - 40)}
          height={Math.min(600, window.innerHeight - 120)}
          drawingSettings={drawingSettings}
          isDrawing={currentGesture.type === 'draw' && currentGesture.confidence > 0.6}
          isErasing={currentGesture.type === 'erase' && currentGesture.confidence > 0.6}
          isVectorDrawing={
            ['line', 'rectangle', 'circle'].includes(currentGesture.type) && 
            currentGesture.confidence > 0.6
          }
          currentPoint={currentGesture.confidence > 0.3 ? currentGesture.position : null}
          currentGestureType={currentGesture.type}
          shapeRecognizer={shapeRecognizer.current}
          onShapeComplete={handleShapeComplete}
        />
      </div>

      {/* 摄像头预览 */}
      <Card className="absolute bottom-4 left-4 overflow-hidden z-50 w-32 h-24 sm:w-48 sm:h-36">
        <video
          ref={videoRef}
          className="w-full h-full object-cover scale-x-[-1] border-0"
          autoPlay
          muted
          playsInline
        />
        <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-black/50 text-white px-1 py-0.5 sm:px-2 sm:py-1 rounded text-xs flex items-center gap-1">
          <Camera className="w-2 h-2 sm:w-3 sm:h-3" />
          <span className="hidden sm:inline">摄像头</span>
        </div>
      </Card>

      {/* 加载状态 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <Card className="p-6 max-w-md mx-4">
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-lg font-medium">正在初始化手部追踪...</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>• 正在加载 MediaPipe 模型</div>
                <div>• 请允许摄像头访问权限</div>
                <div>• 如果长时间无响应，请检查网络连接</div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setIsTracking(false);
                  stopTracking();
                }}
                className="w-full mt-4"
              >
                取消初始化
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 错误显示 */}
      {error && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <Card className="max-w-md mx-4 border-destructive">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-destructive" />
                <h3 className="text-lg font-semibold text-destructive">错误</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button 
                onClick={handleToggleTracking}
                className="w-full"
              >
                重试
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 使用说明（当未开始追踪时显示） */}
      {!isTracking && !isLoading && (
        <Card className="absolute bottom-4 right-4 max-w-sm sm:max-w-xs z-50 backdrop-blur-sm bg-background/95 mx-4 sm:mx-0">
          <CardContent className="p-3 sm:p-4">
            <h3 className="font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
              <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
              使用说明
            </h3>
            <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
              <div><span className="font-medium text-primary">1.</span> 点击右上角"开始追踪"按钮</div>
              <div><span className="font-medium text-primary">2.</span> 允许摄像头访问权限</div>
              <div><span className="font-medium text-primary">3.</span> 将手伸向摄像头，保持适当距离</div>
              <div><span className="font-medium text-primary">4.</span> 基础手势：</div>
              <div className="ml-3 sm:ml-4 space-y-1 bg-muted/30 p-2 rounded">
                <div className="flex items-center gap-2">
                  <span>✏️</span> 
                  <span><strong>食指伸直</strong> → 自由绘画</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✊</span> 
                  <span><strong>握拳</strong> → 擦除模式</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🖐️</span> 
                  <span><strong>五指张开</strong> → 菜单手势</span>
                </div>
              </div>
              <div><span className="font-medium text-primary">5.</span> 在控制面板开启<strong>矢量模式</strong>解锁更多手势</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default App;
