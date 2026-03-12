import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import { networkInterfaces } from 'os';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable compression
  app.use(compression());

  // Support trust proxy for IP detection
  app.set('trust proxy', true);

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API Prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Local network access: http://${getLocalIp()}:${port}`);
}

function getLocalIp(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    const interfaces = nets[name];
    if (interfaces) {
      for (const net of interfaces) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  }
  return '127.0.0.1';
}

void bootstrap();
