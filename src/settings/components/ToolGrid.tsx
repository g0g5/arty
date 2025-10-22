import type { ToolGridProps } from '../../shared/types/components';
import ToolCard from './ToolCard';

function ToolGrid({ tools }: ToolGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {tools.map((tool) => (
        <ToolCard key={tool.name} tool={tool} />
      ))}
    </div>
  );
}

export default ToolGrid;
