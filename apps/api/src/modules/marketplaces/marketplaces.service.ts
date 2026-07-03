import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateMarketplaceInput, UpdateMarketplaceInput } from '@bilal/shared';
import { MarketplacesRepository } from './marketplaces.repository';

@Injectable()
export class MarketplacesService {
  constructor(private readonly repo: MarketplacesRepository) {}

  list(brandId: string, includeInactive = false) {
    return this.repo.findMany(brandId, includeInactive);
  }

  async getById(brandId: string, id: string) {
    const m = await this.repo.findById(brandId, id);
    if (!m) throw new NotFoundException(`Marketplace ${id} not found`);
    return m;
  }

  create(brandId: string, dto: CreateMarketplaceInput) {
    return this.repo.create({
      name: dto.name,
      description: dto.description ?? null,
      color: dto.color,
      brand: { connect: { id: brandId } },
    });
  }

  async update(brandId: string, id: string, dto: UpdateMarketplaceInput) {
    await this.getById(brandId, id);
    return this.repo.update(id, {
      name: dto.name,
      description: dto.description,
      color: dto.color,
      isActive: dto.isActive,
    });
  }

  async remove(brandId: string, id: string) {
    await this.getById(brandId, id);
    return this.repo.delete(id);
  }

  async listArticles(brandId: string, marketplaceId: string) {
    await this.getById(brandId, marketplaceId);
    return this.repo.findArticlesInMarketplace(brandId, marketplaceId);
  }
}
