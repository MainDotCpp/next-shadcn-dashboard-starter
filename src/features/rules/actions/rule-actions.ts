'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// 规则步骤类型
export type StepType =
  | 'country'
  | 'language'
  | 'ip'
  | 'user_agent'
  | 'path'
  | 'bot'
  | 'params_search'
  | 'ip_type';

// 规则步骤动作
export type StepAction = 'intercept' | 'continue' | 'allow';

// 规则表单验证
const ruleSchema = z.object({
  name: z.string().min(1, '规则名称不能为空'),
  description: z.string().optional(),
  enabled: z.boolean().default(true)
});

// 规则步骤配置类型
export type StepConfig =
  | { type: 'country'; countries: string[]; match_mode: 'include' | 'exclude' }
  | { type: 'language'; languages: string[]; match_mode: 'include' | 'exclude' }
  | { type: 'ip'; ips: string[]; match_mode: 'whitelist' | 'blacklist' }
  | { type: 'user_agent'; pattern: string; match_mode: 'regex' | 'contains' }
  | { type: 'path'; pattern: string; match_mode: 'regex' | 'contains' }
  | { type: 'bot'; match_bot: boolean }
  | {
      type: 'params_search';
      param_name: string;
      param_value: string;
      match_mode: 'regex' | 'contains' | 'equals';
    }
  | { type: 'ip_type'; ip_types: string[]; match_mode: 'include' | 'exclude' };

/**
 * 获取所有规则（包含步骤）
 */
export async function getRules(params?: {
  page?: number;
  limit?: number;
  search?: string;
  enabled?: boolean;
}) {
  try {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } }
      ];
    }

    if (params?.enabled !== undefined) {
      where.enabled = params.enabled;
    }

    const [rules, total] = await Promise.all([
      prisma.rule.findMany({
        where,
        include: {
          steps: {
            where: { enabled: true },
            orderBy: { step_order: 'asc' }
          },
          _count: {
            select: { websites: true }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.rule.count({ where })
    ]);

    return {
      success: true,
      data: rules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error fetching rules:', error);
    return {
      success: false,
      error: 'Failed to fetch rules',
      data: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      }
    };
  }
}

/**
 * 根据 ID 获取规则（包含步骤）
 */
export async function getRuleById(id: number) {
  try {
    const rule = await prisma.rule.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { step_order: 'asc' }
        },
        _count: {
          select: { websites: true }
        }
      }
    });

    if (!rule) {
      return {
        success: false,
        error: 'Rule not found',
        data: null
      };
    }

    return {
      success: true,
      data: rule
    };
  } catch (error) {
    console.error('Error fetching rule:', error);
    return {
      success: false,
      error: 'Failed to fetch rule',
      data: null
    };
  }
}

/**
 * 创建规则（包含步骤）
 */
export async function createRule(data: {
  name: string;
  description?: string;
  enabled?: boolean;
  steps?: Array<{
    type: StepType;
    name: string;
    config: StepConfig;
    action: StepAction;
    enabled?: boolean;
  }>;
}) {
  try {
    const validated = ruleSchema.parse({
      name: data.name,
      description: data.description,
      enabled: data.enabled ?? true
    });

    const rule = await prisma.rule.create({
      data: {
        ...validated,
        steps: {
          create: (data.steps || []).map((step, index) => ({
            step_order: index,
            type: step.type,
            name: step.name,
            config: step.config as any,
            action: step.action,
            enabled: step.enabled ?? true
          }))
        }
      },
      include: {
        steps: true
      }
    });

    revalidatePath('/dashboard/rules');
    return {
      success: true,
      data: rule
    };
  } catch (error) {
    console.error('Error creating rule:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Validation error',
        data: null
      };
    }
    return {
      success: false,
      error: 'Failed to create rule',
      data: null
    };
  }
}

/**
 * 更新规则（包含步骤）
 */
export async function updateRuleWithSteps(
  id: number,
  data: {
    name?: string;
    description?: string;
    enabled?: boolean;
    steps?: Array<{
      id?: number; // 如果有 id，表示更新现有步骤；如果没有，表示新建步骤
      type: StepType;
      name: string;
      config: StepConfig;
      action: StepAction;
      enabled?: boolean;
    }>;
  }
) {
  try {
    const rule = await prisma.rule.findUnique({
      where: { id },
      include: { steps: true }
    });

    if (!rule) {
      return {
        success: false,
        error: 'Rule not found',
        data: null
      };
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;

    const validated = ruleSchema.parse({
      name: updateData.name ?? rule.name,
      description: updateData.description ?? rule.description,
      enabled: updateData.enabled ?? rule.enabled
    });

    // 使用事务更新规则和步骤
    const result = await prisma.$transaction(async (tx) => {
      // 更新规则基本信息
      const updatedRule = await tx.rule.update({
        where: { id },
        data: validated
      });

      // 如果提供了步骤，更新步骤
      if (data.steps !== undefined) {
        // 删除所有现有步骤
        await tx.ruleStep.deleteMany({
          where: { rule_id: id }
        });

        // 创建新步骤
        if (data.steps.length > 0) {
          await tx.ruleStep.createMany({
            data: data.steps.map((step, index) => ({
              rule_id: id,
              step_order: index,
              type: step.type,
              name: step.name,
              config: step.config as any,
              action: step.action,
              enabled: step.enabled ?? true
            }))
          });
        }
      }

      // 返回更新后的规则（包含步骤）
      return await tx.rule.findUnique({
        where: { id },
        include: {
          steps: {
            orderBy: { step_order: 'asc' }
          }
        }
      });
    });

    revalidatePath('/dashboard/rules');
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error updating rule with steps:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Validation error',
        data: null
      };
    }
    return {
      success: false,
      error: 'Failed to update rule',
      data: null
    };
  }
}

/**
 * 更新规则基本信息
 */
export async function updateRule(
  id: number,
  data: {
    name?: string;
    description?: string;
    enabled?: boolean;
  }
) {
  try {
    const rule = await prisma.rule.findUnique({
      where: { id }
    });

    if (!rule) {
      return {
        success: false,
        error: 'Rule not found',
        data: null
      };
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;

    const validated = ruleSchema.parse({
      name: updateData.name ?? rule.name,
      description: updateData.description ?? rule.description,
      enabled: updateData.enabled ?? rule.enabled
    });

    const updated = await prisma.rule.update({
      where: { id },
      data: validated,
      include: {
        steps: {
          orderBy: { step_order: 'asc' }
        }
      }
    });

    revalidatePath('/dashboard/rules');
    return {
      success: true,
      data: updated
    };
  } catch (error) {
    console.error('Error updating rule:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Validation error',
        data: null
      };
    }
    return {
      success: false,
      error: 'Failed to update rule',
      data: null
    };
  }
}

/**
 * 更新规则步骤顺序（拖拽排序）
 */
export async function updateRuleStepsOrder(
  ruleId: number,
  stepOrders: Array<{ id: number; step_order: number }>
) {
  try {
    // 使用事务更新所有步骤的顺序
    await prisma.$transaction(
      stepOrders.map(({ id, step_order }) =>
        prisma.ruleStep.update({
          where: { id },
          data: { step_order }
        })
      )
    );

    revalidatePath('/dashboard/rules');
    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating steps order:', error);
    return {
      success: false,
      error: 'Failed to update steps order'
    };
  }
}

/**
 * 添加规则步骤
 */
export async function addRuleStep(
  ruleId: number,
  step: {
    type: StepType;
    name: string;
    config: StepConfig;
    action: StepAction;
    enabled?: boolean;
  }
) {
  try {
    // 获取当前最大顺序
    const maxOrder = await prisma.ruleStep.findFirst({
      where: { rule_id: ruleId },
      orderBy: { step_order: 'desc' },
      select: { step_order: true }
    });

    const newOrder = (maxOrder?.step_order ?? -1) + 1;

    const ruleStep = await prisma.ruleStep.create({
      data: {
        rule_id: ruleId,
        step_order: newOrder,
        type: step.type,
        name: step.name,
        config: step.config as any,
        action: step.action,
        enabled: step.enabled ?? true
      }
    });

    revalidatePath('/dashboard/rules');
    return {
      success: true,
      data: ruleStep
    };
  } catch (error) {
    console.error('Error adding rule step:', error);
    return {
      success: false,
      error: 'Failed to add rule step',
      data: null
    };
  }
}

/**
 * 更新规则步骤
 */
export async function updateRuleStep(
  id: number,
  step: {
    name?: string;
    config?: StepConfig;
    action?: StepAction;
    enabled?: boolean;
  }
) {
  try {
    const updateData: any = {};
    if (step.name !== undefined) updateData.name = step.name;
    if (step.config !== undefined) updateData.config = step.config as any;
    if (step.action !== undefined) updateData.action = step.action;
    if (step.enabled !== undefined) updateData.enabled = step.enabled;

    const updated = await prisma.ruleStep.update({
      where: { id },
      data: updateData
    });

    revalidatePath('/dashboard/rules');
    return {
      success: true,
      data: updated
    };
  } catch (error) {
    console.error('Error updating rule step:', error);
    return {
      success: false,
      error: 'Failed to update rule step',
      data: null
    };
  }
}

/**
 * 删除规则步骤
 */
export async function deleteRuleStep(id: number) {
  try {
    const step = await prisma.ruleStep.findUnique({
      where: { id }
    });

    if (!step) {
      return {
        success: false,
        error: 'Step not found'
      };
    }

    // 删除步骤
    await prisma.ruleStep.delete({
      where: { id }
    });

    // 重新排序剩余步骤
    const remainingSteps = await prisma.ruleStep.findMany({
      where: {
        rule_id: step.rule_id,
        step_order: { gt: step.step_order }
      },
      orderBy: { step_order: 'asc' }
    });

    // 更新顺序
    for (let i = 0; i < remainingSteps.length; i++) {
      await prisma.ruleStep.update({
        where: { id: remainingSteps[i].id },
        data: { step_order: step.step_order + i }
      });
    }

    revalidatePath('/dashboard/rules');
    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting rule step:', error);
    return {
      success: false,
      error: 'Failed to delete rule step'
    };
  }
}

/**
 * 删除规则
 */
export async function deleteRule(id: number) {
  try {
    await prisma.rule.delete({
      where: { id }
    });

    revalidatePath('/dashboard/rules');
    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting rule:', error);
    return {
      success: false,
      error: 'Failed to delete rule'
    };
  }
}

/**
 * 切换规则启用状态
 */
export async function toggleRule(id: number) {
  try {
    const rule = await prisma.rule.findUnique({
      where: { id }
    });

    if (!rule) {
      return {
        success: false,
        error: 'Rule not found'
      };
    }

    const updated = await prisma.rule.update({
      where: { id },
      data: {
        enabled: !rule.enabled
      }
    });

    revalidatePath('/dashboard/rules');
    return {
      success: true,
      data: updated
    };
  } catch (error) {
    console.error('Error toggling rule:', error);
    return {
      success: false,
      error: 'Failed to toggle rule'
    };
  }
}

/**
 * 根据域名获取规则（用于检测逻辑）
 */
/**
 * 根据域名获取关联的规则
 * 支持精确匹配和大小写不敏感匹配
 */
export async function getRuleByDomain(domain: string) {
  try {
    if (!domain) {
      return null;
    }

    // 规范化域名（转小写，去除前后空格）
    const normalizedDomain = domain.toLowerCase().trim();

    // 查找匹配的网站（精确匹配域名，大小写不敏感）
    // 注意：PostgreSQL 默认大小写敏感，这里使用 toLowerCase 预处理
    const website = await prisma.website.findFirst({
      where: {
        domain: normalizedDomain,
        rule: {
          enabled: true
        }
      },
      include: {
        rule: {
          include: {
            steps: {
              where: {
                enabled: true
              },
              orderBy: {
                step_order: 'asc'
              }
            }
          }
        }
      }
    });

    if (website?.rule) {
      console.log(
        `[Rule] Found rule "${website.rule.name}" for domain "${normalizedDomain}" with ${website.rule.steps.length} steps`
      );
      return website.rule;
    }

    console.log(`[Rule] No rule found for domain: ${normalizedDomain}`);
    return null;
  } catch (error) {
    console.error('[Rule] Error fetching rule by domain:', error);
    return null;
  }
}
