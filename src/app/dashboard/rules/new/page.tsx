import PageContainer from '@/components/layout/page-container';
import RuleForm from '@/features/rules/components/rule-form';

export default function NewRulePage() {
  return (
    <PageContainer pageTitle='规则管理' pageDescription='创建新的访问控制规则'>
      <RuleForm initialData={null} pageTitle='创建规则' />
    </PageContainer>
  );
}
