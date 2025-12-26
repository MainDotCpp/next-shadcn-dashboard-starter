////////////////////////////////////////////////////////////////////////////////
// 🛑 Nothing in here has anything to do with Nextjs, it's just a fake database
////////////////////////////////////////////////////////////////////////////////

import { faker } from '@faker-js/faker';
import { matchSorter } from 'match-sorter'; // For filtering
import { Website } from './data';

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Mock website data store
export const fakeWebsites = {
  records: [] as Website[], // Holds the list of website objects

  // Initialize with sample data
  initialize() {
    const sampleWebsites: Website[] = [];

    function generateRandomWebsiteData(id: number): Website {
      return {
        id,
        name: `网站 ${id}`,
        created_at: faker.date
          .between({ from: '2024-01-01', to: new Date() })
          .toISOString(),
        updated_at: faker.date.recent().toISOString()
      };
    }

    // Generate initial records
    for (let i = 1; i <= 5; i++) {
      sampleWebsites.push(generateRandomWebsiteData(i));
    }

    this.records = sampleWebsites;
  },

  // Get all websites with optional search
  async getAll({ search }: { search?: string }) {
    let websites = [...this.records];

    // Search functionality
    if (search) {
      websites = matchSorter(websites, search, {
        keys: ['name']
      });
    }

    return websites;
  },

  // Get paginated results with optional search
  async getWebsites({
    page = 1,
    limit = 10,
    search
  }: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    await delay(500);
    const allWebsites = await this.getAll({ search });
    const totalWebsites = allWebsites.length;

    // Pagination logic
    const offset = (page - 1) * limit;
    const paginatedWebsites = allWebsites.slice(offset, offset + limit);

    // Mock current time
    const currentTime = new Date().toISOString();

    // Return paginated response
    return {
      success: true,
      time: currentTime,
      message: 'Sample data for testing and learning purposes',
      total_websites: totalWebsites,
      offset,
      limit,
      websites: paginatedWebsites
    };
  },

  // Get a specific website by its ID
  async getWebsiteById(id: number) {
    await delay(300);

    const website = this.records.find((website) => website.id === id);

    if (!website) {
      return {
        success: false,
        message: `Website with ID ${id} not found`
      };
    }

    const currentTime = new Date().toISOString();

    return {
      success: true,
      time: currentTime,
      message: `Website with ID ${id} found`,
      website
    };
  },

  // Create a new website
  async createWebsite(data: { name: string }) {
    await delay(500);

    const newWebsite: Website = {
      id:
        this.records.length > 0
          ? Math.max(...this.records.map((w) => w.id)) + 1
          : 1,
      name: data.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.records.push(newWebsite);

    return {
      success: true,
      message: 'Website created successfully',
      website: newWebsite
    };
  },

  // Update an existing website
  async updateWebsite(id: number, data: { name: string }) {
    await delay(500);

    const index = this.records.findIndex((website) => website.id === id);

    if (index === -1) {
      return {
        success: false,
        message: `Website with ID ${id} not found`
      };
    }

    const updatedWebsite: Website = {
      ...this.records[index],
      name: data.name,
      updated_at: new Date().toISOString()
    };

    this.records[index] = updatedWebsite;

    return {
      success: true,
      message: 'Website updated successfully',
      website: updatedWebsite
    };
  },

  // Delete a website
  async deleteWebsite(id: number) {
    await delay(500);

    const index = this.records.findIndex((website) => website.id === id);

    if (index === -1) {
      return {
        success: false,
        message: `Website with ID ${id} not found`
      };
    }

    this.records.splice(index, 1);

    return {
      success: true,
      message: 'Website deleted successfully'
    };
  }
};

// Initialize sample websites
fakeWebsites.initialize();
