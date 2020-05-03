import { authorizationCheck } from "./authorization-check";
import { authorizartionHeader } from "./authorization-header";

/**
 * Perform a GET request to a REST endpoint. Applies a JSON object as query parameters
 */
export async function getJSON(url: string, _json?: object) {
  const headers = {
    "Content-type": "application/json"
  };

  authorizartionHeader(headers);

  return fetch(url, {
    method: 'GET',
    headers,
  })

  .then(authorizationCheck)
  .catch(err => {
    console.warn(err);
  });
}
