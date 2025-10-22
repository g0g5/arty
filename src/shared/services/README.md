# Services

This directory contains service layer implementations for the Chrome extension.

## Storage Service

The Storage Service provides a secure, encrypted interface for managing Chrome extension storage.

## Features

- **Encryption**: API keys are encrypted using AES-GCM with Web Crypto API
- **Type-Safe**: Full TypeScript support with typed storage schema
- **Singleton Pattern**: Single instance ensures consistent encryption key
- **Migration Support**: Built-in utilities for future schema changes
- **Chrome Storage API**: Wraps chrome.storage.local with Promise-based interface

## Usage

### Basic Operations

```typescript
import { storageService } from '@/shared/services';

// Save provider profiles
const providers = [
  {
    id: '1',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1/',
    apiKey: 'encrypted-key',
    models: ['gpt-4', 'gpt-3.5-turbo'],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];
await storageService.saveProviders(providers);

// Get provider profiles
const savedProviders = await storageService.getProviders();

// Save settings
await storageService.saveSettings({
  theme: 'dark',
  toolsEnabledByDefault: true
});

// Get settings
const settings = await storageService.getSettings();
```

### Encryption

```typescript
// Encrypt API key before storage
const encrypted = await storageService.encryptApiKey('sk-1234567890');

// Decrypt API key when needed
const decrypted = await storageService.decryptApiKey(encrypted);
```

### Helper Functions

```typescript
import { addProvider, updateProvider, deleteProvider, getProviderWithDecryptedKey } from '@/shared/utils/storageHelpers';

// Add a new provider (automatically encrypts API key)
const newProvider = await addProvider({
  name: 'Anthropic',
  baseUrl: 'https://api.anthropic.com/v1/',
  apiKey: 'sk-ant-1234567890',
  models: ['claude-3-opus', 'claude-3-sonnet']
});

// Update provider
await updateProvider(newProvider.id, {
  name: 'Anthropic Updated'
});

// Get provider with decrypted key
const provider = await getProviderWithDecryptedKey(newProvider.id);

// Delete provider
await deleteProvider(newProvider.id);
```

### Storage Migration

```typescript
// Check current version
const currentVersion = await storageService.getStorageVersion();

// Migrate to new version
if (currentVersion < 1) {
  await storageService.migrateStorage(currentVersion, 1);
  await storageService.setStorageVersion(1);
}
```

## Security

- API keys are encrypted using AES-GCM with 256-bit keys
- Encryption key is derived from extension ID using PBKDF2 with 100,000 iterations
- Each encryption uses a unique random IV (Initialization Vector)
- Keys are never stored in plaintext

## Storage Schema

```typescript
interface StorageSchema {
  providers: ProviderProfile[];
  settings: AppSettings;
  chatSessions: ChatSession[];
  lastWorkspacePath?: string;
  version?: number;
}
```

## API Reference

### StorageService

#### Methods

- `saveProviders(providers: ProviderProfile[]): Promise<void>`
- `getProviders(): Promise<ProviderProfile[]>`
- `saveSettings(settings: AppSettings): Promise<void>`
- `getSettings(): Promise<AppSettings>`
- `saveChatSessions(sessions: ChatSession[]): Promise<void>`
- `getChatSessions(): Promise<ChatSession[]>`
- `saveLastWorkspacePath(path: string): Promise<void>`
- `getLastWorkspacePath(): Promise<string | undefined>`
- `encryptApiKey(key: string): Promise<string>`
- `decryptApiKey(encrypted: string): Promise<string>`
- `clearAll(): Promise<void>`
- `getAll(): Promise<Partial<StorageSchema>>`
- `migrateStorage(fromVersion: number, toVersion: number): Promise<void>`
- `getStorageVersion(): Promise<number>`
- `setStorageVersion(version: number): Promise<void>`


---

## File System Service

The File System Service manages workspace and file operations using the File System Access API.

### Features

- **Directory Access**: Prompt users to select workspace directories
- **File Operations**: Read and write file content with proper error handling
- **Tree Structure**: Recursively scan and build directory tree structures
- **File Lookup**: Find files by relative path within workspace
- **Permission Management**: Handle and request file system permissions
- **Browser Compatibility**: Check for File System Access API support

### Usage

#### Opening a Workspace

```typescript
import { fileSystemService } from '@/shared/services';

// Prompt user to select a directory
try {
  const dirHandle = await fileSystemService.openWorkspace();
  console.log('Workspace opened:', dirHandle.name);
} catch (error) {
  console.error('Failed to open workspace:', error.message);
}
```

#### Reading Files

```typescript
// Read file content
try {
  const content = await fileSystemService.readFile(fileHandle);
  console.log('File content:', content);
} catch (error) {
  console.error('Failed to read file:', error.message);
}
```

#### Writing Files

```typescript
// Write content to file
try {
  await fileSystemService.writeFile(fileHandle, 'New content');
  console.log('File saved successfully');
} catch (error) {
  console.error('Failed to write file:', error.message);
}
```

#### Getting File Tree

```typescript
// Get directory structure
try {
  const fileTree = await fileSystemService.getFileTree(dirHandle);
  console.log('File tree:', fileTree);
  // Returns: FileTreeNode[]
} catch (error) {
  console.error('Failed to get file tree:', error.message);
}
```

#### Finding Files

```typescript
// Find file by path
try {
  const fileHandle = await fileSystemService.findFile(
    rootHandle,
    'src/components/App.tsx'
  );
  console.log('Found file:', fileHandle.name);
} catch (error) {
  console.error('File not found:', error.message);
}
```

#### Checking Permissions

```typescript
// Verify permission for directory
const hasPermission = await fileSystemService.verifyPermission(
  dirHandle,
  'readwrite'
);

if (!hasPermission) {
  console.log('Permission denied');
}
```

#### Browser Support Check

```typescript
// Check if File System Access API is supported
if (fileSystemService.isSupported()) {
  console.log('File System Access API is supported');
} else {
  console.log('File System Access API is not supported');
}
```

### Error Handling

The File System Service throws descriptive errors for common scenarios:

- **Permission Denied**: User denied permission or insufficient access rights
- **File Not Found**: Specified file or directory doesn't exist
- **Invalid Path**: Path format is incorrect or contains invalid segments
- **User Cancelled**: User cancelled the directory picker dialog
- **API Not Supported**: Browser doesn't support File System Access API

### API Reference

#### FileSystemService

##### Methods

- `openWorkspace(): Promise<FileSystemDirectoryHandle>`
  - Prompts user to select a directory
  - Returns directory handle with readwrite permission
  - Throws error if cancelled or permission denied

- `readFile(handle: FileSystemFileHandle): Promise<string>`
  - Reads file content as text
  - Returns file content string
  - Throws error if file cannot be read

- `writeFile(handle: FileSystemFileHandle, content: string): Promise<void>`
  - Writes content to file
  - Overwrites existing content
  - Throws error if file cannot be written

- `getFileTree(dirHandle: FileSystemDirectoryHandle, basePath?: string): Promise<FileTreeNode[]>`
  - Recursively scans directory structure
  - Returns sorted tree (directories first, then files)
  - Throws error if directory cannot be read

- `findFile(rootHandle: FileSystemDirectoryHandle, path: string): Promise<FileSystemFileHandle>`
  - Locates file by relative path
  - Supports both forward and backward slashes
  - Throws error if file not found

- `isSupported(): boolean`
  - Checks if File System Access API is available
  - Returns true if supported, false otherwise

- `verifyPermission(dirHandle: FileSystemDirectoryHandle, mode?: 'read' | 'readwrite'): Promise<boolean>`
  - Checks and requests permission for directory
  - Returns true if permission granted, false otherwise

### Data Types

```typescript
interface FileTreeNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileTreeNode[];
}
```

### Browser Compatibility

The File System Access API is supported in:
- Chrome 86+
- Edge 86+
- Opera 72+

Not supported in:
- Firefox (as of 2024)
- Safari (as of 2024)

Always check `isSupported()` before using the service.
