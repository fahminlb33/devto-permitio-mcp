import { Permit } from "permitio";

import { getConfig } from "./config";

const config = getConfig();

export const permit = new Permit({
  token: config.permit.token,
  pdp: config.permit.pdpUrl,
});
