import { useRoutes } from 'react-router-dom';
import { routes } from './routes';

function App() {
  const element = useRoutes(routes as any);
  return element;
}

export default App;
