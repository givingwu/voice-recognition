import { useCallback, useEffect, useState } from "react";
import { Input, Button, Typography, Alert, Card, Space, Badge, Descriptions, Flex } from 'antd';
import { AudioOutlined, ApiOutlined, PoweroffOutlined } from '@ant-design/icons';
import { usePorcupine } from "@picovoice/porcupine-react";

import picovoiceModels from "../lib/picovoiceModels";
import porcupineWakeWord from "../lib/porcupineWakeWord";
import VoiceRecorder from "./VoiceRecorder";

const porcupineModel = picovoiceModels[0];
const { Title, Text } = Typography;

export default function VoiceAssistant() {
  const [accessKey, setAccessKey] = useState(import.meta.env.VITE_ACCESS_KEY || '');
  const [isRecorderActive, setIsRecorderActive] = useState(false);

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
      await init(
        accessKey,
        porcupineWakeWord,
        porcupineModel
      );
      await start();
    };

    if (accessKey) {
      openVoiceListening();
    }

    return () => {
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

  return (
    <div className="flex flex-col gap-4 shadow-lg p-6 max-w-4xl m-auto">
      <Title level={2} className="mb-6 flex items-center">
        <AudioOutlined className="mr-2" />
        语音唤醒组件
      </Title>

      {/* 密钥配置 */}
      <Card size="small">
        <Space direction="vertical" className="w-full">
          <Text strong>访问密钥配置</Text>
          <Flex>
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

      {/* 状态指示 */}
      <Card size="small">
        <Descriptions column={3}>
          <Descriptions.Item label="状态">
            <Badge status={isLoaded ? "success" : "default"} text={isLoaded ? "已加载" : "未加载"} />
          </Descriptions.Item>
          <Descriptions.Item label="监听状态">
            <Badge status={isListening ? "processing" : "default"} text={isListening ? "活跃" : "未激活"} />
          </Descriptions.Item>
          <Descriptions.Item label="错误状态">
            <Badge status={error ? "error" : "success"} text={error ? "有错误" : "正常"} />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert type="error" message="错误详情" description={error.message} showIcon />
      )}

      {/* 控制按钮 */}
      <Space className="w-full justify-center">
        <Button
          type="primary"
          icon={<AudioOutlined />}
          onClick={async () => await start()}
          disabled={!isLoaded || isListening}
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

      {/* 语音录制器 */}
      {isRecorderActive && (
        <VoiceRecorder
          isActive={isRecorderActive}
          onComplete={handleRecordingComplete}
        />
      )}

      {/* 唤醒状态反馈 */}
      {isListening && !isRecorderActive && (
        <Alert
          type="info"
          message={`等待唤醒词 “${porcupineWakeWord.label}” 中...`}
          showIcon
        />
      )}
    </div>
  );
}