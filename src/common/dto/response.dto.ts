import { ApiResponse } from '../interfaces/api-response.interface';

export class ResponseDto {
  static success<T>(
    data: T,
    message: string = 'Success',
    code: number = 200,
  ): ApiResponse<T> {
    return {
      code,
      status: true,
      message,
      data,
      timestamp: new Date(),
    };
  }

  static error(
    message: string = 'Error',
    code: number = 500,
    path?: string,
  ): ApiResponse<null> {
    return {
      code,
      status: false,
      message,
      data: null,
      timestamp: new Date(),
      path,
    };
  }

  static paginate<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Success',
  ): ApiResponse<T[]> {
    const totalPages = Math.ceil(total / limit);
    return {
      code: 200,
      status: true,
      message,
      data,
      timestamp: new Date(),
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
