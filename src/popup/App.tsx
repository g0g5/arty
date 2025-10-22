import { useEffect, useState } from 'react'

function App() {
  const [version, setVersion] = useState<string>('1.0.0')

  useEffect(() => {
    // Read version from manifest.json
    const manifestData = chrome.runtime.getManifest()
    setVersion(manifestData.version)
  }, [])

  const handleOpenSettings = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') })
  }

  const handleOpenEditor = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('editor.html') })
  }

  return (
    <div className="w-[300px] h-[400px] flex flex-col bg-white">
      {/* Header Section with Logo and Info */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-8">
        {/* Logo Placeholder */}
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <svg
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </div>

        {/* Extension Name */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Agentic Editor
        </h1>

        {/* Version */}
        <p className="text-sm text-gray-500 mb-8">
          Version {version}
        </p>

        {/* Action Buttons */}
        <div className="w-full space-y-3">
          <button
            onClick={handleOpenSettings}
            className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            Open Settings
          </button>
          
          <button
            onClick={handleOpenEditor}
            className="w-full px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            Open Editor
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          AI-powered text editing assistant
        </p>
      </div>
    </div>
  )
}

export default App
