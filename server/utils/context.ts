import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  operatorId?: number;
  ipAddress?: string;
  requestId?: string;
}

const context = new AsyncLocalStorage<RequestContext>();

export const Context = {
  run: (store: RequestContext, callback: () => void) => {
    context.run(store, callback);
  },

  get: (): RequestContext | undefined => {
    return context.getStore();
  },

  getOperatorId: (): number | undefined => {
    return context.getStore()?.operatorId;
  },

  getIpAddress: (): string | undefined => {
    return context.getStore()?.ipAddress;
  }
};
