class Game {
  board = [];
  round = -1;
  rows = 8;
  cols = this.rows;
  colors = ['red', 'green'];
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
        button.addEventListener('click', () => {
          if (this.validMove(i, j))
            this.makeMove(i, j);
        })
      }
    }

    this.updateRound();
  }

  isEmpty(i, j) {
    let className = this.board[i][j].className;
    return className != this.colors[0] && className != this.colors[1];
  }

  outOfBounds(i, j) {
    return (i < 0 || j < 0 || i > this.rows - 1 || j > this.cols - 1);
  }

  validMove(i, j) {
    const supportingColor = this.colors[this.round % 2];

    // Invalid if box is filled
    if (!this.isEmpty(i, j))
      return false;

    // Loop through neighboring points
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
          if (this.board[a][b].className == supportingColor)
            return true;
          a += movementVector.x;
          b += movementVector.y;
        }
      }
    }
    return false;
  }

  makeMove(i, j) {
    const color = this.colors[this.round % 2];

    // Place the move at given position
    this.board[i][j].className = color;

    // Loop through neighboring points
    // and find consumable pieces
    let consumables = [];
    for (let x = i - 1; x <= i + 1; x++) {
      for (let y = j - 1; y <= j + 1; y++) {

        // Skip pieces not in board array
        if (this.outOfBounds(x, y))
          continue;

        // Skip empty neighbors
        if (this.isEmpty(x, y))
          continue;

        const movementVector = {
          x: x - i,
          y: y - j
        }
        let a = i + movementVector.x;
        let b = j + movementVector.y;
        let pieces = [];

        while (!this.outOfBounds(a, b) && !this.isEmpty(a, b)) {
          if (this.board[a][b].className == color) {
            consumables.push(...pieces);
            break;
          }
          pieces.push(this.board[a][b]);
          a += movementVector.x;
          b += movementVector.y;
        }
      }
    }

    for (const consumable of consumables) {
      consumable.className = color;
    }

    this.updateRound();
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

  updateRound() {
    this.round++;
    let newTurn = (this.round % 2 == 0) ? 'Red' : 'Green';
    document.querySelector('#turn').innerHTML = newTurn;
    document.querySelector('#red-count').innerHTML = this.colorCount('red');
    document.querySelector('#green-count').innerHTML = this.colorCount('green');
  }

}

const game = new Game();
