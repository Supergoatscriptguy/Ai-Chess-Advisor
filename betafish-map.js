document.addEventListener('DOMContentLoaded', function() {
    console.log('BetaFish mapping module loaded');
    
    // Function to highlight a move with correct BetaFish mapping
    function highlightBetafishMove(engine, currentPlayer) {
        // First clear any existing highlights
        clearHighlights();
        
        // Try to get the best move from BetaFish
        try {
            const bestMove = engine.getBestMove();
            if (!bestMove) {
                console.error('No best move found');
                return;
            }
            
            // Log the raw move
            console.log('Raw BetaFish move:', bestMove);
            
            // Let's debug the move first
            const fromSq = bestMove & 0x7F;
            const toSq = (bestMove >> 7) & 0x7F;
            
            console.log(`Raw from=${fromSq}, to=${toSq}`);
            
            // Here's the mapping:
            // BetaFish internal board is laid out as:
            // 56 57 58 59 60 61 62 63   → a1 b1 c1 d1 e1 f1 g1 h1
            // 48 49 50 51 52 53 54 55   → a2 b2 c2 d2 e2 f2 g2 h2
            // ...
            // 8  9  10 11 12 13 14 15   → a7 b7 c7 d7 e7 f7 g7 h7
            // 0  1  2  3  4  5  6  7    → a8 b8 c8 d8 e8 f8 g8 h8
            
            // Get the correct algebraic notation 
            // BetaFish's standard mapping: a8=0, h1=63
            const from = betafishMapping(fromSq);
            const to = betafishMapping(toSq);
            
            console.log(`Mapped move: ${from}-${to}`);
            
            // Display the correct squares
            highlightSquare(from, 'green');  // Source square in green
            highlightSquare(to, 'red');      // Destination square in red
            
            // Add data attributes to store the highlighted move
            document.querySelectorAll('.highlight-square').forEach(el => {
                el.dataset.betafishMove = `${from}-${to}`;
            });
            
            // If you want to visually verify the mapping is correct, also show fixed squares:
            // testMapping();
        } catch (e) {
            console.error('Error highlighting move:', e);
        }
    }
    
    // Map from BetaFish's 0-63 square indices to algebraic notation
    function betafishMapping(index) {
        if (index < 0 || index > 63) {
            console.error('Invalid square index:', index);
            return 'e2'; // Default fallback
        }
        
        // BetaFish indices: a8=0, h1=63
        const file = String.fromCharCode(97 + (index % 8));  // 97 is ASCII 'a'
        const rank = 8 - Math.floor(index / 8);
        
        return file + rank;
    }
    
    // Highlight a specific square with a color
    function highlightSquare(square, color) {
        // Find the square element
        const squareEl = document.querySelector(`[data-square="${square}"]`);
        if (!squareEl) {
            console.error(`Square element not found: ${square}`);
            console.log('Available squares:', 
                Array.from(document.querySelectorAll('[data-square]'))
                .map(el => el.getAttribute('data-square')));
            return;
        }
        
        // Add highlight class
        squareEl.classList.add('highlight-square');
        if (color === 'green') {
            squareEl.classList.add('highlight-from');
        } else if (color === 'red') {
            squareEl.classList.add('highlight-to');
        }
    }
    
    // Clear all highlights
    function clearHighlights() {
        document.querySelectorAll('.highlight-square, .highlight-from, .highlight-to').forEach(el => {
            el.classList.remove('highlight-square', 'highlight-from', 'highlight-to');
            delete el.dataset.betafishMove;
        });
    }
    
    // Test mapping to verify it works correctly
    function testMapping() {
        // Test a few key squares to make sure mapping is correct
        const testSquares = [
            { index: 0, expected: 'a8' },   // Top left corner
            { index: 7, expected: 'h8' },   // Top right corner
            { index: 56, expected: 'a1' },  // Bottom left corner
            { index: 63, expected: 'h1' },  // Bottom right corner
            { index: 52, expected: 'e2' },  // Common opening square
            { index: 12, expected: 'e7' }   // Common opening square
        ];
        
        let allCorrect = true;
        testSquares.forEach(test => {
            const mapped = betafishMapping(test.index);
            const isCorrect = mapped === test.expected;
            
            console.log(`Index ${test.index} maps to ${mapped}, expected ${test.expected}: ${isCorrect ? '✓' : '✗'}`);
            
            if (!isCorrect) allCorrect = false;
            
            // Briefly highlight this square to visually verify
            setTimeout(() => {
                highlightSquare(mapped, 'green');
                setTimeout(() => clearHighlights(), 500);
            }, 1000 * testSquares.indexOf(test));
        });
        
        if (allCorrect) {
            console.log('All test mappings CORRECT! ✓');
        } else {
            console.error('Some test mappings FAILED! ✗');
        }
    }
    
    // Expose necessary functions to global scope
    window.highlightBetafishMove = highlightBetafishMove;
    window.clearHighlights = clearHighlights;
    window.testBetafishMapping = testMapping;
    
    // Listen for board changes to clear highlights
    document.addEventListener('chessPositionChange', clearHighlights);
    
    console.log('BetaFish mapping module initialized');
});