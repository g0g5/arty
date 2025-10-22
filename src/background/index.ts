// Background service worker for Chrome extension

console.log('Agentic Editor background service worker initialized')

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed')
    // Initialize default settings
    chrome.storage.sync.set({
      apiKey: '',
      model: 'gpt-4',
      enabled: true,
    })
  } else if (details.reason === 'update') {
    console.log('Extension updated')
  }
})

// Message handler for communication between components
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Message received:', message)
  
  // Message handling will be implemented in subsequent tasks
  sendResponse({ success: true })
  return true
})

export {}
