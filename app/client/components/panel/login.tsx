import classnames from 'classnames';
import { observer } from "mobx-react";
import * as React from 'react';
import { Action } from '../../action';
import { InputPrompt } from './input-prompt';
import './login.scss';

export interface ILogin {
  /** Provides a custom class name to the container of this component */
  className?: string;
  /** Props to apply directly to the container div of this component */
  containerProps?: React.HTMLProps<HTMLDivElement>;
}

@observer
export class Login extends React.Component<ILogin> {
  state = {};

  handleAccept(value: string) {
    Action.User.login(value);
  }

  render() {
    const { className, containerProps } = this.props;

    return (
      <div className={classnames("Login", className)} {...containerProps}>
        <InputPrompt onAccept={this.handleAccept} />
      </div>
    );
  }
}
