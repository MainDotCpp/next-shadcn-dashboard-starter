import PageContainer from '@/components/layout/page-container';
import RuleViewPage from '@/features/rules/components/rule-view-page';

type PageProps = {
  params: Promise<{
    ruleId: string;
  }>;
};

export default async function RulePage(props: PageProps) {
  const params = await props.params;
  const ruleId = parseInt(params.ruleId);

  if (isNaN(ruleId)) {
    return (
      <PageContainer pageTitle='错误'>
        <div>无效的规则 ID</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      pageTitle='规则管理'
      pageDescription='创建或编辑访问控制规则'
    >
      <RuleViewPage ruleId={ruleId} />
    </PageContainer>
  );
}
