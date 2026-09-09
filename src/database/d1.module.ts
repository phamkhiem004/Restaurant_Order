import { DynamicModule, Global, Module, Provider, Type } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { D1_DATABASE } from './d1.constants';
import { D1Repository } from './d1.repository';

@Global()
@Module({})
export class D1DatabaseModule {
  static forRoot(database: D1Database): DynamicModule {
    return {
      module: D1DatabaseModule,
      providers: [{ provide: D1_DATABASE, useValue: database }],
      exports: [D1_DATABASE],
    };
  }
}

@Module({})
export class D1RepositoryModule {
  static forFeature(entities: Type[]): DynamicModule {
    const providers: Provider[] = entities.map((entity) => ({
      provide: getRepositoryToken(entity),
      inject: [D1_DATABASE],
      useFactory: (database: D1Database) =>
        new D1Repository(database, entity as new () => object),
    }));

    return {
      module: D1RepositoryModule,
      providers,
      exports: providers,
    };
  }
}
