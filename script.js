const socketProtocol = location.protocol === "https:" ? "wss" : "ws";
const socketUrl = `${socketProtocol}://${location.host}`

const playerTypeChooserDiv = document.querySelector(".player-type-chooser");
const usernameInput = document.querySelector("#username");
const randomPlayerButton = document.querySelector("#random-player");
const customPlayerButton = document.querySelector("#custom-player");

const customPlayerChooserDiv = document.querySelector(".custom-player-chooser");
const clientIdArea = document.querySelector("#client-id");
const customPlayerIdInput = document.querySelector("#custom-player-id");
const customPlayerConnectButton = document.querySelector(
    "#custom-player-connect",
);
const spinner = document.querySelector(".spinning-animation");

const gameDetails = document.querySelector("#game-details");
const gameTitleArea = document.querySelector("#game-title");
const redCountArea = document.querySelector("#red-count");
const greenCountArea = document.querySelector("#green-count");
const turnArea = document.querySelector("#turn");

const gameBoard = document.querySelector(".board");
const boardButtons = document.querySelectorAll(".board button");
const buttonsDiv = document.querySelector("#buttons");

const resultDiv = document.querySelector(".game-result");

function hide(...elems) {
    for (const elem of elems) elem.classList.add("hidden");
}

function show(...elems) {
    for (const elem of elems) elem.classList.remove("hidden");
}

const socket = new WebSocket(socketUrl);
const colors = ["red", "green"];
let clientId;
let opponentId;
let usernames = {};
let players;
let board = [];
let round = -1;
let validMoves = [];

socket.onopen = () => console.log("Connection opened!");
socket.onclose = () => console.log("Connection closed!");

socket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    console.log(data);
    switch (data.type) {
        // When new connection is made with server
        case "connection":
            clientId = data.clientId;
            clientIdArea.innerHTML = clientId;
            break;

        // Initialize the game after pairing with opponent
        case "pairSuccess":
            hide(spinner, playerTypeChooserDiv, customPlayerChooserDiv);
            show(gameBoard, gameDetails);
            opponentId = data.opponentId;
            usernames[opponentId] = data.opponentName;
            gameTitleArea.innerHTML = `${usernames[clientId]} v/s ${usernames[opponentId]}`;
            players =
                data.first === clientId
                    ? [clientId, opponentId]
                    : [opponentId, clientId];
            console.log(players);
            boardInitialize();
            break;

        // Could not pair with opponent
        case "pairError":
            alert("Could not pair!");
            hide(spinner, gameDetails, gameBoard);
            show(playerTypeChooserDiv);
            break;

        // Somebody disconnects
        case "unpair":
            alert("Opponent disconnected");
            boardReset();
            hide(spinner, gameDetails, gameBoard);
            show(playerTypeChooserDiv);
            break;

        // Someone (opponent or us) has made a requested a move
        case "move":
            if (!board) {
                console.error("Cannot move board is undefined");
                return;
            }
            const moved = makeMove(data.row, data.col);
            moved && boardUpdate();
            break;

        // Game has ended
        case "gameEnd":
            endGame();
            break;

        default:
            console.error("Message type unknown!");
    }
};

// Enable buttons after typing some username
function enableButtons() {
    randomPlayerButton.disabled = false;
    customPlayerButton.disabled = false;
    usernameInput.removeEventListener("input", enableButtons);
}
usernameInput.addEventListener("input", enableButtons);

// Notify the socket server to connect with random opponent
randomPlayerButton.onclick = () => {
    const name = usernameInput.value.trim();
    if (!name) return;
    usernames[clientId] = name;
    hide(playerTypeChooserDiv);
    show(spinner);
    socket.send(
        JSON.stringify({
            type: "connectRandomly",
            username: name,
        }),
    );
};

// Send the opponent id to server for custom connection
customPlayerButton.onclick = () => {
    const name = usernameInput.value.trim();
    if (!name) return;
    usernames[clientId] = name;
    hide(playerTypeChooserDiv);
    show(customPlayerChooserDiv);
    socket.send(
        JSON.stringify({
            type: "prepareCustomConnection",
            username: name,
        }),
    );
};

// Connect when clicked on connect button (id is sent)
customPlayerConnectButton.onclick = () => {
    const id = customPlayerIdInput.value.trim();
    if (!id) return;
    console.log(`Connecting to custom player of id ${id}`);
    hide(customPlayerChooserDiv);
    show(spinner);
    socket.send(
        JSON.stringify({
            type: "connectViaOpponentId",
            opponentId: id,
        }),
    );
};

// Initializes the game board with initial 4 pieces
// game board is represented by global `board`
function boardInitialize() {
    const btnArr = Array.from(boardButtons);
    console.log(btnArr);
    for (let i = 0; i < 8 * 8; i += 8) board.push(btnArr.slice(i, i + 8));

    console.log(board);
    board[3][3].className = colors[0];
    board[4][4].className = colors[0];
    board[3][4].className = colors[1];
    board[4][3].className = colors[1];

    boardUpdate();
}

// Reset the game board (useful when oppoent disconnects)
function boardReset() {
    // Reset colors
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[0].length; j++) {
            board[i][j].className = "";
            board[i][j].innerHTML = "";
        }
    }
    // Remove eventlisteners on valid moves
    while (validMoves.length > 0) {
        const [a, b, handler] = validMoves.pop();
        console.log("Removing listener for", board[a][b]);
        board[a][b].removeEventListener("click", handler);
        board[a][b].innerHTML = "";
    }
    // Reset variables
    board = [];
    round = -1;
    players = undefined;
    delete usernames[opponentId];
    opponentId = undefined;

    // Hide result (opponent may have quit after ending the game)
    resultDiv.innerHTML = "";
    hide(resultDiv);
}

// Updates game info on webpage and changes board states
function boardUpdate() {
    ++round;
    const movingPlayer = players[round % 2];
    console.log("players[gameRound % 2]:", movingPlayer);
    turnArea.innerHTML = usernames[movingPlayer];
    turnArea.className = colors[round % 2];
    redCountArea.innerHTML = colorCount("red");
    greenCountArea.innerHTML = colorCount("green");

    // No need to check valid moves for us if its opponent's turn
    if (movingPlayer === opponentId) return;

    // Check valid moves and add click event listeners for them
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[0].length; j++) {
            const button = board[i][j];
            const clickHandler = () => {
                console.log("Broadcasting ...");
                broadcastMove(i, j);
                while (validMoves.length > 0) {
                    const [a, b, handler] = validMoves.pop();
                    console.log("Removing listener for", board[a][b]);
                    board[a][b].removeEventListener("click", handler);
                    board[a][b].innerHTML = "";
                }
            };
            if (isValidMove(i, j)) {
                button.innerHTML = "<span style='color: white;'>.</span>";
                button.addEventListener("click", clickHandler);
                validMoves.push([i, j, clickHandler]);
            }
        }
    }

    // End the game if no valid moves remaining
    if (validMoves.length === 0) broadcastGameEnd();
}

function colorCount(color) {
    let count = 0;
    for (let i = 0; i < board.length; i++)
        for (let j = 0; j < board[0].length; j++)
            if (board[i][j].className === color) count++;
    return count;
}

function isValidMove(i, j) {
    const supportingColor = colors[round % 2];

    // Invalid if piece already taken
    if (!isEmpty(i, j)) return false;

    // Loop thorough neighboring points to check validtity of move
    for (let x = i - 1; x <= i + 1; x++) {
        for (let y = j - 1; y <= j + 1; y++) {
            // Skip pieces not in board array
            if (outOfBounds(x, y)) continue;

            // Skip empty neighbors
            if (isEmpty(x, y)) continue;

            // Piece adjacent to moving place cannot be same
            if (board[x][y].className == supportingColor) continue;

            // Check if supporting piece with same color is on other side
            // if yes this move will be valid
            // Check along the line stretched by (i, j) and neighbor (x, y)
            // Move to next point along the line using a movement vector
            const mvector = { x: x - i, y: y - j };
            let a = x + mvector.x;
            let b = y + mvector.y;
            while (!outOfBounds(a, b) && !isEmpty(a, b)) {
                if (board[a][b].className === supportingColor) return true;
                a += mvector.x;
                b += mvector.y;
            }
        }
    }
}

function makeMove(i, j) {
    const supportingColor = colors[round % 2];

    // Opponent's pieces that this move will consume
    let consumables = [];

    // Loop thorough neighboring points to check validtity of move
    for (let x = i - 1; x <= i + 1; x++) {
        for (let y = j - 1; y <= j + 1; y++) {
            // Skip invalid pieces
            if (outOfBounds(x, y)) continue;
            if (isEmpty(x, y)) continue;
            if (board[x][y].className == supportingColor) continue;

            const mvec = {
                x: x - i,
                y: y - j,
            };
            let a = i + mvec.x;
            let b = j + mvec.y;
            let pieces = [];

            while (!outOfBounds(a, b) && !isEmpty(a, b)) {
                const piece = board[a][b];
                if (piece.className === supportingColor) {
                    consumables.push(...pieces);
                    break;
                }
                pieces.push(piece);
                a += mvec.x;
                b += mvec.y;
            }
        }
    }

    console.log("Consumes: ", consumables);

    if (consumables.length === 0) {
        console.error("No pieces could be consumed, move invalid!");
        return false;
    }

    consumables.push(board[i][j]);
    for (const consumable of consumables)
        consumable.className = supportingColor;

    return true;
}

function broadcastMove(i, j) {
    socket.send(
        JSON.stringify({
            type: "move",
            row: i,
            col: j,
        }),
    );
}

function broadcastGameEnd() {
    socket.send(
        JSON.stringify({
            type: "gameEnd",
        }),
    );
}

function endGame() {
    const redCount = colorCount("red");
    const greenCount = colorCount("green");
    if (redCount === greenCount) {
        resultDiv.innerHTML = "TIE!";
        show(resultDiv);
        return;
    }
    const winnerIdx = redCount > greenCount ? 0 : 1;
    const winner = usernames[players[winnerIdx]];
    resultDiv.innerHTML = `Winner: ${winner}`;
    show(resultDiv);
}

function isEmpty(i, j) {
    let color = board[i][j].className;
    return !colors.includes(color);
}

function outOfBounds(i, j) {
    return i < 0 || j < 0 || i > board.length - 1 || j > board[0].length - 1;
}
