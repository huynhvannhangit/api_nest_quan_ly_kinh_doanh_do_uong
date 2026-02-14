import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from '../auth/types';

export const GetCurrentUser = createParamDecorator(
  (data: keyof UserPayload | undefined, context: ExecutionContext) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = request.user as UserPayload;
    if (!data) return user;
    return user[data];
  },
);
