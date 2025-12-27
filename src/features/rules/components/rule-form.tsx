'use client';

import { FormInput } from '@/components/forms/form-input';
import { FormTextarea } from '@/components/forms/form-textarea';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import {
  createRule,
  updateRuleWithSteps,
  getRuleById
} from '../actions/rule-actions';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'sonner';
import type { Rule } from './rule-tables/columns';
import { RuleStepsEditor } from './rule-steps-editor';
import { Info } from 'lucide-react';

const formSchema = z.object({
  name: z
    .string()
    .min(1, '规则名称不能为空')
    .max(100, '规则名称不能超过100个字符'),
  description: z.string().optional()
});

type RuleFormValues = z.infer<typeof formSchema>;

export default function RuleForm({
  initialData,
  pageTitle
}: {
  initialData: Rule | null;
  pageTitle: string;
}) {
  const [loading, setLoading] = useState(false);
  const [createdRuleId, setCreatedRuleId] = useState<number | null>(
    initialData?.id || null
  );
  const [ruleData, setRuleData] = useState<Rule | null>(initialData);
  const [currentSteps, setCurrentSteps] = useState<any[]>(
    (initialData as any)?.steps || []
  );

  const defaultValues: RuleFormValues = {
    name: initialData?.name || '',
    description: (initialData as any)?.description || ''
  };

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const router = useRouter();

  async function onSubmit(values: RuleFormValues) {
    setLoading(true);
    try {
      let result;
      if (initialData || createdRuleId) {
        const ruleId = createdRuleId || initialData!.id;
        const stepsToSave = currentSteps.map((step, index) => ({
          id: step.id > 0 ? step.id : undefined,
          type: step.type,
          name: step.name,
          config: step.config,
          action: step.action,
          enabled: step.enabled ?? true
        }));

        result = await updateRuleWithSteps(ruleId, {
          name: values.name,
          description: values.description,
          enabled: true,
          steps: stepsToSave
        });
      } else {
        const stepsToSave = currentSteps.map((step) => ({
          type: step.type,
          name: step.name,
          config: step.config,
          action: step.action,
          enabled: step.enabled ?? true
        }));

        result = await createRule({
          name: values.name,
          description: values.description,
          enabled: true,
          steps: stepsToSave
        });
      }

      if (result.success) {
        if (initialData || createdRuleId) {
          router.refresh();
        } else {
          if (result.data?.id) {
            setCreatedRuleId(result.data.id);
            const ruleResult = await getRuleById(result.data.id);
            if (ruleResult.success && ruleResult.data) {
              setRuleData(ruleResult.data as Rule);
              setCurrentSteps((ruleResult.data as any).steps || []);
            }
            window.history.pushState(
              {},
              '',
              `/dashboard/rules/${result.data.id}`
            );
          } else {
            router.push('/dashboard/rules');
            router.refresh();
          }
        }
      } else {
        toast.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('Failed to save rule:', error);
      toast.error('操作失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='mx-auto max-w-[1600px] space-y-6'>
      {/* 页面标题 */}
      <div className='flex items-start justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>{pageTitle}</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            配置访问控制规则，通过步骤流程来控制访问权限
          </p>
        </div>
      </div>

      <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
        <div className='grid gap-6 lg:grid-cols-12'>
          {/* 左侧：主要内容区域 */}
          <div className='space-y-6 lg:col-span-10'>
            {/* 基本信息 - 扁平化设计 */}
            <div className='grid gap-4'>
              <FormInput
                control={form.control}
                name='name'
                label='规则名称'
                placeholder='请输入规则名称'
                required
              />
              <FormTextarea
                control={form.control}
                name='description'
                label='描述'
                placeholder='请输入规则描述（可选）'
                className='min-h-[60px]'
              />
            </div>

            <Separator />

            {/* 规则步骤编辑区域 */}
            <RuleStepsEditor
              ruleId={createdRuleId || initialData?.id || 0}
              steps={currentSteps}
              onStepsChange={setCurrentSteps}
            />
          </div>

          {/* 右侧：操作栏 */}
          <div className='lg:col-span-2'>
            <div className='sticky top-4 space-y-4'>
              <div className='space-y-2'>
                <Button
                  type='submit'
                  disabled={loading}
                  className='w-full'
                  size='lg'
                >
                  {loading
                    ? '保存中...'
                    : initialData || createdRuleId
                      ? '保存规则'
                      : '创建规则'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => router.back()}
                  disabled={loading}
                  className='w-full'
                  size='lg'
                >
                  取消
                </Button>
              </div>

              <Separator />

              {/* 提示信息 - 扁平化 */}
              <div className='space-y-2'>
                <div className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
                  <Info className='h-3.5 w-3.5' />
                  动作说明
                </div>
                <div className='text-muted-foreground space-y-1 text-xs'>
                  <p>
                    <span className='font-medium text-red-600 dark:text-red-400'>
                      拦截
                    </span>
                    ：直接阻止
                  </p>
                  <p>
                    <span className='text-muted-foreground font-medium'>
                      继续
                    </span>
                    ：执行下一步
                  </p>
                  <p>
                    <span className='font-medium text-green-600 dark:text-green-400'>
                      放行
                    </span>
                    ：直接允许
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
}
