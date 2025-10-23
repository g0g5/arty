# Agentic Editor Extension - Project Structure

## Directory Structure

```
.
├── public/
│   ├── icons/              # Extension icons (16x16, 48x48, 128x128)
│   └── manifest.json       # Chrome extension manifest (Manifest V3)
├── src/
│   ├── popup/              # Extension popup UI
│   │   ├── index.tsx       # Popup entry point
│   │   └── App.tsx         # Popup main component
│   ├── settings/           # Settings page
│   │   ├── index.tsx       # Settings entry point
│   │   └── App.tsx         # Settings main component
│   ├── editor/             # Content script for editor
│   │   ├── index.ts        # Editor content script entry
│   │   └── styles.css      # Editor-specific styles
│   ├── background/         # Background service worker
│   │   └── index.ts        # Service worker entry point
│   └── shared/             # Shared utilities and types
│       ├── styles/
│       │   └── global.css  # Global styles with TailwindCSS
│       └── types/
│           └── chrome.d.ts # Chrome API type definitions
├── popup.html              # Popup HTML entry
├── settings.html           # Settings HTML entry
├── vite.config.ts          # Vite multi-entry build config
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts

## Build Configuration

### Vite Multi-Entry Setup
- **popup**: React-based popup UI
- **settings**: React-based settings page
- **editor**: Content script (injected into web pages)
- **background**: Service worker for background tasks

### Output Structure (dist/)
```
dist/
├── popup.html
├── settings.html
├── editor.js
├── editor.css
├── background.js
├── manifest.json
├── icons/
└── assets/
```

## Technologies

- **Build Tool**: Vite
- **Framework**: React 19
- **Styling**: TailwindCSS 4
- **Language**: TypeScript
- **Extension**: Chrome Manifest V3

## Development

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build for production
pnpm build

# Lint code
pnpm lint

# unit test
pnpm vitest --run "path_to_test"

```

## Chrome Extension Permissions

- `storage`: For storing user settings and API keys
- `tabs`: For accessing tab information

## Next Steps

1. Run `npm install` to install dependencies including @types/chrome
2. Implement core functionality in subsequent tasks
3. Replace placeholder icons with actual PNG images
4. Test the extension by loading the `dist/` folder in Chrome
