import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
  async create(createUserDto: CreateUserDto) {
    const { password, ...userData } = createUserDto;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = this.userRepository.create({
      ...userData,
      password: hashedPassword,
    });
    return await this.userRepository.save(newUser);
  }

  async findAll() {
    return await this.userRepository.find();
  }

  async findOne(id: number) {
    return await this.userRepository.findOne({ where: { id: id } });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id: id } });
    if (!user) {
      throw new Error('User không tồn tại');
    }
    const { password, ...userData } = updateUserDto;
    let passwordToSave = user.password;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordToSave = await bcrypt.hash(password, salt);
    }
    const newUser = this.userRepository.create({
      ...userData,
      password: passwordToSave,
    });
    return await this.userRepository.update(id, newUser);
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
