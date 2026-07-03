import { Logger, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * Generic base repository. Each domain repository extends this with model-specific queries.
 *
 * Why: removes ~30 lines of boilerplate per domain (findById/findMany/create/update/delete)
 * and gives a consistent shape for tests to mock.
 *
 * Usage:
 *   class CollectionsRepository extends BaseRepository<Collection, ...> {
 *     constructor(prisma: PrismaService) { super(prisma, 'collection'); }
 *     // ... custom queries
 *   }
 */
export abstract class BaseRepository<TModel, TWhere, TCreate, TUpdate, TSelect = unknown> {
  protected readonly logger: Logger;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
  ) {
    this.logger = new Logger(`${modelName}Repository`);
  }

  protected get delegate(): {
    findUnique: (args: { where: TWhere; select?: TSelect; include?: unknown }) => Promise<TModel | null>;
    findMany: (args: unknown) => Promise<TModel[]>;
    count: (args: unknown) => Promise<number>;
    create: (args: { data: TCreate; select?: TSelect; include?: unknown }) => Promise<TModel>;
    update: (args: { where: TWhere; data: TUpdate; select?: TSelect; include?: unknown }) => Promise<TModel>;
    delete: (args: { where: TWhere }) => Promise<TModel>;
  } {
    return (this.prisma as unknown as Record<string, unknown>)[this.modelName] as never;
  }

  async findById(id: string, include?: unknown): Promise<TModel | null> {
    return this.delegate.findUnique({
      where: { id } as TWhere,
      include,
    });
  }

  async findByIdOrFail(id: string, include?: unknown): Promise<TModel> {
    const result = await this.findById(id, include);
    if (!result) {
      throw new NotFoundException(`${this.modelName} with id "${id}" not found`);
    }
    return result;
  }

  async create(data: TCreate, include?: unknown): Promise<TModel> {
    return this.delegate.create({ data, include });
  }

  async update(id: string, data: TUpdate, include?: unknown): Promise<TModel> {
    return this.delegate.update({ where: { id } as TWhere, data, include });
  }

  async delete(id: string): Promise<TModel> {
    return this.delegate.delete({ where: { id } as TWhere });
  }
}
