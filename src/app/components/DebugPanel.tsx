import { useState, useEffect } from 'react';

interface DebugInfo {
  apiCalls: { endpoint: string; status: 'pending' | 'success' | 'error'; time: Date }[];
  errors: { message: string; stack?: string; time: Date }[];
  renderCount: number;
}

const MAX_API_CALLS = 20;
const MAX_ERRORS = 10;

export function DebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    apiCalls: [],
    errors: [],
    renderCount: 0,
  });

  useEffect(() => {
    setDebugInfo(prev => ({ ...prev, renderCount: prev.renderCount + 1 }));
  });

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setDebugInfo(prev => ({
        ...prev,
        errors: [
          { message: event.message, stack: event.error?.stack, time: new Date() },
          ...prev.errors,
        ].slice(0, MAX_ERRORS),
      }));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setDebugInfo(prev => ({
        ...prev,
        errors: [
          { message: `Unhandled: ${event.reason}`, time: new Date() },
          ...prev.errors,
        ].slice(0, MAX_ERRORS),
      }));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg shadow-lg hover:bg-gray-700"
      >
        Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-700">Debug Panel</span>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="max-h-64 overflow-y-auto p-4 space-y-4 text-xs">
        <div>
          <h4 className="font-semibold text-gray-600 mb-1">Render Count</h4>
          <p className="text-gray-800">{debugInfo.renderCount}</p>
        </div>

        {debugInfo.errors.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-600 mb-1">Errors ({debugInfo.errors.length})</h4>
            <div className="space-y-1">
              {debugInfo.errors.slice(0, 5).map((err, i) => (
                <div key={i} className="p-2 bg-red-50 rounded text-red-700">
                  <p className="font-medium">{err.message}</p>
                  {err.stack && (
                    <pre className="text-xs mt-1 overflow-x-auto">{err.stack.slice(0, 100)}</pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {debugInfo.apiCalls.length > 0 && (
          <div>
            <h4 className="font-semibold text-blue-600 mb-1">API Calls</h4>
            <div className="space-y-1">
              {debugInfo.apiCalls.slice(0, 10).map((call, i) => (
                <div
                  key={i}
                  className={`p-2 rounded ${
                    call.status === 'success' ? 'bg-green-50 text-green-700' :
                    call.status === 'error' ? 'bg-red-50 text-red-700' :
                    'bg-yellow-50 text-yellow-700'
                  }`}
                >
                  <p className="font-medium">{call.endpoint}</p>
                  <p>{call.status} - {call.time.toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DebugPanel;
