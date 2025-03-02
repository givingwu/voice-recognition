import { useCallback, useState } from 'react';
import { ErrorState, ErrorType } from '../types/error';


interface ErrorDisplayProps {
  onErrorClear?: () => void;
  autoHideDuration?: number;
}

export const formatErrorMessage = (error: Error, prefix?: string): string => {
  return `${prefix ? prefix + ': ' : ''}${error.message}`;
};

export function useErrorHandler({ onErrorClear, autoHideDuration = 5000 }: ErrorDisplayProps = {}) {
  const [error, setError] = useState<ErrorState>({
    type: null,
    message: null
  });

  // 清除错误
  const clearError = useCallback(() => {
    setError({ type: null, message: null });
    onErrorClear?.();
  }, [onErrorClear]);

  // 设置错误
  const setErrorWithType = useCallback((type: ErrorType, message: string) => {
    setError({ type, message });
    if (autoHideDuration > 0) {
      setTimeout(clearError, autoHideDuration);
    }
  }, [autoHideDuration, clearError]);

  // 处理特定类型的错误
  const handleError = useCallback((error: Error, type: ErrorType, context?: string) => {
    const message = formatErrorMessage(error, context);
    setErrorWithType(type, message);
  }, [setErrorWithType]);

  return {
    error,
    clearError,
    setErrorWithType,
    handleError,
    handleRecordingError: useCallback((error: Error, context?: string) => {
      handleError(error, 'recording', context);
    }, [handleError]),
    handleProcessingError: useCallback((error: Error, context?: string) => {
      handleError(error, 'processing', context);
    }, [handleError]),
    handlePlaybackError: useCallback((error: Error, context?: string) => {
      handleError(error, 'playback', context);
    }, [handleError])
  };
}
