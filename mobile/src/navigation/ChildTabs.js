import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MeScreen, TodayScreen, FocusScreen, MarketScreen } from '../screens/child';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

export const ChildTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.light.primaryDark,
        tabBarInactiveTintColor: colors.light.textMuted,
      }}
    >
      <Tab.Screen name="Me" component={MeScreen} />
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Focus" component={FocusScreen} />
      <Tab.Screen name="Market" component={MarketScreen} />
    </Tab.Navigator>
  );
};
