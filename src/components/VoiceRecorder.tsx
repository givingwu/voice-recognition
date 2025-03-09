import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Progress } from 'antd';
import AudioVisualizer from './AudioVisualizer';
import ErrorDisplay from './ErrorDisplay';
import { useErrorHandler } from '../hooks/error.hook';
import { WebSocketServiceRef } from './WebSocketService';

interface VoiceRecorderProps {
  isActive: boolean;
  onComplete: () => void;
  wsRef: React.RefObject<WebSocketServiceRef>;
}

interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  timeoutProgress: number;
}

export default function VoiceRecorder({ isActive, onComplete, wsRef }: VoiceRecorderProps) {
  // 状态管理
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false,
    isPlaying: false,
    timeoutProgress: 0,
  });

  // 错误处理
  const {
    error,
    clearError,
    handleRecordingError,
    handleProcessingError,
    handlePlaybackError
  } = useErrorHandler();

  // Refs
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioStream = useRef<MediaStream | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // 停止录音
  const stopRecording = useCallback(() => {
    if (!mediaRecorder.current) return;
    if (mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
    }

    setState(prev => ({ ...prev, isRecording: false }));
  }, []);

  // 处理录音
  const processRecording = useCallback(async () => {
    setState(prev => ({ ...prev, isProcessing: true }));
    clearError();

    try {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
      if (audioBlob.size === 0) {
        throw new Error('没有检测到有效的音频数据');
      }

      // 通过 WebSocket 发送音频数据
      if (wsRef.current) {
        wsRef.current.sendAudioStream(audioBlob);
      } else {
        throw new Error('WebSocket 服务未就绪');
      }

      // 开始显示处理进度
      let progress = 0;
      progressIntervalRef.current = window.setInterval(() => {
        progress = Math.min(progress + 1, 90);
        setState(prev => ({ ...prev, timeoutProgress: progress }));
      }, 100);

    } catch (error) {
      console.error('Processing error:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
      handleProcessingError(error as Error);
    }
  }, [clearError, handleProcessingError, wsRef]);

  // 开始录音
  const startRecording = useCallback(() => {
    if (!mediaRecorder.current) {
      handleRecordingError(new Error('录音设备未就绪'));
      return;
    }

    try {
      audioChunks.current = [];
      mediaRecorder.current.start();
      setState(prev => ({ ...prev, isRecording: true }));
      clearError();

      // 30秒后自动停止录音
      timeoutRef.current = window.setTimeout(() => {
        stopRecording();
      }, 30000);
    } catch (error) {
      handleRecordingError(error as Error, '启动录音失败');
    }
  }, [stopRecording, clearError, handleRecordingError]);

  // 初始化录音
  const initializeRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      audioStream.current = stream;
      mediaRecorder.current = new MediaRecorder(stream);

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onerror = (event) => {
        handleRecordingError(event.error, '录音设备错误');
      };

      mediaRecorder.current.onstop = async () => {
        await processRecording();
      };

      // 开始录音
      startRecording();
    } catch (error) {
      console.error('Failed to initialize recording:', error);
      handleRecordingError(error as Error, '初始化录音设备失败');
    }
  }, [processRecording, startRecording, handleRecordingError]);

  // 清理资源
  const cleanup = useCallback(() => {
    if (audioStream.current) {
      audioStream.current.getTracks().forEach(track => track.stop());
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    clearError();
  }, [clearError]);

  // 处理组件激活状态
  useEffect(() => {
    if (isActive) {
      initializeRecording();
    } else {
      stopRecording();
      cleanup();
    }
  }, [isActive, initializeRecording, stopRecording, cleanup]);

  // 清理函数
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return (
    <div className="flex flex-col gap-4">
      {/* 错误提示 */}
      <ErrorDisplay error={error} onClose={clearError} />

      {/* 录音状态显示 */}
      {state.isRecording && (
        <>
          <Alert
            type="info"
            message="正在录音..."
            showIcon
            className="mb-4"
          />
          <AudioVisualizer
            audioStream={audioStream.current}
            isRecording={state.isRecording}
          />
        </>
      )}

      {/* 处理状态显示 */}
      {state.isProcessing && (
        <div className="mt-4">
          <Alert
            type="warning"
            message="正在处理..."
            showIcon
          />
          <Progress
            percent={state.timeoutProgress}
            status="active"
            showInfo={false}
            className="mt-2"
          />
        </div>
      )}
    </div>
  );
}
