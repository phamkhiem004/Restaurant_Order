import { IsNotEmpty, IsString, Min } from "class-validator";

export class CreateDiningTableDto {
    @IsString()
    @IsNotEmpty({ message: 'Tên không được để trống' })
    tableNumber: string;


    @IsNotEmpty({ message: 'Sức chứa không được để trống' })
    @Min(1, { message: 'Sức chứa phải lớn hơn hoặc bằng 1' })
    capacity: number;

}
