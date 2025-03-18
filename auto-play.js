document.addEventListener('DOMContentLoaded', function() {
    console.log('Auto-play module loaded');
    
    // State variables
    let isAutoPlaying = false;
    let autoPlayTimer = null;
    let autoPlayDelay = 1500; // Default delay between moves (ms)
    
    // Create and append the auto-play button
    function createAutoPlayButton() {
        // Create container
        const container = document.createElement('div');
        container.className = 'auto-play-container';
        
        // Create button
        const button = document.createElement('button');
        button.id = 'auto-play-button';
        button.textContent = 'Start Auto Play';
        button.className = 'auto-play-button';
        button.addEventListener('click', toggleAutoPlay);
        
        // Create speed control
        const speedControl = document.createElement('div');
        speedControl.className = 'speed-control';
        
        const speedLabel = document.createElement('label');
        speedLabel.textContent = 'Move Speed:';
        
        const speedSelect = document.createElement('select');
        speedSelect.id = 'auto-play-speed';
        
        const speeds = [
            { value: 3000, label: 'Slow (3s)' },
            { value: 1500, label: 'Medium (1.5s)' },
            { value: 800, label: 'Fast (0.8s)' }
        ];
        
        speeds.forEach(speed => {
            const option = document.createElement('option');
            option.value = speed.value;
            option.textContent = speed.label;
            if (speed.value === 1500) option.selected = true;
            speedSelect.appendChild(option);
        });
        
        speedSelect.addEventListener('change', function() {
            autoPlayDelay = parseInt(this.value);
            console.log('Auto play speed set to:', autoPlayDelay + 'ms');
        });
        
        // Assemble UI
        speedControl.appendChild(speedLabel);
        speedControl.appendChild(speedSelect);
        container.appendChild(button);
        container.appendChild(speedControl);
        
        // Find a place to insert the button
        const infoPanel = document.querySelector('.info-panel');
        if (infoPanel) {
            infoPanel.appendChild(container);
            console.log('Auto-play button added to info panel');
        } else {
            // Fallback to inserting after the board container
            const boardContainer = document.querySelector('.board-container');
            if (boardContainer && boardContainer.parentNode) {
                boardContainer.parentNode.insertBefore(container, boardContainer.nextSibling);
                console.log('Auto-play button added after board container');
            } else {
                // Last resort
                document.body.appendChild(container);
                console.log('Auto-play button added to body');
            }
        }
    }
    
    // Toggle auto-play on/off
    function toggleAutoPlay() {
        if (isAutoPlaying) {
            stopAutoPlay();
        } else {
            startAutoPlay();
        }
    }
    
    // Start auto-play
    function startAutoPlay() {
        console.log('Starting auto play...');
        
        // Check if chess.js is available
        if (!window.chess) {
            console.error('Cannot start auto-play: chess instance not found');
            alert('Cannot start auto-play: chess instance not found');
            return;
        }
        
        isAutoPlaying = true;
        updateButtonState();
        
        // Start the auto-play loop
        autoPlayLoop();
    }
    
    // Stop auto-play
    function stopAutoPlay() {
        console.log('Stopping auto play...');
        
        isAutoPlaying = false;
        updateButtonState();
        
        // Clear any scheduled moves
        if (autoPlayTimer) {
            clearTimeout(autoPlayTimer);
            autoPlayTimer = null;
        }
    }
    
    // Update the button appearance based on state
    function updateButtonState() {
        const button = document.getElementById('auto-play-button');
        if (!button) return;
        
        if (isAutoPlaying) {
            button.textContent = 'Stop Auto Play';
            button.classList.add('active');
        } else {
            button.textContent = 'Start Auto Play';
            button.classList.remove('active');
        }
    }
    
    // Main auto-play loop
    function autoPlayLoop() {
        if (!isAutoPlaying) return;
        
        // Check if game is over
        if (window.chess && window.chess.game_over()) {
            console.log('Game over - stopping auto play');
            stopAutoPlay();
            return;
        }
        
        // Make a smart move instead of a random one
        if (makeSmartMove()) {
            // Schedule next move if move was successful
            autoPlayTimer = setTimeout(autoPlayLoop, autoPlayDelay);
        } else {
            // Stop if we couldn't make a move
            console.error('Failed to make smart move');
            stopAutoPlay();
        }
    }
    
    // Get pieceTheme URL from the board if available
    function getPieceThemeUrl() {
        // Check for pieceTheme in board config
        if (window.board && window.board.pieceTheme) {
            return window.board.pieceTheme;
        }
        
        // Default from chessboardjs
        return 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png';
    }
    
    // Make a smart move
    function makeSmartMove() {
        if (!window.chess) {
            console.error('Chess.js instance not found');
            return false;
        }
        
        try {
            // Create a fresh engine instance to prevent state issues
            const smartEngine = new betafishEngine();
            
            // Set current position
            smartEngine.setFEN(window.chess.fen());
            
            // Set a higher thinking time for stronger play
            smartEngine.setThinkingTime(3);  // 3 seconds for consistent quality with the hint button
            
            // Get the best move from the engine
            const bestMove = smartEngine.getBestMove();
            
            if (!bestMove) {
                console.error('No valid move found');
                return false;
            }
            
            // Extract from and to squares using the functions from connect.js
            const fromIndex = bestMove & 0x7f;
            const toIndex = (bestMove >> 7) & 0x7f;
            
            // Convert to algebraic notation
            const from = indexToNotation(fromIndex);
            const to = indexToNotation(toIndex);
            
            console.log(`Making smart move: ${from} to ${to}`);
            
            // Make the move on the board
            const move = window.chess.move({
                from: from,
                to: to,
                promotion: 'q'  // Always promote to queen
            });
            
            if (move) {
                // Update the board
                window.board.position(window.chess.fen());
                
                // Highlight the move
                if (window.highlightMove) {
                    window.highlightMove(from, to);
                }
                
                // Play sound
                playMoveSound(move);
                
                return true;
            } else {
                console.error('Chess.js rejected the move');
                return false;
            }
        } catch (error) {
            console.error('Error making smart move:', error);
            return false;
        }
    }
    
    // Add a function to convert index to notation
    function indexToNotation(index) {
        if (index < 0 || index > 63) {
            console.error("Invalid square index:", index);
            return null;
        }
        
        // BetaFish uses a8=0, h1=63 mapping
        const file = String.fromCharCode(97 + (index % 8));  // 97 is ASCII 'a'
        const rank = 8 - Math.floor(index / 8);
        
        return file + rank;
    }
    
    // Play appropriate sound based on move type
    function playMoveSound(move) {
        try {
            // Determine which sound to play
            let sound;
            
            if (window.chess.in_check()) {
                // Check sound
                sound = document.getElementById('check-sound');
            } else if (move.flags && move.flags.includes('c')) {
                // Capture sound
                sound = document.getElementById('capture-sound');
            } else {
                // Regular move sound
                sound = document.getElementById('move-sound');
            }
            
            // Play the sound if it exists
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(e => {});
            }
        } catch (e) {
            console.warn('Error playing sound:', e);
        }
    }
    
    // Complete redraw of the board manually based on the FEN
    function updateBoardManually(fen) {
        try {
            // Parse the FEN string to get piece positions
            const fenBoard = fen.split(' ')[0];
            const rows = fenBoard.split('/');
            
            // Get all squares
            const squares = document.querySelectorAll('.square-55d63');
            if (!squares || squares.length === 0) {
                console.error('No board squares found');
                return;
            }
            
            // Get the piece theme URL format
            const pieceTheme = getPieceThemeUrl();
            
            // Clear all pieces - this ensures we don't have any stray pieces
            squares.forEach(square => {
                const pieces = square.querySelectorAll('.piece-417db');
                pieces.forEach(piece => piece.remove());
            });
            
            // Map each square to its DOM element
            const squareMap = {};
            squares.forEach(square => {
                const dataSquare = square.getAttribute('data-square');
                if (dataSquare) {
                    squareMap[dataSquare] = square;
                }
            });
            
            // Place pieces according to FEN
            let rank = 8;
            
            rows.forEach(row => {
                let file = 0;
                
                for (let i = 0; i < row.length; i++) {
                    const char = row.charAt(i);
                    
                    if (/[1-8]/.test(char)) {
                        // Skip empty squares
                        file += parseInt(char);
                    } else {
                        // Determine piece details
                        const square = String.fromCharCode(97 + file) + rank;
                        const squareEl = squareMap[square];
                        
                        if (squareEl) {
                            // Determine piece type and color
                            let pieceType = char.toLowerCase();
                            let pieceColor = char === char.toUpperCase() ? 'w' : 'b';
                            
                            // Create the piece element using image
                            const pieceEl = document.createElement('img');
                            pieceEl.className = 'piece-417db';
                            pieceEl.src = pieceTheme.replace('{piece}', pieceColor + pieceType.toUpperCase());
                            pieceEl.style.width = '100%';
                            pieceEl.style.height = '100%';
                            pieceEl.style.position = 'absolute';
                            pieceEl.style.top = '0';
                            pieceEl.style.left = '0';
                            pieceEl.draggable = true;
                            
                            // Add to the square
                            squareEl.appendChild(pieceEl);
                        }
                        
                        file++;
                    }
                }
                
                rank--;
            });
            
            console.log('Board successfully updated manually');
        } catch (e) {
            console.error('Error in manual board update:', e);
        }
    }
    
    // Add the auto-play button to the page with a delay to ensure everything is loaded
    setTimeout(createAutoPlayButton, 1000);
    
    // Expose functions to global scope
    window.autoPlay = {
        start: startAutoPlay,
        stop: stopAutoPlay,
        toggle: toggleAutoPlay
    };
    
    console.log('Auto-play module initialized');
});