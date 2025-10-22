import { useState } from 'react'
import SettingsLayout from './components/SettingsLayout'
import CategoryList, { type SettingsCategory } from './components/CategoryList'
import ProvidersSettings from './components/ProvidersSettings'
import ToolsSettings from './components/ToolsSettings'
import MCPsSettings from './components/MCPsSettings'

function App() {
  const [selectedCategory, setSelectedCategory] = useState<SettingsCategory>('providers')

  const renderContent = () => {
    switch (selectedCategory) {
      case 'providers':
        return <ProvidersSettings />
      case 'tools':
        return <ToolsSettings />
      case 'mcps':
        return <MCPsSettings />
      default:
        return <ProvidersSettings />
    }
  }

  return (
    <SettingsLayout
      sidebar={
        <CategoryList
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />
      }
    >
      {renderContent()}
    </SettingsLayout>
  )
}

export default App
