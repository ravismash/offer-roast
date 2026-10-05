// Thrown by the provider adapter when the provider is over quota or unavailable. Retrying immediately
// would only waste a request, so grounding stops and the handler reports "busy".
export class ProviderBusyError extends Error {
  constructor() {
    super("provider_busy");
    this.name = "ProviderBusyError";
  }
}
