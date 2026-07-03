import { Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';
import { StorageService } from './storage.service';

@Module({
  providers: [LocalStorageService, StorageService],
  exports: [StorageService, LocalStorageService],
})
export class StorageModule {}
