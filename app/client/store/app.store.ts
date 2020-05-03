import { observable } from "mobx";
import { Store as DomainStore } from "./domain.store";
import { Store as SessionStore } from "./session.store";
import { Store as UIStore } from "./ui.store";

/**
 * Application state
 */
export class AppStore {
  @observable domain = DomainStore;
  @observable session = SessionStore;
  @observable ui = UIStore;
}

export const Application = new AppStore();
