import { IsNotEmpty, IsNumber } from "class-validator";

export class Vnpay {

    @IsNumber()
    @IsNotEmpty()
    order_id: number;
    payment_method: string
}
