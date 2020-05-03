import { action } from 'mobx';
import { Application } from '../store';
import { postJSON } from './util/post-json';

export class UserAction {
  @action
  login(password: string) {
    return postJSON('/login', {
      sig1: 'diniden',
      sig2: password
    })
    .then(response => {
      if (response.auth === true) {
        Application.session.error = '';
        Application.session.user = response.user;
        return true;
      }

      else {
        return false;
      }
    })
    ;
  }
}
