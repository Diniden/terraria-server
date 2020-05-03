import { action } from "mobx";
import { IWorld } from "../../types/rest/world";
import { Application } from "../store";
import { getJSON } from "./util/get-json";
import { postJSON } from "./util/post-json";

/**
 * Actions associated with the server listing
 */
export class WorldAction {
  /**
   * Retrieve all active worlds the server has to offer
   */
  @action
  async fetchWorlds() {
    const { worlds, error } = await getJSON('/world');

    if (!worlds) {
      Application.session.error = error;
      return false;
    }

    Application.domain.worlds = worlds;
    return true;
  }

  /**
   * Tell the server to generate a new world
   */
  @action
  async newWorld(world: IWorld) {
    const { success, error } = await postJSON('/world', world);

    if (!success) {
      Application.session.error = error;
      return false;
    }

    // After creating a new world, we need to re-fetch the list of active worlds to make sure we have the latest
    // on what the server has
    await this.fetchWorlds();

    return true;
  }
}
