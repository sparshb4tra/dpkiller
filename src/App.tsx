import React, { useState, useEffect } from 'react';
import HomeView from './components/HomeView';
import RoomView from './components/RoomView';
import PolicyView from './components/PolicyView';

const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<string>('');

  useEffect(() => {
    // Basic Hash Router implementation
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      setCurrentRoute(hash);
    };

    // Initial check
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToRoom = (roomId: string) => {
    window.location.hash = `/${roomId}`;
  };

  const navigateHome = () => {
    window.location.hash = '';
    setCurrentRoute(''); // Force update for smoother feel
  };

  // Policy routes
  if (currentRoute.startsWith('policy/')) {
    const key = currentRoute.replace('policy/', '');
    return <PolicyView policyKey={key} onBack={navigateHome} />;
  }

  return (
    <>
      {!currentRoute ? (
        <HomeView onJoinRoom={navigateToRoom} />
      ) : (
        <RoomView roomId={currentRoute} navigateHome={navigateHome} />
      )}
    </>
  );
};

export default App;
