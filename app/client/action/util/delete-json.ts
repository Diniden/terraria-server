import { authorizationCheck } from "./authorization-check";
import { authorizartionHeader } from "./authorization-header";

/**
 * Perform a POST request to a REST endpoint.
 */
export async function deleteJSON(url: string, json?: object) {

  const headers = {
    "Content-type": "application/json"
  };

  authorizartionHeader(headers);

  return fetch(url, {
    method: 'DELETE',
    headers,
    body: json ? JSON.stringify(json) : undefined,
  })
  .then(authorizationCheck)
  .catch(err => {
    console.warn(err);
  });
}
