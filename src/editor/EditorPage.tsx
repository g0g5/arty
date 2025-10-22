/**
 * Editor Page Component
 * Main page layout with settings icon trim and editor layout
 */

import { useState } from 'react';
import App from './App';

function EditorPage() {
  const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);

  const handleOpenSettings = () => {
    // Open settings page in new tab
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  };

  return (
    <div className="h-screen w-full flex">
      {/* Settings Icon Trim - Leftmost */}
      <div className="w-12 h-full bg-gray-800 flex flex-col items-center py-4 border-r border-gray-700">
        <button
          onClick={handleOpenSettings}
          onMouseEnter={() => setShowSettingsTooltip(true)}
          onMouseLeave={() => setShowSettingsTooltip(false)}
          className="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
          aria-label="Open Settings"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>

          {/* Tooltip */}
          {showSettingsTooltip && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50">
              Settings
            </div>
          )}
        </button>
      </div>

      {/* Editor Layout - Main Content */}
      <div className="flex-1 h-full">
        <App />
      </div>
    </div>
  );
}

export default EditorPage;
