/**
 * LearnStack.js
 * Stack navigation for the Learn module
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LearnScreen from './LearnScreen';
import TopicDetailScreen from './TopicDetailScreen';
import { Colors } from '../../constants';

const Stack = createNativeStackNavigator();

export default function LearnStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: Colors.background,
                    elevation: 0,
                    shadowOpacity: 0,
                    borderBottomWidth: 0,
                },
                headerTitleStyle: {
                    fontWeight: '700',
                    color: Colors.textPrimary,
                },
                headerTintColor: Colors.primary,
                headerBackTitleVisible: false,
            }}
        >
            <Stack.Screen
                name="LearnHome"
                component={LearnScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="TopicDetail"
                component={TopicDetailScreen}
                options={({ route }) => ({
                    title: route.params?.titleEn || 'Topic'
                })}
            />
        </Stack.Navigator>
    );
}
