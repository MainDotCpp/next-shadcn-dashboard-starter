'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CellAction } from './cell-action';

export type Rule = {
  id: number;
  name: string;
  description: string | null;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
  steps?: Array<{
    id: number;
    step_order: number;
    type: string;
    name: string;
    action: string;
    enabled: boolean;
  }>;
  _count?: {
    websites: number;
  };
};

const getActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    intercept: '拦截',
    continue: '继续',
    allow: '放行'
  };
  return labels[action] || action;
};

export const columns: ColumnDef<Rule>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          规则名称
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    meta: {
      label: '规则名称',
      placeholder: '搜索规则名称...',
      variant: 'text'
    },
    enableColumnFilter: true
  },
  {
    accessorKey: 'steps',
    header: '规则步骤',
    cell: ({ row }) => {
      const steps = row.original.steps || [];
      const enabledSteps = steps.filter((s) => s.enabled);
      if (enabledSteps.length === 0) {
        return <span className='text-muted-foreground text-xs'>无步骤</span>;
      }
      return (
        <div className='flex flex-col gap-1'>
          <span className='text-xs font-medium'>
            {enabledSteps.length} 个步骤
          </span>
          <div className='flex flex-wrap gap-1'>
            {enabledSteps.slice(0, 3).map((step) => (
              <Badge key={step.id} variant='outline' className='text-xs'>
                {step.name}
              </Badge>
            ))}
            {enabledSteps.length > 3 && (
              <Badge variant='outline' className='text-xs'>
                +{enabledSteps.length - 3}
              </Badge>
            )}
          </div>
        </div>
      );
    }
  },
  {
    accessorKey: '_count',
    header: '关联网站',
    cell: ({ row }) => {
      const count = row.original._count?.websites || 0;
      return <span className='text-xs'>{count}</span>;
    }
  },
  {
    accessorKey: 'enabled',
    header: '状态',
    cell: ({ row }) => {
      const enabled = row.original.enabled;
      return (
        <Badge variant={enabled ? 'default' : 'secondary'}>
          {enabled ? '启用' : '禁用'}
        </Badge>
      );
    },
    meta: {
      label: '状态',
      variant: 'select',
      options: [
        { label: '启用', value: 'true' },
        { label: '禁用', value: 'false' }
      ]
    },
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      const enabled = row.original.enabled;
      if (value === 'true') return enabled === true;
      if (value === 'false') return enabled === false;
      return true;
    }
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => {
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          创建时间
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.original.created_at);
      return date.toLocaleString('zh-CN');
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => <CellAction data={row.original} />
  }
];
