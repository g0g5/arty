import type { ToolCardProps } from '../../shared/types/components';

function ToolCard({ tool }: ToolCardProps) {
  // Format the tool definition as JSON with proper indentation
  const toolJson = JSON.stringify(tool, null, 2);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Tool Name */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {tool.name}
      </h3>

      {/* Tool Description */}
      <p className="text-sm text-gray-600 mb-4">
        {tool.description}
      </p>

      {/* JSON Definition */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 overflow-x-auto">
        <pre className="text-xs font-mono text-gray-800 whitespace-pre">
          <code>{toolJson}</code>
        </pre>
      </div>
    </div>
  );
}

export default ToolCard;
