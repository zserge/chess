class ChessBoard {
  constructor(el, marks, cb) {
    this.el = el;
    this.cb = cb;
    this.squareSize = 0;
    this.board = {};
    this.marks = {};
    this.fen = '8/8/8/8/8/8/8/8';
    // Create internal board layout
    for (let r = 8; r >= 1; r--) {
      const row = document.createElement('div');
      row.classList.add('row');
      row.style.display = 'flex';
      this.board[r] = { el: row };
      for (let c = 0; c < 8; c++) {
        // Create square cell
        const coord = 'abcdefgh'[c] + r;
        const square = document.createElement('a');
        square.classList.add('square');
        square.classList.add(`square-${coord}`);
        square.style.position = 'relative';
        square.onclick = () => cb(coord, square);

        this.board[r][c] = { el: square, marks: {} };

        // Add several mark divs for various purposes
        this.marks[coord] = {};
        marks.forEach(name => {
          const mark = document.createElement('div');
          mark.classList.add('marks');
          mark.classList.add(name);
          mark.style.position = 'absolute';
          mark.style.opacity = '0';
          this.marks[coord][name] = false;
          this.board[r][c].marks[name] = mark;
          square.appendChild(mark);
        });

        // Create chess piece placeholder
        const piece = document.createElement('div');
        piece.classList.add('piece');
        piece.style.position = 'absolute';
        piece.style.width = '100%';
        piece.style.height = '100%';
        this.board[r][c].piece = piece;
        square.appendChild(piece);
        row.appendChild(square);
      }
      el.appendChild(row);
    }
    this.render();
  }
  render(fen) {
    if (fen !== undefined) {
      this.fen = fen;
    }
    // Update board size if needed
    const style = getComputedStyle(this.el.parentNode);
    const w =
      parseFloat(style.width) -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    if (this.squareSize !== w / 8) {
      this.squareSize = w / 8;
      for (let r = 8; r >= 1; r--) {
        for (let c = 0; c < 8; c++) {
          this.board[r][c].el.style.width = `${this.squareSize}px`;
          this.board[r][c].el.style.height = `${this.squareSize}px`;
          this.board[r][c].piece.style.backgroundSize = `${6 *
            this.squareSize}px`;
        }
      }
    }

    // Render FEN
    const bg = {
      P: '0 0',
      B: `${-1 * this.squareSize}px 0`,
      N: `${-2 * this.squareSize}px 0`,
      R: `${-3 * this.squareSize}px 0`,
      Q: `${-4 * this.squareSize}px 0`,
      K: `${-5 * this.squareSize}px 0`,
      p: `0 ${-1 * this.squareSize}px`,
      b: `${-1 * this.squareSize}px ${-1 * this.squareSize}px`,
      n: `${-2 * this.squareSize}px ${-1 * this.squareSize}px`,
      r: `${-3 * this.squareSize}px ${-1 * this.squareSize}px`,
      q: `${-4 * this.squareSize}px ${-1 * this.squareSize}px`,
      k: `${-5 * this.squareSize}px ${-1 * this.squareSize}px`,
      '.': `0 ${-6 * this.squareSize}px`,
    };
    const rows = this.fen.split(' ')[0].split('/');
    for (let r = 0; r < 8; r++) {
      rows[r] = rows[r].replace(/\d/g, number => '.'.repeat(number));
      for (let c = 0; c < 8; c++) {
        const coord = 'abcdefgh'[c] + (8-r);
        for (let mark in this.marks[coord]) {
          this.board[8-r][c].marks[mark].style.opacity = this.marks[coord][mark] ? '1' : '0';
        }
        this.board[8 - r][c].piece.style.backgroundPosition = bg[rows[r][c]];
      }
    }
  }
  mark(coord, mark) { this.marks[coord][mark] = true; }
  unmark(corrd, mark) { this.marks[coord][mark] = false; }
  unmarkAll(mark) {
    for (let coord in this.marks) {
      if (mark) {
        this.marks[coord][mark] = false;
      } else {
        for (let mark in this.marks[coord]) {
          this.marks[coord][mark] = false;
        }
      }
    }
  }
}
