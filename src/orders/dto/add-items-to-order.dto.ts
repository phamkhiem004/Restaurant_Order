import { IsArray, IsInt, IsNotEmpty, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ItemDetailDto {
  @IsInt({ message: 'Mã món ăn phải là số nguyên!' })
  @IsNotEmpty({ message: 'Không được bỏ trống mã món ăn!' })
  menuItemId: number;

  @IsInt({ message: 'Số lượng phải là số nguyên!' })
  @Min(1, { message: 'Số lượng gọi thêm phải từ 1 trở lên!' })
  quantity: number;
}

export class AddItemsToOrderDto {
  @IsArray({ message: 'Danh sách món ăn gọi thêm phải là một mảng!' })
  @ValidateNested({ each: true })
  @Type(() => ItemDetailDto)
  items: ItemDetailDto[];
}