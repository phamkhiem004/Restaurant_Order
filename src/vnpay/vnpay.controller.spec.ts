import { Test, TestingModule } from '@nestjs/testing';
import { VnpayController } from './vnpay.controller';
import { VnpayService } from './vnpay.service';

describe('VnpayController', () => {
  let controller: VnpayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VnpayController],
      providers: [VnpayService],
    }).compile();

    controller = module.get<VnpayController>(VnpayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
