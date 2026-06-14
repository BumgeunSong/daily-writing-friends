import { authHandlers } from './auth';

export const handlers = [...authHandlers];
export const handlerResets: Array<() => void> = [];
