import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SeedsService } from './seeds.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const seedsService = app.get(SeedsService);

  try {
    console.log('Starting database seeding...');
    await seedsService.seed();
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

void bootstrap();
