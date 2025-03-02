import { Alert } from 'antd';
import { ErrorState, ERROR_STRATEGIES } from '../types/error';

export default function ErrorDisplay({ error, onClose }: {
  error: ErrorState;
  onClose?: () => void;
}) {
  if (!error.message || !error.type) return null;

  const strategy = ERROR_STRATEGIES[error.type];

  return (
    <Alert
      type="error"
      message={strategy.title}
      description={
        <div className="space-y-1">
          <p>{strategy.getDescription(error.message)}</p>
          <p className="text-gray-500 text-sm">{strategy.action}</p>
        </div>
      }
      showIcon
      closable
      onClose={onClose}
      className="mb-4"
    />
  );
}
