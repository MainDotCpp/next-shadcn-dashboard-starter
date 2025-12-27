'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash, Power } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AlertModal } from '@/components/modal/alert-modal';
import { deleteRule, toggleRule } from '../../actions/rule-actions';
import { toast } from 'sonner';
import type { Rule } from './columns';

interface CellActionProps {
  data: Rule;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    try {
      setLoading(true);
      const result = await deleteRule(data.id);
      if (result.success) {
        toast.success('规则删除成功');
        router.refresh();
      } else {
        toast.error(result.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const onToggle = async () => {
    try {
      setLoading(true);
      const result = await toggleRule(data.id);
      if (result.success) {
        toast.success(`规则已${data.enabled ? '禁用' : '启用'}`);
        router.refresh();
      } else {
        toast.error(result.error || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <span className='sr-only'>打开菜单</span>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>操作</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => router.push(`/dashboard/rules/${data.id}`)}
          >
            <Pencil className='mr-2 h-4 w-4' />
            编辑
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onToggle} disabled={loading}>
            <Power className='mr-2 h-4 w-4' />
            {data.enabled ? '禁用' : '启用'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpen(true)} disabled={loading}>
            <Trash className='mr-2 h-4 w-4' />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
