'use client';

import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Website } from '@/constants/data';
import { Column, ColumnDef } from '@tanstack/react-table';
import { Text } from 'lucide-react';
import { CellAction } from './cell-action';

export const columns: ColumnDef<Website>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }: { column: Column<Website, unknown> }) => (
      <DataTableColumnHeader column={column} title='名称' />
    ),
    cell: ({ cell }) => <div>{cell.getValue<Website['name']>()}</div>,
    meta: {
      label: '名称',
      placeholder: '搜索网站...',
      variant: 'text',
      icon: Text
    },
    enableColumnFilter: true
  },
  {
    accessorKey: 'created_at',
    header: '创建时间',
    cell: ({ cell }) => {
      const date = new Date(cell.getValue<string>());
      return <div>{date.toLocaleDateString('zh-CN')}</div>;
    }
  },
  {
    accessorKey: 'updated_at',
    header: '更新时间',
    cell: ({ cell }) => {
      const date = new Date(cell.getValue<string>());
      return <div>{date.toLocaleDateString('zh-CN')}</div>;
    }
  },
  {
    id: 'actions',
    header: '操作',
    cell: ({ row }) => <CellAction data={row.original} />
  }
];
