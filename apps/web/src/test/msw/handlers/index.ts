import { authHandlers, resetAuthHandlerState } from './auth';
import { blocksHandler } from './blocks';

export const handlers = [...authHandlers, blocksHandler()];
export const handlerResets: Array<() => void> = [resetAuthHandlerState];
