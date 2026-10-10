import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// No StrictMode: the engine owns a rAF loop and global listeners and must start once.
createRoot(document.getElementById('root')!).render(<App />)
