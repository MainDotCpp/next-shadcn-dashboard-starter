'use client';

import { FormInput } from '@/components/forms/form-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Website } from '@/constants/data';
import { createWebsite, updateWebsite } from '../actions/website-actions';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
    })
});

export default function WebsiteForm({
  initialData,
  pageTitle
}: {
  initialData: Website | null;
  pageTitle: string;
}) {
  const [loading, setLoading] = useState(false);
  const defaultValues = {
    name: initialData?.name || ''
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues
  });

  const router = useRouter();

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      if (initialData) {
        // Update existing website
        await updateWebsite(initialData.id, values);
      } else {
        // Create new website
        await createWebsite(values);
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
