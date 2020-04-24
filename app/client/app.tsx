import { destroyAllFonts } from 'lyra';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Home } from "./components";

export class App extends React.Component<{}, {}> {
  componentWillUnmount() {
    destroyAllFonts('TerrariaServer');
  }

  render() {
    return (
      <Home/>
    );
  }
}

ReactDOM.render(<App/>, document.getElementById('main'));
