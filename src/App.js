import logo from './logo.svg';
import './App.css';
import { SecurityLogger } from './utils/securityMonitoring';

function App() {
  // Log page load
  React.useEffect(() => {
    SecurityLogger.info('App loaded');
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Security features enabled. Check console for security logs.
        </p>
      </header>
    </div>
  );
}

export default App;
