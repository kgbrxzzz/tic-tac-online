let token;
let username;
let socket;
let board = Array(9).fill(null);
let myTurn = false;
let mySymbol = null;

function register() {
    fetch("/register", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            username: usernameInput.value,
            password: password.value
        })
    }).then(r => r.text()).then(alert);
}

function login() {
    fetch("/login", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            username: usernameInput.value,
            password: password.value
        })
    })
    .then(r => r.json())
    .then(data => {
        token = data.token;
        username = usernameInput.value;
        document.getElementById("trophies").innerText = data.trophies;
        document.getElementById("login").style.display = "none";
        document.getElementById("game").style.display = "block";
        document.getElementById("playerName").innerText = username;
        loadRanking();
    });
}

function findMatch() {
    socket = new WebSocket("ws://" + location.host);

    socket.onopen = () => {
        socket.send(JSON.stringify({ type: "join", username }));
    };

    socket.onmessage = (msg) => {
        const data = JSON.parse(msg.data);

        if (data.type === "start") {
            mySymbol = data.symbol;
            myTurn = mySymbol === "X";
            createBoard();
        }

        if (data.type === "move") {
            board[data.index] = mySymbol === "X" ? "O" : "X";
            updateBoard();
            myTurn = true;
        }
    };
}

function createBoard() {
    const boardDiv = document.getElementById("board");
    boardDiv.innerHTML = "";
    board = Array(9).fill(null);

    board.forEach((_, i) => {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.onclick = () => play(i);
        boardDiv.appendChild(cell);
    });
}

function play(i) {
    if (!myTurn || board[i]) return;

    board[i] = mySymbol;
    socket.send(JSON.stringify({ type: "move", index: i }));
    updateBoard();
    myTurn = false;
    checkWin();
}

function updateBoard() {
    document.querySelectorAll(".cell").forEach((cell, i) => {
        cell.innerText = board[i] || "";
    });
}

function checkWin() {
    const wins = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];

    for (let combo of wins) {
        const [a,b,c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            socket.send(JSON.stringify({
                type: "result",
                winner: username,
                loser: "opponent"
            }));
            alert("Você venceu!");
        }
    }
}

function loadRanking() {
    fetch("/ranking")
    .then(r => r.json())
    .then(data => {
        const list = document.getElementById("ranking");
        list.innerHTML = "";
        data.forEach(player => {
            const li = document.createElement("li");
            li.innerText = player.username + " - " + player.trophies;
            list.appendChild(li);
        });
    });
}