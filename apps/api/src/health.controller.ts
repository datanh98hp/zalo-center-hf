import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { status: 'ok', service: 'zalo-center-api', timestamp: new Date().toISOString() };
  }
}
