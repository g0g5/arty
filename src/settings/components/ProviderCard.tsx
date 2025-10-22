import type { ProviderCardProps } from '../../shared/types/components';

/**
 * ProviderCard Component
 * Displays a single provider profile with edit and delete actions
 */
function ProviderCard({ provider, onEdit, onDelete }: ProviderCardProps) {
  // Mask API key - show only last 4 characters
  const maskApiKey = (key: string): string => {
    if (key.length <= 4) return '****';
    return '•'.repeat(key.length - 4) + key.slice(-4);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{provider.baseUrl}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
            aria-label={`Edit ${provider.name}`}
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
            aria-label={`Delete ${provider.name}`}
          >
            Delete
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        <div>
          <span className="text-xs font-medium text-gray-600">API Key:</span>
          <div className="mt-1 text-sm text-gray-800 font-mono break-all">
            {maskApiKey(provider.apiKey)}
          </div>
        </div>
        
        <div>
          <span className="text-xs font-medium text-gray-600">Models:</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {provider.models.length > 0 ? (
              provider.models.map((model, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                >
                  {model}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400 italic">No models configured</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
        Created: {new Date(provider.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

export default ProviderCard;
