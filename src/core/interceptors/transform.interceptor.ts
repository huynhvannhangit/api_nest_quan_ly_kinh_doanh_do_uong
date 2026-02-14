import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

/**
 * Transform Interceptor
 * Tự động wrap response theo chuẩn ApiResponse
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data: T): ApiResponse<T> => {
        // Nếu data đã là ApiResponse thì return luôn
        if (
          data &&
          typeof data === 'object' &&
          'code' in data &&
          'status' in data
        ) {
          return data as unknown as ApiResponse<T>;
        }

        // Nếu chưa thì wrap lại
        return {
          code: 200,
          status: true,
          message: 'OK',
          data,
        };
      }),
    );
  }
}
