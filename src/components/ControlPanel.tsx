import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Play, 
  Square, 
  Palette, 
  Brush, 
  Eraser, 
  Hand, 
  Camera,
  Trash2,
  Minus,
  Square as RectIcon,
  Circle,
  Wand2
} from 'lucide-react';
import type { DrawingSettings } from './Canvas';

interface ControlPanelProps {
  drawingSettings: DrawingSettings;
  onSettingsChange: (settings: DrawingSettings) => void;
  onClearCanvas: () => void;
  isTracking: boolean;
  onToggleTracking: () => void;
  currentGesture: string;
  gestureConfidence: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  drawingSettings,
  onSettingsChange,
  onClearCanvas,
  isTracking,
  onToggleTracking,
  currentGesture,
  gestureConfidence
}) => {
  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
    '#800080', '#008000', '#800000', '#000080'
  ];

  const handleColorChange = (color: string) => {
    onSettingsChange({ ...drawingSettings, color });
  };

  const handleBrushSizeChange = (value: number[]) => {
    onSettingsChange({ ...drawingSettings, brushSize: value[0] });
  };

  const handleEraserSizeChange = (value: number[]) => {
    onSettingsChange({ ...drawingSettings, eraserSize: value[0] });
  };

  const getGestureIcon = (gesture: string) => {
    switch (gesture) {
      case 'draw':
        return <Brush className="w-4 h-4" />;
      case 'erase':
        return <Eraser className="w-4 h-4" />;
      case 'line':
        return <Minus className="w-4 h-4" />;
      case 'rectangle':
        return <RectIcon className="w-4 h-4" />;
      case 'circle':
        return <Circle className="w-4 h-4" />;
      case 'menu':
        return <Hand className="w-4 h-4" />;
      default:
        return <Camera className="w-4 h-4" />;
    }
  };

  const getGestureText = (gesture: string) => {
    switch (gesture) {
      case 'draw':
        return '绘图';
      case 'erase':
        return '擦除';
      case 'line':
        return '直线';
      case 'rectangle':
        return '矩形';
      case 'circle':
        return '圆形';
      case 'menu':
        return '菜单';
      default:
        return '无手势';
    }
  };

  const getGestureBadgeVariant = (gesture: string, confidence: number) => {
    if (confidence < 0.3) return 'outline';
    switch (gesture) {
      case 'draw':
        return 'default';
      case 'erase':
        return 'destructive';
      case 'line':
        return 'secondary';
      case 'rectangle':
        return 'secondary';
      case 'circle':
        return 'secondary';
      case 'menu':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="fixed top-4 right-4 w-80 max-w-[calc(100vw-2rem)] md:max-w-80 z-50 backdrop-blur-sm bg-background/95 border shadow-lg max-h-[calc(100vh-2rem)] overflow-y-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="w-5 h-5" />
          空中画布控制
        </CardTitle>
        <CardDescription>
          用手势在空中绘画
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 追踪控制 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">手部追踪</label>
            <Switch 
              checked={isTracking}
              onCheckedChange={onToggleTracking}
            />
          </div>
          
          <Button
            onClick={onToggleTracking}
            variant={isTracking ? "destructive" : "default"}
            className="w-full"
            size="lg"
          >
            {isTracking ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                停止追踪
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                开始追踪
              </>
            )}
          </Button>
        </div>

        {/* 矢量模式切换 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              矢量模式
            </label>
            <Switch 
              checked={drawingSettings.vectorMode}
              onCheckedChange={(checked) => 
                onSettingsChange({ ...drawingSettings, vectorMode: checked })
              }
            />
          </div>
          {drawingSettings.vectorMode && (
            <div className="text-xs text-muted-foreground bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-3 rounded-lg border">
              <div className="flex items-center gap-2 font-semibold mb-2 text-foreground">
                <Wand2 className="w-3 h-3" />
                <span>矢量手势指南</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-1 rounded bg-green-100 dark:bg-green-950/30">
                  <Minus className="w-3 h-3 text-green-600" />
                  <span><strong>食指+中指伸直</strong> → 精确直线</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded bg-yellow-100 dark:bg-yellow-950/30">
                  <Circle className="w-3 h-3 text-yellow-600" />
                  <span><strong>OK手势</strong> (拇指+食指) → 完美圆形</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded bg-purple-100 dark:bg-purple-950/30">
                  <RectIcon className="w-3 h-3 text-purple-600" />
                  <span><strong>拇指伸直+握拳</strong> → 标准矩形</span>
                </div>
              </div>
              <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-amber-800 dark:text-amber-200">
                <div className="text-xs font-medium">💡 提示：</div>
                <div className="text-xs">也可以自由绘画，系统会智能识别并转换为矢量图形</div>
              </div>
            </div>
          )}
        </div>

        {/* 当前手势显示 */}
        {isTracking && (
          <div className="space-y-2">
            <label className="text-sm font-medium">当前手势</label>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                {getGestureIcon(currentGesture)}
                <span className="text-sm font-medium">
                  {getGestureText(currentGesture)}
                </span>
              </div>
              <Badge variant={getGestureBadgeVariant(currentGesture, gestureConfidence)}>
                {Math.round(gestureConfidence * 100)}%
              </Badge>
            </div>
          </div>
        )}

        {/* 颜色选择 */}
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Palette className="w-4 h-4" />
            画笔颜色
          </label>
          <div className="grid grid-cols-6 gap-2">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 ${
                  drawingSettings.color === color 
                    ? 'border-ring ring-2 ring-ring ring-offset-2' 
                    : 'border-border hover:border-ring'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* 画笔大小 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <Brush className="w-4 h-4" />
              画笔大小
            </label>
            <Badge variant="outline">{drawingSettings.brushSize}px</Badge>
          </div>
          <Slider
            value={[drawingSettings.brushSize]}
            onValueChange={handleBrushSizeChange}
            max={20}
            min={2}
            step={1}
            className="w-full"
          />
        </div>

        {/* 擦除器大小 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <Eraser className="w-4 h-4" />
              擦除大小
            </label>
            <Badge variant="outline">{drawingSettings.eraserSize}px</Badge>
          </div>
          <Slider
            value={[drawingSettings.eraserSize]}
            onValueChange={handleEraserSizeChange}
            max={50}
            min={10}
            step={1}
            className="w-full"
          />
        </div>

        {/* 清空画布 */}
        <Button
          onClick={onClearCanvas}
          variant="destructive"
          className="w-full"
          size="lg"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          清空画布
        </Button>

        {/* 手势说明 */}
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Hand className="w-4 h-4" />
            手势参考
          </label>
          
          {/* 基础手势 */}
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="text-xs font-medium mb-2 text-muted-foreground">基础手势</div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-3 p-2 rounded bg-background/50">
                <Brush className="w-3 h-3 text-blue-600" />
                <div>
                  <span className="font-medium">食指伸直</span>
                  <span className="text-muted-foreground ml-2">→ 自由绘画</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded bg-background/50">
                <Eraser className="w-3 h-3 text-red-600" />
                <div>
                  <span className="font-medium">握拳</span>
                  <span className="text-muted-foreground ml-2">→ 擦除模式</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded bg-background/50">
                <Hand className="w-3 h-3 text-gray-600" />
                <div>
                  <span className="font-medium">五指张开</span>
                  <span className="text-muted-foreground ml-2">→ 菜单手势</span>
                </div>
              </div>
            </div>
          </div>

          {/* 矢量手势 */}
          {drawingSettings.vectorMode && (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-3 rounded-lg border">
              <div className="text-xs font-medium mb-2 text-foreground flex items-center gap-1">
                <Wand2 className="w-3 h-3" />
                矢量手势
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-3 p-2 rounded bg-green-100/50 dark:bg-green-950/20">
                  <Minus className="w-3 h-3 text-green-600" />
                  <div>
                    <span className="font-medium">食指+中指</span>
                    <span className="text-muted-foreground ml-2">→ 精确直线</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded bg-yellow-100/50 dark:bg-yellow-950/20">
                  <Circle className="w-3 h-3 text-yellow-600" />
                  <div>
                    <span className="font-medium">OK手势</span>
                    <span className="text-muted-foreground ml-2">→ 完美圆形</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded bg-purple-100/50 dark:bg-purple-950/20">
                  <RectIcon className="w-3 h-3 text-purple-600" />
                  <div>
                    <span className="font-medium">拇指+握拳</span>
                    <span className="text-muted-foreground ml-2">→ 标准矩形</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-md">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600">💡</span>
                  <div className="text-xs text-amber-800 dark:text-amber-200">
                    <div className="font-medium">智能识别</div>
                    <div>自由绘画时，系统会自动识别几何图形并转换为矢量</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ControlPanel;