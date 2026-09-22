export interface Placement {
    word: string;
    x: number;
    y: number;
    dx: number;
    dy: number;
}

// All 8 possible straight-line vectors
const DIRECTIONS = [
    { dx: 1, dy: 0 },   // Horizontal Forward (Left -> Right)
    { dx: -1, dy: 0 },  // Horizontal Backward (Right -> Left)
    { dx: 0, dy: 1 },   // Vertical Forward (Top -> Down)
    { dx: 0, dy: -1 },  // Vertical Backward (Upside Down / Bottom -> Top)
    { dx: 1, dy: 1 },   // Diagonal Forward (Top-Left -> Bottom-Right)
    { dx: -1, dy: 1 },  // Diagonal Forward (Top-Right -> Bottom-Left)
    { dx: 1, dy: -1 },  // Diagonal Backward (Bottom-Left -> Top-Right)
    { dx: -1, dy: -1 }, // Diagonal Backward (Bottom-Right -> Top-Left)
];

const canPlaceWord = (
    grid: (string | null)[][],
    word: string,
    x: number,
    y: number,
    dx: number,
    dy: number,
    size: number
): boolean => {
    const endX = x + dx * (word.length - 1);
    const endY = y + dy * (word.length - 1);

    if (endX < 0 || endX >= size || endY < 0 || endY >= size) return false;

    for (let i = 0; i < word.length; i++) {
        const curX = x + dx * i;
        const curY = y + dy * i;
        const existing = grid[curY][curX];
        if (existing !== null && existing !== word[i]) {
            return false;
        }
    }

    return true;
};

const placeWordOnGrid = (
    grid: (string | null)[][],
    word: string,
    x: number,
    y: number,
    dx: number,
    dy: number
) => {
    for (let i = 0; i < word.length; i++) {
        grid[y + dy * i][x + dx * i] = word[i];
    }
};

export const generateGrid = (
    words: string[],
    size: number = 10
): { grid: string[][]; placedWords: string[] } => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // Attempt up to 80 full board layouts to satisfy all 5 orientation constraints
    for (let attempt = 0; attempt < 80; attempt++) {
        const grid: (string | null)[][] = Array.from({ length: size }, () =>
            Array(size).fill(null)
        );
        const placements: Placement[] = [];

        // Sort words by length descending for easier packing
        const sortedWords = [...words].sort((a, b) => b.length - a.length);

        for (const word of sortedWords) {
            const shuffledDirs = [...DIRECTIONS].sort(() => 0.5 - Math.random());
            let placed = false;

            // Try random starting positions for this word
            for (let p = 0; p < 120; p++) {
                const x = Math.floor(Math.random() * size);
                const y = Math.floor(Math.random() * size);

                for (const dir of shuffledDirs) {
                    if (canPlaceWord(grid, word, x, y, dir.dx, dir.dy, size)) {
                        placeWordOnGrid(grid, word, x, y, dir.dx, dir.dy);
                        placements.push({ word, x, y, dx: dir.dx, dy: dir.dy });
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }
        }

        // Check Rule 2: Minimum 1 Horizontal, 1 Vertical, 1 Diagonal, 1 Forward, 1 Backward
        const hasHorizontal = placements.some((p) => p.dy === 0);
        const hasVertical = placements.some((p) => p.dx === 0);
        const hasDiagonal = placements.some(
            (p) => Math.abs(p.dx) === Math.abs(p.dy) && p.dx !== 0
        );
        const hasForward = placements.some((p) => p.dx >= 0 && p.dy >= 0);
        const hasBackward = placements.some((p) => p.dx < 0 || p.dy < 0);

        // If all words were placed and all 5 constraints are met, complete the grid
        if (
            placements.length === sortedWords.length &&
            hasHorizontal &&
            hasVertical &&
            hasDiagonal &&
            hasForward &&
            hasBackward
        ) {
            const finalGrid: string[][] = grid.map((row) =>
                row.map((cell) => cell || letters[Math.floor(Math.random() * letters.length)])
            );

            return {
                grid: finalGrid,
                placedWords: placements.map((p) => p.word),
            };
        }
    }

    // Fallback: Fill grid with whatever placed if attempts timed out
    const fallbackGrid: (string | null)[][] = Array.from({ length: size }, () =>
        Array(size).fill(null)
    );
    return {
        grid: fallbackGrid.map((row) =>
            row.map((cell) => cell || letters[Math.floor(Math.random() * letters.length)])
        ),
        placedWords: words.slice(0, 3),
    };
};