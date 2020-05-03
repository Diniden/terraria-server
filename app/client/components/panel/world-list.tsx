import classnames from 'classnames';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import * as React from 'react';
import { Action } from '../../action';
import { Application } from '../../store';
import { World } from '../../store/domain.store';
import { Modal } from '../layout/modal';
import { Button } from '../primitive/button';
import { InputPrompt } from './input-prompt';
import './world-list.scss';

export interface IWorldList {
  /** Provides a custom class name to the container of this component */
  className?: string;
  /** Props to apply directly to the container div of this component */
  containerProps?: React.HTMLProps<HTMLDivElement>;
}

interface IState {
  deletingWorld: World | null;
  confirmingDelete: string | null;
  newWorld: World | null;
  newWorldPage: number;
}

@observer
export class WorldList extends React.Component<IWorldList> {
  state: IState = {
    deletingWorld: null,
    confirmingDelete: null,
    newWorld: null,
    newWorldPage: 0
  };

  @observable error: string;

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

  handleCloseServer = (server: World) => () => {
    this.setState({ deletingServer: server });
  }

  handleCloseModal = () => {
    this.setState({
      deletingServer: null,
      confirmingDelete: null,
      newWorld: null,
    });
  }

  /**
   * When the user indicates the passqword entered should be the password for the world so the
   * world could be deleted.
   */
  handleAcceptDeletePassword = (value: string) => {
    this.setState({
      confirmingDelete: value
    });
  }

  /**
   * Handles the add button requesting a new world.
   */
  handleAddWorld = async () => {
    // Begin a new world prompt dialog
    this.setState({
      newWorld: new World(),
      newWorldPage: 0,
    });

    // Check with the server for the worlds to make sure we are able to create a new world.
    await this.pollWorlds();
  }

  /**
   * After the prompts have finished to customize a new world, we submit the world to the server
   */
  handleCreateWorld = async () => {
    const { newWorld } = this.state;
    if (!newWorld) return;
    const result = await Action.World.newWorld(newWorld);

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
    const { deletingWorld, newWorld } = this.state;

    // Validate if the world being delted still exists
    if (deletingWorld && !worlds.find(World.find(deletingWorld))) {
      this.handleCloseModal();
    }

    // Validate if we can still
    if (newWorld && worlds.length >= maxWorlds) {
      this.handleCloseModal();
    }
  }

  render() {
    const { className, containerProps } = this.props;
    const { maxWorlds, worlds } = Application.domain;

    return (
      <div className={classnames("WorldList", className)} {...containerProps}>
        <div className="WorldList__Title">
          List of Active worlds ({this.renderRatio(worlds.length, maxWorlds)})
        </div>
        {Application.domain.worlds.map(this.renderServer)}
        {
          worlds.length < maxWorlds ? (
            <div className="WorldList__Buttons WorldList--center">
              <Button label="Add World" onClick={this.handleAddWorld} />
            </div>
          ) : null
        }
        {this.renderNewWorldPrompt()}
        {this.renderDeletePrompt()}
      </div>
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
  renderNewWorldPrompt() {
    const { newWorld, newWorldPage } = this.state;
    const { worlds, maxWorlds } = Application.domain;

    // If the number of worlds exceeds our max limit then we can't make a new world, so just dismiss
    // the UI immediately
    if (!newWorld || worlds.length >= maxWorlds) {
      return null;
    }

    const setDifficulty = (difficulty: string) => () => {
      newWorld.difficulty = difficulty;
      this.setState({ newWorldPage: newWorldPage + 1 });
    };

    return (
      <Modal onClose={this.handleCloseModal}>
        {[
          <div className="WorldList__PasswordPanel">
            {this.renderError()}
            <InputPrompt
              key="NameOfWorld"
              title="Name of World:"
              type="text"
              onAccept={(value: string) => {
                newWorld.name = value;

                // Make sure the name is available
                if (worlds.find(World.find(newWorld))) {
                  Application.session.error = "This name is already taken.";
                }

                this.setState({ newWorldPage: newWorldPage + 1 });
              }}
            />
          </div>,

          <div className="WorldList__PasswordPanel">
            {this.renderError()}
            <InputPrompt
              key="Password"
              allowEmpty={true}
              title={`Password for ${newWorld.name}:`}
              type="text"
              onAccept={(value: string) => {
                newWorld.password = value;
                this.setState({ newWorldPage: newWorldPage + 1 });
              }}
            />
          </div>,

          <div className="WorldList__PasswordPanel">
            {this.renderError()}
            <div>{`Select a difficulty for ${newWorld.name}`}</div>
            <div className="WorldList__Buttons">
              <Button label="Normal" onClick={setDifficulty("Normal")} />
              <Button label="Expert" onClick={setDifficulty("Expert")} />
              <Button label="Extreme" onClick={setDifficulty("Extreme")} />
            </div>
          </div>,

          <div className="WorldList__PasswordPanel">
            {this.renderError()}
            <InputPrompt
              key="MaxPlayers"
              title={`Number of players for ${newWorld.name} (1 - 8):`}
              type="text"
              onAccept={(value: string) => {
                const val = Number.parseFloat(value);

                if (isNaN(val)) {
                  this.error = "Must be a number";
                  return;
                }

                if (val < 1 || val > 8) {
                  this.error = "Must be a number between 1 - 8";
                  return;
                }

                newWorld.maxPlayers = val;
                this.handleCreateWorld();
              }}
            />
          </div>,
        ][newWorldPage]}
      </Modal>
    );
  }

  renderDeletePrompt() {
    const { deletingWorld, confirmingDelete } = this.state;
    const { worlds } = Application.domain;

    // Always make sure the server is available for deleting. If our polling updates and says this
    // server doesn't exist anymore, then this prompt should just disappear.
    if (!deletingWorld || !worlds.find(World.find(deletingWorld))) {
      return null;
    }

    return (
      <Modal onClose={this.handleCloseModal}>
        {
          confirmingDelete ? (
            <div className="WorldList__PasswordPanel">
              <div>Are you sure?</div>
              <div className="WorldList__Buttons">
                <Button label="Yes" />
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
        }
      </Modal>
    );
  }

  renderRatio(left: number, right: number) {
    return (
      <span className={classnames(left >= right ? 'WorldList--error' : null)}>
        {`${left}/${right}`}
      </span>
    );
  }

  renderServer = (world: World, index: number) =>
    (
      <div key={index} className="WorldList__World">
        <div className="WorldList__Label">
          {`${world.name} (${world.difficulty})`} ({this.renderRatio(world.online, world.maxPlayers)})
        </div>
        <div className="WorldList__Actions" onClick={this.handleCloseServer(world)}>X</div>
      </div>
    )
}
