import classnames from 'classnames';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import * as React from 'react';
import { Application } from '../../store';
import './input-prompt.scss';

export interface IPassword {
  /** When true, allows for an empty field to be present */
  allowEmpty?: boolean;
  /** Provides a custom class name to the container of this component */
  className?: string;
  /** Props to apply directly to the container div of this component */
  containerProps?: React.HTMLProps<HTMLDivElement>;

  /** Label above the input */
  title?: string;
  /** The type of input. Text or password */
  type?: 'password' | 'text';

  /** Is called when the user wishes to have the password processed */
  onAccept(value: string): void;
}

@observer
export class InputPrompt extends React.Component<IPassword> {
  state = {};
  @observable error = "";

  handleAccept = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value || '';

    if (event.key === 'Enter') {
      if (value.length === 0 && !this.props.allowEmpty) {
        this.error = "An empty input is not allowed!";
      }

      this.props.onAccept(value);
    }
  }

  handleChange() {
    this.error = "";
  }

  render() {
    const { className, containerProps, title, type = "password" } = this.props;

    return (
      <div className={classnames("InputPrompt", className)} {...containerProps}>
        {
          (Application.session.error || this.error) ?
          <div className="InputPrompt__Label InputPrompt--error">
            {Application.session.error || this.error}
          </div> :
          null
        }
        <div className="InputPrompt__Label">{title ? title : 'Password:'}</div>
        <input className="InputPrompt__InputPrompt" type={type} onChange={this.handleChange} onKeyPress={this.handleAccept} />
      </div>
    );
  }
}
