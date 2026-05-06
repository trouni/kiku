if (typeof Promise.withResolvers === "undefined") {
  function __withResolvers<T>() {
    let resolve: (value: T | PromiseLike<T>) => void;
    let reject: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    //@ts-expect-error polyfill
    return { promise, resolve, reject };
  }

  Object.defineProperty(Promise, "withResolvers", {
    value: __withResolvers,
    writable: false,
    configurable: false,
    enumerable: false,
  });
}
