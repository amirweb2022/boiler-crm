// Loaded only by the E2E runner's separate reminder server. Never enable in deployment.
const NativeDate = Date;
const fixedNow = NativeDate.parse(process.env.E2E_FIXED_NOW || "");
if (!Number.isFinite(fixedNow)) throw new Error("E2E_FIXED_NOW must be an ISO timestamp");
global.Date = class extends NativeDate {
  constructor(...args) { super(...(args.length ? args : [fixedNow])); }
  static now() { return fixedNow; }
};
