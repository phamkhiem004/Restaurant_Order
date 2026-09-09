import {
  D1EntityMetadata,
  EntityConstructor,
  getD1Metadata,
} from './d1.metadata';

type FindOptions = {
  where?: Record<string, unknown>;
  order?: Record<string, 'ASC' | 'DESC' | 'asc' | 'desc'>;
  relations?: Record<string, boolean>;
};

function toBinding(value: unknown): string | number | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number' || typeof value === 'string') return value;
  throw new TypeError(`Unsupported D1 binding type: ${typeof value}`);
}

export class D1Repository<T extends object> {
  private readonly metadata: D1EntityMetadata<T>;

  constructor(
    private readonly database: D1Database,
    entity: EntityConstructor<T>,
  ) {
    this.metadata = getD1Metadata(entity);
  }

  create(data: Partial<T>): T {
    return Object.assign(new this.metadata.entity(), data);
  }

  async save(entity: T): Promise<T>;
  async save(entity: T[]): Promise<T[]>;
  async save(entity: T | T[]): Promise<T | T[]> {
    if (Array.isArray(entity)) {
      return Promise.all(entity.map((item) => this.saveOne(item)));
    }
    return this.saveOne(entity);
  }

  async find(options: FindOptions = {}): Promise<T[]> {
    const { sql, bindings } = this.buildSelect(options.where, options.order);
    const result = await this.database
      .prepare(sql)
      .bind(...bindings)
      .all();
    const entities = (result.results ?? []).map((row) => this.hydrate(row));

    if (options.relations) {
      await Promise.all(
        entities.map((entity) =>
          this.loadRelations(entity, options.relations!),
        ),
      );
    }
    return entities;
  }

  async findOne(options: FindOptions): Promise<T | null> {
    const rows = await this.find(options);
    return rows[0] ?? null;
  }

  async findOneBy(where: Record<string, unknown>): Promise<T | null> {
    return this.findOne({ where });
  }

  async update(
    criteria: number | Record<string, unknown>,
    partial: Partial<T>,
  ): Promise<{ affected: number }> {
    const values = Object.entries(partial).filter(
      ([property, value]) =>
        property !== 'id' &&
        this.metadata.columns[property] !== undefined &&
        value !== undefined,
    );
    values.push(['updatedAt', new Date()] as [string, unknown]);

    const setters = values.map(
      ([property]) => `${this.quote(this.column(property))} = ?`,
    );
    const bindings = values.map(([, value]) => toBinding(value));
    const where =
      typeof criteria === 'number' ? { id: criteria } : (criteria ?? {});
    const condition = this.buildWhere(where, bindings);
    const result = await this.database
      .prepare(
        `UPDATE ${this.quote(this.metadata.table)} SET ${setters.join(', ')}${condition}`,
      )
      .bind(...bindings)
      .run();

    return { affected: result.meta.changes };
  }

  createQueryBuilder(alias: string): D1QueryBuilder<T> {
    return new D1QueryBuilder(this.database, this.metadata, alias, (row) =>
      this.hydrate(row),
    );
  }

  private async saveOne(entity: T): Promise<T> {
    const mutableEntity = entity as unknown as Record<string, unknown>;
    const id = mutableEntity.id;
    if (typeof id === 'number') {
      await this.update(id, entity);
      return (await this.findOneBy({ id })) ?? entity;
    }

    const now = new Date();
    if (
      'createdAt' in this.metadata.columns &&
      mutableEntity.createdAt == null
    ) {
      mutableEntity.createdAt = now;
    }
    if (
      'updatedAt' in this.metadata.columns &&
      mutableEntity.updatedAt == null
    ) {
      mutableEntity.updatedAt = now;
    }

    const values = Object.entries(entity).filter(
      ([property, value]) =>
        property !== 'id' &&
        this.metadata.columns[property] !== undefined &&
        value !== undefined,
    );
    const columns = values.map(([property]) =>
      this.quote(this.column(property)),
    );
    const bindings = values.map(([, value]) => toBinding(value));
    const placeholders = values.map(() => '?').join(', ');
    const result = await this.database
      .prepare(
        `INSERT INTO ${this.quote(this.metadata.table)} (${columns.join(', ')}) VALUES (${placeholders})`,
      )
      .bind(...bindings)
      .run();

    mutableEntity.id = Number(result.meta.last_row_id);
    return (await this.findOneBy({ id: mutableEntity.id })) ?? entity;
  }

  private buildSelect(
    where?: Record<string, unknown>,
    order?: Record<string, string>,
  ): { sql: string; bindings: (string | number | null)[] } {
    const bindings: (string | number | null)[] = [];
    let sql = `SELECT * FROM ${this.quote(this.metadata.table)}`;
    sql += this.buildWhere(where ?? {}, bindings);

    if (order && Object.keys(order).length > 0) {
      sql +=
        ' ORDER BY ' +
        Object.entries(order)
          .map(
            ([property, direction]) =>
              `${this.quote(this.column(property))} ${direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`,
          )
          .join(', ');
    }
    return { sql, bindings };
  }

  private buildWhere(
    where: Record<string, unknown>,
    bindings: (string | number | null)[],
  ): string {
    const clauses: string[] = [];
    for (const [property, rawValue] of Object.entries(where)) {
      const column = this.quote(this.column(property));
      const operator = rawValue as {
        _type?: string;
        _value?: unknown;
      };

      if (operator?._type === 'in') {
        const values = operator._value as unknown[];
        clauses.push(`${column} IN (${values.map(() => '?').join(', ')})`);
        bindings.push(...values.map(toBinding));
      } else if (operator?._type === 'between') {
        const [start, end] = operator._value as unknown[];
        clauses.push(`${column} BETWEEN ? AND ?`);
        bindings.push(toBinding(start), toBinding(end));
      } else if (rawValue === null) {
        clauses.push(`${column} IS NULL`);
      } else {
        clauses.push(`${column} = ?`);
        bindings.push(toBinding(rawValue));
      }
    }
    return clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '';
  }

  private hydrate(row: Record<string, unknown>): T {
    const entity = new this.metadata.entity();
    for (const [property, column] of Object.entries(this.metadata.columns)) {
      if (!(column in row)) continue;
      let value = row[column];
      if (this.metadata.dates?.includes(property) && value != null) {
        if (typeof value !== 'string' && typeof value !== 'number') {
          throw new TypeError(`Invalid date value in D1 column ${column}`);
        }
        value = new Date(value);
      }
      if (this.metadata.booleans?.includes(property) && value != null) {
        value = Boolean(value);
      }
      (entity as unknown as Record<string, unknown>)[property] = value;
    }
    return entity;
  }

  private async loadRelations(
    entity: T,
    requestedRelations: Record<string, boolean>,
  ): Promise<void> {
    for (const [property, enabled] of Object.entries(requestedRelations)) {
      const relation = this.metadata.relations?.[property];
      if (!enabled || !relation) continue;
      const repository = new D1Repository<object>(
        this.database,
        relation.entity,
      );
      const mutableEntity = entity as unknown as Record<string, unknown>;
      mutableEntity[property] = await repository.findOneBy({
        [relation.targetProperty]: mutableEntity[relation.localProperty],
      });
    }
  }

  private column(property: string): string {
    const column = this.metadata.columns[property];
    if (!column) throw new Error(`Unknown property ${property}`);
    return column;
  }

  private quote(identifier: string): string {
    return `"${identifier.replaceAll('"', '""')}"`;
  }
}

class D1QueryBuilder<T extends object> {
  private selection = '*';
  private selectionAlias?: string;
  private readonly clauses: Array<{
    expression: string;
    parameters: Record<string, unknown>;
  }> = [];

  constructor(
    private readonly database: D1Database,
    private readonly metadata: D1EntityMetadata<T>,
    private readonly alias: string,
    private readonly hydrate: (row: Record<string, unknown>) => T,
  ) {}

  select(expression: string, alias?: string): this {
    this.selection = this.translateProperties(expression);
    this.selectionAlias = alias;
    return this;
  }

  where(expression: string, parameters: Record<string, unknown>): this {
    this.clauses.length = 0;
    this.clauses.push({ expression, parameters });
    return this;
  }

  andWhere(expression: string, parameters: Record<string, unknown>): this {
    this.clauses.push({ expression, parameters });
    return this;
  }

  async getOne(): Promise<T | null> {
    const { sql, bindings } = this.buildQuery();
    const row = await this.database
      .prepare(`${sql} LIMIT 1`)
      .bind(...bindings)
      .first();
    return row ? this.hydrate(row) : null;
  }

  async getRawOne(): Promise<Record<string, unknown>> {
    const { sql, bindings } = this.buildQuery();
    return (
      (await this.database
        .prepare(`${sql} LIMIT 1`)
        .bind(...bindings)
        .first()) ?? {}
    );
  }

  private buildQuery(): {
    sql: string;
    bindings: (string | number | null)[];
  } {
    const bindings: (string | number | null)[] = [];
    let selection = this.selection;
    if (this.selectionAlias) {
      selection += ` AS "${this.selectionAlias.replaceAll('"', '""')}"`;
    }

    const conditions = this.clauses.map(({ expression, parameters }) => {
      let result = this.translateProperties(expression);
      result = result.replace(
        /:\.\.\.([A-Za-z_][A-Za-z0-9_]*)/g,
        (_match: string, name: string) => {
          const values = parameters[name] as unknown[];
          bindings.push(...values.map(toBinding));
          return values.map(() => '?').join(', ');
        },
      );
      result = result.replace(
        /:([A-Za-z_][A-Za-z0-9_]*)/g,
        (_match: string, name: string) => {
          bindings.push(toBinding(parameters[name]));
          return '?';
        },
      );
      return result;
    });

    const table = `"${this.metadata.table.replaceAll('"', '""')}"`;
    return {
      sql: `SELECT ${selection} FROM ${table}${conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''}`,
      bindings,
    };
  }

  private translateProperties(expression: string): string {
    let result = expression;
    for (const [property, column] of Object.entries(this.metadata.columns)) {
      result = result.replaceAll(`${this.alias}.${property}`, `"${column}"`);
      result = result.replaceAll(`${this.alias}.${column}`, `"${column}"`);
    }
    return result;
  }
}
