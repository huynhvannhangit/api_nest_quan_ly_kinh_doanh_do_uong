import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { IsNotBlank } from '../../../common/validators/is-not-blank.decorator';
import { NoSpecialChars } from '../../../common/validators/no-special-chars.decorator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @IsNotBlank({ message: 'Họ tên không được chỉ chứa khoảng trắng' })
  @NoSpecialChars({ message: 'Họ tên chỉ được chứa chữ cái và khoảng trắng' })
  fullName: string;
}
