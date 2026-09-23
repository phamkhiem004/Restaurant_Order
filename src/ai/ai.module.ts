import { DynamicModule, Global, Module } from '@nestjs/common';
import { AI_BINDING } from './ai.constants';

@Global()
@Module({})
export class AiModule {
  static forRoot(ai: Ai): DynamicModule {
    return {
      module: AiModule,
      providers: [{ provide: AI_BINDING, useValue: ai }],
      exports: [AI_BINDING],
    };
  }
}
