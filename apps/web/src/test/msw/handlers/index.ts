import { authHandlers, resetAuthHandlerState } from './auth';

export const handlers = [...authHandlers];
export const handlerResets: Array<() => void> = [resetAuthHandlerState];
