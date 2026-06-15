'use client'

import { useT, type TranslationKey } from '@/i18n'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type DemoUserStatus = 'active' | 'dormant' | 'vip'

interface DemoUser {
  id: string
  name: string
  email: string
  registeredAt: string
  spending: string
  status: DemoUserStatus
}

// Demo business data — names/emails/dates are fixture content (not UI copy),
// so they intentionally stay out of i18n. The status field maps to localized
// labels + token-based color classes below.
const users: DemoUser[] = [
  {
    id: 'U001',
    name: '张三',
    email: 'zhangsan@example.com',
    registeredAt: '2025-01-15',
    spending: '¥12,580',
    status: 'active',
  },
  {
    id: 'U002',
    name: '李四',
    email: 'lisi@example.com',
    registeredAt: '2025-02-03',
    spending: '¥8,320',
    status: 'active',
  },
  {
    id: 'U003',
    name: '王五',
    email: 'wangwu@example.com',
    registeredAt: '2025-02-18',
    spending: '¥3,150',
    status: 'dormant',
  },
  {
    id: 'U004',
    name: '赵六',
    email: 'zhaoliu@example.com',
    registeredAt: '2025-03-07',
    spending: '¥25,400',
    status: 'vip',
  },
  {
    id: 'U005',
    name: '钱七',
    email: 'qianqi@example.com',
    registeredAt: '2025-04-12',
    spending: '¥6,780',
    status: 'active',
  },
  {
    id: 'U006',
    name: '孙八',
    email: 'sunba@example.com',
    registeredAt: '2025-05-01',
    spending: '¥15,900',
    status: 'vip',
  },
  {
    id: 'U007',
    name: '周九',
    email: 'zhoujiu@example.com',
    registeredAt: '2025-06-22',
    spending: '¥1,200',
    status: 'dormant',
  },
  {
    id: 'U008',
    name: '吴十',
    email: 'wushi@example.com',
    registeredAt: '2025-07-14',
    spending: '¥9,870',
    status: 'active',
  },
  {
    id: 'U009',
    name: '郑冬',
    email: 'zhengdong@example.com',
    registeredAt: '2025-08-30',
    spending: '¥18,650',
    status: 'vip',
  },
  {
    id: 'U010',
    name: '陈南',
    email: 'chennan@example.com',
    registeredAt: '2025-09-05',
    spending: '¥4,320',
    status: 'active',
  },
  {
    id: 'U011',
    name: '林北',
    email: 'linbei@example.com',
    registeredAt: '2025-10-18',
    spending: '¥780',
    status: 'dormant',
  },
  {
    id: 'U012',
    name: '黄东',
    email: 'huangdong@example.com',
    registeredAt: '2025-11-27',
    spending: '¥21,100',
    status: 'vip',
  },
]

// Status → (i18n key, Tailwind token classes). All classes use DESIGN.md
// tokens — no hardcoded hex / palette colors.
const STATUS_BADGE: Record<
  DemoUserStatus,
  { labelKey: TranslationKey; className: string }
> = {
  active: {
    labelKey: 'demo.userStatus.active',
    className: 'text-success bg-success/10',
  },
  dormant: {
    labelKey: 'demo.userStatus.dormant',
    className: 'text-warning bg-warning/10',
  },
  vip: {
    labelKey: 'demo.userStatus.vip',
    className: 'text-primary bg-primary/10',
  },
}

const COLUMN_KEYS = [
  'demo.tableColumns.id',
  'demo.tableColumns.name',
  'demo.tableColumns.email',
  'demo.tableColumns.registeredAt',
  'demo.tableColumns.spending',
  'demo.tableColumns.status',
] as const

export function DemoUserTable() {
  const t = useT()
  const tableTitle = t('demo.tableTitle')

  return (
    <Table data-selection-title={tableTitle} data-testid="demo-user-table">
      <TableHeader>
        <TableRow>
          <TableHead>{t(COLUMN_KEYS[0])}</TableHead>
          <TableHead>{t(COLUMN_KEYS[1])}</TableHead>
          <TableHead>{t(COLUMN_KEYS[2])}</TableHead>
          <TableHead>{t(COLUMN_KEYS[3])}</TableHead>
          <TableHead className="text-right">{t(COLUMN_KEYS[4])}</TableHead>
          <TableHead>{t(COLUMN_KEYS[5])}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const badge = STATUS_BADGE[user.status]
          return (
            <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
              <TableCell className="font-mono text-xs">{user.id}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {user.email}
              </TableCell>
              <TableCell>{user.registeredAt}</TableCell>
              <TableCell className="text-right font-mono">
                {user.spending}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-block rounded-pill px-2 py-0.5 text-xs font-medium ${badge.className}`}
                  data-testid={`status-${user.id}`}
                >
                  {t(badge.labelKey)}
                </span>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
