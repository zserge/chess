// PWA
if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

let uiPromise;
let level = 1;
let side = 'w';
let showHints = true;

const wasm = new Worker('stockfish.wasm.js');

const chess = new Chess();
if (localStorage.getItem('pgn')) {
  chess.load_pgn(localStorage.getItem('pgn'));
}

let from;

const board = new ChessBoard(
  document.querySelector('.chessboard'),
  ['selected', 'opponent-from', 'opponent-to', 'moves', 'hint'],
  (sq) => {
    // If UI move is not expected - ignore clicks
    if (!uiPromise) {
      return;
    }

    // On first click: select square if it's a valid move
    if (!from) {
      const moves = chess.moves({square: sq, verbose: true});
      if (moves.length > 0) {
        from = sq;
        wasm.postMessage('stop');
        board.unmarkAll();
        board.mark(sq, 'selected');
        moves.forEach(m => board.mark(m.to, 'moves'));
        board.render();
      }
      return;
    }
    // On second click on the same square: unselect it
    if (sq === from) {
      from = undefined;
      board.unmarkAll();
      board.render();
      return;
    }
    // If second click is not the same square, but another piece: select it
    const clickedPiece = chess.get(sq);
    const selectedPiece = chess.get(from);
    if (clickedPiece && (clickedPiece.color === selectedPiece.color)) {
      const moves = chess.moves({square: sq, verbose: true});
      if (moves.length > 0) {
        from = sq;
        board.unmarkAll();
        board.mark(sq, 'selected');
        moves.forEach(m => board.mark(m.to, 'moves'));
        board.render();
      }
      return;
    }
    // Check if move is legal
    const move = chess.moves({square: from, verbose: true}).filter(m => m.from === from && m.to === sq);
    if (move.length === 0) {
      return;
    }

    board.unmarkAll();
    const p = uiPromise;
    uiPromise = undefined;
    p(move[0]);
  },
);
board.render(chess.fen());
window.addEventListener('resize', () => board.render());

const stockfish = (fen, moves, level) => new Promise((resolve, reject) => {
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

function step() {
  board.render(chess.fen());
  localStorage.setItem('pgn', chess.pgn());
  if (chess.game_over()) {
    dialog('game-over', (restart) => {
      if (restart) {
        restartGame();
      }
    });
    return;
  }
  let move;
  if (chess.turn() === side || level === 0) {
    if (showHints && chess.fen() !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
      const startFEN = chess.fen();
      stockfish(chess.fen(), chess.moves({verbose: true}), 20).then(hint => {
        if (hint && chess.fen() === startFEN) {
          board.mark(hint.from, 'hint');
          board.render();
        }
      });
    }
    from = undefined;
    uiPromise = move => {
      chess.move(move);
      step();
    }
  } else {
    let lvl = {
      1: 0,
      2: 7,
      3: 20,
    }[level];
    stockfish(chess.fen(), chess.moves({verbose: true}), lvl).then(move => {
      chess.move(move);
      board.mark(move.from, 'opponent-from');
      board.mark(move.to, 'opponent-to');
      board.render();
      step();
    });
  }
}

function dialog(content, cb) {
  const overlay = document.querySelector('.overlay');
  const dialog = overlay.querySelector('.dialog');
  const hide = () => {
    overlay.style.display = 'none';
    dialog.querySelectorAll('.dialog-content').forEach(el => {
      el.style.display = 'none';
    })
  };
  overlay.style.display = 'flex';
  dialog.querySelectorAll('.dialog-content').forEach(el => {
    el.style.display = 'none';
  })
  overlay.onclick = () => {
    cb();
    hide();
  };
  dialog.querySelector(`.dialog-content-${content}`).style.display = 'block';
  dialog.querySelectorAll('.dialog-button').forEach(el => {
    el.onclick = () => {
      cb(el.getAttribute('data-dialog'));
      hide();
    }
  });
}

function undoLastStep() {
  board.unmarkAll();
  chess.undo();
  chess.undo();
  step();
}

function restartGame() {
  board.unmarkAll();
  chess.reset();
  step();
}

document.querySelector('.btn-level').onclick = () => dialog('level', (n) => {
  if (n) {
    if (n === 'human') {
      level = 0;
    } else {
      level = +n;
    }
  }
});

document.querySelector('.btn-swap').onclick = () => {
  side = (side === 'w' ? 'b' : 'w');
  if (side === 'w') {
    document.querySelector('.chessboard').classList.remove('flipped');
  } else {
    document.querySelector('.chessboard').classList.add('flipped');
  }
  board.unmarkAll();
  step();
}
document.querySelector('.btn-undo').onclick = () => undoLastStep();
document.querySelector('.btn-restart').onclick = () => dialog('restart', restart => {
  if (restart) {
    restartGame();
  }
});

step();

