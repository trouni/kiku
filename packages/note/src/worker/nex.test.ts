import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { NexMain, type NexRemote, NexWorker } from "./nex";

function createLinkedTransport() {
  const channel = new MessageChannel();
  channel.port1.start();
  channel.port2.start();

  return {
    mainWorker: channel.port1,
    workerScope: channel.port2,
  };
}

class MainApi {
  add(a: number, b: number) {
    return a + b;
  }

  fail() {
    throw new Error("main failed");
  }
}

class WorkerApi {
  main?: NexRemote<MainApi>;

  double(n: number) {
    return n * 2;
  }

  addViaMain(n: number) {
    if (!this.main) throw new Error("missing main bridge");
    return this.main.add(n, 1);
  }

  fail() {
    throw new Error("worker failed");
  }
}

describe("Nex", () => {
  it("wraps class instances with typed main/worker RPC proxies", async () => {
    const { mainWorker, workerScope } = createLinkedTransport();
    const main = new NexMain<WorkerApi>(mainWorker as unknown as Worker);
    const worker = new NexWorker<MainApi>(workerScope);

    const mainApi = new MainApi();
    const workerApi = new WorkerApi();
    const mainAddSpy = vi.spyOn(mainApi, "add");
    const workerDoubleSpy = vi.spyOn(workerApi, "double");
    const workerAddViaMainSpy = vi.spyOn(workerApi, "addViaMain");

    const mainToWorker = main.wrap(mainApi);
    const workerToMain = worker.wrap(workerApi);
    workerApi.main = workerToMain;

    expectTypeOf(mainToWorker.double).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(mainToWorker.double).returns.toEqualTypeOf<Promise<number>>();
    expectTypeOf(workerToMain.add).parameters.toEqualTypeOf<[number, number]>();
    expectTypeOf(workerToMain.add).returns.toEqualTypeOf<Promise<number>>();

    await expect(mainToWorker.double(3)).resolves.toBe(6);
    await expect(workerToMain.add(2, 5)).resolves.toBe(7);
    await expect(mainToWorker.addViaMain(4)).resolves.toBe(5);
    expect(workerDoubleSpy).toHaveBeenCalledWith(3);
    expect(mainAddSpy).toHaveBeenCalledWith(2, 5);
    expect(workerAddViaMainSpy).toHaveBeenCalledWith(4);
  });

  it("propagates errors across the bridge", async () => {
    const { mainWorker, workerScope } = createLinkedTransport();
    const main = new NexMain<WorkerApi>(mainWorker as unknown as Worker);
    const worker = new NexWorker<MainApi>(workerScope);

    const mainToWorker = main.wrap(new MainApi());
    const workerToMain = worker.wrap(new WorkerApi());

    await expect(mainToWorker.fail()).rejects.toThrow("worker failed");
    await expect(workerToMain.fail()).rejects.toThrow("main failed");
  });
});
