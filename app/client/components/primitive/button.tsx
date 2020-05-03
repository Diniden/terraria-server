import classnames from 'classnames';
import * as React from 'react';
import './button.scss';

export interface IButton {
  /** Provides a custom class name to the container of this component */
  className?: string;
  /** Props to apply directly to the container div of this component */
  containerProps?: React.HTMLProps<HTMLDivElement>;
  /** Label on the button */
  label: string;

  /** Fired when button is clicked */
  onClick?(): void;
}

export class Button extends React.Component<IButton> {
  state = {};

  render() {
    const { className, containerProps, label, onClick } = this.props;

    return (
      <div
        className={classnames("Button", className)}
        onClick={onClick}
        {...containerProps}
      >
        <div className="Button__Label">{label}</div>
      </div>
    );
  }
}
