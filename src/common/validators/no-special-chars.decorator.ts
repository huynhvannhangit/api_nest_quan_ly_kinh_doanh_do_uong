import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'noSpecialChars', async: false })
export class NoSpecialCharsConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') return false;
    // Bắt các ký tự đặc biệt phổ biến: !@#$%^&*()_+-=[]{}|;':",./<>?
    // Nhưng vẫn cho phép chữ cái (bao gồm tiếng Việt) và khoảng trắng
    const specialCharsRegex = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/;
    return !specialCharsRegex.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} không được chứa ký tự đặc biệt`;
  }
}

export function NoSpecialChars(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: NoSpecialCharsConstraint,
    });
  };
}
