import { PartialType } from '@nestjs/mapped-types';
import { CreateMenuItemDto } from './create-menu-item.dto';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {

    @IsNotEmpty()
    name: string;
        
    @IsOptional()
    description?: string;
        
    @IsNotEmpty()
    @Min(0, { message: 'Giá món ăn phải lớn hơn hoặc bằng 0' })
    @IsInt()
    price: number;
        
    @IsOptional()
    category?: string;

    @IsInt()
    @Min(0, { message: 'Giá khuyến mãi phải lớn hơn hoặc bằng 0' })
    sale_price?: number;

    @IsBoolean()
    is_flash_sale?: boolean;  

}
