import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AI_BINDING } from '../ai/ai.constants';
import { ClassSchedulesService } from '../class-schedules/class-schedules.service';
import { DiningTable } from '../dining-tables/entities/dining-table.entity';
import { MenuItem } from '../menu-items/entities/menu_item.entity';
import { SendMessageDto } from './dto/send-message.dto';

const MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8';

const TABLE_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'trống',
  OCCUPIED: 'đang phục vụ',
  MAINTENANCE: 'đang bảo trì',
};

const SCHEDULE_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'sắp diễn ra',
  LIVE: 'đang diễn ra',
};

function formatVnd(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return 'liên hệ';
  return `${Math.round(Number(value)).toLocaleString('vi-VN')}đ`;
}

function formatVnDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

@Injectable()
export class ChatService {
  private readonly ai: Ai;

  constructor(
    @Inject(AI_BINDING) ai: object,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(DiningTable)
    private readonly diningTableRepository: Repository<DiningTable>,
    private readonly classSchedulesService: ClassSchedulesService,
  ) {
    this.ai = ai as Ai;
  }

  async reply(dto: SendMessageDto): Promise<string> {
    const systemPrompt = await this.buildSystemPrompt();

    const result = await this.ai.run(MODEL, {
      messages: [
        { role: 'system', content: systemPrompt },
        ...(dto.history ?? []).map((item) => ({
          role: item.role,
          content: item.content,
        })),
        { role: 'user', content: dto.message },
      ],
      max_tokens: 400,
      temperature: 0.4,
    });

    const reply = (result as { response?: string }).response?.trim();
    if (!reply) {
      throw new ServiceUnavailableException(
        'Trợ lý ảo hiện chưa thể trả lời, vui lòng thử lại sau.',
      );
    }
    return reply;
  }

  private async buildSystemPrompt(): Promise<string> {
    const [menuItems, tables, schedules] = await Promise.all([
      this.menuItemRepository.find(),
      this.diningTableRepository.find(),
      this.classSchedulesService.findAll(),
    ]);

    const menuLines = menuItems
      .filter((item) => item.isActive !== false)
      .map((item) => {
        const price =
          item.is_flash_sale && item.sale_price ? item.sale_price : item.price;
        const flash = item.is_flash_sale ? ' [đang flash sale]' : '';
        return `- ${item.name} (${item.category ?? 'Món ăn'}): ${formatVnd(price)}${flash}`;
      })
      .join('\n');

    const tableLines = tables
      .map(
        (table) =>
          `- Bàn ${table.tableNumber}: sức chứa ${table.capacity} khách, hiện đang ${TABLE_STATUS_LABEL[table.status ?? ''] ?? 'không rõ'}`,
      )
      .join('\n');

    const upcomingLines = schedules
      .filter((schedule) => schedule.status === 'SCHEDULED' || schedule.status === 'LIVE')
      .slice(0, 5)
      .map((schedule) => {
        const capacity = schedule.capacity
          ? `, tối đa ${schedule.capacity} học viên`
          : '';
        return `- "${schedule.title}" lúc ${formatVnDateTime(schedule.scheduledAt)} (${SCHEDULE_STATUS_LABEL[schedule.status]}), giá ${formatVnd(schedule.price)}/buổi${capacity}`;
      })
      .join('\n');

    return [
      'Bạn là trợ lý ảo của "Restaurant Hub" - một nhà hàng có đặt bàn, gọi món và lớp dạy nấu ăn online.',
      'Trả lời ngắn gọn, thân thiện, bằng tiếng Việt.',
      'CHỈ dùng đúng thông tin trong dữ liệu bên dưới. KHÔNG được bịa thêm món ăn, giá cả, số bàn, hay lịch học không có trong danh sách.',
      'Khi khách hỏi món ngon, gợi ý món, tình trạng bàn hay lịch học, hãy trả lời trực tiếp bằng cách chọn ra vài mục phù hợp từ danh sách bên dưới kèm giá - đừng chỉ bảo khách tự vào trang xem.',
      'Chỉ khi nào dữ liệu bên dưới thực sự không có thông tin khách cần, hãy nói rõ là bạn không chắc và hướng khách tới trang phù hợp: Thực đơn (/menu), Bàn ăn (/tables), Đặt bàn (/bookings), Lớp học nấu ăn (/classes).',
      'Bạn không thể tự đặt bàn, tạo đơn hay xác nhận thanh toán thay khách - hãy hướng dẫn họ dùng đúng trang chức năng trên website.',
      '',
      'THỰC ĐƠN HIỆN TẠI:',
      menuLines || 'Chưa có món ăn nào.',
      '',
      'TÌNH TRẠNG BÀN ĂN:',
      tableLines || 'Chưa có bàn ăn nào.',
      '',
      'LỚP HỌC NẤU ĂN SẮP TỚI:',
      upcomingLines || 'Hiện chưa có lịch buổi học nào sắp diễn ra.',
    ].join('\n');
  }
}
