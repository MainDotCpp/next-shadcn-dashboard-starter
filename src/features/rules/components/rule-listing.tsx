import { searchParamsCache } from '@/lib/searchparams';
import { getRules } from '../actions/rule-actions';
import { RuleTable } from './rule-tables';
import type { Rule } from './rule-tables/columns';

export default async function RuleListingPage() {
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('search');
  const type = searchParamsCache.get('type');
  const enabled = searchParamsCache.get('enabled');
  const pageLimit = searchParamsCache.get('perPage');

  const filters: any = {
    page: page || 1,
    limit: pageLimit || 10
  };

  if (search) {
    filters.search = search;
  }

  if (type && type !== 'all') {
    filters.type = type;
  }

  if (enabled && enabled !== 'all') {
    filters.enabled = enabled === 'true';
  }

  const result = await getRules(filters);
  const rules: Rule[] = (result.data || []) as Rule[];
  const totalItems = result.pagination?.total || 0;

  return <RuleTable data={rules} totalItems={totalItems} />;
}
