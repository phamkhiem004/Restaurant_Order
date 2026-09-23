import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import type { Request } from 'express';
import moment from 'moment';
import * as qs from 'qs';
import { Repository } from 'typeorm';
import type { SessionUser } from '../auth/auth.types';
import { RealtimeKitRole } from '../realtimekit/dto/create-participant.dto';
import { RealtimeKitService } from '../realtimekit/realtimekit.service';
import { CreateClassScheduleDto } from './dto/create-class-schedule.dto';
import { ClassEnrollment } from './entities/class-enrollment.entity';
import { ClassSchedule } from './entities/class-schedule.entity';

@Injectable()
export class ClassSchedulesService {
  constructor(
    @InjectRepository(ClassSchedule)
    private readonly scheduleRepository: Repository<ClassSchedule>,
    @InjectRepository(ClassEnrollment)
    private readonly enrollmentRepository: Repository<ClassEnrollment>,
    private readonly realtimeKitService: RealtimeKitService,
    private readonly configService: ConfigService,
  ) {}

  create(dto: CreateClassScheduleDto, createdBy: number) {
    const schedule = this.scheduleRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      scheduledAt: new Date(dto.scheduledAt),
      durationMinutes: dto.durationMinutes ?? 60,
      price: dto.price ?? 30000,
      capacity: dto.capacity ?? null,
      createdBy,
    });
    return this.scheduleRepository.save(schedule);
  }

  findAll() {
    return this.scheduleRepository.find({ order: { scheduledAt: 'ASC' } });
  }

  findEnrollmentsForUser(userId: number) {
    return this.enrollmentRepository.find({ where: { userId } });
  }

  findEnrollmentsForSchedule(scheduleId: number) {
    return this.enrollmentRepository.find({
      where: { classScheduleId: scheduleId },
    });
  }

  async cancel(id: number) {
    const schedule = await this.getScheduleOrThrow(id);
    await this.scheduleRepository.update(id, { status: 'CANCELLED' });
    return { message: `Đã hủy buổi học "${schedule.title}".` };
  }

  async complete(id: number) {
    await this.getScheduleOrThrow(id);
    await this.scheduleRepository.update(id, { status: 'COMPLETED' });
    return { message: 'Đã đánh dấu buổi học hoàn tất.' };
  }

  async start(id: number, teacher: SessionUser, requestOrigin: string) {
    const schedule = await this.getScheduleOrThrow(id);
    if (schedule.status === 'CANCELLED') {
      throw new BadRequestException('Buổi học này đã bị hủy.');
    }
    if (schedule.status === 'COMPLETED') {
      throw new BadRequestException('Buổi học này đã kết thúc.');
    }

    let meetingId = schedule.meetingId;
    if (!meetingId) {
      const meeting = await this.realtimeKitService.createMeeting({
        title: schedule.title,
        persistChat: true,
      });
      meetingId = meeting.id;
    }
    await this.scheduleRepository.update(id, { meetingId, status: 'LIVE' });

    const participant = await this.realtimeKitService.addParticipant(
      meetingId,
      {
        name: teacher.name,
        role: RealtimeKitRole.HOST,
        customParticipantId: `class-teacher-${teacher.id}-${crypto.randomUUID()}`,
      },
    );
    const joinUrl = new URL('/meeting', requestOrigin);
    joinUrl.searchParams.set('authToken', participant.token);

    return { meetingId, joinUrl: joinUrl.toString() };
  }

  async enroll(scheduleId: number, userId: number) {
    const schedule = await this.getScheduleOrThrow(scheduleId);
    if (schedule.status === 'CANCELLED') {
      throw new BadRequestException('Buổi học này đã bị hủy.');
    }
    if (schedule.status === 'COMPLETED') {
      throw new BadRequestException(
        'Buổi học này đã kết thúc, không thể đăng ký.',
      );
    }

    const existing = await this.enrollmentRepository.findOneBy({
      classScheduleId: scheduleId,
      userId,
    });
    if (existing?.status === 'PAID') {
      throw new BadRequestException(
        'Bạn đã đăng ký và thanh toán buổi học này rồi.',
      );
    }
    if (existing?.status === 'PENDING_PAYMENT') {
      return existing;
    }

    if (schedule.capacity) {
      const all = await this.enrollmentRepository.find({
        where: { classScheduleId: scheduleId },
      });
      const activeCount = all.filter((e) => e.status !== 'CANCELLED').length;
      if (activeCount >= schedule.capacity) {
        throw new BadRequestException('Buổi học đã đủ số lượng học viên.');
      }
    }

    const enrollment = this.enrollmentRepository.create({
      classScheduleId: scheduleId,
      userId,
      amount: schedule.price,
    });
    return this.enrollmentRepository.save(enrollment);
  }

  async createPaymentUrl(
    enrollmentId: number,
    userId: number,
    req: Request,
  ): Promise<string> {
    const enrollment = await this.enrollmentRepository.findOneBy({
      id: enrollmentId,
    });
    if (!enrollment) {
      throw new NotFoundException(
        `Không tìm thấy lượt đăng ký #${enrollmentId}`,
      );
    }
    if (enrollment.userId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền thanh toán cho lượt đăng ký này.',
      );
    }
    if (enrollment.status === 'PAID') {
      throw new BadRequestException('Lượt đăng ký này đã được thanh toán.');
    }
    if (enrollment.status === 'CANCELLED') {
      throw new BadRequestException('Lượt đăng ký này đã bị hủy.');
    }

    const date = new Date();
    const createDate = moment(date).format('YYYYMMDDHHmmss');
    const txnRef = `class_${enrollment.id}_${date.getTime()}`;
    await this.enrollmentRepository.update(enrollment.id, {
      vnpTxnRef: txnRef,
    });

    const tmnCode = this.configService.getOrThrow<string>('VNP_TMN_CODE');
    const hashSecret = this.configService.getOrThrow<string>(
      'VNP_HASH_SECRET',
    );
    const vnpUrl = this.configService.get<string>(
      'VNP_URL',
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    );
    const returnUrl = this.configService.getOrThrow<string>('VNP_RETURN_URL');
    const ipAddr =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const amount = Math.round(Number(enrollment.amount));

    let params: Record<string, any> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan buoi hoc nau an #${enrollment.id}`,
      vnp_OrderType: 'other',
      vnp_Amount: amount * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };
    params = this.sortObject(params);
    const signData = qs.stringify(params, { encode: false });
    const hmac = crypto.createHmac('sha512', hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    params['vnp_SecureHash'] = signed;

    return vnpUrl + '?' + qs.stringify(params, { encode: false });
  }

  async join(scheduleId: number, user: SessionUser) {
    const schedule = await this.getScheduleOrThrow(scheduleId);
    const isTeacher = user.role === 'STAFF' || user.role === 'ADMIN';

    if (!isTeacher) {
      const enrollment = await this.enrollmentRepository.findOneBy({
        classScheduleId: scheduleId,
        userId: user.id,
        status: 'PAID',
      });
      if (!enrollment) {
        throw new ForbiddenException(
          'Bạn cần đăng ký và thanh toán để tham gia buổi học này.',
        );
      }
    }

    if (schedule.status !== 'LIVE' || !schedule.meetingId) {
      throw new BadRequestException(
        'Buổi học chưa bắt đầu. Vui lòng quay lại đúng giờ.',
      );
    }

    const participant = await this.realtimeKitService.addParticipant(
      schedule.meetingId,
      {
        name: user.name,
        role: isTeacher ? RealtimeKitRole.HOST : RealtimeKitRole.GUEST,
        customParticipantId: `class-user-${user.id}-${crypto.randomUUID()}`,
      },
    );
    return { token: participant.token };
  }

  verifySecureHash(query: Record<string, any>): boolean {
    const receivedHash = query['vnp_SecureHash'];
    const params = { ...query };
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];
    const sorted = this.sortObject(params);
    const signData = qs.stringify(sorted, { encode: false });
    const hashSecret = this.configService.getOrThrow<string>(
      'VNP_HASH_SECRET',
    );
    const hmac = crypto.createHmac('sha512', hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    return signed === receivedHash;
  }

  async handleIpn(query: Record<string, any>) {
    if (!this.verifySecureHash(query)) {
      return { RspCode: '97', Message: 'Invalid Checksum' };
    }
    return this.processPaymentResult(
      query.vnp_TxnRef,
      query.vnp_ResponseCode,
    );
  }

  private async processPaymentResult(txnRef: string, responseCode: string) {
    const enrollment = await this.enrollmentRepository.findOneBy({
      vnpTxnRef: txnRef,
    });
    if (!enrollment) return { RspCode: '01', Message: 'Order not found' };
    if (enrollment.status === 'PAID') {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    if (responseCode === '00') {
      await this.enrollmentRepository.update(enrollment.id, {
        status: 'PAID',
        paidAt: new Date(),
      });
    }
    // On failure the enrollment simply stays PENDING_PAYMENT so the
    // student can retry payment without re-registering.
    return { RspCode: '00', Message: 'Confirm success' };
  }

  private async getScheduleOrThrow(id: number): Promise<ClassSchedule> {
    const schedule = await this.scheduleRepository.findOneBy({ id });
    if (!schedule) {
      throw new NotFoundException(`Không tìm thấy buổi học #${id}`);
    }
    return schedule;
  }

  private sortObject(obj: Record<string, any>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys: string[] = [];
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        keys.push(encodeURIComponent(key));
      }
    }
    keys.sort();
    for (const key of keys) {
      sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
    }
    return sorted;
  }
}
