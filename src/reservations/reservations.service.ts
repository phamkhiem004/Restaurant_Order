import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>
  ) {}

  async create(createDto: CreateReservationDto) {
    const { tableId, reservationTime, guestCount } = createDto;


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

  remove(id: number) {
    return `This action removes a #${id} reservation`;
  }
}
