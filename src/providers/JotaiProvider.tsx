import React from 'react';
import { Provider, createStore } from 'jotai';

// Create a Jotai store
const jotaiStore = createStore();

interface JotaiProviderProps {
  children: React.ReactNode;
}

export const JotaiProvider: React.FC<JotaiProviderProps> = ({ children }) => {
  return (
    <Provider store={jotaiStore}>
      {children}
    </Provider>
  );
}; 