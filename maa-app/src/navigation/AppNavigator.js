/**
 * AppNavigator.js
 * Maa App - Bottom tab navigation.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Labels } from '../constants';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MealLoggingFlow from '../screens/food/MealLoggingFlow';
import HealthScreen from '../screens/health/HealthScreen';
import HomeScreen from '../screens/home/HomeScreen';
import LearnStack from '../screens/learn/LearnStack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EyeHealthScreen from '../screens/eye/EyeHealthScreen';
import AcuityTestScreen from '../screens/eye/tests/AcuityTestScreen';
import ContrastTestScreen from '../screens/eye/tests/ContrastTestScreen';
import AmslerTestScreen from '../screens/eye/tests/AmslerTestScreen';
import PeripheralTestScreen from '../screens/eye/tests/PeripheralTestScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import LandingScreen from '../screens/auth/LandingScreen';
import SetuScreen from '../screens/setu/SetuScreen';
import SOSScreen from '../screens/emergency/SOSScreen';
import AuthNavigatorRoutes from '../screens/auth/LandingScreen'; // (not replacing this, just injecting above it)
import LanguageSelectionScreen from '../screens/auth/LanguageSelectionScreen';
import RationCardScreen from '../screens/entitlement/RationCardScreen';
import AIChatbotScreen from '../screens/ai/AIChatbotScreen';

// ASHA Screens
import AshaDashboard from '../screens/asha/AshaDashboard';
import SmartRouteMap from '../screens/asha/SmartRouteMap';
import QrScannerRegister from '../screens/asha/QrScannerRegister';
import MedicationTracker from '../screens/asha/MedicationTracker';
import PatientHistory from '../screens/asha/PatientHistory';
import AshaProfile from '../screens/asha/AshaProfile';
import DoctorDashboard from '../screens/dr/DoctorDashboard';
import DoctorPatientDetail from '../screens/dr/DoctorPatientDetail';

const Tab = createBottomTabNavigator();
const EyeStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
const LangStack = createNativeStackNavigator();
const AshaStack = createNativeStackNavigator();
const DoctorStack = createNativeStackNavigator();

function LanguageNavigator() {
    return (
        <LangStack.Navigator screenOptions={{ headerShown: false }}>
            <LangStack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
        </LangStack.Navigator>
    );
}

function EyeStackNavigator() {
    return (
        <EyeStack.Navigator screenOptions={{ headerShown: false }}>
            <EyeStack.Screen name="EyeHealth" component={EyeHealthScreen} />
            <EyeStack.Screen name="AcuityTest" component={AcuityTestScreen} />
            <EyeStack.Screen name="ContrastTest" component={ContrastTestScreen} />
            <EyeStack.Screen name="AmslerTest" component={AmslerTestScreen} />
            <EyeStack.Screen name="PeripheralTest" component={PeripheralTestScreen} />
        </EyeStack.Navigator>
    );
}

function AuthNavigator() {
    return (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Landing" component={LandingScreen} />
            <AuthStack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
    );
}

function AshaTabs() {
    const { language } = useLanguage();
    const insets = useSafeAreaInsets();
    const isHindi = language === 'hi';

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused }) => {
                    let iconName;
                    if (route.name === 'AshaDashboard') iconName = 'view-dashboard';
                    else if (route.name === 'SmartRouteMap') iconName = 'map-marker-path';
                    else if (route.name === 'MedicationTracker') iconName = 'pill';
                    else if (route.name === 'AshaProfile') iconName = 'account-circle';

                    return (
                        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                            <MaterialCommunityIcons
                                name={iconName}
                                size={24}
                                color={focused ? Colors.primary : Colors.textLight}
                            />
                        </View>
                    );
                },
                tabBarLabel: ({ focused }) => {
                    let label;
                    if (route.name === 'AshaDashboard') label = isHindi ? 'डैशबोर्ड' : 'Dashboard';
                    else if (route.name === 'SmartRouteMap') label = isHindi ? 'रूट मैप' : 'Route';
                    else if (route.name === 'MedicationTracker') label = isHindi ? 'दवा' : 'Meds';
                    else if (route.name === 'AshaProfile') label = isHindi ? 'प्रोफ़ाइल' : 'Profile';

                    return (
                        <Text style={[styles.label, focused && styles.labelActive]}>
                            {label}
                        </Text>
                    );
                },
                tabBarStyle: [
                    styles.tabBar,
                    {
                        height: 60 + Math.max(insets.bottom, 10),
                        paddingBottom: Math.max(insets.bottom, 10),
                    }
                ],
                tabBarItemStyle: styles.tabBarItem,
            })}
        >
            <Tab.Screen name="AshaDashboard" component={AshaDashboard} />
            <Tab.Screen name="SmartRouteMap" component={SmartRouteMap} />
            <Tab.Screen name="MedicationTracker" component={MedicationTracker} />
            <Tab.Screen name="AshaProfile" component={AshaProfile} />
        </Tab.Navigator>
    );
}

function AshaNavigator() {
    return (
        <AshaStack.Navigator screenOptions={{ headerShown: false }}>
            <AshaStack.Screen name="AshaMain" component={AshaTabs} />
            <AshaStack.Screen name="QrRegister" component={QrScannerRegister} />
            <AshaStack.Screen name="PatientHistory" component={PatientHistory} />
        </AshaStack.Navigator>
    );
}

function DoctorTabs() {
    const { language } = useLanguage();
    const insets = useSafeAreaInsets();
    const isHindi = language === 'hi';

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused }) => {
                    let iconName;
                    if (route.name === 'DoctorDashboard') iconName = 'doctor';
                    else if (route.name === 'AshaProfile') iconName = 'account-circle';

                    return (
                        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                            <MaterialCommunityIcons
                                name={iconName}
                                size={24}
                                color={focused ? Colors.primary : Colors.textLight}
                            />
                        </View>
                    );
                },
                tabBarLabel: ({ focused }) => {
                    let label;
                    if (route.name === 'DoctorDashboard') label = isHindi ? 'डैशबोर्ड' : 'Dashboard';
                    else if (route.name === 'AshaProfile') label = isHindi ? 'प्रोफ़ाइल' : 'Profile';

                    return (
                        <Text style={[styles.label, focused && styles.labelActive]}>
                            {label}
                        </Text>
                    );
                },
                tabBarStyle: [
                    styles.tabBar,
                    {
                        height: 60 + Math.max(insets.bottom, 10),
                        paddingBottom: Math.max(insets.bottom, 10),
                    }
                ],
                tabBarItemStyle: styles.tabBarItem,
            })}
        >
            <Tab.Screen name="DoctorDashboard" component={DoctorDashboard} />
            <Tab.Screen name="AshaProfile" component={AshaProfile} />
        </Tab.Navigator>
    );
}

function DoctorNavigator() {
    return (
        <DoctorStack.Navigator screenOptions={{ headerShown: false }}>
            <DoctorStack.Screen name="DoctorMain" component={DoctorTabs} />
            <DoctorStack.Screen name="DoctorPatientDetail" component={DoctorPatientDetail} />
        </DoctorStack.Navigator>
    );
}

const TAB_ICONS = {
    Home: '🏠',
    Food: '🍽️',
    Setu: '🧠',
    Health: '💊',
    Learn: '📚',
    Eye: '👁️',
    Profile: '👤',
};

const TAB_LABEL_KEYS = {
    Home: 'home',
    Food: 'food',
    Setu: 'setu',
    Health: 'health',
    Learn: 'learn',
    Profile: 'profile',
    Eye: 'eye',
};

function getTabLabel(routeName, language) {
    const key = TAB_LABEL_KEYS[routeName];
    if (!key || !Labels[key]) {
        if (routeName === 'Setu') return language === 'hi' ? 'सेतु' : 'Setu';
        return routeName;
    }
    return Labels[key][language] || Labels[key].en || routeName;
}

function MainTabs() {
    const { language } = useLanguage();
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused }) => (
                    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                        <Text style={styles.icon}>{TAB_ICONS[route.name]}</Text>
                    </View>
                ),
                tabBarLabel: ({ focused }) => (
                    <Text style={[styles.label, focused && styles.labelActive]}>
                        {getTabLabel(route.name, language)}
                    </Text>
                ),
                tabBarStyle: [
                    styles.tabBar,
                    {
                        height: 60 + Math.max(insets.bottom, 10),
                        paddingBottom: Math.max(insets.bottom, 10),
                    }
                ],
                tabBarItemStyle: styles.tabBarItem,
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Food" component={MealLoggingFlow} />
            <Tab.Screen name="Setu" component={SetuScreen} />
            <Tab.Screen name="Health" component={HealthScreen} />
            <Tab.Screen name="Learn" component={LearnStack} />
            <Tab.Screen name="Eye" component={EyeStackNavigator} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}

function RootNavigator() {
    const { user } = useUser();

    return (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
            {user?.role === 'asha' ? (
                <RootStack.Screen name="Asha" component={AshaNavigator} />
            ) : user?.role === 'doctor' ? (
                <RootStack.Screen name="Doctor" component={DoctorNavigator} />
            ) : (
                <RootStack.Screen name="Main" component={MainTabs} />
            )}
            <RootStack.Screen
                name="RationCard"
                component={RationCardScreen}
                options={{
                    animation: 'slide_from_bottom',
                    presentation: 'modal'
                }}
            />
            <RootStack.Screen
                name="SOS"
                component={SOSScreen}
                options={{
                    animation: 'fade_from_bottom',
                    presentation: 'fullScreenModal'
                }}
            />
            <RootStack.Screen
                name="AIChatbot"
                component={AIChatbotScreen}
                options={{
                    animation: 'slide_from_bottom',
                    presentation: 'fullScreenModal',
                }}
            />
        </RootStack.Navigator>
    );
}

export default function AppNavigator() {
    const { user } = useUser();
    const { hasChosenLanguage, isLanguageLoaded } = useLanguage();

    if (!isLanguageLoaded) {
        return null;
    }

    return (
        <NavigationContainer>
            {!hasChosenLanguage ? (
                <LanguageNavigator />
            ) : user ? (
                <RootNavigator />
            ) : (
                <AuthNavigator />
            )}
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        paddingTop: 8,
        backgroundColor: Colors.white,
        borderTopWidth: 0,
        elevation: 20,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    tabBarItem: {
        paddingVertical: 4,
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconWrapActive: {
        backgroundColor: Colors.surfaceLight,
    },
    icon: {
        fontSize: 24,
    },
    label: {
        fontSize: 12,
        color: Colors.textLight,
        fontWeight: '500',
    },
    labelActive: {
        color: Colors.primary,
        fontWeight: '700',
    },
});
