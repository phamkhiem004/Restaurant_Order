import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ClassSchedulesService } from './class-schedules.service';
import { CreateClassScheduleDto } from './dto/create-class-schedule.dto';

@Controller('class-schedules')
export class ClassSchedulesController {
  constructor(private readonly classSchedulesService: ClassSchedulesService) {}

  @Post()
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  create(
    @Body() dto: CreateClassScheduleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.classSchedulesService.create(dto, request.user.id);
  }

  @Get()
  findAll() {
    return this.classSchedulesService.findAll();
  }

  @Get('my-enrollments')
  @UseGuards(SessionAuthGuard)
  myEnrollments(@Req() request: AuthenticatedRequest) {
    return this.classSchedulesService.findEnrollmentsForUser(request.user.id);
  }

  @Get(':id/enrollments')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  enrollments(@Param('id', ParseIntPipe) id: number) {
    return this.classSchedulesService.findEnrollmentsForSchedule(id);
  }

  @Patch(':id/start')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  start(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.classSchedulesService.start(
      id,
      request.user,
      request.protocol + '://' + request.get('host'),
    );
  }

  @Patch(':id/cancel')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.classSchedulesService.cancel(id);
  }

  @Patch(':id/complete')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  complete(@Param('id', ParseIntPipe) id: number) {
    return this.classSchedulesService.complete(id);
  }

  @Post(':id/enroll')
  @UseGuards(SessionAuthGuard)
  enroll(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.classSchedulesService.enroll(id, request.user.id);
  }

  @Post('enrollments/:enrollmentId/pay')
  @UseGuards(SessionAuthGuard)
  async pay(
    @Param('enrollmentId', ParseIntPipe) enrollmentId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    const url = await this.classSchedulesService.createPaymentUrl(
      enrollmentId,
      request.user.id,
      request as unknown as Request,
    );
    return { message: 'Tạo URL thanh toán thành công', url };
  }

  @Post(':id/join')
  @UseGuards(SessionAuthGuard)
  join(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.classSchedulesService.join(id, request.user);
  }
}
