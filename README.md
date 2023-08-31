# Reversi
A strategy game consisting of two players. This project implements the
game using web-sockets.

See [reversi](https://en.wikipedia.org/wiki/Reversi) on Wikipedia.

## How communication is done

Every communication between client and socket server is done in JSON format.
The sending/receiving JSON contains a property `type` which specifies the
type of communication that is being done
```JSON
{
    "type": "message_type",
    // ...
}
```
The used types for communication are
| Message Type                | Sender | Usage                                                        |
|-----------------------------|--------|--------------------------------------------------------------|
| `"connection"`              | server | When a new client gets connected                             |
| `"pairSuccess"`             | server | When two players are matched for a game                      |
| `"pairError"`               | server | Notifies occurrence of error during pairing                  |
| `"unpair"`                  | server | When two players get disconnected                            |
| `"move"`                    | server | To direct client to make move and update UI                  |
| `"gameEnd"`                 | server | To notify opponent/client that game has ended                |
| `"move"`                    | client | To broadcast his/her move to the server                      |
| `"gameEnd"`                 | client | To ask server to notify ending of game                       |
| `"connectRandomly"`         | client | To request for a random opponent                             |
| `"connectViaOpponentId"`    | client | To request to connect with custom opponent (by providing id) |
| `"prepareCustomConnection"` | client | To provide username in custom connection.                    |


## How connections are made

Connections are of two types
- Random Connection
- Custom Connection

A random connection is straightforward, a player just has to enter
his/her username and hit the button that will connect randomly. On server side,
the random connection request hopes for these fields
```JSON
{
    "type": "connectRandomly",
    "username": "Jack"
}
```

A custom connection is made in two steps. When custom connection is chosen
on the first page by entering username, the username is sent to server and
stored as `usernames[clientId]`. This ensures that the player waiting for partner
can also provide his/her name. Otherwise, only username of the player who
enters the id will be recorded. The server hopes the following in the initial request
```JSON
{
    "type": "prepareCustomConnection",
    "username": "Jack",
}
```
During the second request, the opponent's id is provided to create connection. The
id is provided by server when connection is established using web-sockets. The
format for second request is like
```JSON
{
    "type": "connectViaOpponentId",
    "opponentId": "9348afj9ur893", // this is random
}
```
