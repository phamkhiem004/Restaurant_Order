import { IsInt, Min } from 'class-validator';

export class UpdateItemQuantityDto {
  @IsInt({ message: 'Số lượng phải là số nguyên!' })
  @Min(1, { message: 'Số lượng món ăn phải từ 1 trở lên. Nếu muốn hủy, vui lòng chọn Hủy món!' }) 
  quantity: number;
}