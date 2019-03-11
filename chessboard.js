window.ChessBoard = function(boardId, config) {
  const self = this;

  const options = {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
    orientation: 'w',
  };

  for (let key in config) {
    options[key] = config[key];
  }

  let squareSize, selectedSquares = [];
  const board = {};
  const promotion = {
    pieces: [],
    selectedElement: null
  };

  function calcSquare(row, column) {
    return String.fromCharCode(97 + column) + row;
  }

  function createBoard() {
    const boardElement = document.getElementById(boardId);

    boardElement.classList.add('chessboard');

    if (options.orientation === 'b') {
      boardElement.classList.add('flipped');
    }

    board.element = boardElement;

    for (let r = 8; r >= 1; r--) {
      const rowElement = document.createElement('div');

      board[r] = {
        element: rowElement
      };

      for (let c = 0; c < 8; c++) {
        const squareElement = document.createElement('div');
        
        if ((r + c) % 2 === 0) {
          squareElement.className = 'white square';
        } else {
          squareElement.className = 'black square';
        }

        squareElement.setAttribute('data-square', calcSquare(r, c));

        if (options.onSquareClick) {
          squareElement.addEventListener('click', onSquareClick);
        }

        board[r][c] = {
          element: squareElement,
          piece: null
        };
        
        rowElement.appendChild(squareElement);
      }

      boardElement.appendChild(rowElement);
    }
  }

  function createPromotionPiece(piece) {
    const pieceElement = document.createElement('div');

    pieceElement.className = `square ${piece}`;
    pieceElement.setAttribute('data-piece', piece);

    promotion.pieces.push({ piece: piece, element: pieceElement });

    return pieceElement;
  }

  function createPromotionPieces(color) {
    const piecesWrapper = document.createElement('div');
    piecesWrapper.className = 'pieces';

    piecesWrapper.appendChild(createPromotionPiece(`${color}Q`));
    piecesWrapper.appendChild(createPromotionPiece(`${color}R`));
    piecesWrapper.appendChild(createPromotionPiece(`${color}N`));
    piecesWrapper.appendChild(createPromotionPiece(`${color}B`));

    if (color === 'w') {
      promotion.whitePiecesWrapper = piecesWrapper;
    } else {
      promotion.blackPiecesWrapper = piecesWrapper;
    }
  }

  function createPromotion() {
    // Pieces
    createPromotionPieces('w');
    createPromotionPieces('b');

    // Promote button
    let promoteButton = document.createElement('button');
    const promoteButtonText = document.createTextNode('Promote');

    promoteButton.appendChild(promoteButtonText);
    promotion.promoteButton = promoteButton;

    let promoteButtonWrapper = document.createElement('div');

    promoteButtonWrapper.appendChild(promoteButton);
    promotion.promoteButtonWrapper = promoteButtonWrapper;

    // Promotion wrapper
    const promotionWrapper = document.createElement('div');
    promotionWrapper.className = 'promotion-wrapper';

    promotionWrapper.appendChild(promotion.whitePiecesWrapper);
    promotionWrapper.appendChild(promotion.blackPiecesWrapper);
    promotionWrapper.appendChild(promoteButtonWrapper);

    promotion.wrapper = promotionWrapper;

    // Promotion overlay
    let overlay = document.createElement('div');
    overlay.className = 'promotion-overlay';
    promotion.overlay = overlay;

    overlay.appendChild(promotionWrapper);
    board.element.appendChild(overlay);

    // Set click handlers
    for (let i = 0, len = promotion.pieces.length; i < len; i++) {
      promotion.pieces[i].element.addEventListener('click', onPromotionPieceClick);
    }

    promoteButton.addEventListener('click', onPromotionButtonClick);
  }

  function onPromotionPieceClick(event) {
    const clickedElement = event.target;

    // Selected piece clicked
    if (clickedElement === promotion.selectedElement) {
      return;
    }

    // First time piece is selected
    if (promotion.selectedElement === null) {
      promotion.selectedElement = clickedElement;
      clickedElement.classList.add('selected');
      promotion.promoteButton.disabled = false;
      return;
    }

    // Selecting another piece
    promotion.selectedElement.classList.remove('selected');
    promotion.selectedElement = clickedElement;
    clickedElement.classList.add('selected');
  }

  function onPromotionButtonClick() {
    const piece = promotion.selectedElement.getAttribute('data-piece');
    const shortPiece = String.fromCharCode(piece.charCodeAt(1) + 32);

    promotion.overlay.style.display = 'none';

    if (promotion.callback) {
      promotion.callback(shortPiece);
    }
  }

  function calcSquareSize() {
    const parentStyle = getComputedStyle(board.element.parentNode);
    const parentWidth = parseFloat(parentStyle.width) - parseFloat(parentStyle.paddingLeft)
                                                  - parseFloat(parentStyle.paddingRight);
    
    squareSize = parentWidth / 8;
  }

  function setBoardSize() {
    calcSquareSize();

    const squareSizePx = `${squareSize}px`;
    const rowWidthPx = `${8 * squareSize}px`;
    const backgroundSizePx = `${6 * squareSize}px`;

    // Update board elements
    board.element.style.width = `${8 * squareSize}px`;

    for (let r = 8; r >= 1; r--) {
      board[r].element.style.width = rowWidthPx;
      board[r].element.style.height = squareSizePx;

      for (let c = 0; c < 8; c++) {
        board[r][c].element.style.width = squareSizePx;
        board[r][c].element.style.height = squareSizePx;
        board[r][c].element.style.backgroundSize = backgroundSizePx;
        board[r][c].element.style.backgroundPosition = backgroundPosition(board[r][c].piece);
      }
    }

    // Update promotion elements
    promotion.wrapper.style.width = `${4 * squareSize}px`;
    promotion.wrapper.style.height = `${2 * squareSize}px`;
    promotion.wrapper.style.marginTop = `${3 * squareSize}px`;

    promotion.whitePiecesWrapper.style.height = squareSizePx;
    promotion.blackPiecesWrapper.style.height = squareSizePx;

    for (let i = 0, len = promotion.pieces.length; i < len; i++) {
      const piece = promotion.pieces[i].piece;
      const element = promotion.pieces[i].element;

      element.style.width = squareSizePx;
      element.style.height = squareSizePx;
      element.style.backgroundSize = backgroundSizePx;
      element.style.backgroundPosition = backgroundPosition(piece);
    }

    promotion.promoteButtonWrapper.style.height = squareSizePx;
    promotion.promoteButtonWrapper.style.lineHeight = squareSizePx;
    promotion.promoteButton.style.fontSize = `${squareSize / 2.5}px`;
  }

  function backgroundPosition(piece) {
    switch (piece) {
      case 'wP': return '0 0';
      case 'wB': return `${-1 * squareSize}px 0`;
      case 'wN': return `${-2 * squareSize}px 0`;
      case 'wR': return `${-3 * squareSize}px 0`;
      case 'wQ': return `${-4 * squareSize}px 0`;
      case 'wK': return `${-5 * squareSize}px 0`;
      case 'bP': return `0 ${-1 * squareSize}px`;
      case 'bB': return `${-1 * squareSize}px ${-1 * squareSize}px`;
      case 'bN': return `${-2 * squareSize}px ${-1 * squareSize}px`;
      case 'bR': return `${-3 * squareSize}px ${-1 * squareSize}px`;
      case 'bQ': return `${-4 * squareSize}px ${-1 * squareSize}px`;
      case 'bK': return `${-5 * squareSize}px ${-1 * squareSize}px`;
    }
  }

  function getBoardSquare(square) {
    const c = square[0].charCodeAt(0) - 97;
    const r = +square[1];

    return board[r][c];
  }

  this.selectSquare = function(square) {
    if (selectedSquares.indexOf(square) > -1) {
      return;
    }

    const boardSquare = getBoardSquare(square);

    boardSquare.element.classList.add('selected');
    selectedSquares.push(square);
  };

  this.unselectSquare = function(square) {
    const index = selectedSquares.indexOf(square);

    if (index === -1) {
      return;
    }

    const boardSquare = getBoardSquare(square);

    boardSquare.element.classList.remove('selected');
    selectedSquares.splice(index, 1);
  };

  this.unselectAllSquares = function() {
    for (let i = 0, len = selectedSquares.length; i < len; i++) {
      const boardSquare = getBoardSquare(selectedSquares[i]);

      boardSquare.element.classList.remove('selected');
    }

    selectedSquares = [];
  };

  function onSquareClick(event) {
    const clickedSquare = event.target.getAttribute('data-square');

    options.onSquareClick(clickedSquare, selectedSquares);
  }

  function clearSquare(square) {
    const boardSquare = getBoardSquare(square);
    let piece = boardSquare.piece;

    if (piece !== null) {
      boardSquare.element.classList.remove(piece);
    }

    boardSquare.piece = null;
  }

  function putPiece(square, piece) {
    const boardSquare = getBoardSquare(square);
    const currentPiece = boardSquare.piece;

    if (currentPiece !== null) {
      boardSquare.element.classList.remove(currentPiece);
    }

    boardSquare.element.classList.add(piece);
    boardSquare.element.style.backgroundPosition = backgroundPosition(piece);
    boardSquare.piece = piece;
  }

  function calcPieceFromFenPiece(fenPiece) {
    const fenPieceCharCode = fenPiece.charCodeAt(0);

    if (fenPieceCharCode >= 97) { // Black
      return `b${String.fromCharCode(fenPieceCharCode - 32)}`;
    } else { // White
      return `w${fenPiece}`;
    }
  }

  this.setPosition = function(fen) {
    const fenFields = fen.split(' ');
    const rows = fenFields[0].split('/');

    for (let r = 0; r < 8; r++) {
      rows[r] = rows[r].replace(/\d/g, number => { 
        return '.'.repeat(number);
      });

      for (let c = 0; c < 8; c++) {
        const square = calcSquare(8 - r, c);

        if (rows[r][c] === '.') {
          clearSquare(square);
        } else {
          putPiece(square, calcPieceFromFenPiece(rows[r][c]));
        }
      }
    }
  };

  this.askPromotion = function(color, callback) {
    promotion.callback = callback;
    promotion.whitePiecesWrapper.style.display = color === 'w' ? 'block' : 'none';
    promotion.blackPiecesWrapper.style.display = color === 'b' ? 'block' : 'none';

    promotion.promoteButton.disabled = true;

    if (promotion.selectedElement !== null) {
      promotion.selectedElement.classList.remove('selected');
    }

    promotion.selectedElement = null;

    promotion.overlay.style.display = 'block';
  };

  createBoard();
  createPromotion();

  setTimeout(() => { // Without setTimeout, boxSizing is not set yet.
    setBoardSize();
    self.setPosition(options.fen);
  });

  window.addEventListener('resize', setBoardSize);
};
