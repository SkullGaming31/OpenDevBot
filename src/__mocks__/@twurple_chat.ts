// Minimal manual mock for @twurple/chat used during Jest tests.
// Exports a ChatClient class with the methods used by the codebase.
export interface ChatMessage {
  id: string;
  channelId?: string;
  userInfo: { displayName: string; isMod?: boolean; isBroadcaster?: boolean; userId?: string };
  text: string;
}

export type ChatClientOptions = Record<string, unknown>;

export class ChatClient {
  public isConnected = false;
  private handlers: Record<string, Function[]> = {} as Record<string, Function[]>;
  constructor(_opts?: ChatClientOptions) {
    // no-op
  }
  connect() { this.isConnected = true; }
  reconnect() { this.isConnected = true; }
  join(_channel: string) { /* no-op */ }
  say(_channel: string, _message: string, _opts?: unknown, _extra?: unknown) { return Promise.resolve(); }
  action(_channel: string, _action: string) { return Promise.resolve(); }
  onMessage(fn: (channel: string, user: string, text: string, msg: ChatMessage) => void) { this.addHandler('message', fn); }
  onJoin(fn: (channel: string, user: string) => void) { this.addHandler('join', fn); }
  onPart(fn: (channel: string, user: string) => void) { this.addHandler('part', fn); }
  onAuthenticationFailure(fn: (text: string, retryCount: number) => void) { this.addHandler('authFail', fn); }
  onJoinHandler(channel: string, user: string) { this.callHandlers('join', channel, user); }
  onPartHandler(channel: string, user: string) { this.callHandlers('part', channel, user); }
  emitMessage(channel: string, user: string, text: string, msg: ChatMessage) { this.callHandlers('message', channel, user, text, msg); }
  private addHandler(name: string, fn: Function) { (this.handlers[name] ||= []).push(fn); }
  private callHandlers(name: string, ...args: unknown[]) { (this.handlers[name] || []).forEach((h) => { try { h(...args); } catch { /* ignore */ } }); }
}

export default { ChatClient };
