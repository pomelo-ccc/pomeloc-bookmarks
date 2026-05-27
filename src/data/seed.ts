export interface SeedCategory {
  name: string
  icon: string
  order: number
}

export interface SeedLink {
  id: string
  title: string
  url: string
  desc: string
  category: string
  tags: string[]
  clickCount: number
  createdAt: number
  updatedAt: number
}

export interface SeedData {
  categories: SeedCategory[]
  links: SeedLink[]
  pinnedIds: string[]
}

const now = Date.now()

export const seedData: SeedData = {
  categories: [
    { name: 'PLM', icon: 'folder', order: 0 },
    { name: '组件文档', icon: 'component', order: 1 },
    { name: 'DevOps', icon: 'server', order: 2 },
    { name: '杂项', icon: 'folder', order: 3 },
  ],
  links: [
    // PLM 系统
    {
      id: 'seed-001',
      title: '68 环境',
      url: 'http://172.16.100.68:8080/',
      desc: 'PLM 开发环境 - 日常开发与调试',
      category: 'PLM',
      tags: ['开发环境', 'debug', '日常使用'],
      clickCount: 120,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-002',
      title: 'RD 环境',
      url: 'http://plm.digiwin.com:18012/',
      desc: 'PLM 研发环境 - Bug 修复与功能测试',
      category: 'PLM',
      tags: ['bug', '测试环境', '研发'],
      clickCount: 85,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-003',
      title: '在线文档',
      url: 'http://172.16.100.77:8083/',
      desc: 'PLM 系统在线文档与 API 参考',
      category: 'PLM',
      tags: ['documentation', 'api', '参考'],
      clickCount: 62,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '200b892c-df40-4a68-a6ea-6587599577d2',
      title: '68 环境',
      url: 'http://172.16.100.68:8080/',
      desc: 'PLM 开发环境 - 前端开发专用',
      category: 'PLM',
      tags: ['开发环境', 'frontend'],
      clickCount: 45,
      createdAt: now,
      updatedAt: now,
    },

    // 组件文档
    {
      id: 'seed-004',
      title: 'WPS 在线组件文档',
      url: 'https://www.kdocs.cn/l/cjSSuasjfoB2',
      desc: 'WPS 协作平台 - 组件设计稿与规范文档',
      category: '组件文档',
      tags: ['design', '规范', '协作文档'],
      clickCount: 78,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-005',
      title: 'LC 组件文档',
      url: 'http://172.16.100.77/lc-docs/button/api/button/options/',
      desc: 'LC 组件库 API 文档 - Button 组件配置选项',
      category: '组件文档',
      tags: ['api', 'components', '前端'],
      clickCount: 92,
      createdAt: now,
      updatedAt: now,
    },

    // DevOps
    {
      id: 'seed-006',
      title: '编译版本',
      url: 'http://172.16.100.122:4875/',
      desc: 'NPM 私有仓库 - 历史构建版本查询与下载',
      category: 'DevOps',
      tags: ['releases', 'builds', 'npm'],
      clickCount: 156,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-007',
      title: '版本号查询',
      url: 'http://172.16.100.122:4873/-/web/detail/ng-lc-dpp',
      desc: 'NPM 包版本详情 - ng-lc-dpp 组件包',
      category: 'DevOps',
      tags: ['version', 'package', '查询'],
      clickCount: 43,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-008',
      title: 'CI/CD 流水线',
      url: 'https://gitlab.example.com/groups/-/ci_cd',
      desc: 'GitLab CI/CD - 构建与部署流水线管理',
      category: 'DevOps',
      tags: ['ci', 'pipeline', '自动化'],
      clickCount: 67,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-009',
      title: '监控大盘',
      url: 'https://grafana.example.com/dashboards',
      desc: 'Grafana 监控 - 系统性能与服务状态监控',
      category: 'DevOps',
      tags: ['monitoring', 'grafana', '告警'],
      clickCount: 54,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-010',
      title: '日志中心',
      url: 'https://kibana.example.com/app/discover',
      desc: 'ELK 日志系统 - 日志查询与分析',
      category: 'DevOps',
      tags: ['logging', 'elk', '排查'],
      clickCount: 89,
      createdAt: now,
      updatedAt: now,
    },

    // 杂项
    {
      id: 'seed-011',
      title: '公司系统',
      url: 'https://efgpcn.digiwin.com/NaNaWeb/',
      desc: '公司内部管理系统 - 人事、行政、财务',
      category: '杂项',
      tags: ['internal', 'oa', '办公'],
      clickCount: 34,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'd1a85f3e-b067-42cf-9937-24bb90137086',
      title: 'gp 系统',
      url: 'https://efgpcn.digiwin.com/NaNaWeb/',
      desc: '公司核心业务系统入口',
      category: '杂项',
      tags: ['internal', 'business'],
      clickCount: 28,
      createdAt: now,
      updatedAt: now,
    },
  ],
  pinnedIds: [
    'seed-008',
    'seed-006',
    '200b892c-df40-4a68-a6ea-6587599577d2',
  ],
}
