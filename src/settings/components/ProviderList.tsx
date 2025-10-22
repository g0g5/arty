import type { ProviderListProps } from '../../shared/types/components';
import ProviderCard from './ProviderCard';

/**
 * ProviderList Component
 * Displays all configured provider profiles
 */
function ProviderList({ providers, onEdit, onDelete }: ProviderListProps) {
  if (providers.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">No providers configured yet.</p>
        <p className="text-sm text-gray-400 mt-2">
          Click "Add Provider" to create your first provider profile.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {providers.map((provider) => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          onEdit={() => onEdit(provider)}
          onDelete={() => onDelete(provider.id)}
        />
      ))}
    </div>
  );
}

export default ProviderList;
