export interface LinkItem {
  id: string
  title: string
  url: string
  desc?: string
  category: string
  tags: string[]
  clickCount: number
  createdAt: number
  updatedAt: number
}

export interface Category {
  name: string
  icon: string
  order: number
}

export interface LinkHubData {
  links: LinkItem[]
  categories: Category[]
  pinnedIds: string[]
  meta: {
    version: string
    lastExport: number
    isAdmin: boolean
  }
}
