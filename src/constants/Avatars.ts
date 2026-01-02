import { ImageSourcePropType } from 'react-native';

export const AVATAR_ASSETS: { [key: string]: ImageSourcePropType } = {
    'icon_0': require('../../assets/users_icons/icon_0.png'),
    'icon_1': require('../../assets/users_icons/icon_1.png'),
    'icon_2': require('../../assets/users_icons/icon_2.png'),
    'icon_3': require('../../assets/users_icons/icon_3.png'),
    'icon_4': require('../../assets/users_icons/icon_4.png'),
    'icon_5': require('../../assets/users_icons/icon_5.png'),
    'icon_6': require('../../assets/users_icons/icon_6.png'),
    'icon_7': require('../../assets/users_icons/icon_7.png'),
    'icon_8': require('../../assets/users_icons/icon_8.png'),
    'icon_9': require('../../assets/users_icons/icon_9.png'),
    'icon_10': require('../../assets/users_icons/icon_10.png'),
    'icon_11': require('../../assets/users_icons/icon_11.png'),
    'icon_12': require('../../assets/users_icons/icon_12.png'),
    'icon_13': require('../../assets/users_icons/icon_13.png'),
    'icon_14': require('../../assets/users_icons/icon_14.png'),
    'icon_15': require('../../assets/users_icons/icon_15.png'),
    'icon_16': require('../../assets/users_icons/icon_16.png'),
    'icon_17': require('../../assets/users_icons/icon_17.png'),
    'icon_18': require('../../assets/users_icons/icon_18.png'),
    'icon_19': require('../../assets/users_icons/icon_19.png'),
};

export const getAvatarSource = (url: string | null | undefined): ImageSourcePropType => {
    if (!url) {
        // Default placeholder or maybe return null if caller handles it
        // returning a default from assets if desired, or null.
        // Let's return undefined so Image component can handle default or we use a specific default icon.
        // For compliance with React Native Image source, let's use the first icon as default backup if needed,
        // but typically we want to show a generic person icon if null.
        return { uri: undefined };
    }

    if (url.startsWith('asset:')) {
        const key = url.split(':')[1];
        return AVATAR_ASSETS[key] || { uri: undefined };
    }

    return { uri: url };
};
