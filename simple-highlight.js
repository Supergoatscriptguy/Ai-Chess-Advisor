// Wait for document to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Simple highlight module loaded');
    
    // Function to highlight a move (from and to squares)
    function highlightMove(from, to) {
        // Clear any existing highlights first
        clearHighlights();
        
        if (!from || !to) {
            console.error('Invalid squares for highlighting');
            return;
        }
        
        console.log(`Highlighting move from ${from} to ${to}`);
        
        // Get the square elements
        const fromSquare = document.querySelector(`[data-square="${from}"]`);
        const toSquare = document.querySelector(`[data-square="${to}"]`);
        
        if (!fromSquare || !toSquare) {
            console.error(`Square element not found: ${!fromSquare ? from : to}`);
            return;
        }
        
        // Add highlight classes
        fromSquare.classList.add('highlight-from');
        toSquare.classList.add('highlight-to');
    }
    
    // Function to clear all highlights
    function clearHighlights() {
        document.querySelectorAll('.highlight-from, .highlight-to').forEach(square => {
            square.classList.remove('highlight-from', 'highlight-to');
        });
    }
    
    // Function to show best move based on current position
    function showBestMove(engine, currentPlayer) {
        console.log('Getting best move for player:', currentPlayer);
        
        try {
            // Ensure engine has enough thinking time
            engine.setThinkingTime(3); // Increase thinking time for better moves
            
            // Use chess.js to get legal moves for the current position
            if (!window.chess) {
                console.error('Chess.js instance not available');
                return;
            }
            
            const legalMoves = window.chess.moves({ verbose: true });
            if (legalMoves.length === 0) {
                console.log('No legal moves available - game may be over');
                return;
            }
            
            console.log('Legal moves:', legalMoves.map(m => `${m.from}-${m.to}`));
            
            // Choose a move based on some basic chess principles
            let bestMove = chooseBestMove(legalMoves, currentPlayer);
            
            console.log('Selected best move:', bestMove);
            
            // Highlight the chosen move
            highlightMove(bestMove.from, bestMove.to);
        } catch (e) {
            console.error('Error showing best move:', e);
        }
    }
    
    // Function to choose a good move based on basic chess principles
    function chooseBestMove(legalMoves, playerColor) {
        // Create a scoring system for moves
        const scoredMoves = legalMoves.map(move => {
            let score = 0;
            
            // Prefer captures (higher value pieces first)
            if (move.captured) {
                const pieceValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9 };
                score += pieceValues[move.captured] || 1;
            }
            
            // Prefer checks
            if (move.flags.includes('c')) {
                score += 2;
            }
            
            // In the opening, prefer center control and development
            if (window.chess.history().length < 10) {
                // Center pawn moves
                if (move.piece === 'p' && ['e4', 'e5', 'd4', 'd5'].includes(move.to)) {
                    score += 3;
                }
                
                // Developing knights and bishops
                if (['n', 'b'].includes(move.piece) && !['a', 'h'].includes(move.to[0])) {
                    score += 2;
                }
                
                // Discourage early queen moves
                if (move.piece === 'q') {
                    score -= 1;
                }
                
                // Castling is good in the opening
                if (move.san === 'O-O' || move.san === 'O-O-O') {
                    score += 4;
                }
            }
            
            return { ...move, score };
        });
        
        // Sort moves by score (highest first)
        scoredMoves.sort((a, b) => b.score - a.score);
        
        console.log('Scored moves:', scoredMoves.map(m => `${m.from}-${m.to} (${m.score})`));
        
        // Return the highest scoring move
        return scoredMoves[0] || legalMoves[0];
    }
    
    // Add CSS for highlighting
    function addHighlightStyles() {
        // Check if styles already exist
        if (document.getElementById('highlight-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'highlight-styles';
        style.textContent = `
            .highlight-from {
                box-shadow: inset 0 0 0 4px green !important;
                background-color: rgba(0, 128, 0, 0.3) !important;
            }
            
            .highlight-to {
                box-shadow: inset 0 0 0 4px red !important;
                background-color: rgba(255, 0, 0, 0.3) !important;
            }
        `;
        
        document.head.appendChild(style);
        console.log('Highlight styles added');
    }
    
    // Expose functions to global scope
    window.highlightMove = highlightMove;
    window.clearHighlights = clearHighlights;
    window.simpleShowBestMove = showBestMove;
    
    // Listen for position changes
    document.addEventListener('chessPositionChange', clearHighlights);
    
    // Clear highlights when a piece is grabbed
    document.addEventListener('mousedown', function(e) {
        if (e.target.classList.contains('piece-417db')) {
            clearHighlights();
        }
    }, true);
    
    // Initialize
    addHighlightStyles();
    console.log('Simple highlight module initialized');
});