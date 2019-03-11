let uiPromise;
let level = 1;
let side = 'w';
let showHints = true;

const chess = new Chess();
if (localStorage.getItem('pgn')) {
  chess.load_pgn(localStorage.getItem('pgn'));
}

const board = new ChessBoard('chess-board', {
  fen: chess.fen(),
  maxSquareSize: 96,
  onSquareClick: (sq, sel) => {
    if (!uiPromise) {
      return;
    }

    // On first click: select square if it's a valid move
    if (sel.length === 0) {
      const moves = chess.moves({square: sq, verbose: true});
      if (moves.length > 0) {
        document.querySelectorAll('.opponent').forEach(el => el.classList.remove('opponent'));
        document.querySelectorAll('.hint').forEach(el => el.classList.remove('hint'));
        board.selectSquare(sq);
        moves.forEach(m => board.selectSquare(m.to));
      }
      return;
    }
    // On second click on the same square: unselect it
    const from = sel[0];
    if (sq === from) {
      board.unselectAllSquares(sq);
      return;
    }
    board.unselectAllSquares(from);
    // If second click is not the same square, but another piece: select it
    const clickedPiece = chess.get(sq);
    const selectedPiece = chess.get(from);
    if (clickedPiece && (clickedPiece.color === selectedPiece.color)) {
      board.selectSquare(sq);
      return;
    }
    // Check if move is legal
    const move = chess.moves({square: from, verbose: true}).filter(m => m.from === from && m.to === sq);
    if (move.length === 0) {
      return;
    }

    document.querySelectorAll('.hint').forEach(el => el.classList.remove('hint'));
    uiPromise(move[0]);
    uiPromise = undefined;
  },
});

const ui = () => new Promise(resolve => {
  uiPromise = resolve;
});

const stockfish = (() => {
  const wasm = new Worker('stockfish.wasm.js');
  return (fen, moves, level) => new Promise((resolve, reject) => {
    wasm.onmessage = (e) => {
      if (!e || !e.data) {
        return;
      }
      let best = e.data.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbk])?/)
      if (best) {
        let from = best[1];
        let to = best[2];
        for (let i = 0; i < moves.length; i++) {
          if (moves[i].from == from && moves[i].to == to) {
            resolve(moves[i]);
            return;
          }
        }
        resolve();
      }
    };
    const skill = Math.max(0, Math.min(level, 20));
    const errorProbability = Math.round((skill * 6.35) + 1);
    const maxError = Math.round((skill * -0.5) + 10);
    wasm.postMessage(`position fen ${fen}`);
    wasm.postMessage(`setoption name Skill Level value ${skill}`);
    wasm.postMessage(`setoption name Skill Level Maximum Error value ${maxError}`);
    wasm.postMessage(`setoption name Skill Level Probability value ${errorProbability}`);
    wasm.postMessage('go movetime 500');
  });
})();

function render() {
  board.setPosition(chess.fen());
  document.querySelectorAll('.opponent').forEach(el => el.classList.remove('opponent'));
  document.querySelectorAll('.hint').forEach(el => el.classList.remove('hint'));
  if (chess.in_check()) {
    document.querySelector(`.${chess.turn()}K`).classList.add('check');
  } else {
    document.querySelectorAll('.check').forEach(el => el.classList.remove('check'));
  }
  console.log(chess.pgn());
  localStorage.setItem('pgn', chess.pgn());
}

function step() {
  if (chess.game_over()) {
    console.log('game over');
    return;
  }
  let move;
  if ((chess.turn() === 'w' && level >= 0) || (chess.turn() === 'b' && level <= 0)) {
    if (showHints && chess.fen() !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
      const startFEN = chess.fen();
      stockfish(chess.fen(), chess.moves({verbose: true}), 10).then(hint => {
        if (hint && chess.fen() === startFEN) {
          document.querySelector(`[data-square='${hint.from}']`).classList.add('hint');
        }
      });
    }
    ui().then(move => {
      chess.move(move);
      render();
      step();
    });
  } else {
    let lvl = {
      1: 0,
      2: 7,
      3: 20,
    }[Math.abs(level)];
    stockfish(chess.fen(), chess.moves({verbose: true}), lvl).then(move => {
      chess.move(move);
      render();
      document.querySelector(`[data-square='${move.from}']`).classList.add('opponent');
      document.querySelector(`[data-square='${move.to}']`).classList.add('opponent');
      step();
    });
  }
}

document.querySelector('.btn-level-0').onclick = () => level = 0;
document.querySelector('.btn-level-1').onclick = () => level = (side === 'w' ? 1 : -1);
document.querySelector('.btn-level-2').onclick = () => level = (side === 'w' ? 2 : -2);
document.querySelector('.btn-level-3').onclick = () => level = (side === 'w' ? 3 : -3);
document.querySelector('.btn-swap').onclick = () => {
  side = (side === 'w' ? 'b' : 'w');
  if (side === 'w') {
    document.querySelector('.chessboard').classList.remove('flipped');
  } else {
    document.querySelector('.chessboard').classList.add('flipped');
  }
  level = (side === 'w' ? 1 : -1) * Math.abs(level);
  render();
  step();
}
document.querySelector('.btn-undo').onclick = () => {
  chess.undo();
  chess.undo();
  render();
  step();
}
document.querySelector('.btn-restart').onclick = () => {
  chess.reset();
  render();
  step();
};

step();
