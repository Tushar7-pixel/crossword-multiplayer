export type GridData = {
    grid: string[][];
    placedWords: string[];
};

const DIRECTIONS = [
    { x: 1, y: 0 },   // Horizontal (Right)
    { x: 0, y: 1 },   // Vertical (Down)
    { x: 1, y: 1 },   // Diagonal (Down-Right)
    // Add {-1, 0} (Left) or {0, -1} (Up) here to increase difficulty
];

export const generateGrid = (words: string[], size: number = 10): GridData => {
    // Initialize empty grid
    const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
    const placedWords: string[] = [];

    // Helper to check if a word fits at a specific coordinate and direction
    const canPlaceWord = (word: string, startY: number, startX: number, dir: { x: number, y: number }) => {
        for (let i = 0; i < word.length; i++) {
            const y = startY + i * dir.y;
            const x = startX + i * dir.x;

            // Check bounds
            if (y < 0 || y >= size || x < 0 || x >= size) return false;

            // Check for collision (cell must be empty OR have the exact same letter)
            const cell = grid[y][x];
            if (cell !== '' && cell !== word[i]) return false;
        }
        return true;
    };

    // Attempt to place each word
    for (const word of words) {
        const upperWord = word.toUpperCase();
        let placed = false;
        let attempts = 0;
        const maxAttempts = 100; // Prevent infinite loops if grid is too crowded

        while (!placed && attempts < maxAttempts) {
            // Pick a random starting position and direction
            const startY = Math.floor(Math.random() * size);
            const startX = Math.floor(Math.random() * size);
            const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

            if (canPlaceWord(upperWord, startY, startX, dir)) {
                // Actually place the letters in the grid
                for (let i = 0; i < upperWord.length; i++) {
                    grid[startY + i * dir.y][startX + i * dir.x] = upperWord[i];
                }
                placedWords.push(upperWord);
                placed = true;
            }
            attempts++;
        }
    }

    // Fill remaining empty cells with random letters
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (grid[y][x] === '') {
                grid[y][x] = alphabet[Math.floor(Math.random() * alphabet.length)];
            }
        }
    }

    return { grid, placedWords };
};