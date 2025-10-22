export type SettingsCategory = 'providers' | 'tools' | 'mcps'

interface CategoryListProps {
  selectedCategory: SettingsCategory
  onCategorySelect: (category: SettingsCategory) => void
}

interface CategoryItem {
  id: SettingsCategory
  label: string
  icon: string
}

const categories: CategoryItem[] = [
  { id: 'providers', label: 'Providers', icon: '🔌' },
  { id: 'tools', label: 'Tools', icon: '🛠️' },
  { id: 'mcps', label: 'MCPs', icon: '🔗' },
]

function CategoryList({ selectedCategory, onCategorySelect }: CategoryListProps) {
  return (
    <nav className="p-4">
      <h2 className="text-lg font-semibold mb-4 px-3 text-gray-700">Settings</h2>
      <ul className="space-y-1">
        {categories.map((category) => (
          <li key={category.id}>
            <button
              onClick={() => onCategorySelect(category.id)}
              className={`
                w-full text-left px-3 py-2 rounded-lg transition-colors
                flex items-center gap-3
                ${
                  selectedCategory === category.id
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }
              `}
              aria-current={selectedCategory === category.id ? 'page' : undefined}
            >
              <span className="text-xl" aria-hidden="true">{category.icon}</span>
              <span>{category.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default CategoryList
