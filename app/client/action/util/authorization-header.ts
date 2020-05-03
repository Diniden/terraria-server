import { COLYTTAJBO } from "../../util/jwt-store";

/**
 * Applies the authoization header if it is present
 */
export function authorizartionHeader(headers: Record<string, string>) {
  /** Check for authorization */
  const auth = COLYTTAJBO();

  if (auth) {
    headers.Authorization = `TKO ${auth}`;
  }
}
