// Single message shape used in both directions.
// `req` means "invoke a method on the other side".
// `res` means "reply to a request we received earlier".
type NexMessage = {
  req?: {
    id: number;
    fn: string;
    args: unknown[];
  };
  res?: {
    id: number;
    result?: unknown;
    error?: unknown;
  };
};

// Convert a local API into the shape of the remote proxy:
// keep only methods, and make every call return a Promise.
export type NexRemote<T extends object> = {
  [K in keyof T as T[K] extends (...args: infer A) => infer R
    ? K
    : never]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : never;
};

// Callback used when an endpoint receives a message.
type NexRequestHandler = (message: NexMessage) => void;

// Minimal transport contract. Both the main thread and worker only need
// `postMessage` plus a message listener.
type NexEndpoint = {
  postMessage(message: NexMessage): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<NexMessage>) => void,
  ): void;
};

abstract class NexBase<TRemote extends object> {
  private readonly pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (reason?: unknown) => void;
    }
  >();
  private nextRequestId = 0;
  private api: object | undefined;
  private subscribed = false;

  protected abstract postMessage(message: NexMessage): void;
  protected abstract subscribe(handler: NexRequestHandler): void;

  // Register the local API and return a typed proxy for the remote side.
  wrap<TLocal extends object>(api: TLocal): NexRemote<TRemote> {
    this.api = api;
    if (!this.subscribed) {
      this.subscribe(this.handleMessage);
      this.subscribed = true;
    }
    return this.createRemoteProxy();
  }

  private createRemoteProxy(): NexRemote<TRemote> {
    // The proxy turns property access into RPC calls.
    return new Proxy(
      {},
      {
        get: (_, fn) => {
          if (fn === "then") return undefined;
          if (typeof fn !== "string") return undefined;
          return (...args: unknown[]) => this.request(fn, args);
        },
      },
    ) as NexRemote<TRemote>;
  }

  private readonly handleMessage = async (message: NexMessage) => {
    // Reply path: resolve or reject the Promise created for an earlier request.
    if (message.res) {
      const { id, result, error } = message.res;
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      error ? pending.reject(error) : pending.resolve(result);
      return;
    }

    // Request path: call the local API method and send the result back.
    if (!message.req || !this.api) return;

    const { id, fn, args } = message.req;
    try {
      const maybeFn = Reflect.get(this.api, fn, this.api);
      const result =
        typeof maybeFn === "function"
          ? await Reflect.apply(maybeFn, this.api, args)
          : maybeFn;
      this.postMessage({ res: { id, result } });
    } catch (error) {
      this.postMessage({ res: { id, error } });
    }
  };

  private request(fn: string, args: unknown[]) {
    // Track the pending call by id so the matching response can resolve it.
    return new Promise<unknown>((resolve, reject) => {
      const id = ++this.nextRequestId;
      this.pending.set(id, { resolve, reject });
      this.postMessage({ req: { id, fn, args } });
    });
  }
}

export class NexMain<TRemote extends object> extends NexBase<TRemote> {
  private readonly worker: Worker;

  constructor(worker: Worker) {
    super();
    this.worker = worker;
  }

  protected postMessage(message: NexMessage): void {
    this.worker.postMessage(message);
  }

  protected subscribe(handler: NexRequestHandler): void {
    // Main thread listens to messages coming from the worker.
    this.worker.addEventListener("message", (e: MessageEvent<NexMessage>) => {
      handler(e.data);
    });
  }
}

export class NexWorker<TRemote extends object> extends NexBase<TRemote> {
  private readonly scope: NexEndpoint;

  constructor(scope: NexEndpoint = self) {
    super();
    this.scope = scope;
  }

  protected postMessage(message: NexMessage): void {
    this.scope.postMessage(message);
  }

  protected subscribe(handler: NexRequestHandler): void {
    // Worker listens to messages coming from the main thread.
    this.scope.addEventListener("message", (e: MessageEvent<NexMessage>) => {
      handler(e.data);
    });
  }
}
