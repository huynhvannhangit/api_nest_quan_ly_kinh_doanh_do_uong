import { SetMetadata } from '@nestjs/common';

export const ACTION_LOG_KEY = 'action_log';

export interface ActionLogOptions {
  action: string;
  module?: string;
  description?: string;
}

export const ActionLog = (options: ActionLogOptions) =>
  SetMetadata(ACTION_LOG_KEY, options);
