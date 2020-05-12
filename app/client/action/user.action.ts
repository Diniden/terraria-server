import { action } from 'mobx';
import { Application } from '../store';
import { postJSON } from './util/post-json';

export class UserAction {
  @action
  async login(password: string) {
    const response = await postJSON('/login', {
      sig1: 'diniden',
      sig2: password
    });

    if (response.auth === true) {
      Application.session.error = '';
      Application.session.user = response.user;
      return true;
    }

    else {
      return false;
    }
  }
}
