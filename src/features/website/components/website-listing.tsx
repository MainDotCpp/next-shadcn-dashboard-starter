import { Website } from '@/constants/data';
import { searchParamsCache } from '@/lib/searchparams';
import { getWebsites } from '../actions/website-actions';
import { WebsiteTable } from './website-tables';
import { columns } from './website-tables/columns';

type WebsiteListingPage = {};

export default async function WebsiteListingPage({}: WebsiteListingPage) {
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('name');
  const pageLimit = searchParamsCache.get('perPage');

  const filters = {
    page: page || 1,
    limit: pageLimit || 10,
    ...(search && { search })
  };

  const data = await getWebsites(filters);
  const totalWebsites = data.total_websites;
  const websites: Website[] = data.websites;

  return (
    <WebsiteTable
      data={websites}
      totalItems={totalWebsites}
      columns={columns}
    />
  );
}
