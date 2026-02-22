let username;
let socket;
let board = Array(9).fill(null);
let myTurn = false;
let mySymbol = null;

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginMsg = document.getElementById("loginMsg");

function register() {
    fetch("/register", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            username: usernameInput.value,
            password: passwordInput.value
        })
    })
    .then(r => r.text())
    .then(msg => loginMsg.innerText = msg);
}

function login() {
    fetch("/login", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            username: usernameInput.value,
            password: passwordInput.value
        })
    })
    .then(r => r.json())
    .then(data => {
        username = usernameInput.value;

        document.getElementById("trophies").innerText = data.trophies;
        document.getElementById("playerName").innerText = "👤 " + username;

        document.getElementById("loginBox").classList.add("hidden");
        document.getElementById("gameBox").classList.remove("hidden");

        loadRanking();
    })
    .catch(() => loginMsg.innerText = "Erro no login");
}

function findMatch() {
    socket = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host);

    socket.onopen = () => {
        socket.send(JSON.stringify({ type: "join", username }));
        document.getElementById("status").innerText = "Procurando jogador...";
    };

    socket.onmessage = (msg) => {
        const data = JSON.parse(msg.data);

        if (data.type === "start") {
            mySymbol = data.symbol;
            myTurn = mySymbol === "X";
            document.getElementById("status").innerText =
                myTurn ? "Sua vez!" : "Vez do adversário";
            createBoard();
        }

        if (data.type === "move") {
            board[data.index] = mySymbol === "X" ? "O" : "X";
            updateBoard();
            myTurn = true;
            document.getElementById("status").innerText = "Sua vez!";
            checkGame();
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
    document.getElementById("status").innerText = "Vez do adversário";
    checkGame();
}

function updateBoard() {
    document.querySelectorAll(".cell").forEach((cell, i) => {
        cell.innerText = board[i] || "";
    });
}

function checkGame() {
    const wins = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];

    for (let combo of wins) {
        const [a,b,c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {

            const winner = board[a] === mySymbol ? username : null;

            socket.send(JSON.stringify({
                type: "result",
                winner: winner,
                loser: winner ? null : username
            }));

            alert(winner ? "🎉 Você venceu!" : "😢 Você perdeu!");
            resetGame();
            return;
        }
    }

    if (!board.includes(null)) {
        alert("Empate!");
        resetGame();
    }
}

function resetGame() {
    board = Array(9).fill(null);
    createBoard();
}

function loadRanking() {
    fetch("/ranking")
    .then(r => r.json())
    .then(data => {
        const list = document.getElementById("ranking");
        list.innerHTML = "";
        data.forEach(player => {
            const li = document.createElement("li");
            li.innerText = player.username + " - " + player.trophies + "🏆";
            list.appendChild(li);
        });
    });
}