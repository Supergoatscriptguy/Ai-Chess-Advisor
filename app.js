/**
 * Chess Advisor - Main Application
 */

(function() {
    'use strict';

    let chess = null;
    let engine = null;
    let board = null;

    document.addEventListener('DOMContentLoaded', initializeApp);

    function initializeApp() {
        if (typeof Chess === 'undefined' || typeof Chessboard === 'undefined' || typeof betafishEngine === 'undefined') {
            return;
        }

        chess = new Chess();
        window.chess = chess;

        engine = betafishEngine();
        engine.setThinkingTime(2);

        try {
            board = Chessboard('board', {
                position: 'start',
                draggable: true,
                showNotation: false,
                pieceTheme: 'https://lichess1.org/assets/piece/cburnett/{piece}.svg',
                onDragStart: onDragStart,
                onDrop: onDrop,
                onSnapEnd: onSnapEnd
            });
        } catch (error) {
            return;
        }

        setTimeout(function() {
            if (board) board.resize();
            attachEventHandlers();
        }, 100);
    }

    function onDragStart(source, piece) {
        if (chess.game_over()) return false;
        if ((chess.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (chess.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
        clearHighlights();
        return true;
    }

    function onDrop(source, target) {
        clearHighlights();

        const move = chess.move({
            from: source,
            to: target,
            promotion: 'q'
        });

        if (move === null) return 'snapback';

        playMoveSound(move);
        engine.setFEN(chess.fen());
        updateMoveHistory();

        return true;
    }

    function onSnapEnd() {
        board.position(chess.fen());
    }

    function playMoveSound(move) {
        try {
            let soundId = 'move-sound';
            if (move && move.captured) {
                soundId = 'capture-sound';
            } else if (chess.in_check()) {
                soundId = 'check-sound';
            }
            const sound = document.getElementById(soundId);
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(function() {});
            }
        } catch (e) {}
    }

    function highlightMove(from, to) {
        clearHighlights();
        if (!from || !to) return;

        const fromSquare = document.querySelector('[data-square="' + from + '"]');
        const toSquare = document.querySelector('[data-square="' + to + '"]');

        if (fromSquare) fromSquare.classList.add('highlight-from');
        if (toSquare) toSquare.classList.add('highlight-to');
    }

    function clearHighlights() {
        document.querySelectorAll('.highlight-from, .highlight-to').forEach(function(sq) {
            sq.classList.remove('highlight-from', 'highlight-to');
        });
    }

    window.highlightMove = highlightMove;
    window.clearHighlights = clearHighlights;

    // BetaFish uses 120-square board: a1=21, h1=28, a8=91, h8=98
    function sq120ToAlgebraic(sq120) {
        const file = (sq120 % 10) - 1;  // 0-7 for a-h
        const rank = Math.floor(sq120 / 10) - 2;  // 0-7 for ranks 1-8

        if (file < 0 || file > 7 || rank < 0 || rank > 7) {
            return null;
        }

        return String.fromCharCode(97 + file) + (rank + 1);
    }

    function decodeBetafishMove(move) {
        // BetaFish move encoding: from in bits 0-6, to in bits 7-13
        const fromSq = move & 0x7F;
        const toSq = (move >> 7) & 0x7F;

        return {
            from: sq120ToAlgebraic(fromSq),
            to: sq120ToAlgebraic(toSq)
        };
    }

    function analyzeAndShow() {
        const analysisEl = document.getElementById('analysis');
        const moveListEl = document.getElementById('top-moves-list');

        if (analysisEl) {
            analysisEl.textContent = 'Analyzing...';
        }
        if (moveListEl) {
            moveListEl.innerHTML = '<li style="color: #666;">Calculating...</li>';
        }

        // Use setTimeout to allow UI to update before heavy computation
        setTimeout(function() {
            try {
                engine.setFEN(chess.fen());
                engine.setThinkingTime(2);

                // Get best move and show it
                const bestMove = engine.getBestMove();

                if (bestMove) {
                    const decoded = decodeBetafishMove(bestMove);
                    if (decoded.from && decoded.to) {
                        highlightMove(decoded.from, decoded.to);
                    }
                }

                // Get evaluation
                const eval_result = engine.evaluate(chess.fen());
                const score = eval_result.score / 100;

                if (analysisEl) {
                    let scoreText = score > 0 ? '+' + score.toFixed(1) : score.toFixed(1);
                    let advantage = 'Even';
                    if (score > 0.5) advantage = 'White is better';
                    else if (score < -0.5) advantage = 'Black is better';
                    analysisEl.textContent = 'Evaluation: ' + scoreText + ' (' + advantage + ')';
                }

                // Get top moves
                const topMoves = engine.getTopMoves(3);

                if (moveListEl && topMoves && topMoves.length > 0) {
                    moveListEl.innerHTML = '';

                    topMoves.forEach(function(moveInfo, index) {
                        const decoded = decodeBetafishMove(moveInfo.move);
                        if (!decoded.from || !decoded.to) return;

                        const moveScore = moveInfo.score / 100;
                        const li = document.createElement('li');
                        li.textContent = (index + 1) + '. ' + decoded.from + decoded.to + ' (' + (moveScore > 0 ? '+' : '') + moveScore.toFixed(1) + ')';

                        li.addEventListener('click', function() {
                            highlightMove(decoded.from, decoded.to);
                        });

                        moveListEl.appendChild(li);
                    });
                }
            } catch (e) {
                if (analysisEl) {
                    analysisEl.textContent = 'Analysis error';
                }
            }
        }, 50);
    }

    function updateMoveHistory() {
        try {
            const history = chess.history({ verbose: true });
            const historyEl = document.getElementById('move-history');
            if (!historyEl) return;

            let html = '';
            for (let i = 0; i < history.length; i += 2) {
                const num = Math.floor(i / 2) + 1;
                let pair = num + '. ' + history[i].san;
                if (i + 1 < history.length) {
                    pair += ' ' + history[i + 1].san;
                }
                html += '<div class="move-pair">' + pair + '</div>';
            }

            historyEl.innerHTML = html;
            historyEl.scrollTop = historyEl.scrollHeight;
        } catch (e) {}
    }

    function resetBoard() {
        chess.reset();
        board.position('start');
        engine.setFEN(chess.fen());
        clearHighlights();
        updateMoveHistory();

        const analysisEl = document.getElementById('analysis');
        const moveListEl = document.getElementById('top-moves-list');
        if (analysisEl) analysisEl.textContent = 'Click "Show Best Move" to analyze';
        if (moveListEl) moveListEl.innerHTML = '<li style="color: #666;">Click "Show Best Move" to see suggestions</li>';

        playMoveSound({});
    }

    function attachEventHandlers() {
        const showHintBtn = document.getElementById('show-hint');
        if (showHintBtn) {
            showHintBtn.addEventListener('click', analyzeAndShow);
        }

        const resetBtn = document.getElementById('reset-board');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetBoard);
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft') {
                chess.undo();
                board.position(chess.fen());
                engine.setFEN(chess.fen());
                clearHighlights();
                updateMoveHistory();
            } else if (e.key === 'ArrowRight') {
                analyzeAndShow();
            } else if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
                resetBoard();
            }
        });

        document.addEventListener('mousedown', function(e) {
            if (e.target.classList.contains('piece-417db')) {
                clearHighlights();
            }
        }, true);
    }

})();
