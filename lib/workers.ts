import type { SerializableObject } from "./types";
import type {
  WorkerMessageData,
  WorkerMessageDataAction,
} from "./types/worker";

export enum WorkerEvents {
  Destroy = "destroy",
}

type WorkerWithId = Worker & {
  readonly _wid: unique symbol;
  getWid: () => symbol;
};

class Workers {
  _workers = new Map<symbol, Worker | WorkerWithId>();
  createWorker(): Worker {
    const w = new Worker("./_worker.tsx");
    const id = Symbol("waavy_worker_id");
    (w as any)._wid = id;
    (w as any).getWid = () => id;
    this.setupWorker(w as WorkerWithId);
    this._workers.set(id, w as WorkerWithId);
    return w as WorkerWithId;
  }

  destroyWorker(id: symbol | Worker) {
    const w = typeof id === "symbol" ? this._workers.get(id) : id;
    if (w) {
      w.terminate();
    }
    this._workers.delete((w as WorkerWithId)._wid);
  }

  private setupWorker(worker: WorkerWithId) {
    worker.onmessage = (message) => {
      const { data, type } = message;
      const isRequestingDestroyEvent =
        data?.type === WorkerEvents.Destroy || type === WorkerEvents.Destroy;
      if (isRequestingDestroyEvent) {
        this.destroyWorker(worker);
      }
    };
  }
}

export function createWorkerMessageData<T = SerializableObject>(
  action: WorkerMessageDataAction,
  payload: T,
): WorkerMessageData<T> {
  return {
    action,
    payload,
  };
}

export default Workers;
