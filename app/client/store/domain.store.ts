import { observable } from "mobx";
import { IWorld } from "../../types/rest/world";

export class World implements IWorld {
  /** The difficulty this server was set to */
  @observable difficulty: string;
  /** Number of players allowed on this server */
  @observable maxPlayers: number;
  /** Unique name and identifier of the world */
  @observable name: string;
  /** Number of players detected to be online */
  @observable online: number = 0;
  /** This is only populated from the client side. The server NEVER delivers the password */
  @observable password?: string;

  static find(a: World) {
    return (b: World) => a.name === b.name;
  }
}

/**
 * Retains all retrieved data that comes from the domain.
 */
export class Domain {
  /** The number of servers the host machine is able to support */
  @observable maxWorlds = 10;
  /** Available servers the server is hosting currently */
  @observable worlds: World[] = [];
}

export const Store = new Domain();
