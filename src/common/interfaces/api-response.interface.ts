export interface ApiResponse<T> {
  code: number;
  status: boolean;
  message: string;
  data?: T;
  timestamp?: Date;
  path?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
