import classnames from 'classnames';
import { observer } from "mobx-react";
import * as React from 'react';
import { Application } from '../../store';
import { Login } from '../panel';
import { WorldList } from '../panel/world-list';
import './home.scss';

export interface IHome {
  /** Provides a custom class name to the container of this component */
  className?: string;
  /** Props to apply directly to the container div of this component */
  containerProps?: React.HTMLProps<HTMLDivElement>;
}

/**
 * The home page layout
 */
@observer
export class Home extends React.Component<IHome> {
  state = {};

  render() {
    const { className, containerProps } = this.props;

    return (
      <div
        className={classnames("Home", className)}
        style={{
          background: `url(${require('../../../asset/Terraria-Scene.png')}) no-repeat center`,
          backgroundSize: 'cover'
        }}
        {...containerProps}
      >
        <div className="Home__Header">
          <img className="Home__Logo" src={require('../../../asset/Terraria-Logo.png')}/>
        </div>
        <div className="Home__Body">
          <div className="Home__MainContent">
            {Application.session.user === null ? <Login /> : <WorldList />}
          </div>
        </div>
      </div>
    );
  }
}
