export type ErrorType = 'recording' | 'processing' | 'playback' | null;

export interface ErrorState {
  type: ErrorType;
  message: string | null;
}

export const ERROR_STRATEGIES = {
  recording: {
    title: '录音错误',
    getDescription: (message: string) => message,
    action: '请检查麦克风权限或设备连接'
  },
  processing: {
    title: '处理错误',
    getDescription: (message: string) => message,
    action: '请稍后重试或联系管理员'
  },
  playback: {
    title: '播放错误',
    getDescription: (message: string) => message,
    action: '请检查音频设备是否正常'
  }
} as const;