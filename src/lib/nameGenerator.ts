const ADJECTIVES = [
    'Swift', 'Cosmic', 'Sunny', 'Clever', 'Brave', 'Chill', 'Wild',
    'Mega', 'Aqua', 'Lucky', 'Hyper', 'Nova', 'Pixel', 'Sonic', 'Golden'
];

const CREATURES = [
    'Otter', 'Falcon', 'Panda', 'Koala', 'Tiger', 'Fox', 'Eagle',
    'Dolphin', 'Badger', 'Wolf', 'Hawk', 'Cheetah', 'Gecko', 'Lynx', 'Puma'
];

export const generateRandomName = (): string => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const creature = CREATURES[Math.floor(Math.random() * CREATURES.length)];
    const num = Math.floor(10 + Math.random() * 90);
    return `${adj}${creature}${num}`;
};