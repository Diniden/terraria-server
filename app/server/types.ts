import { IWorld } from "../types/rest/world";

export interface IWorldInternal extends IWorld {
  /** This is the port this world is broadcast on */
  port: number;
  /** This is the  */
  loadId: number;
}

