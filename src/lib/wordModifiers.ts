/**
 * Scrambles a word into an anagram.
 * If keepEnds is true (Levels 21-23), preserves first and last letters (e.g., C _ _ _ H).
 */
export const scrambleWord = (word: string, keepEnds: boolean = false): string => {
    if (word.length <= 3) return word;

    if (keepEnds) {
        const first = word[0];
        const last = word[word.length - 1];
        const middle = word.slice(1, -1).split('');

        let scrambledMiddle = middle.join('');
        let attempts = 0;
        while (scrambledMiddle === middle.join('') && attempts < 10) {
            middle.sort(() => 0.5 - Math.random());
            scrambledMiddle = middle.join('');
            attempts++;
        }
        return `${first}${scrambledMiddle}${last}`;
    }

    // Full word scramble (Levels 24-25)
    const letters = word.split('');
    let scrambled = word;
    let attempts = 0;
    while (scrambled === word && attempts < 15) {
        letters.sort(() => 0.5 - Math.random());
        scrambled = letters.join('');
        attempts++;
    }
    return scrambled;
};