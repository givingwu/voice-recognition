import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Badge, Descriptions, Alert } from 'antd';
import useWebSocket from 'react-use-websocket';

export interface WebSocketServiceRef {
  sendAudioStream: (audioData: Blob) => void;
}

interface WebSocketServiceProps {
  onReady: () => void;
  onError: (error: Error) => void;
}

const WebSocketService = forwardRef<WebSocketServiceRef, WebSocketServiceProps>(({ onReady, onError }, ref) => {
  const [wsStatus, setWsStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(new Audio());

  // WebSocket 连接
  const {
    sendMessage,
    lastMessage,
    readyState,
  } = useWebSocket(import.meta.env.VITE_SOCKET_URL, {
    onOpen: () => {
      console.log('WebSocket 连接已建立');
      setWsStatus('connected');
      onReady();
    },
    onClose: () => {
      console.log('WebSocket 连接已关闭');
      setWsStatus('idle');
    },
    onError: (event) => {
      console.error('WebSocket 错误:', event);
      setWsStatus('error');
      const wsError = new Error('WebSocket 连接错误');
      setError(wsError);
      onError(wsError);
    },
    shouldReconnect: () => true,
    reconnectInterval: 3000,
    reconnectAttempts: 5
  });

  // 处理服务器返回的音频数据
  useEffect(() => {
    if (lastMessage) {
      try {
        const audioBlob = new Blob([lastMessage.data], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);

        audioPlayerRef.current.src = audioUrl;
        audioPlayerRef.current.play().catch(error => {
          console.error('播放失败:', error);
          onError(error);
        });
      } catch (error) {
        console.error('处理音频数据失败:', error);
        onError(error as Error);
      }
    }
  }, [lastMessage, onError]);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    sendAudioStream: (audioData: Blob) => {
      if (readyState === WebSocket.OPEN) {
        sendMessage(audioData);
      } else {
        onError(new Error('WebSocket 未连接'));
      }
    }
  }));

  // 获取 WebSocket 状态文本
  const getConnectionStatus = () => {
    switch (readyState) {
      case WebSocket.CONNECTING:
        return '连接中...';
      case WebSocket.OPEN:
        return '已连接';
      case WebSocket.CLOSING:
        return '正在关闭...';
      case WebSocket.CLOSED:
        return '已断开';
      default:
        return '未知状态';
    }
  };

  return (
    <>
      <Descriptions column={2}>
        <Descriptions.Item label="连接状态">
          <Badge 
            status={
              wsStatus === 'connected' ? "success" :
              wsStatus === 'connecting' ? "processing" :
              wsStatus === 'error' ? "error" : "default"
            } 
            text={getConnectionStatus()} 
          />
        </Descriptions.Item>
        <Descriptions.Item label="错误状态">
          <Badge 
            status={error ? "error" : "success"} 
            text={error ? "有错误" : "正常"} 
          />
        </Descriptions.Item>
      </Descriptions>

      {error && (
        <Alert
          type="error"
          message="错误详情"
          description={error.message}
          showIcon
          className="mt-4"
        />
      )}
    </>
  );
});

export default WebSocketService;