let broadcaster: (event: string, payload?: unknown) => void = () => { /* no-op by default */ };

export function setBroadcaster(fn: (event: string, payload?: unknown) => void): void {
  broadcaster = fn;
}

export function broadcast(event: string, payload?: unknown): void {
  try {
    broadcaster(event, payload);
  } catch (err) {
    // swallow errors to avoid affecting core logic
    // logger is intentionally not imported to keep this module minimal
  }
}

export default { setBroadcaster, broadcast };
