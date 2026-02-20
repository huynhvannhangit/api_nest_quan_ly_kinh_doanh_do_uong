import { Permission } from '../../../common/enums/permission.enum';

export type JwtPayload = {
  email: string;
  sub: number;
  role: string;
  permissions?: Permission[];
};

export type JwtPayloadWithRt = JwtPayload & { refreshToken: string };

export type UserPayload = {
  id: number;
  email: string;
  fullName?: string;
  role: string;
  permissions?: Permission[];
  refreshToken?: string;
};
