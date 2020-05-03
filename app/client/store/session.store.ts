import { observable } from "mobx";

class User {
  @observable name: string;
}

export class Session {
  /**
   * At any time the session can have some sort of error. It is up to each page to handle
   * when this is set. Some pages may not care about session errors.
   */
  @observable error: string | null = null;
  /** This is populated with the user when the user is validated. */
  @observable user: User | null = null;
}

export const Store = new Session();
