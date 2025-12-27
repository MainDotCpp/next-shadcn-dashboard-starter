'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { Website } from '@/constants/data';

export async function getWebsites({
  page = 1,
  limit = 10,
  search
}: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  try {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          name: {
            contains: search,
            mode: 'insensitive' as const
          }
        }
      : {};

    const [websites, total] = await Promise.all([
      prisma.website.findMany({
        where,
        skip,
        take: limit,
        include: {
          rule: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      }),
      prisma.website.count({ where })
    ]);

    return {
      success: true,
      total_websites: total,
      offset: skip,
      limit,
      websites: websites.map((w) => ({
        id: w.id,
        name: w.name,
        domain: w.domain || undefined,
        rule_id: w.rule_id || undefined,
        rule_name: w.rule?.name,
        created_at: w.created_at.toISOString(),
        updated_at: w.updated_at.toISOString()
      })) as any[]
    };
  } catch (error) {
    console.error('Error fetching websites:', error);
    throw new Error('Failed to fetch websites');
  }
}

export async function getWebsiteById(id: number) {
  try {
    const website = await prisma.website.findUnique({
      where: { id },
      include: {
        rule: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!website) {
      return {
        success: false,
        message: `Website with ID ${id} not found`
      };
    }

    return {
      success: true,
      message: `Website with ID ${id} found`,
      website: {
        id: website.id,
        name: website.name,
        domain: website.domain || undefined,
        rule_id: website.rule_id || undefined,
        rule_name: website.rule?.name,
        created_at: website.created_at.toISOString(),
        updated_at: website.updated_at.toISOString()
      } as any
    };
  } catch (error) {
    console.error('Error fetching website:', error);
    throw new Error('Failed to fetch website');
  }
}

export async function createWebsite(data: {
  name: string;
  domain?: string;
  rule_id?: number | null;
}) {
  try {
    const website = await prisma.website.create({
      data: {
        name: data.name,
        domain: data.domain || null,
        rule_id: data.rule_id || null
      }
    });

    revalidatePath('/dashboard/website');

    return {
      success: true,
      message: 'Website created successfully',
      website: {
        id: website.id,
        name: website.name,
        domain: website.domain || undefined,
        rule_id: website.rule_id || undefined,
        created_at: website.created_at.toISOString(),
        updated_at: website.updated_at.toISOString()
      } as any
    };
  } catch (error) {
    console.error('Error creating website:', error);
    throw new Error('Failed to create website');
  }
}

export async function updateWebsite(
  id: number,
  data: {
    name?: string;
    domain?: string;
    rule_id?: number | null;
  }
) {
  try {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.domain !== undefined) updateData.domain = data.domain || null;
    if (data.rule_id !== undefined) updateData.rule_id = data.rule_id || null;

    const website = await prisma.website.update({
      where: { id },
      data: updateData
    });

    revalidatePath('/dashboard/website');
    revalidatePath(`/dashboard/website/${id}`);

    return {
      success: true,
      message: 'Website updated successfully',
      website: {
        id: website.id,
        name: website.name,
        domain: website.domain || undefined,
        rule_id: website.rule_id || undefined,
        created_at: website.created_at.toISOString(),
        updated_at: website.updated_at.toISOString()
      } as any
    };
  } catch (error) {
    console.error('Error updating website:', error);
    throw new Error('Failed to update website');
  }
}

export async function deleteWebsite(id: number) {
  try {
    await prisma.website.delete({
      where: { id }
    });

    revalidatePath('/dashboard/website');

    return {
      success: true,
      message: 'Website deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting website:', error);
    throw new Error('Failed to delete website');
  }
}
