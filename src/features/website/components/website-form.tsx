'use client';

import { FormInput } from '@/components/forms/form-input';
import { FormSelect } from '@/components/forms/form-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Website } from '@/constants/data';
import { createWebsite, updateWebsite } from '../actions/website-actions';
import { getRules } from '@/features/rules/actions/rule-actions';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const formSchema = z.object({
  name: z
    .string()
    .min(1, {
      message: '网站名称不能为空'
    })
    .max(100, {
      message: '网站名称不能超过100个字符'
    }),
  domain: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(
          val
        ),
      {
        message: '请输入有效的域名格式'
      }
    ),
  // rule_id 可以是字符串（'none' 或数字字符串）或数字
  rule_id: z.union([z.string(), z.number().int(), z.null()]).optional()
});

export default function WebsiteForm({
  initialData,
  pageTitle
}: {
  initialData: Website | null;
  pageTitle: string;
}) {
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<Array<{ label: string; value: string }>>(
    []
  );
  const [loadingRules, setLoadingRules] = useState(true);

  const defaultValues = {
    name: initialData?.name || '',
    domain: (initialData as any)?.domain || '',
    // 将 null 转换为 'none' 字符串，以便 Select 组件使用
    rule_id: (initialData as any)?.rule_id
      ? (initialData as any).rule_id.toString()
      : 'none'
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues
  });

  const router = useRouter();

  useEffect(() => {
    async function loadRules() {
      try {
        const result = await getRules({ limit: 100 });
        if (result.success && result.data) {
          setRules(
            result.data.map((rule: any) => ({
              label: rule.name,
              value: rule.id.toString()
            }))
          );
        }
      } catch (error) {
        console.error('Failed to load rules:', error);
      } finally {
        setLoadingRules(false);
      }
    }
    loadRules();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      // 处理 rule_id：如果是 'none' 字符串，转换为 null；如果是数字字符串，转换为数字
      let ruleId: number | null = null;
      if (values.rule_id) {
        if (values.rule_id === 'none' || values.rule_id === '') {
          ruleId = null;
        } else if (typeof values.rule_id === 'string') {
          ruleId = parseInt(values.rule_id, 10);
        } else {
          ruleId = values.rule_id;
        }
      }

      const submitData = {
        ...values,
        rule_id: ruleId
      };

      if (initialData) {
        // Update existing website
        await updateWebsite(initialData.id, submitData);
      } else {
        // Create new website
        await createWebsite(submitData);
      }
      router.push('/dashboard/website');
      router.refresh();
    } catch (error) {
      console.error('Failed to save website:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className='mx-auto w-full'>
      <CardHeader>
        <CardTitle className='text-left text-2xl font-bold'>
          {pageTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form
          form={form}
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-8'
        >
          <FormInput
            control={form.control}
            name='name'
            label='网站名称'
            placeholder='请输入网站名称'
            required
          />

          <FormInput
            control={form.control}
            name='domain'
            label='域名'
            placeholder='例如: example.com'
            description='用于匹配请求的 Host 头，留空则不进行域名匹配'
          />

          <FormSelect
            control={form.control}
            name='rule_id'
            label='关联规则'
            options={[{ label: '无', value: 'none' }, ...rules]}
            description='选择要应用的访问控制规则'
            disabled={loadingRules}
          />

          <div className='flex gap-4'>
            <Button type='submit' disabled={loading}>
              {loading ? '保存中...' : initialData ? '更新' : '创建'}
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => router.push('/dashboard/website')}
            >
              取消
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
