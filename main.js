class Game {
  board = [];
  round = -1;
  rows = 8;
  cols = this.rows;
  colors = ['red', 'green'];
  validMoves = [];
  firstTurn = this.colors[0];


  constructor() {
    const boxes = Array.from(document.querySelectorAll('.board button'));

    for (let i = 0; i < 64; i += 8) {
      this.board.push(boxes.slice(i, i + 8));
    }
    this.board[3][3].className = 'red';
    this.board[4][4].className = 'red';
    this.board[3][4].className = 'green';
    this.board[4][3].className = 'green';

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const button = this.board[i][j];
        const moveIfValid = () => {
          if (this.validMoves.includes(button)) {
            this.makeMove(i, j);
            button.removeEventListener('click', moveIfValid);
          }
        }
        button.addEventListener('click', moveIfValid);
      }
    }
    this.updateStates();
  }

  isEmpty(i, j) {
    let className = this.board[i][j].className;
    return className != this.colors[0] && className != this.colors[1];
  }

  outOfBounds(i, j) {
    return (i < 0 || j < 0 || i > this.rows - 1 || j > this.cols - 1);
  }

  isValidMove(i, j) {
    const supportingColor = this.colors[this.round % 2];

    // Invalid if piece already taken
    if (!this.isEmpty(i, j))
      return false;

    // Loop thorough neighboring points to check validtity of move
    for (let x = i - 1; x <= i + 1; x++) {
      for (let y = j - 1; y <= j + 1; y++) {

        // Skip pieces not in board array
        if (this.outOfBounds(x, y))
          continue;

        // Skip empty neighbors
        if (this.isEmpty(x, y))
          continue;

        // Piece adjacent to moving place cannot be same
        if (this.board[x][y].className == supportingColor)
          continue;

        // Check if supporting piece with same color is on other side
        // if yes this move will be valid
        // Check along the line stretched by (i, j) and neighbor (x, y)
        const movementVector = {
          x: x - i,
          y: y - j
        }
        let a = x + movementVector.x;
        let b = y + movementVector.y;
        while (!this.outOfBounds(a, b) && !this.isEmpty(a, b)) {
          if (this.board[a][b].className === supportingColor)
            return true;
          a += movementVector.x;
          b += movementVector.y;
        }
      }
    }

  }

  makeMove(i, j) {
    const supportingColor = this.colors[this.round % 2];

    // Opponent's pieces that this move will consume
    let consumables = [];

    // Loop thorough neighboring points to check validtity of move
    for (let x = i - 1; x <= i + 1; x++) {
      for (let y = j - 1; y <= j + 1; y++) {

        // Skip pieces not in board
        if (this.outOfBounds(x, y))
          continue;

        // Skip empty neighbors
        if (this.isEmpty(x, y))
          continue;

        // Piece adjacent to moving place cannot be same
        if (this.board[x][y].className == supportingColor)
          continue;

        // Check if supporting piece with same color is on other side
        // if yes this move will be valid
        // Check along the line stretched by (i, j) and neighbor (x, y)
        const movementVector = {
          x: x - i,
          y: y - j
        }
        let a = i + movementVector.x;
        let b = j + movementVector.y;
        let pieces = [];

        while (!this.outOfBounds(a, b) && !this.isEmpty(a, b)) {
          const piece = this.board[a][b];
          if (piece.className === supportingColor) {
            consumables.push(...pieces);
            break;
          }
          pieces.push(piece)
          a += movementVector.x;
          b += movementVector.y;
        }
      }
    }

    console.log("conumes: ", consumables);

    if (consumables.length === 0)
      throw new Error("No pieces could be consumed!");


    consumables.push(this.board[i][j]);
    for (const consumable of consumables)
      consumable.className = supportingColor;

    this.updateStates();
  }

  colorCount(color) {
    let count = 0;
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.board[i][j].className == color)
          count++;
      }
    }
    return count;
  }

  showGameResult() {
    let winner;
    const reds = this.colorCount('red');
    const greens = this.colorCount('green');
    if (reds > greens) winner = 'Red';
    if (greens > reds) winner = 'Green';

    const result = document.createElement('div');
    if (!winner)
      result.innerHTML = "TIE"
    else
      result.innerHTML = `Winner: <span class="${winner.toLowerCase()}">${winner}</span>`

    const turn = document.querySelector("#game-details").children[1];
    turn.replaceWith(result);

    document.querySelector('#game-result').classList.remove('hidden');
  }

  updateStates() {
    this.round++;
    this.validMoves = [];
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.isValidMove(i, j))
          this.validMoves.push(this.board[i][j])
      }
    }

    if (this.validMoves.length === 0) {
      this.showGameResult();
      return;
    }

    const newTurn = (this.round % 2 == 0) ? 'Red' : 'Green';
    const turnElement = document.querySelector('#turn');
    turnElement.innerHTML = newTurn;
    turnElement.className = newTurn.toLowerCase();
    document.querySelector('#red-count').innerHTML = this.colorCount('red');
    document.querySelector('#green-count').innerHTML = this.colorCount('green');

  }
}



const game = new Game();
