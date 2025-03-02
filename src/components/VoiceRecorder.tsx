import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Progress } from 'antd';
import AudioVisualizer from './AudioVisualizer';
import ErrorDisplay from './ErrorDisplay';
import { useErrorHandler } from '../hooks/error.hook';

interface VoiceRecorderProps {
  isActive: boolean;
  onComplete: () => void;
}

interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  continuousMode: boolean;
  timeoutProgress: number;
}

export default function VoiceRecorder({ isActive, onComplete }: VoiceRecorderProps) {
  // 状态管理
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false,
    isPlaying: false,
    continuousMode: false,
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
  const audioPlayer = useRef<HTMLAudioElement>(new Audio());
  const timeoutRef = useRef<number>(null);
  const continuousModeTimeoutRef = useRef<number>(null);
  const progressIntervalRef = useRef<number>(null);

  // 停止录音
  const stopRecording = useCallback(() => {
    if (!mediaRecorder.current) return;
    if (mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
    }

    setState(prev => ({ ...prev, isRecording: false }));
  }, []);

  // 结束持续模式
  const endContinuousMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      continuousMode: false,
      timeoutProgress: 0
    }));
    onComplete();
  }, [onComplete]);

  // 处理录音
  const processRecording = useCallback(async () => {
    setState(prev => ({ ...prev, isProcessing: true }));
    clearError();

    try {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
      if (audioBlob.size === 0) {
        throw new Error('没有检测到有效的音频数据');
      }

      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch(import.meta.env.VITE_API_ENDPOINT, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.statusText}`);
      }

      const responseBlob = await response.blob();
      if (responseBlob.size === 0) {
        throw new Error('服务器返回的音频数据无效');
      }

      const audioUrl = URL.createObjectURL(responseBlob);

      // 播放响应
      audioPlayer.current.src = audioUrl;
      setState(prev => ({ ...prev, isProcessing: false, isPlaying: true }));

      try {
        await audioPlayer.current.play();
      } catch (playError) {
        handlePlaybackError(playError as Error);
        return;
      }

      // 播放结束后进入持续模式
      audioPlayer.current.onended = () => {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          continuousMode: true,
          timeoutProgress: 100
        }));
        startContinuousMode();
      };

    } catch (error) {
      console.error('Processing error:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
      handleProcessingError(error as Error);
    }
  }, [clearError, handleProcessingError, handlePlaybackError]);

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

      // 5秒后自动停止录音
      timeoutRef.current = window.setTimeout(() => {
        stopRecording();
      }, 5000);
    } catch (error) {
      handleRecordingError(error as Error, '启动录音失败');
    }
  }, [stopRecording, clearError, handleRecordingError]);

  // 持续模式处理
  const startContinuousMode = useCallback(() => {
    let progress = 100;
    const interval = 150; // 15秒 = 100步

    const updateProgress = () => {
      progress -= 1;
      setState(prev => ({ ...prev, timeoutProgress: progress }));

      if (progress <= 0) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        endContinuousMode();
      }
    };

    // 每 150ms 更新一次进度
    progressIntervalRef.current = window.setInterval(updateProgress, interval);

    // 15 秒后结束持续模式
    continuousModeTimeoutRef.current = window.setTimeout(() => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      endContinuousMode();
    }, 15000);
  }, [endContinuousMode]);

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
    if (continuousModeTimeoutRef.current) {
      clearTimeout(continuousModeTimeoutRef.current);
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
        <Alert
          type="warning"
          message="正在处理..."
          showIcon
        />
      )}

      {/* 播放状态显示 */}
      {state.isPlaying && (
        <Alert
          type="success"
          message="正在播放响应..."
          showIcon
        />
      )}

      {/* 持续模式显示 */}
      {state.continuousMode && (
        <div className="mt-4">
          <Alert
            type="info"
            message="等待后续输入..."
            description="15秒内可以继续说话"
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
