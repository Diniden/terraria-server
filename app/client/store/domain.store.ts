import { computed, observable } from "mobx";
import { IWorld } from "../../types/rest/world";

/**
 * A Store for server delivered World objects.
 */
export class World implements IWorld {
  /** This determines if the world is active or not */
  @observable isActive: boolean;
  /** The difficulty this server was set to */
  @observable difficulty: IWorld['difficulty'];
  /** Number of players allowed on this server */
  @observable maxPlayers: number;
  /** Unique name and identifier of the world */
  @observable name: string;
  /** Number of players detected to be online */
  @observable online: number = 0;
  /** The size of this server */
  @observable size: IWorld['size'];
  /**
   * This is only populated from the client side to send to the server.
   * The server NEVER delivers the password for a world.
   */
  @observable password?: string;

  /**
   * An easy way to find another world object in a list of worlds that may represent
   * the same World, but may not be the same object.
   * list.find(World.findMethod(aWorldToFind))
   */
  static findMethod(a: IWorld) {
    return (b: IWorld) => a.name === b.name;
  }
}

/**
 * Retains all retrieved data that comes from the domain.
 */
export class Domain {
  /** The number of servers the host machine is able to support */
  @observable maxWorlds = 10;
  /** Available servers the server is hosting currently */
  @observable worlds: IWorld[] = [];

  @computed
  get activeWorlds() {
    return this.worlds.filter(world => world.isActive);
  }

  @computed
  get deactivatedWorlds() {
    return this.worlds.filter(world => !world.isActive);
  }
}

export const Store = new Domain();
