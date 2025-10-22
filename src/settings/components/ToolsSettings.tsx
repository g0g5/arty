import ToolGrid from './ToolGrid';
import { TOOL_DEFINITIONS } from '../../shared/constants/tools';

function ToolsSettings() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Tools</h1>
      <p className="text-gray-600 mb-6">
        View available tools for the agentic editor. These tools enable the AI agent to interact with your workspace and files.
      </p>
      
      <ToolGrid tools={TOOL_DEFINITIONS} />
    </div>
  );
}

export default ToolsSettings;
