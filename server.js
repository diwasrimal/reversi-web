const fs = require("fs");
const { WebSocketServer } = require("ws");
const http = require("http");
const { randomUUID } = require("crypto");

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    switch (req.url) {
        case "/":
            res.writeHead(200, { "Content-Type": "text/html" });
            fs.readFile("./index.html", (err, content) => {
                if (err) throw err;
                res.write(content);
                res.end();
            });
            break;

        case "/game.js":
            res.writeHead(200, { "Content-Type": "text/javascript" });
            fs.readFile("./game.js", (err, content) => {
                if (err) throw err;
                res.write(content);
                res.end();
            });
            break;

        case "/style.css":
            res.writeHead(200, { "Content-Type": "text/css" });
            fs.readFile("./style.css", (err, content) => {
                if (err) throw err;
                res.write(content);
                res.end();
            });
            break;

        default:
            res.writeHead(404);
            res.write("Unkown route");
            res.end();
    }
});

const wss = new WebSocketServer({ server: server });

let connections = {};
let pairs = {};
let randomWanting = [];
let usernames = {};

wss.on("connection", (conn) => {
    // Record new connection
    const clientId = randomUUID();
    connections[clientId] = conn;
    sendData(
        {
            type: "connection",
            clientId: clientId,
        },
        conn,
    );
    logData();

    conn.on("error", console.error);

    conn.on("close", () => {
        console.log(`${clientId} has disconnected`);
        const opponentId = pairs[clientId];
        connections[opponentId] &&
            sendData(
                {
                    type: "unpair",
                    opponentId: opponentId,
                },
                connections[opponentId],
            );

        delete connections[clientId];
        delete pairs[opponentId];
        delete pairs[clientId];
        randomWanting = randomWanting.filter((id) => id !== clientId);
        logData();
    });

    conn.on("message", (message) => {
        message = message.toString();
        const data = JSON.parse(message);
        console.log(`Message from ${clientId.substring(0, 5)}:`, data);

        switch (data.type) {
            // First request for creating custom connection
            // User just provides username in this request
            case "prepareCustomConnection":
                randomWanting = randomWanting.filter((id) => id !== clientId);
                if (!data.username)
                    console.error(
                        "Username not provided for custom connection",
                    );
                usernames[clientId] = data.username;
                break;

            // Second request for custom connection
            // Clients provides id of opponent to connect with
            case "connectViaOpponentId":
                randomWanting = randomWanting.filter((id) => id !== clientId);
                if (
                    data.opponentId === clientId ||
                    !connections[data.opponentId]
                ) {
                    console.error(
                        `Invalid connect request: ${clientId} with ${data.opponentId}`,
                    );
                    sendData({ type: "pairError" }, conn);
                    return;
                }
                pairWith(data.opponentId);
                logData();
                break;

            // Requested to find a random opponent
            case "connectRandomly":
                usernames[clientId] = data.username;
                if (randomWanting.length > 0) {
                    pairWith(randomWanting.shift());
                } else {
                    randomWanting.push(clientId);
                }
                logData();
                break;

            // End of game
            case "gameEnd":
                sendData({ type: "gameEnd" }, conn);
                connections[pairs[clientId]] &&
                    sendData({ type: "gameEnd" }, connections[pairs[clientId]]);
                break;

            // Making a move
            case "move":
                const opponentId = pairs[clientId];
                sendData(
                    {
                        type: "move",
                        row: data.row,
                        col: data.col,
                    },
                    conn,
                );
                connections[opponentId] &&
                    sendData(
                        {
                            type: "move",
                            row: data.row,
                            col: data.col,
                        },
                        connections[opponentId],
                    );
                break;

            default:
                console.error("Invalid communcation type");
        }
    });

    function pairWith(opponentId) {
        console.log(`Pairing ${clientId} and ${opponentId}`);
        pairs[clientId] = opponentId;
        pairs[opponentId] = clientId;
        const firstPlayer = clientId > opponentId ? clientId : opponentId;

        // Notify client after pairing
        sendData(
            {
                type: "pairSuccess",
                opponentId: opponentId,
                opponentName: usernames[opponentId],
                first: firstPlayer,
            },
            conn,
        );

        // Also notify opponent after pairing
        sendData(
            {
                type: "pairSuccess",
                opponentId: clientId,
                opponentName: usernames[clientId],
                first: firstPlayer,
            },
            connections[opponentId],
        );
    }
});

// Sends data in form of stringified JSON
function sendData(data, connection) {
    try {
        if (typeof data !== "object")
            throw Error("Can only send type 'object'");
        if (!connection) throw Error("Connection is invalid");
        const jsonData = JSON.stringify(data);
        connection.send(jsonData);
    } catch (err) {
        console.error(err);
        console.log(`Provided data: ${data}`);
    }
}

function logData() {
    console.log("Players:", Object.keys(connections));
    console.log("RandomWanting:", randomWanting);
    console.log("Pairs:", pairs);
}

server.listen(port, "0.0.0.0", () => console.log(`Listening on port ${port}`));
