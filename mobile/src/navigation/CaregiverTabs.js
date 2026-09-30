import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen, TasksScreen, ProgressScreen, ChildProfileScreen } from '../screens/caregiver';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

export const CaregiverTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.light.primaryDark,
        tabBarInactiveTintColor: colors.light.textMuted,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Child" component={ChildProfileScreen} />
    </Tab.Navigator>
  );
};
