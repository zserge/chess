// PWA
if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

let level = 7;
let side = 'w';
let showHints = true;

const chess = new class extends Chess {
  constructor() {
    super();
    if (localStorage.getItem('pgn')) {
      this.load_pgn(localStorage.getItem('pgn'));
    }
    function save(cb) {
      return function() {
        cb.apply(this, arguments);
        localStorage.setItem('pgn', this.pgn());
      };
    };
    this.move = save(this.move);
    this.reset = save(this.reset);
  }
};

const board = new class extends ChessBoard {
  constructor() {
    super(
      document.querySelector('.chessboard'),
      ['selected', 'opponent-from', 'opponent-to', 'moves', 'hint'],
    );
    this.render(chess.fen());
    window.addEventListener('resize', () => this.render());
    this.from = undefined;
    this.promise = undefined;
  }
  wait(cb) {
    this.from = undefined;
    this.promise = cb;
  }
  onclick(sq) {
    // If UI move is not expected - ignore clicks
    if (!this.promise) {
      return;
    }

    // On first click: select square if it's a valid move
    if (!this.from) {
      const moves = chess.moves({square: sq, verbose: true});
      if (moves.length > 0) {
        this.from = sq;
        stockfish.cancel();
        this.unmarkAll();
        this.mark(sq, 'selected');
        moves.forEach(m => this.mark(m.to, 'moves'));
        this.render();
      }
      return;
    }
    // On second click on the same square: unselect it
    if (sq === this.from) {
      this.from = undefined;
      this.unmarkAll();
      this.render();
      return;
    }
    // If second click is not the same square, but another piece: select it
    const clickedPiece = chess.get(sq);
    const selectedPiece = chess.get(this.from);
    if (clickedPiece && (clickedPiece.color === selectedPiece.color)) {
      const moves = chess.moves({square: sq, verbose: true});
      if (moves.length > 0) {
        this.from = sq;
        this.unmarkAll();
        this.mark(sq, 'selected');
        moves.forEach(m => this.mark(m.to, 'moves'));
        this.render();
      }
      return;
    }
    // Check if move is legal
    const move = chess.moves({square: this.from, verbose: true}).filter(m => m.from === this.from && m.to === sq);
    if (move.length === 0) {
      return;
    }

    this.unmarkAll();
    const p = this.promise;
    this.promise = undefined;
    p(move[0]);
  }
};

const stockfish = new class {
  constructor() {
    this.wasm = new Worker('stockfish.wasm.js');
  }
  analyze(fen, moves, level, cb) {
    const wasm = this.wasm;
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
            cb(moves[i]);
            return;
          }
        }
        cb();
      }
    };
    const skill = Math.max(0, Math.min(level, 20));
    const errorProbability = Math.round((skill * 6.35) + 1);
    const maxError = Math.round((skill * -0.5) + 10);
    wasm.postMessage(`position fen ${fen}`);
    wasm.postMessage(`setoption name Skill Level value ${skill}`);
    wasm.postMessage(`setoption name Skill Level Maximum Error value ${maxError}`);
    wasm.postMessage(`setoption name Skill Level Probability value ${errorProbability}`);
    wasm.postMessage('go movetime 1000');
  }
  cancel() {
    this.wasm.postMessage('stop');
  }
};

function step() {
  board.render(chess.fen());
  if (chess.game_over()) {
    promptRestart('.dialog-content-game-over');
    return;
  }
  let move;
  if (chess.turn() === side || level < 0) {
    if (showHints && chess.fen() !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
      const startFEN = chess.fen();
      stockfish.analyze(chess.fen(), chess.moves({verbose: true}), 20, hint => {
        if (hint && chess.fen() === startFEN) {
          board.mark(hint.from, 'hint');
          board.render();
        }
      });
    }
    board.wait(move => {
      chess.move(move);
      step();
    })
  } else {
    stockfish.analyze(chess.fen(), chess.moves({verbose: true}), level, move => {
      chess.move(move);
      board.mark(move.from, 'opponent-from');
      board.mark(move.to, 'opponent-to');
      board.render();
      step();
    });
  }
}

class Dialog {
  constructor(content) {
    this.overlay = document.createElement('div');
    this.dialog = document.createElement('div');

    this.overlay.className = 'overlay';
    this.dialog.className = 'dialog';

    this.overlay.onclick = () => {
      this.oncancel();
      this.hide();
    };

    this.dialog.onclick = (e) => { e.stopPropagation(); };

    this.content = content.cloneNode(true);
    this.dialog.appendChild(this.content);
    this.overlay.appendChild(this.dialog);
  }
  show() {
    if (this.shown) {
      return;
    }
    this.shown = true;
    document.body.appendChild(this.overlay);
    this.oninit(this.content, this);
  }
  hide() {
    if (this.shown) {
      document.body.removeChild(this.overlay);
      this.shown = false;
    }
  }
  oninit() {}
  oncancel() {}
}

function promptRestart(content) {
  const d = new Dialog(document.querySelector(content || '.dialog-content-restart'));
  d.oninit = (el) => {
    el.querySelector('.dialog-button-ok').onclick = () => {
      d.hide();
      board.unmarkAll();
      chess.reset();
      step();
    };
    el.querySelector('.dialog-button-cancel').onclick = () => d.hide();
  };
  d.show();
}

function promptLevel() {
  const d = new Dialog(document.querySelector('.dialog-content-level'));
  d.oninit = (el) => {
    const levels = {
      'human': -1,
      'easy': 0,
      'normal': 7,
      'hard': 13,
      'extreme': 20,
    };
    for (let name in levels) {
      const btn = el.querySelector('.level-' + name);
      if (levels[name] === level) {
        btn.classList.add('selected');
      }
      btn.onclick = (e) => {
        for (let name in levels) {
          el.querySelector('.level-' + name).classList.remove('selected');
        }
        btn.classList.add('selected');
        e.preventDefault();
        e.stopPropagation();
        level = levels[name];
      };
    };

    el.querySelector('.show-hints').checked = showHints;
    el.querySelector('.show-hints').onchange = function(e) {
      e.preventDefault();
      e.stopPropagation();
      showHints = this.checked;
    };

    el.querySelector('.dialog-button-ok').onclick = () => {
      d.hide();
    };
  };
  d.show();
}

function undoLastStep() {
  board.unmarkAll();
  chess.undo();
  chess.undo();
  step();
}

function swapSides() {
  side = (side === 'w' ? 'b' : 'w');
  if (side === 'w') {
    document.querySelector('.chessboard').classList.remove('flipped');
  } else {
    document.querySelector('.chessboard').classList.add('flipped');
  }
  board.unmarkAll();
  step();
}

document.querySelector('.btn-level').onclick = promptLevel;
document.querySelector('.btn-swap').onclick = swapSides;
document.querySelector('.btn-undo').onclick = undoLastStep;
document.querySelector('.btn-restart').onclick = () => promptRestart();

step();

