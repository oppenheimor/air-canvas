import type { HandLandmark } from '../hooks/useHandTracking';

export interface GestureResult {
  type: 'draw' | 'erase' | 'menu' | 'none' | 'line' | 'rectangle' | 'circle';
  position: { x: number; y: number };
  confidence: number;
}

// 手部关键点索引
const LANDMARKS = {
  THUMB_TIP: 4,
  INDEX_FINGER_TIP: 8,
  INDEX_FINGER_PIP: 6,
  MIDDLE_FINGER_TIP: 12,
  MIDDLE_FINGER_PIP: 10,
  RING_FINGER_TIP: 16,
  PINKY_TIP: 20,
  WRIST: 0
};

// 计算两点间距离
const calculateDistance = (point1: HandLandmark, point2: HandLandmark): number => {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// 检测手指是否伸直
const isFingerExtended = (landmarks: HandLandmark[], tipIndex: number, pipIndex: number): boolean => {
  const tip = landmarks[tipIndex];
  const pip = landmarks[pipIndex];
  const wrist = landmarks[LANDMARKS.WRIST];
  
  // 计算手指尖端到手腕的距离 vs PIP关节到手腕的距离
  const tipToWrist = calculateDistance(tip, wrist);
  const pipToWrist = calculateDistance(pip, wrist);
  
  return tipToWrist > pipToWrist;
};

// 检测是否为画图手势（食指伸直，其他手指弯曲）
const isDrawingGesture = (landmarks: HandLandmark[]): boolean => {
  const indexExtended = isFingerExtended(landmarks, LANDMARKS.INDEX_FINGER_TIP, LANDMARKS.INDEX_FINGER_PIP);
  const middleExtended = isFingerExtended(landmarks, LANDMARKS.MIDDLE_FINGER_TIP, LANDMARKS.MIDDLE_FINGER_PIP);
  const ringExtended = isFingerExtended(landmarks, LANDMARKS.RING_FINGER_TIP, LANDMARKS.RING_FINGER_TIP - 2);
  
  // 食指伸直，中指和无名指弯曲
  return indexExtended && !middleExtended && !ringExtended;
};

// 检测是否为擦除手势（握拳状态）
const isErasingGesture = (landmarks: HandLandmark[]): boolean => {
  const indexExtended = isFingerExtended(landmarks, LANDMARKS.INDEX_FINGER_TIP, LANDMARKS.INDEX_FINGER_PIP);
  const middleExtended = isFingerExtended(landmarks, LANDMARKS.MIDDLE_FINGER_TIP, LANDMARKS.MIDDLE_FINGER_PIP);
  const ringExtended = isFingerExtended(landmarks, LANDMARKS.RING_FINGER_TIP, LANDMARKS.RING_FINGER_TIP - 2);
  const pinkyExtended = isFingerExtended(landmarks, LANDMARKS.PINKY_TIP, LANDMARKS.PINKY_TIP - 2);
  
  // 所有手指都弯曲
  return !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
};

// 检测是否为菜单手势（五指张开）
const isMenuGesture = (landmarks: HandLandmark[]): boolean => {
  const indexExtended = isFingerExtended(landmarks, LANDMARKS.INDEX_FINGER_TIP, LANDMARKS.INDEX_FINGER_PIP);
  const middleExtended = isFingerExtended(landmarks, LANDMARKS.MIDDLE_FINGER_TIP, LANDMARKS.MIDDLE_FINGER_PIP);
  const ringExtended = isFingerExtended(landmarks, LANDMARKS.RING_FINGER_TIP, LANDMARKS.RING_FINGER_TIP - 2);
  const pinkyExtended = isFingerExtended(landmarks, LANDMARKS.PINKY_TIP, LANDMARKS.PINKY_TIP - 2);
  
  // 所有手指都伸直
  return indexExtended && middleExtended && ringExtended && pinkyExtended;
};

// 检测是否为直线手势（食指+中指伸直）
const isLineGesture = (landmarks: HandLandmark[]): boolean => {
  const indexExtended = isFingerExtended(landmarks, LANDMARKS.INDEX_FINGER_TIP, LANDMARKS.INDEX_FINGER_PIP);
  const middleExtended = isFingerExtended(landmarks, LANDMARKS.MIDDLE_FINGER_TIP, LANDMARKS.MIDDLE_FINGER_PIP);
  const ringExtended = isFingerExtended(landmarks, LANDMARKS.RING_FINGER_TIP, LANDMARKS.RING_FINGER_TIP - 2);
  const pinkyExtended = isFingerExtended(landmarks, LANDMARKS.PINKY_TIP, LANDMARKS.PINKY_TIP - 2);
  
  // 食指和中指伸直，其他手指弯曲
  return indexExtended && middleExtended && !ringExtended && !pinkyExtended;
};

// 检测是否为圆形手势（OK手势：拇指+食指相碰）
const isCircleGesture = (landmarks: HandLandmark[]): boolean => {
  const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
  const indexTip = landmarks[LANDMARKS.INDEX_FINGER_TIP];
  const middleExtended = isFingerExtended(landmarks, LANDMARKS.MIDDLE_FINGER_TIP, LANDMARKS.MIDDLE_FINGER_PIP);
  
  // 拇指和食指距离很近，中指伸直
  const thumbIndexDistance = calculateDistance(thumbTip, indexTip);
  return thumbIndexDistance < 0.05 && middleExtended;
};

// 检测是否为矩形手势（拇指伸直+握拳）
const isRectangleGesture = (landmarks: HandLandmark[]): boolean => {
  const thumbExtended = landmarks[LANDMARKS.THUMB_TIP].y < landmarks[LANDMARKS.THUMB_TIP - 1].y;
  const indexExtended = isFingerExtended(landmarks, LANDMARKS.INDEX_FINGER_TIP, LANDMARKS.INDEX_FINGER_PIP);
  const middleExtended = isFingerExtended(landmarks, LANDMARKS.MIDDLE_FINGER_TIP, LANDMARKS.MIDDLE_FINGER_PIP);
  const ringExtended = isFingerExtended(landmarks, LANDMARKS.RING_FINGER_TIP, LANDMARKS.RING_FINGER_TIP - 2);
  
  // 拇指伸直，其他手指弯曲
  return thumbExtended && !indexExtended && !middleExtended && !ringExtended;
};

// 主要的手势识别函数
export const recognizeGesture = (landmarks: HandLandmark[]): GestureResult => {
  if (!landmarks || landmarks.length < 21) {
    return { type: 'none', position: { x: 0, y: 0 }, confidence: 0 };
  }

  const indexTip = landmarks[LANDMARKS.INDEX_FINGER_TIP];
  // 修复坐标映射：翻转 X 轴以匹配用户直觉
  // MediaPipe 的 x 坐标是镜像的，需要翻转
  const position = { 
    x: 1 - indexTip.x, // 翻转 X 轴：右手移动 = 画笔向右
    y: indexTip.y      // Y 轴保持不变
  };

  // 按优先级检测各种手势
  if (isLineGesture(landmarks)) {
    return { type: 'line', position, confidence: 0.85 };
  }
  
  if (isCircleGesture(landmarks)) {
    return { type: 'circle', position, confidence: 0.8 };
  }
  
  if (isRectangleGesture(landmarks)) {
    return { type: 'rectangle', position, confidence: 0.8 };
  }
  
  if (isDrawingGesture(landmarks)) {
    return { type: 'draw', position, confidence: 0.8 };
  }
  
  if (isErasingGesture(landmarks)) {
    return { type: 'erase', position, confidence: 0.7 };
  }
  
  if (isMenuGesture(landmarks)) {
    return { type: 'menu', position, confidence: 0.9 };
  }

  return { type: 'none', position, confidence: 0 };
};

// 轨迹点接口
export interface TrackPoint {
  x: number;
  y: number;
  timestamp: number;
}

// 智能图形识别类
export class ShapeRecognizer {
  private trackPoints: TrackPoint[] = [];
  private readonly maxTrackPoints = 50;
  private readonly minPointsForRecognition = 10;

  addPoint(point: { x: number; y: number }): void {
    this.trackPoints.push({
      x: point.x,
      y: point.y,
      timestamp: Date.now()
    });

    // 限制轨迹点数量
    if (this.trackPoints.length > this.maxTrackPoints) {
      this.trackPoints.shift();
    }
  }

  // 分析轨迹并识别图形
  recognizeShape(): { shape: 'line' | 'circle' | 'rectangle' | 'none'; confidence: number; points?: { start: TrackPoint; end: TrackPoint } | { center: TrackPoint; radius: number } | { topLeft: TrackPoint; bottomRight: TrackPoint } } {
    if (this.trackPoints.length < this.minPointsForRecognition) {
      return { shape: 'none', confidence: 0 };
    }

    // 检测直线
    const lineResult = this.detectLine();
    if (lineResult.confidence > 0.7) {
      return lineResult;
    }

    // 检测圆形
    const circleResult = this.detectCircle();
    if (circleResult.confidence > 0.6) {
      return circleResult;
    }

    // 检测矩形
    const rectangleResult = this.detectRectangle();
    if (rectangleResult.confidence > 0.6) {
      return rectangleResult;
    }

    return { shape: 'none', confidence: 0 };
  }

  private detectLine(): { shape: 'line'; confidence: number; points: { start: TrackPoint; end: TrackPoint } } {
    const start = this.trackPoints[0];
    const end = this.trackPoints[this.trackPoints.length - 1];
    
    // 计算所有点到直线的距离
    let totalDeviation = 0;
    const lineLength = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    
    for (let i = 1; i < this.trackPoints.length - 1; i++) {
      const point = this.trackPoints[i];
      const deviation = this.pointToLineDistance(point, start, end);
      totalDeviation += deviation;
    }

    const avgDeviation = totalDeviation / (this.trackPoints.length - 2);
    const confidence = Math.max(0, 1 - (avgDeviation * 10)); // 调整系数

    return {
      shape: 'line',
      confidence: lineLength > 0.1 ? confidence : 0, // 确保线段足够长
      points: { start, end }
    };
  }

  private detectCircle(): { shape: 'circle'; confidence: number; points: { center: TrackPoint; radius: number } } {
    // 简单的圆形检测：计算中心点和平均半径
    let centerX = 0, centerY = 0;
    this.trackPoints.forEach(point => {
      centerX += point.x;
      centerY += point.y;
    });
    centerX /= this.trackPoints.length;
    centerY /= this.trackPoints.length;

    const center = { x: centerX, y: centerY, timestamp: Date.now() };

    // 计算平均半径和半径变化
    let totalRadius = 0;
    let radiusDeviation = 0;
    
    this.trackPoints.forEach(point => {
      const radius = Math.sqrt(Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2));
      totalRadius += radius;
    });
    
    const avgRadius = totalRadius / this.trackPoints.length;
    
    this.trackPoints.forEach(point => {
      const radius = Math.sqrt(Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2));
      radiusDeviation += Math.abs(radius - avgRadius);
    });
    
    const avgDeviation = radiusDeviation / this.trackPoints.length;
    const confidence = Math.max(0, 1 - (avgDeviation * 15)); // 调整系数

    return {
      shape: 'circle',
      confidence: avgRadius > 0.05 ? confidence : 0, // 确保圆形足够大
      points: { center, radius: avgRadius }
    };
  }

  private detectRectangle(): { shape: 'rectangle'; confidence: number; points: { topLeft: TrackPoint; bottomRight: TrackPoint } } {
    // 找到边界框
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    this.trackPoints.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });

    const width = maxX - minX;
    const height = maxY - minY;
    
    // 检查是否接近矩形路径
    let edgePoints = 0;
    const tolerance = 0.05;
    
    this.trackPoints.forEach(point => {
      const nearLeftEdge = Math.abs(point.x - minX) < tolerance;
      const nearRightEdge = Math.abs(point.x - maxX) < tolerance;
      const nearTopEdge = Math.abs(point.y - minY) < tolerance;
      const nearBottomEdge = Math.abs(point.y - maxY) < tolerance;
      
      if (nearLeftEdge || nearRightEdge || nearTopEdge || nearBottomEdge) {
        edgePoints++;
      }
    });

    const edgeRatio = edgePoints / this.trackPoints.length;
    const aspectRatio = Math.min(width, height) / Math.max(width, height);
    const confidence = edgeRatio * aspectRatio;

    return {
      shape: 'rectangle',
      confidence: (width > 0.1 && height > 0.1) ? confidence : 0,
      points: {
        topLeft: { x: minX, y: minY, timestamp: Date.now() },
        bottomRight: { x: maxX, y: maxY, timestamp: Date.now() }
      }
    };
  }

  private pointToLineDistance(point: TrackPoint, lineStart: TrackPoint, lineEnd: TrackPoint): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    const param = dot / lenSq;
    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  clearTrack(): void {
    this.trackPoints = [];
  }

  getTrackPoints(): TrackPoint[] {
    return [...this.trackPoints];
  }
}

// 手势稳定化：防止手势抖动
export class GestureStabilizer {
  private gestureHistory: GestureResult[] = [];
  private readonly historySize = 5;
  private readonly confidenceThreshold = 0.6;

  addGesture(gesture: GestureResult): GestureResult {
    this.gestureHistory.push(gesture);
    
    if (this.gestureHistory.length > this.historySize) {
      this.gestureHistory.shift();
    }

    // 计算最频繁的手势类型
    const gestureCount: { [key: string]: number } = {};
    this.gestureHistory.forEach(g => {
      gestureCount[g.type] = (gestureCount[g.type] || 0) + 1;
    });

    const mostFrequent = Object.entries(gestureCount)
      .sort(([,a], [,b]) => b - a)[0];

    if (mostFrequent && mostFrequent[1] >= Math.ceil(this.historySize * this.confidenceThreshold)) {
      const recentGesture = this.gestureHistory[this.gestureHistory.length - 1];
      return {
        type: mostFrequent[0] as GestureResult['type'],
        position: recentGesture.position,
        confidence: mostFrequent[1] / this.historySize
      };
    }

    return { type: 'none', position: gesture.position, confidence: 0 };
  }

  reset() {
    this.gestureHistory = [];
  }
}