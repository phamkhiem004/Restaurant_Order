import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { Repository } from 'typeorm';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import { DiningTable } from 'src/dining-tables/entities/dining-table.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(DiningTable)
    private readonly diningTableRepository: Repository<DiningTable>,

  ) {}

  async create(createDto: CreateReservationDto) {
    const { tableId, reservationTime, guestCount } = createDto;

    const table = await this.diningTableRepository.findOne({ 
    where: { id: tableId } 
  });

  if (!table) {
    throw new NotFoundException('Không tìm thấy bàn này!');
  }
  if (table.status === 'MAINTENANCE') {
    throw new BadRequestException('Bàn này đang bảo trì, không thể đặt!');
  }
  if (table.status === 'OCCUPIED') {
    throw new BadRequestException('Bàn này đang có người sử dụng, không thể đặt!');
  }

  if (guestCount > table.capacity) {
    throw new BadRequestException(`Bàn không đủ sức chứa! Bàn này chỉ phục vụ tối đa ${table.capacity} người.`);
  }


    const startTime = new Date(reservationTime);
    const durationMinutes = this.calculateDuration(guestCount);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);


    const conflictingReservation = await this.reservationRepository
      .createQueryBuilder('res')
      .where('res.table_id = :tableId', { tableId })
      .andWhere('res.status IN (:...statuses)', { statuses: ['PENDING', 'CONFIRMED'] }) 
      .andWhere('res.reservation_time < :endTime', { endTime })
      .andWhere('res.end_time > :startTime', { startTime })
      .getOne();

    if (conflictingReservation) {
      throw new BadRequestException('Bàn này đã có người đặt trong khung giờ bạn chọn. Vui lòng chọn giờ khác hoặc bàn khác!');
    }


    const newReservation = this.reservationRepository.create({
      ...createDto,
      reservationTime: startTime,
      endTime: endTime,
    });

    return await this.reservationRepository.save(newReservation);
  }


  private calculateDuration(guestCount: number): number {
    if (guestCount <= 2) return 90; 
    if (guestCount <= 6) return 120;
    return 180;                      
  }

  async findAll() {
    return await this.reservationRepository.find();
  }

  async findOne(id: number) {
    return await this.reservationRepository.findOneBy({ id });
  }

  update(id: number, updateReservationDto: UpdateReservationDto) {
    console.log(updateReservationDto);
    return `This action updates a #${id} reservation`;
  }

  async updateStatus(id: number, updateStatusDto: UpdateReservationStatusDto) {
    const { status } = updateStatusDto;
    const reservation = await this.reservationRepository.findOneBy({ id });

    if (!reservation) {
      throw new BadRequestException(`Không tìm thấy đặt chỗ với ID ${id}`);
    }
    reservation.status = status;
    await this.reservationRepository.save(reservation);
    return {
      message: `Đã cập nhật trạng thái đặt chỗ thành ${status}`,
      reservation: {
        id: reservation.id,
        status: reservation.status
      }
    };

  }

  remove(id: number) {
    return `This action removes a #${id} reservation`;
  }
}
