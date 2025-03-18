document.addEventListener('DOMContentLoaded', function() {
    console.log('Thinking indicator module loaded');
    
    // Add button event listener once the document is loaded
    setTimeout(function() {
        const showHintButton = document.getElementById('show-hint');
        if (showHintButton) {
            // Replace any existing event listeners with our new implementation
            showHintButton.removeEventListener('click', window.showBestMove);
            showHintButton.addEventListener('click', showThinkingBestMove);
            console.log('Show hint button event listener attached');
            
            // Track the current position to know when a move has been made
            window.lastFenForHint = window.chess ? window.chess.fen() : null;
            
            // Monitor board changes to re-enable the button after a move
            setupMoveListener();
        } else {
            console.error('Show hint button not found');
        }
    }, 500);
    
    // Function to monitor for moves and re-enable the hint button
    function setupMoveListener() {
        // Check if we can use MutationObserver for the board
        const boardElement = document.querySelector('.board-b72b1');
        if (boardElement) {
            // Set up mutation observer to detect board changes
            const observer = new MutationObserver(function(mutations) {
                if (window.chess && window.lastFenForHint !== window.chess.fen()) {
                    enableHintButton();
                    window.lastFenForHint = window.chess.fen();
                }
            });
            
            observer.observe(boardElement, { 
                childList: true, 
                subtree: true,
                attributes: true
            });
            console.log('Board mutation observer set up');
        } else {
            // Fallback: Set up a periodic check
            setInterval(function() {
                if (window.chess && window.lastFenForHint !== window.chess.fen()) {
                    enableHintButton();
                    window.lastFenForHint = window.chess.fen();
                }
            }, 1000);
            console.log('Using interval to detect board changes');
        }
        
        // Also listen for move events if your app uses them
        document.addEventListener('chessMove', function() {
            setTimeout(enableHintButton, 500);
        });
        
        // Listen for clicks on the board which might indicate a move
        document.addEventListener('click', function(e) {
            if (e.target.closest('.board-b72b1')) {
                // Check after a short delay if a move was made
                setTimeout(function() {
                    if (window.chess && window.lastFenForHint !== window.chess.fen()) {
                        enableHintButton();
                        window.lastFenForHint = window.chess.fen();
                    }
                }, 500);
            }
        });
    }
    
    // Function to enable the hint button
    function enableHintButton() {
        const showHintButton = document.getElementById('show-hint');
        if (showHintButton) {
            showHintButton.disabled = false;
            showHintButton.classList.remove('disabled');
            showHintButton.title = 'Show the best move for the current position';
        }
    }
    
    // Function to disable the hint button
    function disableHintButton() {
        const showHintButton = document.getElementById('show-hint');
        if (showHintButton) {
            showHintButton.disabled = true;
            showHintButton.classList.add('disabled');
            showHintButton.title = 'Hint already used for this position - make a move first';
        }
    }
    
    // Define constants for extracting move data
    const FROMSQ_MASK = 0x7F;          // 0000 0000 0000 0000 0000 0000 0111 1111
    const TOSQ_MASK = 0x7F << 7;       // 0000 0000 0000 0000 0011 1111 1000 0000
    const CAPTURED_MASK = 0xF << 14;   // 0000 0000 0000 0011 1100 0000 0000 0000
    const PROMOTED_MASK = 0xF << 20;   // 0000 0000 1111 0000 0000 0000 0000 0000
    
    // Create a persistent engine for consistent evaluations
    let persistentEngine = null;
    const positionCache = new Map(); // Cache evaluated positions

    // Initialize the persistent engine
    function ensurePersistentEngine() {
        if (!persistentEngine) {
            persistentEngine = new betafishEngine();
            persistentEngine.setThinkingTime(3); // 5 seconds for good quality
            console.log('Persistent engine initialized');
        }
        return persistentEngine;
    }

    // The main function to show the thinking indicator and best move
    function showThinkingBestMove() {
        console.log('Show thinking best move called');
        
        // Prevent multiple clicks - disable the button immediately
        disableHintButton();
        
        // Create or get the thinking indicator
        let thinkingIndicator = document.getElementById('thinking-indicator');
        if (!thinkingIndicator) {
            thinkingIndicator = document.createElement('div');
            thinkingIndicator.id = 'thinking-indicator';
            thinkingIndicator.className = 'thinking-indicator';
            
            // Add a spinner and text
            thinkingIndicator.innerHTML = `
                <div class="spinner"></div>
                <span>BetaFish thinking (3s)...</span>
            `;
            
            // Add to the info panel
            const infoPanel = document.querySelector('.info-panel');
            if (infoPanel) {
                // Insert at the top of the info panel
                infoPanel.insertBefore(thinkingIndicator, infoPanel.firstChild);
            } else {
                document.body.appendChild(thinkingIndicator);
            }
            
            // Add CSS if not already present
            if (!document.getElementById('thinking-indicator-style')) {
                const style = document.createElement('style');
                style.id = 'thinking-indicator-style';
                style.textContent = `
                    .thinking-indicator {
                        display: none;
                        align-items: center;
                        background-color: #f8f9fa;
                        border: 1px solid #dee2e6;
                        border-radius: 4px;
                        padding: 10px 15px;
                        margin-bottom: 15px;
                        font-weight: bold;
                        color: #495057;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    
                    .thinking-indicator .spinner {
                        border: 4px solid rgba(0, 0, 0, 0.1);
                        border-radius: 50%;
                        border-top: 4px solid #3498db;
                        width: 20px;
                        height: 20px;
                        margin-right: 10px;
                        animation: spin 1s linear infinite;
                    }
                    
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    
                    /* Disabled button style */
                    #show-hint.disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                        background-color: #cccccc;
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        // Show the thinking indicator
        thinkingIndicator.style.display = 'flex';
        
        // Clear any previous highlights
        if (window.clearHighlights) {
            window.clearHighlights();
        }
        
        // Store the current position to track when a move is made
        if (window.chess) {
            window.lastFenForHint = window.chess.fen();
        }
        
        // Check if the game is already over
        if (window.chess && window.chess.game_over()) {
            thinkingIndicator.style.display = 'none';
            
            // Update display with game over message
            const analysisElement = document.getElementById('analysis');
            if (analysisElement) {
                analysisElement.textContent = `Game is over - no moves to make`;
            }
            return;
        }
        
        // Use setTimeout to ensure the UI updates before the heavy computation starts
        setTimeout(function() {
            try {
                // Get the current FEN
                const currentFen = window.chess.fen();
                console.log('Current FEN:', currentFen);
                
                // Check if we have this position cached
                if (positionCache.has(currentFen)) {
                    const cachedResult = positionCache.get(currentFen);
                    console.log('Using cached result:', cachedResult);
                    processMove(cachedResult.bestMove, cachedResult.evaluation);
                    thinkingIndicator.style.display = 'none';
                    return;
                }
                
                // Get or create the persistent engine
                const engine = ensurePersistentEngine();
                
                // Set the current position
                engine.setFEN(currentFen);
                
                // Make sure the engine initialized correctly
                if (!engine || typeof engine.setThinkingTime !== 'function') {
                    throw new Error('Engine not properly initialized');
                }
                
                // Reset the engine state for a fresh calculation
                if (typeof engine.resetSearchHistory === 'function') {
                    engine.resetSearchHistory();
                }
                
                // Set a longer thinking time for better moves
                console.log('Setting thinking time to 5 seconds and ensuring proper search');
                engine.setThinkingTime(3); // Increase to 5 seconds

                // Force the engine to initialize search with proper depth
                if (typeof engine.SearchPosition === 'function') {
                    engine.SearchPosition(); // This ensures proper initialization
                }
                
                // Get all legal moves from chess.js as a fallback
                const legalMoves = window.chess.moves({ verbose: true });
                console.log(`Legal moves according to chess.js: ${legalMoves.length}`);
                
                // This call will take time based on the thinking time
                const bestMove = engine.getBestMove();
                console.log('Best move calculation complete, move value:', bestMove);
                
                // Cache this result
                if (bestMove && bestMove !== 0) {
                    const evaluation = getMaterialEvaluation();
                    positionCache.set(currentFen, { bestMove, evaluation });
                }
                
                // Now hide the thinking indicator
                thinkingIndicator.style.display = 'none';
                
                // Process the move result
                processMove(bestMove, getMaterialEvaluation());
            } catch (error) {
                console.error('Error calculating best move:', error);
                thinkingIndicator.style.display = 'none';
                
                // Update display with error
                const analysisElement = document.getElementById('analysis');
                if (analysisElement) {
                    analysisElement.textContent = `Error: Could not calculate best move`;
                }
                
                // Try to suggest a random legal move as fallback
                if (window.chess) {
                    const legalMoves = window.chess.moves({ verbose: true });
                    suggestRandomLegalMove(legalMoves);
                }
            }
        }, 50); // Small delay to allow UI update
        
        // Helper function to process the move result
        function processMove(bestMove, evaluation) {
            // Process and display the best move
            if (bestMove && bestMove !== 0) {
                // Extract from and to squares using the bit masks
                const fromIdx = bestMove & FROMSQ_MASK; 
                const toIdx = (bestMove & TOSQ_MASK) >> 7;
                
                console.log(`Raw move data: fromIdx=${fromIdx}, toIdx=${toIdx}`);
                
                // Convert to algebraic notation
                const from = betafishToAlgebraic(fromIdx);
                const to = betafishToAlgebraic(toIdx);
                
                console.log(`Best move: ${from} to ${to} (from idx: ${fromIdx}, to idx: ${toIdx})`);
                
                // Get all legal moves from chess.js
                const legalMoves = window.chess.moves({ verbose: true });
                
                // Double-check against legal moves
                let isLegalMove = false;
                if (from && to) {
                    isLegalMove = legalMoves.some(move => 
                        move.from === from && move.to === to);
                }
                
                if (isLegalMove) {
                    // Highlight the move
                    if (window.highlightMove) {
                        window.highlightMove(from, to);
                    }
                    
                    // Update display if there's an analysis element
                    const analysisElement = document.getElementById('analysis');
                    if (analysisElement) {
                        const capturedPiece = (bestMove & CAPTURED_MASK) >> 14;
                        const promotedPiece = (bestMove & PROMOTED_MASK) >> 20;
                        let moveDescription = `${from} to ${to}`;
                        
                        if (capturedPiece) {
                            moveDescription += " (captures)";
                        }
                        if (promotedPiece) {
                            moveDescription += " (promotes)";
                        }
                        
                        analysisElement.textContent = `Best move: ${moveDescription} | Material evaluation: ${evaluation}`;
                    }
                } else {
                    console.error(`Move ${from}-${to} is not legal according to chess.js`);
                    // Fall back to a random legal move if calculation returned illegal move
                    suggestRandomLegalMove(legalMoves);
                }
            } else {
                console.error('No best move found or invalid move returned');
                
                // Fall back to suggesting a random legal move
                const legalMoves = window.chess.moves({ verbose: true });
                suggestRandomLegalMove(legalMoves);
            }
        }
    }
    
    // Fallback function to suggest a random legal move
    function suggestRandomLegalMove(legalMoves) {
        if (!legalMoves || legalMoves.length === 0) {
            const analysisElement = document.getElementById('analysis');
            if (analysisElement) {
                analysisElement.textContent = `No legal moves available - checkmate or stalemate`;
            }
            return;
        }
        
        // Choose a random legal move
        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        
        // Highlight the move
        if (window.highlightMove) {
            window.highlightMove(randomMove.from, randomMove.to);
        }
        
        // Update display
        const analysisElement = document.getElementById('analysis');
        if (analysisElement) {
            analysisElement.textContent = `Suggested move: ${randomMove.from} to ${randomMove.to} | Material evaluation: ${getMaterialEvaluation()}`;
        }
    }
    
    // Function to convert BetaFish's index (0-63) to algebraic notation
    function betafishToAlgebraic(index) {
        if (index < 0 || index > 63) {
            console.error("Invalid square index:", index);
            return null;
        }
        
        // BetaFish uses a8=0, h1=63 mapping
        const file = String.fromCharCode(97 + (index % 8));  // 97 is ASCII 'a'
        const rank = 8 - Math.floor(index / 8);
        
        return file + rank;
    }
    
    // Get a simple material evaluation
    function getMaterialEvaluation() {
        if (!window.chess) return "Evaluation not available";
        
        const fen = window.chess.fen();
        const position = fen.split(' ')[0];
        
        const PIECES = {
            'p': 1,    // pawn
            'n': 3,    // knight
            'b': 3,    // bishop
            'r': 5,    // rook
            'q': 9     // queen
        };
        
        let whiteMaterial = 0;
        let blackMaterial = 0;
        
        // Count pieces in the position
        for (let i = 0; i < position.length; i++) {
            const char = position.charAt(i);
            if (char in PIECES) {
                // Lowercase means black piece
                blackMaterial += PIECES[char];
            } else if (char.toLowerCase() in PIECES) {
                // Uppercase means white piece
                whiteMaterial += PIECES[char.toLowerCase()];
            }
        }
        
        const advantage = whiteMaterial - blackMaterial;
        
        if (advantage > 0) {
            return `White is ahead by ${advantage} points`;
        } else if (advantage < 0) {
            return `Black is ahead by ${Math.abs(advantage)} points`;
        } else {
            return "Material is even";
        }
    }
    
    // Make the functions globally available
    window.showThinkingBestMove = showThinkingBestMove;
    window.betafishToAlgebraic = betafishToAlgebraic;
});