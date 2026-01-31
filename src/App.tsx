import { Toaster } from 'react-hot-toast';
import { MainInterface } from './components/MainInterface';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <MainInterface />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1F2937',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#FFCB05',
              secondary: '#000',
            },
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
