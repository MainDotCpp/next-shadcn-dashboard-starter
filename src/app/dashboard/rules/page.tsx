import PageContainer from '@/components/layout/page-container';
import RuleListingPage from '@/features/rules/components/rule-listing';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { IconPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { searchParamsCache } from '@/lib/searchparams';
import { SearchParams } from 'nuqs/server';

export const metadata = {
  title: 'Dashboard: 访问规则'
};

type pageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function RulesPage(props: pageProps) {
  const searchParams = await props.searchParams;
  // Allow nested RSCs to access the search params (in a type-safe way)
  searchParamsCache.parse(searchParams);
  return (
    <PageContainer
      scrollable={false}
      pageTitle='访问规则'
      pageDescription='管理和配置访问控制规则，包括 IP 白名单、黑名单、User-Agent 过滤等'
      pageHeaderAction={
        <Link
          href='/dashboard/rules/new'
          className={cn(buttonVariants(), 'text-xs md:text-sm')}
        >
          <IconPlus className='mr-2 h-4 w-4' /> 新增规则
        </Link>
      }
    >
      <Suspense
        fallback={
          <DataTableSkeleton columnCount={7} rowCount={8} filterCount={3} />
        }
      >
        <RuleListingPage />
      </Suspense>
    </PageContainer>
  );
}
