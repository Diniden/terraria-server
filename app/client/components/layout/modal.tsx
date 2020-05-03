import classnames from 'classnames';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { destroyModal, ensureModal } from '../../util/ensure-modal';
import './modal.scss';

const PORTAL_ID = "ModalPortal";

export interface IModal {
  /** Provides a custom class name to the container of this component */
  className?: string;
  /** Props to apply directly to the container div of this component */
  containerProps?: React.HTMLProps<HTMLDivElement>;

  /** This is called whenever common modal means of dismissal occurs */
  onClose?(): void;
}

/**
 * This is a component that will render on top of everything with a presentation
 * box.
 */
export class Modal extends React.Component<IModal> {
  state = {
    isInside: false
  };

  componentDidMount() {
    ensureModal(PORTAL_ID)
    .addEventListener('mouseup', this.handleClickOff);

    document.addEventListener("keydown", this.handleKeyPress);
  }

  componentWillUnmount() {
    destroyModal(PORTAL_ID)
    ?.removeEventListener('mouseup', this.handleClickOff);

    document.removeEventListener("keydown", this.handleKeyPress);
  }

  /**
   * When modal contents detects a click event we stop that even from bubbling to the page as the rest
   * of the page is waiting for a click event to trigger a dismissal.
   */
  handleClickContents = () => {
    this.setState({
      isInside: true
    });
  }

  /**
   * Monitors for pressing of the escape key
   */
  handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.props.onClose?.();
    }
  }

  /**
   * This handles the click event when the user clicks outside the modal to dismiss it
   */
  handleClickOff = () => {
    if (!this.state.isInside) {
      this.props.onClose?.();
    }

    this.setState({
      isInside: false,
    });
  }

  render() {
    const { className, containerProps } = this.props;
    const portalTarget = document.getElementById(PORTAL_ID);
    if (!portalTarget) return null;

    return ReactDOM.createPortal(
      <div
        className={classnames("Modal", className)}
        onMouseDown={this.handleClickContents}
        {...containerProps}
      >
        {this.props.children}
      </div>,
      portalTarget
    );
  }
}
