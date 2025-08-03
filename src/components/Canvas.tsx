import React, { useRef, useEffect, useState } from 'react';
import type { TrackPoint, ShapeRecognizer } from '../utils/gestureRecognition';

export interface Point {
  x: number;
  y: number;
}

export interface DrawingSettings {
  color: string;
  brushSize: number;
  eraserSize: number;
  vectorMode: boolean; // 是否启用矢量图形模式
}

export interface VectorShape {
  type: 'line' | 'circle' | 'rectangle';
  id: string;
  color: string;
  strokeWidth: number;
  points: any; // 根据type不同而不同
}

interface CanvasProps {
  width: number;
  height: number;
  onDraw?: (point: Point) => void;
  onErase?: (point: Point) => void;
  drawingSettings: DrawingSettings;
  isDrawing: boolean;
  isErasing: boolean;
  isVectorDrawing: boolean; // 是否在绘制矢量图形
  currentPoint: Point | null;
  currentGestureType: 'draw' | 'erase' | 'line' | 'rectangle' | 'circle' | 'menu' | 'none';
  shapeRecognizer?: ShapeRecognizer;
  onShapeComplete?: (shape: VectorShape) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  width,
  height,
  onDraw,
  onErase,
  drawingSettings,
  isDrawing,
  isErasing,
  isVectorDrawing,
  currentPoint,
  currentGestureType,
  shapeRecognizer,
  onShapeComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [vectorShapes, setVectorShapes] = useState<VectorShape[]>([]);
  const [isDrawingVector, setIsDrawingVector] = useState(false);
  const [vectorStartPoint, setVectorStartPoint] = useState<Point | null>(null);
  const [previewShape, setPreviewShape] = useState<VectorShape | null>(null);

  // 初始化画布
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // 设置画布尺寸
    canvas.width = width;
    canvas.height = height;

    // 设置绘图属性
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    contextRef.current = context;
  }, [width, height]);

  // 绘制函数
  const draw = (point: Point) => {
    const context = contextRef.current;
    if (!context) return;

    context.globalCompositeOperation = 'source-over';
    context.strokeStyle = drawingSettings.color;
    context.lineWidth = drawingSettings.brushSize;

    if (lastPoint) {
      context.beginPath();
      context.moveTo(lastPoint.x, lastPoint.y);
      context.lineTo(point.x, point.y);
      context.stroke();
    } else {
      // 画一个点
      context.beginPath();
      context.arc(point.x, point.y, drawingSettings.brushSize / 2, 0, 2 * Math.PI);
      context.fill();
    }

    setLastPoint(point);
    onDraw?.(point);
  };

  // 擦除函数
  const erase = (point: Point) => {
    const context = contextRef.current;
    if (!context) return;

    context.globalCompositeOperation = 'destination-out';
    context.beginPath();
    context.arc(point.x, point.y, drawingSettings.eraserSize, 0, 2 * Math.PI);
    context.fill();

    onErase?.(point);
  };

  // 绘制矢量图形
  const drawVectorShape = (shape: VectorShape, isPreview = false) => {
    const context = contextRef.current;
    if (!context) return;

    // 保存当前状态
    context.save();
    
    if (isPreview) {
      context.globalAlpha = 0.5;
      context.setLineDash([5, 5]);
    }

    context.globalCompositeOperation = 'source-over';
    context.strokeStyle = shape.color;
    context.lineWidth = shape.strokeWidth;
    context.beginPath();

    switch (shape.type) {
      case 'line':
        if (shape.points.start && shape.points.end) {
          context.moveTo(shape.points.start.x * width, shape.points.start.y * height);
          context.lineTo(shape.points.end.x * width, shape.points.end.y * height);
        }
        break;
      
      case 'rectangle':
        if (shape.points.topLeft && shape.points.bottomRight) {
          const x = shape.points.topLeft.x * width;
          const y = shape.points.topLeft.y * height;
          const w = (shape.points.bottomRight.x - shape.points.topLeft.x) * width;
          const h = (shape.points.bottomRight.y - shape.points.topLeft.y) * height;
          context.rect(x, y, w, h);
        }
        break;
      
      case 'circle':
        if (shape.points.center && shape.points.radius) {
          const centerX = shape.points.center.x * width;
          const centerY = shape.points.center.y * height;
          const radius = shape.points.radius * Math.min(width, height);
          context.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        }
        break;
    }

    context.stroke();
    context.restore();
  };

  // 保存和恢复画布内容
  const [canvasSnapshot, setCanvasSnapshot] = useState<ImageData | null>(null);

  // 创建画布快照（保存当前绘画内容）
  const createSnapshot = () => {
    const context = contextRef.current;
    if (!context) return;
    
    const imageData = context.getImageData(0, 0, width, height);
    setCanvasSnapshot(imageData);
  };

  // 恢复画布快照
  const restoreSnapshot = () => {
    const context = contextRef.current;
    if (!context || !canvasSnapshot) return;
    
    context.putImageData(canvasSnapshot, 0, 0);
  };

  // 重新绘制画布（只绘制矢量图形，保留自由绘画）
  const redrawCanvas = () => {
    const context = contextRef.current;
    if (!context) return;

    // 如果有快照，先恢复原始内容
    if (canvasSnapshot) {
      restoreSnapshot();
    } else {
      // 没有快照时，清空画布
      context.fillStyle = 'white';
      context.fillRect(0, 0, width, height);
    }

    // 绘制所有矢量图形
    vectorShapes.forEach(shape => drawVectorShape(shape));

    // 绘制预览图形
    if (previewShape) {
      drawVectorShape(previewShape, true);
    }
  };

  // 更新矢量预览（无损绘制）
  const updateVectorPreviewLive = (point: Point) => {
    if (!vectorStartPoint) return;

    const context = contextRef.current;
    if (!context) return;

    // 恢复到开始绘制时的状态
    if (canvasSnapshot) {
      restoreSnapshot();
    }

    // 绘制所有已完成的矢量图形
    vectorShapes.forEach(shape => drawVectorShape(shape));

    // 绘制当前预览
    let preview: VectorShape | null = null;

    switch (currentGestureType) {
      case 'line':
        preview = {
          type: 'line',
          id: 'preview',
          color: drawingSettings.color,
          strokeWidth: drawingSettings.brushSize,
          points: { start: vectorStartPoint, end: point }
        };
        break;
      
      case 'rectangle':
        preview = {
          type: 'rectangle',
          id: 'preview',
          color: drawingSettings.color,
          strokeWidth: drawingSettings.brushSize,
          points: { topLeft: vectorStartPoint, bottomRight: point }
        };
        break;
      
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(point.x - vectorStartPoint.x, 2) + 
          Math.pow(point.y - vectorStartPoint.y, 2)
        );
        preview = {
          type: 'circle',
          id: 'preview',
          color: drawingSettings.color,
          strokeWidth: drawingSettings.brushSize,
          points: { center: vectorStartPoint, radius }
        };
        break;
    }

    if (preview) {
      drawVectorShape(preview, true);
      setPreviewShape(preview);
    }
  };

  // 开始矢量图形绘制
  const startVectorDrawing = (point: Point) => {
    // 创建画布快照以保存当前内容
    createSnapshot();
    
    setIsDrawingVector(true);
    setVectorStartPoint(point);
    
    // 添加到轨迹识别器
    if (shapeRecognizer) {
      shapeRecognizer.clearTrack();
      shapeRecognizer.addPoint(point);
    }
  };


  // 完成矢量图形绘制
  const completeVectorDrawing = () => {
    if (!isDrawingVector || !previewShape) return;

    // 生成唯一ID
    const shapeId = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const completedShape = { ...previewShape, id: shapeId };

    // 添加到形状列表
    setVectorShapes(prev => [...prev, completedShape]);
    
    // 通知父组件
    onShapeComplete?.(completedShape);

    // 重置状态
    setIsDrawingVector(false);
    setVectorStartPoint(null);
    setPreviewShape(null);
    setCanvasSnapshot(null); // 清除快照，因为形状已经确定
    
    // 重绘画布以显示最终结果
    setTimeout(() => redrawCanvas(), 0);
  };

  // 智能形状识别和自动完成
  const handleShapeRecognition = () => {
    if (!shapeRecognizer) return;

    const recognizedShape = shapeRecognizer.recognizeShape();
    if (recognizedShape.confidence > 0.7 && recognizedShape.points) {
      let vectorShape: VectorShape | null = null;

      switch (recognizedShape.shape) {
        case 'line':
          if ('start' in recognizedShape.points && 'end' in recognizedShape.points) {
            vectorShape = {
              type: 'line',
              id: `auto_line_${Date.now()}`,
              color: drawingSettings.color,
              strokeWidth: drawingSettings.brushSize,
              points: {
                start: { x: recognizedShape.points.start.x, y: recognizedShape.points.start.y },
                end: { x: recognizedShape.points.end.x, y: recognizedShape.points.end.y }
              }
            };
          }
          break;
        
        case 'circle':
          if ('center' in recognizedShape.points && 'radius' in recognizedShape.points) {
            vectorShape = {
              type: 'circle',
              id: `auto_circle_${Date.now()}`,
              color: drawingSettings.color,
              strokeWidth: drawingSettings.brushSize,
              points: {
                center: { x: recognizedShape.points.center.x, y: recognizedShape.points.center.y },
                radius: recognizedShape.points.radius
              }
            };
          }
          break;
        
        case 'rectangle':
          if ('topLeft' in recognizedShape.points && 'bottomRight' in recognizedShape.points) {
            vectorShape = {
              type: 'rectangle',
              id: `auto_rect_${Date.now()}`,
              color: drawingSettings.color,
              strokeWidth: drawingSettings.brushSize,
              points: {
                topLeft: { x: recognizedShape.points.topLeft.x, y: recognizedShape.points.topLeft.y },
                bottomRight: { x: recognizedShape.points.bottomRight.x, y: recognizedShape.points.bottomRight.y }
              }
            };
          }
          break;
      }

      if (vectorShape) {
        setVectorShapes(prev => [...prev, vectorShape]);
        onShapeComplete?.(vectorShape);
        shapeRecognizer.clearTrack();
      }
    }
  };


  // 当手势状态改变时处理绘制
  useEffect(() => {
    if (!currentPoint) {
      setLastPoint(null);
      // 如果是矢量绘制模式且正在绘制，完成绘制
      if (isDrawingVector && ['line', 'rectangle', 'circle'].includes(currentGestureType)) {
        completeVectorDrawing();
      }
      return;
    }

    const canvasPoint = {
      x: currentPoint.x * width,
      y: currentPoint.y * height
    };

    // 矢量图形模式
    if (drawingSettings.vectorMode && ['line', 'rectangle', 'circle'].includes(currentGestureType)) {
      if (!isDrawingVector) {
        // 开始矢量绘制
        startVectorDrawing(currentPoint);
      } else {
        // 更新预览（实时绘制）
        updateVectorPreviewLive(currentPoint);
      }
    }
    // 自由绘画模式
    else if (isDrawing) {
      draw(canvasPoint);
      // 添加到轨迹识别器用于智能识别
      if (shapeRecognizer && drawingSettings.vectorMode) {
        shapeRecognizer.addPoint(currentPoint);
      }
    } 
    // 擦除模式
    else if (isErasing) {
      erase(canvasPoint);
      setLastPoint(null); // 擦除时不需要连线
    } 
    else {
      setLastPoint(null);
      // 如果结束自由绘画且启用了智能识别，尝试识别形状
      if (shapeRecognizer && drawingSettings.vectorMode && !isDrawing && !isErasing) {
        setTimeout(handleShapeRecognition, 500); // 延迟识别，给用户时间完成绘制
      }
    }
  }, [currentPoint, isDrawing, isErasing, isVectorDrawing, currentGestureType, width, height, drawingSettings]);

  // 重新绘制画布当矢量形状变化时
  useEffect(() => {
    redrawCanvas();
  }, [vectorShapes, previewShape]);

  // 当矢量模式切换时清理状态
  useEffect(() => {
    if (!drawingSettings.vectorMode) {
      setIsDrawingVector(false);
      setVectorStartPoint(null);
      setPreviewShape(null);
    }
  }, [drawingSettings.vectorMode]);


  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        className={`drawing-canvas ${
          isDrawing ? 'cursor-crosshair' : isErasing ? 'cursor-pointer' : 'cursor-default'
        }`}
      />
      
      {/* 显示当前手势位置的指示器 */}
      {currentPoint && (
        <div
          className="gesture-indicator w-5 h-5"
          style={{
            left: currentPoint.x * width,
            top: currentPoint.y * height,
            backgroundColor: 
              isDrawing ? drawingSettings.color : 
              isErasing ? '#ef4444' : 
              currentGestureType === 'line' ? '#10b981' :
              currentGestureType === 'rectangle' ? '#8b5cf6' :
              currentGestureType === 'circle' ? '#f59e0b' :
              '#3b82f6',
          }}
        />
      )}

      {/* 矢量绘制状态指示器 */}
      {isDrawingVector && vectorStartPoint && (
        <div
          className="absolute pointer-events-none text-xs font-semibold text-white bg-black/70 px-2 py-1 rounded"
          style={{
            left: vectorStartPoint.x * width + 20,
            top: vectorStartPoint.y * height - 10,
          }}
        >
          {currentGestureType === 'line' ? '直线模式' :
           currentGestureType === 'rectangle' ? '矩形模式' :
           currentGestureType === 'circle' ? '圆形模式' : '矢量绘制'}
        </div>
      )}

      {/* 显示形状数量 */}
      {vectorShapes.length > 0 && (
        <div className="absolute top-2 right-2 text-xs font-semibold text-gray-600 bg-white/80 px-2 py-1 rounded">
          形状: {vectorShapes.length}
        </div>
      )}
    </div>
  );
};

export default Canvas;