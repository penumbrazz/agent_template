'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface User {
  id: string
  name: string
  email: string
  registeredAt: string
  spending: string
  status: string
}

const users: User[] = [
  { id: 'U001', name: '张三', email: 'zhangsan@example.com', registeredAt: '2025-01-15', spending: '¥12,580', status: '活跃' },
  { id: 'U002', name: '李四', email: 'lisi@example.com', registeredAt: '2025-02-03', spending: '¥8,320', status: '活跃' },
  { id: 'U003', name: '王五', email: 'wangwu@example.com', registeredAt: '2025-02-18', spending: '¥3,150', status: '休眠' },
  { id: 'U004', name: '赵六', email: 'zhaoliu@example.com', registeredAt: '2025-03-07', spending: '¥25,400', status: 'VIP' },
  { id: 'U005', name: '钱七', email: 'qianqi@example.com', registeredAt: '2025-04-12', spending: '¥6,780', status: '活跃' },
  { id: 'U006', name: '孙八', email: 'sunba@example.com', registeredAt: '2025-05-01', spending: '¥15,900', status: 'VIP' },
  { id: 'U007', name: '周九', email: 'zhoujiu@example.com', registeredAt: '2025-06-22', spending: '¥1,200', status: '休眠' },
  { id: 'U008', name: '吴十', email: 'wushi@example.com', registeredAt: '2025-07-14', spending: '¥9,870', status: '活跃' },
  { id: 'U009', name: '郑冬', email: 'zhengdong@example.com', registeredAt: '2025-08-30', spending: '¥18,650', status: 'VIP' },
  { id: 'U010', name: '陈南', email: 'chennan@example.com', registeredAt: '2025-09-05', spending: '¥4,320', status: '活跃' },
  { id: 'U011', name: '林北', email: 'linbei@example.com', registeredAt: '2025-10-18', spending: '¥780', status: '休眠' },
  { id: 'U012', name: '黄东', email: 'huangdong@example.com', registeredAt: '2025-11-27', spending: '¥21,100', status: 'VIP' },
]

const statusColors: Record<string, string> = {
  '活跃': 'text-green-700 bg-green-50',
  '休眠': 'text-amber-700 bg-amber-50',
  'VIP': 'text-[#cc785c] bg-[#cc785c]/10',
}

export function DemoUserTable() {
  return (
    <Table
      data-selection-title="用户数据表"
      data-testid="demo-user-table"
    >
      <TableHeader>
        <TableRow>
          <TableHead>用户 ID</TableHead>
          <TableHead>姓名</TableHead>
          <TableHead>邮箱</TableHead>
          <TableHead>注册日期</TableHead>
          <TableHead className="text-right">消费金额</TableHead>
          <TableHead>状态</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
            <TableCell className="font-mono text-xs">{user.id}</TableCell>
            <TableCell>{user.name}</TableCell>
            <TableCell className="text-muted-foreground">{user.email}</TableCell>
            <TableCell>{user.registeredAt}</TableCell>
            <TableCell className="text-right font-mono">{user.spending}</TableCell>
            <TableCell>
              <span
                className={`inline-block rounded-pill px-2 py-0.5 text-xs font-medium ${statusColors[user.status] ?? ''}`}
                data-testid={`status-${user.id}`}
              >
                {user.status}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
