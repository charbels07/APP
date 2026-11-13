/** The version written in app.json ("version"): told to the server so the team knows which versions are still in use. */
import Constants from 'expo-constants';

export const APP_VERSION: string = Constants.expoConfig?.version ?? '';
