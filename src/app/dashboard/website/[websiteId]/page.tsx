import FormCardSkeleton from '@/components/form-card-skeleton';
import PageContainer from '@/components/layout/page-container';
import { Suspense } from 'react';
import WebsiteViewPage from '@/features/website/components/website-view-page';

export const metadata = {
  title: 'Dashboard: 网站管理'
};

type PageProps = { params: Promise<{ websiteId: string }> };

export default async function Page(props: PageProps) {
  const params = await props.params;
  return (
    <PageContainer scrollable>
      <div className='flex-1 space-y-4'>
        <Suspense fallback={<FormCardSkeleton />}>
          <WebsiteViewPage websiteId={params.websiteId} />
        </Suspense>
      </div>
    </PageContainer>
  );
}
