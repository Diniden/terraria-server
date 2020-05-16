import classnames from 'classnames';
import { stopPropagation, when } from 'lyra';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import * as React from 'react';
import { IWorld } from '../../../types/rest/world';
import { Action } from '../../action';
import { Application } from '../../store';
import { World } from '../../store/domain.store';
import { Modal } from '../layout/modal';
import { Button } from '../primitive/button';
import { InputPrompt } from './input-prompt';
import './world-list.scss';

enum promptPages {
  START,
  NEW_WORLD,
  LOAD_WORLD,
  NEW_WORLD_PASSWORD,
  NEW_WORLD_DIFFICULTY,
  NEW_WORLD_SIZE,
  NEW_WORLD_MAX_PLAYERS,
  LOAD_WORLD_PASSWORD,
}

export interface IWorldList {
  /** Provides a custom class name to the container of this component */
  className?: string;
  /** Props to apply directly to the container div of this component */
  containerProps?: React.HTMLProps<HTMLDivElement>;
}

@observer
export class WorldList extends React.Component<IWorldList> {
  @observable selectedWorld: IWorld | null = null;
  @observable deletingWorld: IWorld | null = null;
  @observable confirmingDelete: string | null = null;
  @observable newWorld: IWorld | null = null;
  @observable newWorldPage: promptPages = promptPages.START;
  @observable error: string;
  @observable loading: boolean = false;
  pollId = -1;

  componentDidMount() {
    Action.World.fetchWorlds();
    this.pollId = window.setInterval(async () => {
      this.pollWorlds();
    }, 10000);
  }

  componentWillUnmount() {
    clearInterval(this.pollId);
  }

  handleCloseWorld = (world: IWorld) => (e: any) => {
    this.deletingWorld = world;
    stopPropagation(e);
  }

  handleCloseModal = () => {
    this.deletingWorld = null;
    this.confirmingDelete = null;
    this.newWorld = null;
    this.selectedWorld = null;
  }

  /**
   * Handles selection of an inactive world when working on activating or creating a world
   */
  handleSelectInactiveWorld = (world: IWorld) => () => {
    this.newWorld = world;
    this.newWorldPage = promptPages.LOAD_WORLD_PASSWORD;
  };

  /**
   * Handles selection of an active world to reveal how to connect to that world.
   */
  handleSelectActiveWorld = (world: IWorld) => () => {
    this.selectedWorld = world;
  };

  /**
   * When the user indicates the passqword entered should be the password for the world so the
   * world could be deleted.
   */
  handleAcceptDeletePassword = (value: string) => {
    this.confirmingDelete = value;
    if (this.deletingWorld) this.deletingWorld.password = value;
  }

  /**
   * This handles confirmed deletion of a world from the server list
   */
  handleDeleteWorld = async () => {
    if (!this.deletingWorld) return;
    this.loading = true;
    await Action.World.deleteWorld(this.deletingWorld);
    this.loading = false;
    this.handleCloseModal();
  }

  /**
   * Handles the add button requesting a new world.
   */
  handleAddWorld = async () => {
    // Begin a new world prompt dialog
    this.newWorld = new World();
    this.newWorldPage = promptPages.START;
    Application.session.error = '';

    // Check with the server for the worlds to make sure we are able to create a new world.
    await this.pollWorlds();
  }

  /**
   * After the prompts have finished to customize a new world, we submit the world to the server
   */
  handleCreateWorld = async () => {
    if (!this.newWorld) return;
    this.loading = true;
    const result = await Action.World.newWorld(this.newWorld);
    this.loading = false;

    if (!result) {
      this.error = "Could not create the new world\n";
      this.error += Application.session.error;
    }

    else {
      this.handleCloseModal();
    }
  }

  /**
   * Reaches out to the server for an update on the current listing of worlds. We poll for updates as push
   * notifications are excessively complicated for such a simple system for now. May be one day...
   */
  async pollWorlds() {
    await Action.World.fetchWorlds();
    const { worlds, maxWorlds } = Application.domain;

    // Validate if the world being delted still exists
    if (this.deletingWorld && !worlds.find(World.findMethod(this.deletingWorld))) {
      this.handleCloseModal();
    }

    // Validate if we can still
    if (this.newWorld && worlds.length >= maxWorlds) {
      this.handleCloseModal();
    }
  }

  render() {
    const { className, containerProps } = this.props;
    const { maxWorlds, activeWorlds, deactivatedWorlds } = Application.domain;

    return (
      <div className={classnames("WorldList", className)} {...containerProps}>
        {when(
          Application.session.error,
          <div className="WorldList__Error"></div>
        )}
        <div className="WorldList__Title">
          List of Active worlds ({this.renderRatio(activeWorlds.length, maxWorlds)})
        </div>
        {activeWorlds.map(this.renderActiveWorld)}
        {
          activeWorlds.length < maxWorlds ? (
            <div className="WorldList__Buttons WorldList--center">
              <Button label="Add World" onClick={this.handleAddWorld} />
            </div>
          ) : null
        }
        {this.renderNewWorldPrompt(this.newWorld, this.newWorldPage, deactivatedWorlds)}
        {this.renderDeletePrompt(this.deletingWorld, this.confirmingDelete)}
        {this.renderConnection(this.selectedWorld)}
      </div>
    );
  }

  /**
   * When the user selects an active world, this shows the connection information
   * to join that world.
   */
  renderConnection(world: IWorld | null) {
    if (!world) return null;

    return (
      <Modal onClose={this.handleCloseModal}>
        <div className="WorldList__PasswordPanel">
          <div>{`This is how to connect to ${world.name}:`}</div>
          <div>{world?.connection}</div>
        </div>
      </Modal>
    );
  }

  renderError() {
    if (!this.error) return null;

    return (
      <div className="ServerList__Title ServerList--error">{this.error}</div>
    );
  }

  /**
   * This renders the prompt needed to create a new world.
   */
  renderNewWorldPrompt(newWorld: IWorld | null, newWorldPage: promptPages, deactivatedWorlds: IWorld[]) {
    const { worlds, maxWorlds } = Application.domain;

    // If the number of worlds exceeds our max limit then we can't make a new world, so just dismiss
    // the UI immediately
    if (!newWorld || worlds.length >= maxWorlds) {
      return null;
    }

    const setDifficulty = (difficulty: IWorld['difficulty']) => () => {
      if (!newWorld) return;
      newWorld.difficulty = difficulty;
      this.newWorldPage = promptPages.NEW_WORLD_SIZE;
    };

    const setSize = (size: IWorld['size']) => () => {
      if (!newWorld) return;
      newWorld.size = size;
      this.newWorldPage = promptPages.NEW_WORLD_MAX_PLAYERS;
    };

    const pages: {[key in promptPages]: React.ReactElement} = {
      [promptPages.START]:
      <div className="WorldList__PasswordPanel">
        {this.renderError()}
        <div className="WorldList__Buttons">
          <Button label="New World" onClick={() => this.newWorldPage = promptPages.NEW_WORLD} />
          <Button label="Load World" onClick={() => this.newWorldPage = promptPages.LOAD_WORLD} />
        </div>
      </div>,

      [promptPages.NEW_WORLD]:
      <div className="WorldList__PasswordPanel">
        {this.renderError()}
        <InputPrompt
          key="NameOfWorld"
          title="Name of World:"
          type="text"
          onAccept={(value: string) => {
            if (!newWorld) return;
            newWorld.name = value;

            // No spaces in the name
            if (newWorld.name.split(' ').length > 1) {
              this.error = "No spaces allowed in the world name";
              return;
            }

            // Make sure the name is available
            if (worlds.find(World.findMethod(newWorld))) {
              Application.session.error = "This name is already taken.";
              return;
            }

            this.newWorldPage = promptPages.NEW_WORLD_PASSWORD;
          }}
        />
      </div>,

      [promptPages.NEW_WORLD_PASSWORD]:
      <div className="WorldList__PasswordPanel">
        {this.renderError()}
        <InputPrompt
          key="Password"
          allowEmpty={true}
          title={`Password for ${newWorld.name}:`}
          type="text"
          onAccept={(value: string) => {
            if (!newWorld) return;
            newWorld.password = value;
            this.newWorldPage = promptPages.NEW_WORLD_DIFFICULTY;
          }}
        />
      </div>,

      [promptPages.NEW_WORLD_DIFFICULTY]:
      <div className="WorldList__PasswordPanel">
        {this.renderError()}
        <div>{`Select a difficulty for ${newWorld.name}`}</div>
        <div className="WorldList__Buttons">
          <Button label="Classic" onClick={setDifficulty("Classic")} />
          <Button label="Expert" onClick={setDifficulty("Expert")} />
          <Button label="Master" onClick={setDifficulty("Master")} />
          <Button label="Journey" onClick={setDifficulty("Journey")} />
        </div>
      </div>,

      [promptPages.NEW_WORLD_SIZE]:
      <div className="WorldList__PasswordPanel">
        {this.renderError()}
        <div>{`Select a size for ${newWorld.name}`}</div>
        <div className="WorldList__Buttons">
          <Button label="Small" onClick={setSize("Small")} />
          <Button label="Medium" onClick={setSize("Medium")} />
          <Button label="Large" onClick={setSize("Large")} />
        </div>
      </div>,

      [promptPages.NEW_WORLD_MAX_PLAYERS]:
      <div className="WorldList__PasswordPanel">
        {this.renderError()}
        <InputPrompt
          key="MaxPlayers"
          title={`Number of players for ${newWorld.name} (1 - 16):`}
          type="text"
          onAccept={(value: string) => {
            if (!newWorld) return;
            const val = Number.parseFloat(value);

            if (isNaN(val)) {
              this.error = "Must be a number";
              return;
            }

            if (val < 1 || val > 16) {
              this.error = "Must be a number between 1 - 16";
              return;
            }

            newWorld.maxPlayers = val;
            this.handleCreateWorld();
          }}
        />
      </div>,

      [promptPages.LOAD_WORLD]:
      <div className="WorldList__PasswordPanel">
        {this.renderError()}
        {deactivatedWorlds.map(this.renderInactiveWorld)}
      </div>,

      [promptPages.LOAD_WORLD_PASSWORD]:
      <div className="WorldList__PasswordPanel">
        {this.renderError()}
        <InputPrompt
          key="Password"
          allowEmpty={true}
          title={`Password for ${newWorld.name}:`}
          type="text"
          onAccept={(value: string) => {
            if (!newWorld) return;
            newWorld.password = value;
            this.newWorldPage = promptPages.NEW_WORLD_MAX_PLAYERS;
          }}
        />
      </div>,
    };

    return (
      <Modal onClose={when(!this.loading, () => this.handleCloseModal, )}>
        {when(this.loading, (
          <div className="WorldList__PromptLoading">
            Loading...
          </div>
        ), pages[newWorldPage])}
      </Modal>
    );
  }

  /**
   * Renders our prompt for deleting a world
   */
  renderDeletePrompt(deletingWorld: IWorld | null, confirmingDelete: string | null) {
    const { worlds } = Application.domain;

    // Always make sure the server is available for deleting. If our polling updates and says this
    // server doesn't exist anymore, then this prompt should just disappear.
    if (!deletingWorld || !worlds.find(World.findMethod(deletingWorld))) {
      return null;
    }

    return (
      <Modal onClose={this.handleCloseModal}>
        {when(this.loading,
          <div className="WorldList__PromptLoading">
            Loading...
          </div>,
          confirmingDelete !== null ? (
            <div className="WorldList__PasswordPanel">
              <div>Are you sure?</div>
              <div className="WorldList__Buttons">
                <Button label="Yes" onClick={this.handleDeleteWorld}/>
                <Button label="No" onClick={this.handleCloseModal}/>
              </div>
            </div>
          ) : (
            <div className="WorldList__PasswordPanel">
              <div>Enter the password for world</div>
              <div>{deletingWorld.name}</div>
              <div>to remove it from the list of available worlds</div>
              <InputPrompt
                allowEmpty={true}
                className="WorldList__Password"
                onAccept={this.handleAcceptDeletePassword}
              />
            </div>
          )
        )}
      </Modal>
    );
  }

  /**
   * Common form for rendering a ratio of two numbers
   */
  renderRatio(left: number, right: number) {
    return (
      <span className={classnames(left >= right ? 'WorldList--error' : null)}>
        {`${left}/${right}`}
      </span>
    );
  }

  /**
   * Renders a server listing, displaying any relevant server information
   */
  renderActiveWorld = (world: IWorld, index: number) =>
    (
      <div key={index} className="WorldList__World" onClick={this.handleSelectActiveWorld(world)}>
        <div className="WorldList__Label">
          {`${world.name} (${world.difficulty}) (${world.size}) Online:`} ({this.renderRatio(world.online, world.maxPlayers)})
        </div>
        <div className="WorldList__Actions" onClick={this.handleCloseWorld(world)}>X</div>
      </div>
    )

  /**
   * Renders an inactive world for selecting to re-activate it
   */
  renderInactiveWorld = (world: World, index: number) =>
    (
      <div key={index} className="WorldList__World" onClick={this.handleSelectInactiveWorld(world)}>
        <div className="WorldList__Label">
          {`${world.name} (${world.difficulty}) (${world.size})`}
        </div>
      </div>
    )
}
