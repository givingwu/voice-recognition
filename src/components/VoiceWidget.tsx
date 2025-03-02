import { useState } from "react";
import { Input, Button, Typography, Alert, Card, Space, Badge, Descriptions, Flex } from 'antd';
import { AudioOutlined, ApiOutlined, PoweroffOutlined, ReloadOutlined } from '@ant-design/icons';
import { usePicovoice } from "@picovoice/picovoice-react";

import picovoiceModels from "../lib/picovoiceModels";
import porcupineWakeWord from "../lib/porcupineWakeWord";
import rhinoContext from "../lib/rhinoContext";

const [porcupineModel, rhinoModel] = picovoiceModels;
const { Title, Text } = Typography;

export default function VoiceWidget() {
  const [accessKey, setAccessKey] = useState(import.meta.env.VITE_ACCESS_KEY || '');
  const contextName = rhinoContext.publicPath.split("/").pop()?.replace("_wasm.rhn", "");
  const {
    wakeWordDetection,
    inference,
    contextInfo,
    isLoaded,
    isListening,
    error,
    init,
    start,
    stop,
    release,
  } = usePicovoice();

  return (
    <div className="flex flex-col gap-4 shadow-lg p-6">
      <Title level={2} className="mb-6 flex items-center">
        <AudioOutlined className="mr-2" />
        Voice Recognition Widget
      </Title>

      {/* Access Key Section */}
      <Card size="small">
        <Space direction="vertical" className="w-full">
          <Text strong>Access Key Configuration</Text>
          <Flex>
            <Input
              className="w-3/4"
              placeholder="Enter your Picovoice access key"
              value={accessKey}
              variant="filled"
              onChange={(e) => setAccessKey(e.target.value)}
            />
            <Button
              type="primary"
              icon={<ApiOutlined />}
              onClick={async () => await init(accessKey, porcupineWakeWord, porcupineModel, rhinoContext, rhinoModel)}
              className="w-1/4"
            >
              Initialize
            </Button>
          </Flex>
          <Text type="secondary">
            Get your access key from{" "}
            <a href="https://console.picovoice.ai/" target="_blank" rel="noopener noreferrer">
              Picovoice Console
            </a>
          </Text>
        </Space>
      </Card>

      {/* Status Section */}
      <Card size="small">
        <Descriptions column={3}>
          <Descriptions.Item label="Status">
            <Badge status={isLoaded ? "success" : "default"} text={isLoaded ? "Loaded" : "Not Loaded"} />
          </Descriptions.Item>
          <Descriptions.Item label="Listening">
            <Badge status={isListening ? "processing" : "default"} text={isListening ? "Active" : "Inactive"} />
          </Descriptions.Item>
          <Descriptions.Item label="Error">
            <Badge status={error ? "error" : "success"} text={error ? "Error" : "None"} />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert
          type="error"
          message="Error"
          description={error.message}
          showIcon
        />
      )}

      {/* Control Buttons */}
      {/* <Card size="small"> */}
        <Space className="w-full justify-center">
          <Button
            type="primary"
            icon={<AudioOutlined />}
            onClick={async () => await start()}
            disabled={error !== null || !isLoaded || isListening}
          >
            Start
          </Button>
          <Button
            danger
            icon={<PoweroffOutlined />}
            onClick={async () => await stop()}
            disabled={error !== null || !isLoaded || !isListening}
          >
            Stop
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={async () => await release()}
            disabled={error !== null || !isLoaded || isListening}
          >
            Release
          </Button>
        </Space>
      {/* </Card> */}

      {/* Wake Word Detection Status */}
      {isListening && (
        <Card size="small">
          {wakeWordDetection ? (
            <Alert
              type="success"
              message="Wake word detected!"
              showIcon
              className="mb-4"
            />
          ) : (
            <Alert
              type="info"
              message={`Listening for wake word '${porcupineWakeWord.label}'...`}
              showIcon
              className="mb-4"
            />
          )}
        </Card>
      )}

      {/* Inference Results */}
      {isListening && inference && (
        <Card size="small" title="Inference Results">
          <Typography.Text code copyable className="block p-4 bg-gray-50 rounded">
            {JSON.stringify(inference, null, 2)}
          </Typography.Text>
        </Card>
      )}

      {/* Context Information */}
      <Card size="small" title="Context Information">
        <Descriptions column={1}>
          <Descriptions.Item label="Context Name">{contextName}</Descriptions.Item>
          <Descriptions.Item label="Context Info">
            <pre className="bg-gray-50 p-4 rounded">
              {contextInfo}
            </pre>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
