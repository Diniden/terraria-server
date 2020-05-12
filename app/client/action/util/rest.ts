import { deleteJSON } from "./delete-json";
import { getJSON } from "./get-json";
import { postJSON } from "./post-json";

export const REST = {
  GET: getJSON,
  POST: postJSON,
  DELETE: deleteJSON
};
