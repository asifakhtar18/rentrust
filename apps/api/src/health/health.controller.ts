import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * Liveness: is the process up and able to answer? Must not depend on
   * downstream systems so a transient DB blip does not trigger a pod restart.
   */
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  liveness() {
    return { data: { status: 'ok', uptime: process.uptime() } };
  }

  /**
   * Readiness: are our dependencies (DB, Redis) reachable so we can accept
   * traffic? Returns 200 only when every dependency reports healthy.
   */
  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  async readiness() {
    const checks = await this.health.checkDependencies();
    return { data: checks };
  }
}
