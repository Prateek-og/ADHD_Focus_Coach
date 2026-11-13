import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { LoginScreen } from '../screens/LoginScreen';
import { ChildTabs } from './ChildTabs';
import { CaregiverTabs } from './CaregiverTabs';

export const RootNavigator = () => {
  const { isAuthenticated, role } = useSelector((state) => state.auth);

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <LoginScreen />
      ) : role === 'child' ? (
        <ChildTabs />
      ) : (
        <CaregiverTabs />
      )}
    </NavigationContainer>
  );
};
