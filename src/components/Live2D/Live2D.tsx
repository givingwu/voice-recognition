import React, { useEffect, useRef, useCallback, forwardRef } from 'react';

interface Live2DProps {
  width?: number;
  height?: number;
  modelId?: number;
  position?: 'left' | 'right';
  onLoad?: () => void;
}

interface Live2DInstance {
  speak: (text: string, timeout?: number) => void;
  move: (x: number, y: number) => void;
  eyeShine: () => void;
  changeModel: (modelId: number) => void;
}

declare global {
  interface Window {
    loadlive2d: (canvasId: string, modelPath: string) => void;
    live2d_settings: Record<string, unknown>;
    showMessage: (text: string, timeout?: number) => void;
    loadOtherModel: () => void;
    loadRandModel: () => void;
    loadTipsMessage: () => void;
  }
}

export const Live2D = forwardRef<Live2DInstance, Live2DProps>(({
  width = 600,
  height = 535,
  modelId = 2,
  position = 'right',
  onLoad
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 初始化 Live2D
  useEffect(() => {
    const loadScripts = async () => {
      try {
        // 加载必要的脚本
        await Promise.all([
          loadScript('https://live2d.fghrsh.net/assets/1.4.2/jquery.min.js'),
          loadScript('https://live2d.fghrsh.net/assets/1.4.2/jquery-ui.min.js')
        ]);

        await Promise.all([
          loadScript('https://live2d.fghrsh.net/assets/1.4.2/waifu-tips.min.js'),
          loadScript('https://live2d.fghrsh.net/assets/1.4.2/live2d.min.js')
        ]);

        // 配置 Live2D 设置
        window.live2d_settings = {
          modelId,
          modelTexturesId: 6,
          modelStorage: false,
          canCloseLive2d: false,
          canTurnToHomePage: false,
          waifuSize: `${width}x${height}`,
          waifuTipsSize: '570x150',
          waifuFontSize: '30px',
          waifuEdgeSide: `${position}:0`,
          waifuToolFont: '36px',
          waifuToolLine: '50px',
          waifuToolTop: '-60px',
          waifuDraggable: 'axis-x',
        };

        onLoad?.();
      } catch (error) {
        console.error('Failed to load Live2D:', error);
      }
    };

    loadScripts();
  }, [width, height, modelId, position, onLoad]);

  // 说话功能
  const speak = useCallback((text: string, timeout = 4000) => {
    if (window.showMessage) {
      window.showMessage(text, timeout);
    }
  }, []);

  // 移动或弹跳
  const move = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const newX = rect.left + x;
      const newY = rect.top + y;

      // @ts-expect-error the $ will be loaded after `loadScripts` function executed
      $(canvas).animate({ left: newX, top: newY }, 500, 'easeOutElastic');
    }
  }, []);

  // 眼睛闪烁
  const eyeShine = useCallback(() => {
    if (window.loadOtherModel) {
      // 通过切换表情实现眼睛闪烁效果
      window.loadOtherModel();
      setTimeout(() => window.loadRandModel(), 100);
    }
  }, []);

  // 切换模型
  const changeModel = useCallback((newModelId: number) => {
    if (window.live2d_settings) {
      window.live2d_settings.modelId = newModelId;
      window.loadlive2d('live2d', `https://live2d.fghrsh.net/get/?id=${newModelId}`);
    }
  }, []);

  // 暴露 API 给父组件
  React.useImperativeHandle<Live2DInstance, Live2DInstance>(
    ref,
    () => ({
      speak,
      move,
      eyeShine,
      changeModel
    }),
    [speak, move, eyeShine, changeModel]
  );

  return (
    <div
      ref={containerRef}
      className="waifu"
      style={{
        position: 'fixed',
        bottom: 0,
        [position]: 0,
        zIndex: 1000
      }}
    >
      <div className="waifu-tips"></div>
      <canvas
        ref={canvasRef}
        id="live2d"
        className="live2d"
        width={width}
        height={height}
        style={{
          position: 'relative',
          width,
          height
        }}
      />
    </div>
  );
});

// 辅助函数：加载脚本
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}

export default Live2D; 