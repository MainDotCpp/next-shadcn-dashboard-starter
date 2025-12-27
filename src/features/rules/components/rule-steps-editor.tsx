'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { StepType, StepAction, StepConfig } from '../actions/rule-actions';
import { toast } from 'sonner';
import { StepConfigEditor } from './step-config-editor';

interface RuleStep {
  id: number;
  step_order: number;
  type: StepType;
  name: string;
  config: StepConfig;
  action: StepAction;
  enabled: boolean;
}

interface RuleStepsEditorProps {
  ruleId: number;
  steps: RuleStep[];
  onStepsChange?: (steps: RuleStep[]) => void;
}

const STEP_TYPE_LABELS: Record<StepType, string> = {
  country: '地区检查',
  language: '语言检查',
  ip: 'IP 检查',
  user_agent: 'User-Agent 检查',
  path: '路径检查',
  bot: '机器人检查',
  params_search: '参数匹配',
  ip_type: 'IP类型匹配'
};

const ACTION_LABELS: Record<
  StepAction,
  { label: string; variant: 'default' | 'destructive' | 'secondary' }
> = {
  intercept: { label: '拦截', variant: 'destructive' },
  continue: { label: '继续', variant: 'secondary' },
  allow: { label: '放行', variant: 'default' }
};

function SortableStepItem({
  step,
  onEdit,
  onDelete,
  onToggle
}: {
  step: RuleStep;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card rounded-lg border transition-all ${
        isDragging ? 'ring-primary ring-2' : ''
      } ${!step.enabled ? 'opacity-60' : ''}`}
    >
      <div className='p-4'>
        <div className='flex items-start gap-3'>
          {/* 拖拽手柄 */}
          <button
            {...attributes}
            {...listeners}
            className='text-muted-foreground hover:text-foreground mt-1 flex-shrink-0 cursor-grab transition-colors active:cursor-grabbing'
          >
            <GripVertical className='h-5 w-5' />
          </button>

          {/* 步骤内容 */}
          <div className='min-w-0 flex-1 space-y-2'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0 flex-1 space-y-1.5'>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant='outline' className='text-xs font-medium'>
                    {STEP_TYPE_LABELS[step.type]}
                  </Badge>
                  <span className='truncate text-sm font-semibold'>
                    {step.name}
                  </span>
                </div>
                <div className='text-muted-foreground flex flex-wrap items-center gap-2 text-xs'>
                  {step.type === 'country' && (
                    <span className='truncate'>
                      国家:{' '}
                      {(step.config as any).countries?.join(', ') || '未配置'}
                    </span>
                  )}
                  {step.type === 'language' && (
                    <span className='truncate'>
                      语言:{' '}
                      {(step.config as any).languages?.join(', ') || '未配置'}
                    </span>
                  )}
                  {step.type === 'ip' && (
                    <span className='truncate'>
                      IP: {(step.config as any).ips?.join(', ') || '未配置'}
                    </span>
                  )}
                  {(step.type === 'user_agent' || step.type === 'path') && (
                    <span className='truncate font-mono'>
                      模式: {(step.config as any).pattern || '未配置'}
                    </span>
                  )}
                  {step.type === 'bot' && (
                    <span>
                      匹配机器人: {(step.config as any).match_bot ? '是' : '否'}
                    </span>
                  )}
                  {step.type === 'params_search' && (
                    <span className='truncate font-mono'>
                      参数: {(step.config as any).param_name || '未配置'} ={' '}
                      {(step.config as any).param_value || '未配置'}
                    </span>
                  )}
                  {step.type === 'ip_type' && (
                    <span className='truncate'>
                      IP类型:{' '}
                      {(step.config as any).ip_types?.join(', ') || '未配置'}
                    </span>
                  )}
                </div>
              </div>

              {/* 操作区域 */}
              <div className='flex flex-shrink-0 items-center gap-2'>
                <Badge
                  variant={ACTION_LABELS[step.action].variant}
                  className='min-w-[60px] justify-center text-xs font-medium'
                >
                  {ACTION_LABELS[step.action].label}
                </Badge>
                <Switch
                  checked={step.enabled}
                  onCheckedChange={onToggle}
                  size='sm'
                  className='flex-shrink-0'
                />
                <div className='ml-1 flex items-center gap-1 border-l pl-2'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={onEdit}
                    className='h-8 w-8 p-0'
                    title='编辑'
                  >
                    <Edit2 className='h-4 w-4' />
                  </Button>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={onDelete}
                    className='text-destructive hover:text-destructive h-8 w-8 p-0'
                    title='删除'
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 拖拽时的预览组件
function StepDragOverlay({ step }: { step: RuleStep }) {
  return (
    <div className='border-primary bg-card rounded-lg border-2 p-4'>
      <div className='flex items-start gap-3'>
        <GripVertical className='text-muted-foreground mt-1 h-5 w-5' />
        <div className='flex-1 space-y-1.5'>
          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='text-xs'>
              {STEP_TYPE_LABELS[step.type]}
            </Badge>
            <span className='text-sm font-semibold'>{step.name}</span>
          </div>
          <Badge
            variant={ACTION_LABELS[step.action].variant}
            className='text-xs'
          >
            {ACTION_LABELS[step.action].label}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export function RuleStepsEditor({
  ruleId,
  steps: initialSteps,
  onStepsChange
}: RuleStepsEditorProps) {
  const [steps, setSteps] = useState<RuleStep[]>(initialSteps);
  const [editingStep, setEditingStep] = useState<RuleStep | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [nextTempId, setNextTempId] = useState(-1);
  const [activeId, setActiveId] = useState<number | null>(null);

  // 当 initialSteps 改变时，同步更新本地状态
  useEffect(() => {
    setSteps(initialSteps);
  }, [initialSteps]);

  // 使用 useMemo 优化步骤 ID 列表
  const stepIds = useMemo(() => steps.map((s) => s.id), [steps]);

  // 当步骤变化时，通知父组件（使用防抖优化）
  useEffect(() => {
    onStepsChange?.(steps);
  }, [steps, onStepsChange]);

  // 优化传感器配置，添加激活延迟以提高性能
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8 // 移动8px后才激活拖拽
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 触摸200ms后才激活
        tolerance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.id === active.id);
      const newIndex = steps.findIndex((s) => s.id === over.id);

      const newSteps = arrayMove(steps, oldIndex, newIndex);
      // 更新步骤顺序
      const updatedSteps = newSteps.map((step, index) => ({
        ...step,
        step_order: index
      }));
      setSteps(updatedSteps);
    }
  };

  const handleToggleStep = (stepId: number, enabled: boolean) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, enabled } : s))
    );
  };

  const handleDeleteStep = (stepId: number) => {
    if (!confirm('确定要删除这个步骤吗？')) {
      return;
    }
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
  };

  const handleAddStep = () => {
    setEditingStep(null);
    setIsDialogOpen(true);
  };

  const handleEditStep = (step: RuleStep) => {
    setEditingStep(step);
    setIsDialogOpen(true);
  };

  const activeStep = activeId ? steps.find((s) => s.id === activeId) : null;

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2'>
            <h2 className='text-lg font-semibold'>规则步骤</h2>
            {steps.length > 0 && (
              <Badge variant='secondary' className='text-xs'>
                {steps.filter((s) => s.enabled).length} / {steps.length}
              </Badge>
            )}
          </div>
          <p className='text-muted-foreground text-xs'>
            拖拽排序，按顺序执行检查。每个步骤可以设置拦截、继续或放行
          </p>
        </div>
        <Button onClick={handleAddStep} size='sm'>
          <Plus className='mr-2 h-4 w-4' />
          添加步骤
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
          <div className='space-y-3'>
            {steps.length === 0 ? (
              <div className='bg-muted/30 flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12 text-center'>
                <div className='bg-muted mb-2 rounded-full p-3'>
                  <Plus className='text-muted-foreground h-5 w-5' />
                </div>
                <p className='text-muted-foreground mb-1 text-sm font-medium'>
                  暂无步骤
                </p>
                <p className='text-muted-foreground mb-4 text-xs'>
                  点击"添加步骤"开始配置规则流程
                </p>
                <Button onClick={handleAddStep} variant='outline' size='sm'>
                  <Plus className='mr-2 h-4 w-4' />
                  添加第一个步骤
                </Button>
              </div>
            ) : (
              <div className='space-y-3'>
                {steps.map((step) => (
                  <SortableStepItem
                    key={step.id}
                    step={step}
                    onEdit={() => handleEditStep(step)}
                    onDelete={() => handleDeleteStep(step.id)}
                    onToggle={(enabled) => handleToggleStep(step.id, enabled)}
                  />
                ))}
              </div>
            )}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeStep ? <StepDragOverlay step={activeStep} /> : null}
        </DragOverlay>
      </DndContext>

      <StepEditDialog
        ruleId={ruleId}
        step={editingStep}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={(newStep) => {
          setIsDialogOpen(false);
          if (editingStep) {
            setSteps((prev) =>
              prev.map((s) => (s.id === editingStep.id ? newStep : s))
            );
          } else {
            const tempId = nextTempId;
            setNextTempId(tempId - 1);
            setSteps((prev) => [
              ...prev,
              {
                ...newStep,
                id: tempId,
                step_order: prev.length
              }
            ]);
          }
        }}
      />
    </div>
  );
}

// 步骤编辑对话框组件
function StepEditDialog({
  ruleId,
  step,
  open,
  onOpenChange,
  onSuccess
}: {
  ruleId: number;
  step: RuleStep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newStep: RuleStep) => void;
}) {
  // 初始化配置
  const getDefaultConfig = (type: StepType): StepConfig => {
    switch (type) {
      case 'country':
        return { type: 'country', countries: [], match_mode: 'include' };
      case 'language':
        return { type: 'language', languages: [], match_mode: 'include' };
      case 'ip':
        return { type: 'ip', ips: [], match_mode: 'whitelist' };
      case 'user_agent':
        return { type: 'user_agent', pattern: '', match_mode: 'contains' };
      case 'path':
        return { type: 'path', pattern: '', match_mode: 'contains' };
      case 'bot':
        return { type: 'bot', match_bot: true };
      case 'params_search':
        return {
          type: 'params_search',
          param_name: '',
          param_value: '',
          match_mode: 'equals'
        };
      case 'ip_type':
        return { type: 'ip_type', ip_types: [], match_mode: 'include' };
      default:
        return { type: 'country', countries: [], match_mode: 'include' };
    }
  };

  const [stepType, setStepType] = useState<StepType>(step?.type || 'country');
  const [stepName, setStepName] = useState(step?.name || '');
  const [stepAction, setStepAction] = useState<StepAction>(
    step?.action || 'continue'
  );
  const [config, setConfig] = useState<StepConfig>(
    step?.config ? (step.config as StepConfig) : getDefaultConfig(stepType)
  );

  // 当 step prop 改变时，重新初始化所有字段
  useEffect(() => {
    if (step) {
      setStepType(step.type);
      setStepName(step.name);
      setStepAction(step.action);
      setConfig(step.config as StepConfig);
    } else {
      setStepType('country');
      setStepName('');
      setStepAction('continue');
      setConfig(getDefaultConfig('country'));
    }
  }, [step]);

  // 当步骤类型改变时（仅新建模式），重置配置
  useEffect(() => {
    if (!step) {
      setConfig(getDefaultConfig(stepType));
    }
  }, [stepType, step]);

  const handleSubmit = () => {
    if (!stepName.trim()) {
      toast.error('请输入步骤名称');
      return;
    }

    const newStep: RuleStep = {
      id: step?.id || 0,
      step_order: step?.step_order || 0,
      type: stepType,
      name: stepName,
      config: config as StepConfig,
      action: stepAction,
      enabled: step?.enabled ?? true
    };

    onSuccess(newStep);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{step ? '编辑步骤' : '添加步骤'}</DialogTitle>
          <DialogDescription>配置规则步骤的类型、条件和动作</DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          {!step && (
            <div className='space-y-2'>
              <label className='text-sm font-medium'>步骤类型</label>
              <Select
                value={stepType}
                onValueChange={(value) => setStepType(value as StepType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='country'>地区检查</SelectItem>
                  <SelectItem value='language'>语言检查</SelectItem>
                  <SelectItem value='ip'>IP 检查</SelectItem>
                  <SelectItem value='user_agent'>User-Agent 检查</SelectItem>
                  <SelectItem value='path'>路径检查</SelectItem>
                  <SelectItem value='bot'>机器人检查</SelectItem>
                  <SelectItem value='params_search'>参数匹配</SelectItem>
                  <SelectItem value='ip_type'>IP类型匹配</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className='space-y-2'>
            <label className='text-sm font-medium'>步骤名称</label>
            <input
              type='text'
              value={stepName}
              onChange={(e) => setStepName(e.target.value)}
              placeholder='例如: 检查中国地区访问'
              className='border-input bg-background w-full rounded-md border px-3 py-2 text-sm'
            />
          </div>

          <div className='space-y-2'>
            <label className='text-sm font-medium'>步骤配置</label>
            <StepConfigEditor
              type={stepType}
              config={config}
              onChange={setConfig}
            />
          </div>

          <div className='space-y-2'>
            <label className='text-sm font-medium'>动作</label>
            <Select
              value={stepAction}
              onValueChange={(value) => setStepAction(value as StepAction)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='intercept'>
                  拦截 - 直接阻止，忽略接下来的流程
                </SelectItem>
                <SelectItem value='continue'>继续 - 执行下一个步骤</SelectItem>
                <SelectItem value='allow'>
                  放行 - 直接允许，忽略接下来的流程
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex justify-end gap-2 pt-2'>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>{step ? '更新' : '添加'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
