import { IsInt, IsNotEmpty, IsOptional, Min } from "class-validator";

export class CreateMenuItemDto {
    
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
}
