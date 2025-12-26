import { Website } from '@/constants/data';
import { getWebsiteById } from '../actions/website-actions';
import { notFound } from 'next/navigation';
import WebsiteForm from './website-form';

type TWebsiteViewPageProps = {
  websiteId: string;
};

export default async function WebsiteViewPage({
  websiteId
}: TWebsiteViewPageProps) {
  let website = null;
  let pageTitle = '创建新网站';

  if (websiteId !== 'new') {
    const data = await getWebsiteById(Number(websiteId));
    if (!data.success || !data.website) {
      notFound();
    }
    website = data.website;
    pageTitle = `编辑网站`;
  }

  return <WebsiteForm initialData={website} pageTitle={pageTitle} />;
}
