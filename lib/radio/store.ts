export { getRadioStore, startRadioMaintenance } from "./store-factory";
export type { RadioStore } from "./store-interface";

import { startRadioMaintenance } from "./store-factory";

const g = globalThis as unknown as { __vybe_radio_maintenance?: ReturnType<typeof setInterval> };
if (!g.__vybe_radio_maintenance) {
  g.__vybe_radio_maintenance = setInterval(() => {
    void startRadioMaintenance();
  }, 15_000);
}
