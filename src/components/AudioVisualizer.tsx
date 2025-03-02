import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioStream: MediaStream | null;
  isRecording: boolean;
}

export default function AudioVisualizer({ audioStream, isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode>(null);
  const audioContextRef = useRef<AudioContext>(null);

  useEffect(() => {
    if (!audioStream || !isRecording || !canvasRef.current) return;

    // 初始化音频上下文和分析器
    audioContextRef.current = new AudioContext();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;

    // 连接音频流
    const source = audioContextRef.current.createMediaStreamSource(audioStream);
    source.connect(analyserRef.current);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isRecording) return;

      animationFrameId.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgb(20, 20, 20)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#8b5cf6'); // Violet
        gradient.addColorStop(1, '#3b82f6'); // Blue

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioStream, isRecording]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-24 rounded-lg bg-gray-900"
      width={800}
      height={100}
    />
  );
} 