import { Module } from '@nestjs/common';
import { MarketplacesController } from './marketplaces.controller';
import { MarketplacesService } from './marketplaces.service';
import { MarketplacesRepository } from './marketplaces.repository';

@Module({
  controllers: [MarketplacesController],
  providers: [MarketplacesService, MarketplacesRepository],
  exports: [MarketplacesService],
})
export class MarketplacesModule {}
