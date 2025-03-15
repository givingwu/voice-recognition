import { useCallback, useEffect, useRef, useState } from "react";
import { Input, Button, Typography, Alert, Card, Space, Badge, Descriptions, Flex } from 'antd';
import { AudioOutlined, ApiOutlined, PoweroffOutlined, CloudServerOutlined, AuditOutlined } from '@ant-design/icons';
import { usePorcupine } from "@picovoice/porcupine-react";

import picovoiceModels from "../lib/picovoiceModels";
import porcupineWakeWord from "../lib/porcupineWakeWord";
import VoiceRecorder from "./VoiceRecorder";
import WebSocketService, { WebSocketServiceRef } from "./WebSocketService";

const porcupineModel = picovoiceModels[0];
const { Title, Text } = Typography;

export default function VoiceAssistant() {
  const [accessKey, setAccessKey] = useState(import.meta.env.VITE_ACCESS_KEY || '');
  const [isRecorderActive, setIsRecorderActive] = useState(false);
  const [isWebSocketReady, setIsWebSocketReady] = useState(false);
  const isInitializing = useRef(false);
  const wsRef = useRef<WebSocketServiceRef>(null);

  // 使用 Porcupine 专用 Hook
  const {
    keywordDetection,
    isLoaded,
    isListening,
    error,
    init,
    start,
    stop,
    release
  } = usePorcupine();

  // 监听唤醒词检测
  useEffect(() => {
    if (keywordDetection) {
      setIsRecorderActive(true);
    }
  }, [keywordDetection]);

  // 在应用初始化时预加载模型
  useEffect(() => {
    const openVoiceListening = async () => {
      // 先停止并释放已有实例（防止重复初始化）
      if (isLoaded) {
        await stop();
        await release();
      }

      try {
        await init(
          accessKey,
          porcupineWakeWord,
          porcupineModel
        );

        await start();
      } catch (e) {
        console.error('初始化失败:', e);

        if (e instanceof Error) {
          console.error('错误类型:', e.name, '消息:', e.message);
        }
      }
    };

    if (accessKey && !isInitializing.current) {
      isInitializing.current = true;
      openVoiceListening();
    }

    return () => {
      // 清理时确保释放资源
      if (isLoaded) {
        stop();
        release();
      }
    };
  }, [accessKey, isLoaded, init, release, start, stop]);

  // 处理录音完成
  const handleRecordingComplete = useCallback(() => {
    setIsRecorderActive(false);
  }, []);

  // 处理 WebSocket 错误
  const handleWebSocketError = useCallback((error: Error) => {
    console.error('WebSocket 错误:', error);
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <Title level={2} className="mb-6 flex items-center">
        <AudioOutlined className="mr-2" />
        语音助手
      </Title>

      {/* 密钥配置 */}
      <Card
        size="small"
        title={
          <Space>
            <ApiOutlined />
            <Text strong>访问密钥配置</Text>
          </Space>
        }
      >
        <Space direction="vertical" className="w-full">
          <Flex gap={16}>
            <Input
              className="w-3/4"
              placeholder="输入 Picovoice 访问密钥"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
            />
            <Button
              type="primary"
              icon={<ApiOutlined />}
              onClick={async () => {
                await init(accessKey, porcupineWakeWord, porcupineModel);
                await start();
              }}
              className="w-1/4"
            >
              初始化
            </Button>
          </Flex>
          <Text type="secondary">
            从 <a href="https://console.picovoice.ai/" target="_blank" rel="noopener noreferrer">
              Picovoice 控制台
            </a> 获取密钥
          </Text>
        </Space>
      </Card>

      {/* 服务状态区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PicoVoice 状态 */}
        <Card
          title={
            <Space>
              <AuditOutlined />
              <Text strong>语音唤醒服务</Text>
            </Space>
          }
          size="small"
        >
          <div className="flex flex-col gap-4">
            <Descriptions column={2}>
              <Descriptions.Item label="服务状态">
                <Badge status={isLoaded ? "success" : "default"} text={isLoaded ? "已加载" : "未加载"} />
              </Descriptions.Item>
              <Descriptions.Item label="监听状态">
                <Badge status={isListening ? "processing" : "default"} text={isListening ? "活跃" : "未激活"} />
              </Descriptions.Item>
              <Descriptions.Item label="错误状态">
                <Badge status={error ? "error" : "success"} text={error ? "有错误" : "正常"} />
              </Descriptions.Item>
            </Descriptions>

            {error && (
              <Alert type="error" message="错误详情" description={error.message} showIcon />
            )}

            {isListening && !isRecorderActive && (
              <Alert
                type="info"
                message={`等待唤醒词 "${porcupineWakeWord.label}" 中...`}
                showIcon
              />
            )}

            <Space className="w-full justify-center">
              <Button
                type="primary"
                icon={<AudioOutlined />}
                onClick={async () => await start()}
                disabled={!isLoaded || isListening || !isWebSocketReady}
              >
                开始监听
              </Button>
              <Button
                danger
                icon={<PoweroffOutlined />}
                onClick={async () => await stop()}
                disabled={!isLoaded || !isListening}
              >
                停止监听
              </Button>
            </Space>
          </div>
        </Card>

        {/* WebSocket 状态 */}
        <Card
          title={
            <Space>
              <CloudServerOutlined />
              <Text strong>WebSocket 服务</Text>
            </Space>
          }
          size="small"
        >
          <WebSocketService
            ref={wsRef}
            onReady={() => setIsWebSocketReady(true)}
            onError={handleWebSocketError}
          />
        </Card>
      </div>

      {/* 语音录制器 */}
      {isRecorderActive && isWebSocketReady && (
        <Card
          title={
            <Space>
              <AudioOutlined />
              <Text strong>语音录制</Text>
            </Space>
          }
          size="small"
        >
          <VoiceRecorder
            isActive={isRecorderActive}
            onComplete={handleRecordingComplete}
            websocketService={wsRef.current}
          />
        </Card>
      )}
    </div>
  );
}