import { getRuleById } from '../actions/rule-actions';
import RuleForm from './rule-form';
import type { Rule } from './rule-tables/columns';

export default async function RuleViewPage({ ruleId }: { ruleId: number }) {
  const result = await getRuleById(ruleId);
  const rule = result.data as Rule | null;

  return (
    <RuleForm initialData={rule} pageTitle={rule ? '编辑规则' : '创建规则'} />
  );
}
