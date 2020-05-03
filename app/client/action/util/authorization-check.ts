import { Application } from "../../store";
import { OBJATTYLOC } from "../../util/jwt-store";

/**
 * Performs a check to make sure the user was authorized for the information retrieved.
 *
 * If not authorized, this automatically sends the user back to login for reauthorization.
 */
export async function authorizationCheck(raw: Response) {
  switch (raw.status) {
    case 400:
      return { error: Application.session.error };

    case 401:
      Application.session.error = "Please log in";
      Application.session.user = null;

      return { error: Application.session.error };

    case 404:
      break;

    case 200:
    default:
      break;
  }

  const check = await raw.text();

  // A response of Unauthorized means we should immediately go back to login
  if (check === 'Unauthorized') {
    Application.session.error = "Please log in";
    Application.session.user = null;

    return { error: Application.session.error };
  }

  // If this is not an Unauthorized response, we simply parse out the JSON for the response
  const json = JSON.parse(check);

  // We check the contents of the JSON for further authorization notices
  if (json.session) {
    // Look for session authorization flag
    if (json.session.auth === false) {
      Application.session.error = json.session.message || "Please log in";
      Application.session.user = null;

      return { error: Application.session.error };
    }

    // Look for session authorization tokens for storage
    else {
      Application.session.error = "";
      if (json.session.token) {
        OBJATTYLOC(json.session.token);
      }

      if (json.user) {
        Application.session.user = json.user;
      }
    }
  }

  return json;
}
