import { action } from "mobx";
import { IErrorResponse, IGenericResponse, isErrorResponse } from "../../types/rest/generic-response";
import { IWorld } from "../../types/rest/world";
import { Application } from "../store";
import { REST } from "./util/rest";

/**
 * Actions associated with the server listing
 */
export class WorldAction {
  /**
   * Retrieve all active worlds the server has to offer
   */
  @action
  async fetchWorlds() {
    const response: IWorld[] | IErrorResponse = await REST.GET('/world');

    if (isErrorResponse(response)) {
      Application.session.error = response.error;
      return false;
    }

    Application.domain.worlds = response;
    return true;
  }

  /**
   * Tell the server to generate a new world
   */
  @action
  async newWorld(world: IWorld) {
    const response: IGenericResponse = await REST.POST('/world', world);

    if (isErrorResponse(response)) {
      Application.session.error = response.error;
      return false;
    }

    // After creating a new world, we need to re-fetch the list of active worlds to make sure we have the latest
    // on what the server has
    await this.fetchWorlds();

    return true;
  }

  /**
   * Tell the server to delete/deactivate a world
   */
  @action
  async deleteWorld(world: IWorld) {
    const response: IGenericResponse = await REST.DELETE('/world', world);

    if (isErrorResponse(response)) {
      Application.session.error = response.error;
      return false;
    }

    // After creating a new world, we need to re-fetch the list of active worlds to make sure we have the latest
    // on what the server has
    await this.fetchWorlds();

    return true;
  }
}
