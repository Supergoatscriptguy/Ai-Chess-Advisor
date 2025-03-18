document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded");
    
    // Check if necessary libraries are loaded
    if (typeof Chess === 'undefined') {
        console.error("Chess.js is not loaded!");
    } else {
        console.log("Chess.js loaded successfully");
    }
    
    if (typeof Chessboard === 'undefined') {
        console.error("Chessboard.js is not loaded!");
    } else {
        console.log("Chessboard.js loaded successfully");
    }
    
    if (typeof betafishEngine === 'undefined') {
        console.error("BetaFish engine is not loaded!");
    } else {
        console.log("BetaFish engine loaded successfully");
    }
    
    console.log("Initializing...");
    
    // Create chess instance first
    const chess = new Chess();
    // Make it globally available for coordination between modules
    window.chess = chess;
    
    // Initialize BetaFish engine
    const engine = betafishEngine();
    engine.setThinkingTime(3);  // 3 seconds for good balance of speed and quality
    
    // Track if arrow is showing
    let arrowShowing = false;
    let selectedGameIndex = null;
    
    // IMPORTANT: Simplified Chessboard initialization (fix for the dragging issue)
    let board = null;
    try {
        board = Chessboard('board', {
            position: 'start',
            draggable: true,
            pieceTheme: 'https://lichess1.org/assets/piece/cburnett/{piece}.svg',
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSnapEnd: onSnapEnd
        });
        console.log("Chessboard created successfully");
    } catch (error) {
        console.error("Error creating chessboard:", error);
    }
    
    // These helper functions extract the move data from BetaFish's move format - NOW USING CORRECT BIT MASKS
    function fromSQ(move) {
        return move & 0x7f; // Using the correct bit mask from the bottom of your file
    }

    function toSQ(move) {
        return (move >> 7) & 0x7f; // Using the correct bit mask from the bottom of your file
    }
    
    // Debug function to log full details about a move
    function debugMove(move) {
        console.log("Move decimal:", move);
        console.log("Move hex:", move.toString(16));
        console.log("Move binary:", move.toString(2).padStart(16, '0'));
        
        const fromSquareIndex = fromSQ(move);
        const toSquareIndex = toSQ(move);
        
        console.log("From square index:", fromSquareIndex);  
        console.log("To square index:", toSquareIndex);
        
        const fromNotation = indexToNotation(fromSquareIndex);
        const toNotation = indexToNotation(toSquareIndex);
        
        console.log("From notation:", fromNotation);
        console.log("To notation:", toNotation);
        
        return { from: fromNotation, to: toNotation };
    }
    
    // Convert a board index (0-63) to algebraic notation (a1-h8)
    function indexToNotation(index) {
        if (index < 0 || index > 63) {
            console.error("Invalid square index:", index);
            return 'e2'; // Default to a common starting square
        }
        
        // Try different mappings to see which works
        // Standard mapping (a1=0, h8=63)
        const standardFile = String.fromCharCode(97 + (index % 8));
        const standardRank = Math.floor(index / 8) + 1;
        const standardNotation = standardFile + standardRank;
        
        // Let's try a flipped mapping too
        // Flipped mapping (a8=0, h1=63)
        const flippedFile = String.fromCharCode(97 + (index % 8));
        const flippedRank = 8 - Math.floor(index / 8);
        const flippedNotation = flippedFile + flippedRank;
        
        // Let's also try a doubly flipped mapping
        // Double flipped (h1=0, a8=63)
        const doubleFlippedFile = String.fromCharCode(104 - (index % 8)); // 104 is ASCII 'h'
        const doubleFlippedRank = 8 - Math.floor(index / 8);
        const doubleFlippedNotation = doubleFlippedFile + doubleFlippedRank;
        
        console.log(`Index ${index} could be ${standardNotation} or ${flippedNotation} or ${doubleFlippedNotation}`);
        
        // Check which of these notations exist in the DOM
        const availableSquares = Array.from(document.querySelectorAll('[data-square]'))
            .map(el => el.getAttribute('data-square'));
        
        if (availableSquares.includes(standardNotation)) {
            console.log(`Using standard notation: ${standardNotation}`);
            return standardNotation;
        } else if (availableSquares.includes(flippedNotation)) {
            console.log(`Using flipped notation: ${flippedNotation}`);
            return flippedNotation;
        } else if (availableSquares.includes(doubleFlippedNotation)) {
            console.log(`Using double flipped notation: ${doubleFlippedNotation}`);
            return doubleFlippedNotation;
        }
        
        // If none of these work, try all available squares
        console.log("No matching notation found, attempting to find closest match");
        
        // Default to e2 as a fallback which should always exist
        return 'e2';
    }
    
    // Prevent illegal moves
    function onDragStart(source, piece) {
        // Don't allow moving pieces if the game is over
        if (chess.game_over()) return false;
        
        // Only allow the current player to move their pieces
        if ((chess.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (chess.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
        
        // Remove any existing highlights when starting a new move
        if (window.clearHighlights) {
            window.clearHighlights();
        }
        return true;
    }
    
    // Validate and make moves
    function onDrop(source, target) {
        // Clear any highlights first
        if (window.clearHighlights) {
            window.clearHighlights();
        }
        
        // See if the move is legal
        const move = chess.move({
            from: source,
            to: target,
            promotion: 'q' // Always promote to a queen for simplicity
        });
        
        // Illegal move
        if (move === null) return 'snapback';
        
        // Play sound effect
        try {
            if (move.captured) {
                document.getElementById('capture-sound').play().catch(e => console.log("Sound error:", e));
            } else if (chess.in_check()) {
                document.getElementById('check-sound').play().catch(e => console.log("Sound error:", e));
            } else {
                document.getElementById('move-sound').play().catch(e => console.log("Sound error:", e));
            }
        } catch (e) {
            console.log("Sound play error:", e);
        }
        
        // Update engine position
        engine.setFEN(chess.fen());
        
        // Trigger custom event to notify of board change
        document.dispatchEvent(new Event('chessPositionChange'));
        
        return true;
    }
    
    // Update board position after the piece snap animation
    function onSnapEnd() {
        board.position(chess.fen());
    }
    
    // Reset the board to the starting position
    function resetBoard() {
        chess.reset();
        board.position('start');
        engine.setFEN(chess.fen());
        
        // Clear highlights
        if (window.clearHighlights) {
            window.clearHighlights();
        }
        
        // Update UI
        updateUI();
        
        try {
            document.getElementById('move-sound').play().catch(e => console.log("Sound error:", e));
        } catch (e) {
            console.log("Sound play error:", e);
        }
    }
    
    // Combined function to update all UI elements
    function updateUI() {
        try {
            analyzePosition();
            showTopMoves();
            updateMoveHistory();
        } catch (e) {
            console.error("Error in updateUI:", e);
        }
    }
    
    // Analyze the current position
    function analyzePosition() {
        try {
            const evaluation = engine.evaluate(chess.fen());
            const score = evaluation.score / 100; // Convert centipawns to pawns
            let scoreText = score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1);
            if (score === 0) scoreText = "0.0";
            
            const analysisElement = document.getElementById('analysis');
            if (analysisElement) {
                analysisElement.textContent = 
                    `Position evaluation: ${scoreText} (${score > 0 ? 'White' : (score < 0 ? 'Black' : 'Even')})`;
            }
        } catch (e) {
            console.error("Error in analyzePosition:", e);
        }
    }
    
    // Show top 3 moves
    function showTopMoves() {
        try {
            engine.setThinkingTime(3); // Increase from 2 to 3 seconds
            const topMoves = engine.getTopMoves(3); // Get top 3 moves
            
            const moveList = document.getElementById('top-moves-list');
            if (!moveList) return;
            
            moveList.innerHTML = '';
            
            topMoves.forEach((moveInfo, index) => {
                const move = moveInfo.move;
                const decodedMove = debugMove(move);
                const score = moveInfo.score / 100;
                
                const li = document.createElement('li');
                li.textContent = `Move ${index+1}: ${decodedMove.from}-${decodedMove.to} (${score > 0 ? '+' : ''}${score.toFixed(2)})`;
                li.addEventListener('click', () => {
                    if (window.clearHighlights) window.clearHighlights();
                    if (window.highlightMove) window.highlightMove(decodedMove.from, decodedMove.to);
                });
                moveList.appendChild(li);
            });
        } catch (e) {
            console.error("Error in showTopMoves:", e);
        }
    }
    
    // Update move history
    function updateMoveHistory() {
        try {
            const history = chess.history({ verbose: true });
            const historyElement = document.getElementById('move-history');
            if (!historyElement) return;
            
            historyElement.innerHTML = '';
            
            let moveHtml = '';
            
            for (let i = 0; i < history.length; i += 2) {
                const moveNumber = Math.floor(i / 2) + 1;
                let movePair = `${moveNumber}. ${history[i].san}`;
                
                if (i + 1 < history.length) {
                    movePair += ` ${history[i + 1].san}`;
                }
                
                moveHtml += `<div class="move-pair">${movePair}</div>`;
            }
            
            historyElement.innerHTML = moveHtml;
            historyElement.scrollTop = historyElement.scrollHeight; // Scroll to bottom
        } catch (e) {
            console.error("Error in updateMoveHistory:", e);
        }
    }
    
    // Save the current game
    function saveGame() {
        try {
            const gameData = {
                fen: chess.fen(),
                pgn: chess.pgn(),
                timestamp: new Date().toISOString()
            };
            
            const savedGames = JSON.parse(localStorage.getItem('savedChessGames') || '[]');
            savedGames.push(gameData);
            localStorage.setItem('savedChessGames', JSON.stringify(savedGames));
            
            alert('Game saved successfully!');
            loadSavedGames(); // Refresh the saved games list
        } catch (e) {
            console.error("Error saving game:", e);
            alert('Error saving game: ' + e.message);
        }
    }
    
    // Load a saved game
    function loadGame(index) {
        try {
            const savedGames = JSON.parse(localStorage.getItem('savedChessGames') || '[]');
            if (index >= savedGames.length) return;
            
            const gameData = savedGames[index];
            chess.load(gameData.fen);
            board.position(gameData.fen);
            engine.setFEN(gameData.fen);
            
            // Clear highlights
            if (window.clearHighlights) {
                window.clearHighlights();
            }
            
            // Update UI
            updateUI();
            
            try {
                document.getElementById('move-sound').play().catch(e => console.log("Sound error:", e));
            } catch (e) {
                console.log("Sound play error:", e);
            }
        } catch (e) {
            console.error("Error loading game:", e);
            alert('Error loading game: ' + e.message);
        }
    }
    
    // Load saved games list
    function loadSavedGames() {
        try {
            const savedGames = JSON.parse(localStorage.getItem('savedChessGames') || '[]');
            const savedGamesElement = document.getElementById('saved-games');
            if (!savedGamesElement) return;
            
            savedGamesElement.innerHTML = '';
            
            if (savedGames.length === 0) {
                savedGamesElement.innerHTML = '<p>No saved games yet.</p>';
                return;
            }
            
            savedGames.forEach((game, index) => {
                const date = new Date(game.timestamp);
                const formattedDate = `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                
                const gameElement = document.createElement('div');
                gameElement.className = 'saved-game';
                gameElement.textContent = `Game ${index + 1} - ${formattedDate}`;
                gameElement.dataset.index = index;
                
                gameElement.addEventListener('click', (e) => {
                    // Remove selected class from all games
                    document.querySelectorAll('.saved-game').forEach(el => {
                        el.style.backgroundColor = '#f0f0f0';
                    });
                    
                    // Add selected class to clicked game
                    e.target.style.backgroundColor = '#c0e0c0';
                    selectedGameIndex = index;
                });
                
                savedGamesElement.appendChild(gameElement);
            });
        } catch (e) {
            console.error("Error loading saved games:", e);
        }
    }
    
    // Add this function to initialize debugging and tests
    function initializeDebugging() {
        // Debug square mapping
        debugSquareMapping();
        
        // Test highlighting
        console.log("Testing square highlighting...");
        if (window.highlightMove) {
            window.highlightMove('e2', 'e4');
            
            // Wait 2 seconds and then highlight another move
            setTimeout(function() {
                if (window.clearHighlights) window.clearHighlights();
                window.highlightMove('g1', 'f3');
            }, 2000);
        }
    }

    // Add this function to check square representations
    function debugSquareMapping() {
        console.log("Checking chessboard square mapping...");
        const squares = document.querySelectorAll('[data-square]');
        
        if (squares.length === 0) {
            console.error("No squares with data-square attribute found on the board");
            return;
        }
        
        console.log(`Found ${squares.length} squares with data-square attributes`);
        
        // Create a map of all squares
        const squareMap = {};
        squares.forEach(square => {
            const notation = square.getAttribute('data-square');
            const rect = square.getBoundingClientRect();
            squareMap[notation] = {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            };
        });
        
        console.log("Square mapping:", squareMap);
        
        // Log the square mappings in a grid for easier visualization
        let boardGrid = '';
        for (let rank = 8; rank >= 1; rank--) {
            let rankRow = `${rank} `;
            for (let file = 'a'.charCodeAt(0); file <= 'h'.charCodeAt(0); file++) {
                const square = String.fromCharCode(file) + rank;
                rankRow += square in squareMap ? '[+]' : '[ ]';
            }
            boardGrid += rankRow + '\n';
        }
        boardGrid += '  a b c d e f g h';
        console.log("Board grid representation:\n" + boardGrid);
        
        // Check which squares have the correct data-square attribute
        let knownSquares = [];
        for (let rank = 1; rank <= 8; rank++) {
            for (let file = 'a'.charCodeAt(0); file <= 'h'.charCodeAt(0); file++) {
                knownSquares.push(String.fromCharCode(file) + rank);
            }
        }
        
        console.log("Known square notations:", knownSquares);
        const availableSquares = Array.from(document.querySelectorAll('[data-square]'))
            .map(el => el.getAttribute('data-square'));
        console.log("Available square notations:", availableSquares);
        
        // Find missing squares
        const missingSquares = knownSquares.filter(sq => !availableSquares.includes(sq));
        console.log("Missing squares:", missingSquares);
    }
    
    // Add this function to your connect.js file

    function showBestMove() {
        // Get the current player (needed for proper move selection)
        const currentPlayer = chess.turn() === 'w' ? 'white' : 'black';
        
        // Create or get the thinking indicator
        let thinkingIndicator = document.getElementById('thinking-indicator');
        if (!thinkingIndicator) {
            thinkingIndicator = document.createElement('div');
            thinkingIndicator.id = 'thinking-indicator';
            thinkingIndicator.className = 'thinking-indicator';
            
            // Add a spinner and text
            thinkingIndicator.innerHTML = `
                <div class="spinner"></div>
                <span>BetaFish thinking...</span>
            `;
            
            // Add to the info panel
            const infoPanel = document.querySelector('.info-panel');
            if (infoPanel) {
                // Insert at the top of the info panel
                infoPanel.insertBefore(thinkingIndicator, infoPanel.firstChild);
            }
        }
        
        // Show the thinking indicator
        thinkingIndicator.style.display = 'flex';
        
        // Update the engine's FEN
        engine.setFEN(chess.fen());
        
        // Set thinking time to 10 seconds for better moves
        engine.setThinkingTime(10);
        
        // Use setTimeout to allow the UI to update before starting calculation
        setTimeout(() => {
            // Get the best move (this is where the engine takes time)
            console.log("BetaFish is thinking...");
            const bestMove = engine.getBestMove();
            
            // Hide thinking indicator once calculation is done
            thinkingIndicator.style.display = 'none';
            
            // Use the move data to highlight the best move
            if (bestMove) {
                // Extract from and to squares
                const fromIdx = bestMove & 0x7F;
                const toIdx = (bestMove >> 7) & 0x7F;
                
                // Convert to algebraic notation
                const from = indexToNotation(fromIdx);
                const to = indexToNotation(toIdx);
                
                console.log(`Best move: ${from} to ${to}`);
                
                // Clear any previous highlights
                window.clearHighlights();
                
                // Highlight the move
                window.highlightMove(from, to);
                
                // Show arrow if function is available
                if (typeof drawArrow === 'function') {
                    drawArrow(from, to);
                    arrowShowing = true;
                }
                
                // Update display in analysis section
                const analysisElement = document.getElementById('analysis');
                if (analysisElement) {
                    // Get position evaluation
                    const evaluation = evaluatePosition();
                    analysisElement.textContent = `Best move: ${from} to ${to} | Evaluation: ${evaluation}`;
                }
            } else {
                console.error("No best move found");
            }
        }, 50); // Small delay to allow UI update
    }

    // Add this function to evaluate the position
    function evaluatePosition() {
        try {
            // Create a fresh engine for evaluation to avoid state issues
            const evalEngine = new betafishEngine();
            evalEngine.setFEN(chess.fen());
            
            // Use a short thinking time for evaluation
            evalEngine.setThinkingTime(0.5);
            
            // Get the top move and its score
            const topMoves = evalEngine.getTopMoves ? evalEngine.getTopMoves(1) : null;
            
            if (topMoves && topMoves.length > 0) {
                const score = topMoves[0].score / 100; // Convert centipawns to pawns
                
                // Format the evaluation string
                let evalText;
                if (Math.abs(score) < 0.1) {
                    evalText = "Even (0.0)";
                } else if (score > 0) {
                    evalText = `+${score.toFixed(1)} (White advantage)`;
                } else {
                    evalText = `${score.toFixed(1)} (Black advantage)`;
                }
                
                return evalText;
            } else {
                return "Evaluation not available";
            }
        } catch (e) {
            console.error("Error evaluating position:", e);
            return "Evaluation error";
        }
    }
    
    // Initialize UI after the board is created
    setTimeout(function() {
        try {
            // Force a board resize to ensure everything renders correctly
            if (board) {
                board.resize();
                console.log("Board resized");
            }
            
            // Initialize UI
            updateUI();
            loadSavedGames();
            
            // Attach event handlers to buttons
            const showHintButton = document.getElementById('show-hint');
            if (showHintButton) {
                showHintButton.addEventListener('click', function() {
                    // Get the current player color from chess.js
                    const currentPlayer = chess.turn(); // 'w' or 'b'
                    console.log("Show hint button clicked - current player:", currentPlayer);
                    
                    // Use our simple implementation that's guaranteed to work
                    if (window.simpleShowBestMove) {
                        window.simpleShowBestMove(engine, currentPlayer);
                    } else {
                        console.error("simpleShowBestMove function not found!");
                    }
                });
            }
            
            const resetBoardButton = document.getElementById('reset-board');
            if (resetBoardButton) {
                resetBoardButton.addEventListener('click', resetBoard);
            }
            
            const saveGameButton = document.getElementById('save-game');
            if (saveGameButton) {
                saveGameButton.addEventListener('click', saveGame);
            }
            
            const loadGameButton = document.getElementById('load-game-btn');
            if (loadGameButton) {
                loadGameButton.addEventListener('click', function() {
                    if (selectedGameIndex !== null) {
                        loadGame(selectedGameIndex);
                    } else {
                        alert('Please select a game to load first.');
                    }
                });
            }
            
            // Add keyboard navigation
            document.addEventListener('keydown', function(e) {
                if (e.key === 'ArrowLeft') {
                    // Undo move
                    chess.undo();
                    board.position(chess.fen());
                    engine.setFEN(chess.fen());
                    if (window.clearHighlights) {
                        window.clearHighlights();
                    }
                    updateUI();
                } else if (e.key === 'ArrowRight') {
                    // Show hint for next move
                    if (window.simpleShowBestMove) {
                        window.simpleShowBestMove(engine, chess.turn());
                    }
                } else if (e.key === 'r') {
                    // Reset board
                    resetBoard();
                } else if (e.key === 's') {
                    // Save game
                    saveGame();
                }
            });
            
            // After everything else is initialized...
            initializeDebugging();
            
            // Important: we need to make sure the call to initializeDebugging is executed
            // AFTER the chessboard has completely rendered
            console.log("Debug initialization complete");
            
            console.log("UI initialization complete");
        } catch (e) {
            console.error("Error in UI initialization:", e);
        }
    }, 200);
});