export { confirm } from "./confirm/index.js";
export type { ConfirmationRequest, ConfirmationResult } from "./confirm/index.js";

export {
  vaultStore,
  vaultRemove,
  getPaymentMethods,
  addPaymentMethod,
  getDefaultPaymentMethod,
} from "./vault/index.js";
export type { PaymentMethod } from "./vault/index.js";

export { createPayment, createSharedPaymentToken } from "./adapters/stripe.js";
export type { CreatePaymentRequest, PaymentResult, SharedPaymentToken } from "./adapters/stripe.js";

export { discoverService, searchServices, listServices } from "./adapters/mcp-registry.js";
export type { ServiceListing } from "./adapters/mcp-registry.js";
