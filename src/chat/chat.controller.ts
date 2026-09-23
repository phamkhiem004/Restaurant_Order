import { Body, Controller, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async send(@Body() dto: SendMessageDto) {
    const reply = await this.chatService.reply(dto);
    return { reply };
  }
}
