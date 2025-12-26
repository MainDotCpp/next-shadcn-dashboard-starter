import PageContainer from '@/components/layout/page-container';
import { buttonVariants } from '@/components/ui/button';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import WebsiteListingPage from '@/features/website/components/website-listing';
import { searchParamsCache, serialize } from '@/lib/searchparams';
import { cn } from '@/lib/utils';
import { IconPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { SearchParams } from 'nuqs/server';
import { Suspense } from 'react';

export const metadata = {
  title: 'Dashboard: 网站管理'
};

type pageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function WebsitePage(props: pageProps) {
  const searchParams = await props.searchParams;
  // Allow nested RSCs to access the search params (in a type-safe way)
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer
      scrollable={false}
      pageTitle='网站管理'
      pageDescription='管理网站信息（支持服务端表格功能）'
      pageHeaderAction={
        <Link
          href='/dashboard/website/new'
          className={cn(buttonVariants(), 'text-xs md:text-sm')}
        >
          <IconPlus className='mr-2 h-4 w-4' /> 新增
        </Link>
      }
    >
      <Suspense
        fallback={
          <DataTableSkeleton columnCount={4} rowCount={8} filterCount={1} />
        }
      >
        <WebsiteListingPage />
      </Suspense>
    </PageContainer>
  );
}
