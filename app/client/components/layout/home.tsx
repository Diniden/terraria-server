import classnames from 'classnames';
import * as React from 'react';
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
          <div className="Home__MainContent">Content!</div>
        </div>
      </div>
    );
  }
}
