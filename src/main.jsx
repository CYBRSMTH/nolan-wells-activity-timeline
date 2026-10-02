import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import records from './data/snapchat_messages_cleaned.json';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App records={records} />
  </StrictMode>,
);
