document.addEventListener("DOMContentLoaded", () => {
    const DATA_FILES = {
        wed: "./assets/data/wednesday.json",
        thu: "./assets/data/thursday.json",
    };

    const PAGE_CONFIGS = [
        {
            file: "wed",
            key: "team",
            type: "team",
            tableId: "wedTeamStandings",
            containerId: "wedTeamTableContainer",
            containerSelector: ".tableContainer",
        },
        {
            file: "thu",
            key: "team",
            type: "team",
            tableId: "thuTeamStandings",
            containerId: "thuTeamTableContainer",
            containerSelector: ".tableContainer",
        },
        {
            file: "wed",
            key: "singles",
            type: "singles",
            tableId: "wedPlayers",
            weekHeaderId: "wedSinglesWeekHeader",
        },
        {
            file: "thu",
            key: "singles",
            type: "singles",
            tableId: "thuPlayers",
            weekHeaderId: "thuSinglesWeekHeader",
        },
    ];

    init();

    async function init() {
        try {
            const data = await fetchAllData();

            PAGE_CONFIGS.forEach((config) => {
                const rows = data[config.file]?.[config.key];

                if (!Array.isArray(rows)) return;

                if (config.type === "team") {
                    renderTeamPage(config, rows);
                }

                if (config.type === "singles") {
                    renderSinglesTable(config, rows);
                }
            });
        } catch (error) {
            console.error("Error loading standings data:", error);
        }
    }

    async function fetchAllData() {
        const entries = await Promise.all(
            Object.entries(DATA_FILES).map(async ([name, filePath]) => {
                const response = await fetch(filePath);

                if (!response.ok) {
                    throw new Error(`Failed to fetch ${filePath}`);
                }

                const json = await response.json();
                return [name, json];
            })
        );

        return Object.fromEntries(entries);
    }

    function renderTeamPage(config, teams) {
        const container = document.getElementById(config.containerId);

        if (!container) return;

        container.innerHTML = "";

        const weekStatus = document.createElement("h2");
        weekStatus.className = "weekStatus";

        const table = document.createElement("table");
        table.id = config.tableId;
        table.className = "teamStandingsTable";

        table.innerHTML = `
            <thead></thead>
            <tbody></tbody>
        `;

        container.appendChild(weekStatus);
        container.appendChild(table);

        renderTeamTable(table.id, teams, weekStatus);
    }

    function renderTeamTable(tableId, teams, weekStatusElement) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const thead = table.querySelector("thead");
        const tbody = table.querySelector("tbody");

        const teamStandings = buildTeamStandings(teams);
        const currentWeek = getCurrentWeekFromWeeks(teamStandings);

        if (weekStatusElement) {
            weekStatusElement.textContent = `After ${currentWeek} Week${
                currentWeek === 1 ? "" : "s"
            }`;
        }

        thead.innerHTML = `
            <tr>
                <th class="positionColumn">Pos</th>
                <th>Team</th>
                <th>Total Points</th>
                <th>Weekly Avg</th>
                ${Array.from(
                    { length: currentWeek },
                    (_, i) => `<th>W${i + 1}</th>`
                ).join("")}
            </tr>
        `;

        tbody.innerHTML = "";

        const rankedTeams = assignCompetitionPositions(teamStandings, "total");

        rankedTeams.forEach((team) => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td class="positionColumn">${team.position}</td>
                <td>${cleanText(team.team)}</td>
                <td>${formatNumber(team.total)}</td>
                <td>${formatNumber(team.average)}</td>
                ${team.weeks
                    .slice(0, currentWeek)
                    .map((score) => `<td>${formatNumber(score)}</td>`)
                    .join("")}
            `;

            tbody.appendChild(tr);
        });
    }

    function buildTeamStandings(teams) {
        return teams
            .filter((team) => team && Array.isArray(team.players))
            .map((team) => {
                const players = team.players.filter(isValidPlayer);
                const weeks = [];

                for (let i = 0; i < 22; i++) {
                    const playerScore = players.reduce((sum, player) => {
                        const score = Number(player.weeks?.[i] ?? 0);
                        return sum + (Number.isNaN(score) ? 0 : score);
                    }, 0);

                    const handicap = Number(team.handicaps?.[i] ?? 0);
                    const validHandicap = Number.isNaN(handicap) ? 0 : handicap;
                    const weeklyScore = playerScore + validHandicap;

                    weeks.push(Number(weeklyScore.toFixed(2)));
                }

                const total = weeks.reduce((sum, score) => sum + score, 0);
                const weeksPlayed = weeks.filter((score) => score > 0).length;
                const average = weeksPlayed > 0 ? total / weeksPlayed : 0;

                return {
                    team: team.team,
                    total: Number(total.toFixed(2)),
                    average: Number(average.toFixed(2)),
                    weeks,
                };
            })
            .filter((team) => team.total > 0)
            .sort((a, b) => b.total - a.total);
    }

    function renderSinglesWeekHeader(headerId, currentWeek) {
        if (!headerId) return;

        const header = document.getElementById(headerId);
        if (!header) return;

        header.textContent = `After ${currentWeek} Week${
            currentWeek === 1 ? "" : "s"
        }`;
    }

    function renderSinglesTable(config, players) {
        const table = document.getElementById(config.tableId);
        if (!table) return;

        const thead = table.querySelector("thead");
        const tbody = table.querySelector("tbody");

        const validPlayers = players
            .filter(isValidSinglesPlayer)
            .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));

        const currentWeek = getCurrentWeekFromSingles(validPlayers);

        renderSinglesWeekHeader(config.weekHeaderId, currentWeek);

        thead.innerHTML = `
            <tr>
                <th class="positionColumn">Pos</th>
                <th>Player</th>
                <th>Team</th>
                <th>Total Points</th>
                <th>Average</th>
                ${Array.from(
                    { length: currentWeek },
                    (_, i) => `<th>W${i + 1}</th>`
                ).join("")}
            </tr>
        `;

        tbody.innerHTML = "";

        const rankedPlayers = assignCompetitionPositions(
            validPlayers,
            "score"
        );

        rankedPlayers.forEach((player) => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td class="positionColumn">${player.position}</td>
                <td>${cleanText(player.player)}</td>
                <td>${cleanText(player.team)}</td>
                <td>${formatNumber(player.score)}</td>
                <td>${formatNumber(player.average)}</td>
                ${player.weeks
                    .slice(0, currentWeek)
                    .map((score) => `<td>${formatNumber(score)}</td>`)
                    .join("")}
            `;

            tbody.appendChild(tr);
        });
    }

    function assignCompetitionPositions(rows, scoreKey) {
        let previousScore = null;
        let previousPosition = 0;

        return rows.map((row, index) => {
            const score = Number(row?.[scoreKey] ?? 0);

            const position =
                index > 0 && score === previousScore
                    ? previousPosition
                    : index + 1;

            previousScore = score;
            previousPosition = position;

            return {
                ...row,
                position,
            };
        });
    }

    function getCurrentWeekFromWeeks(rows) {
        let currentWeek = 0;

        rows.forEach((row) => {
            row.weeks?.forEach((score, index) => {
                if (Number(score) > 0) {
                    currentWeek = Math.max(currentWeek, index + 1);
                }
            });
        });

        return currentWeek || 1;
    }

    function getCurrentWeekFromSingles(players) {
        let currentWeek = 0;

        players.forEach((player) => {
            player.weeks?.forEach((score, index) => {
                if (Number(score) > 0) {
                    currentWeek = Math.max(currentWeek, index + 1);
                }
            });
        });

        return currentWeek || 1;
    }

    function isValidPlayer(player) {
        if (!player) return false;

        const name = String(player.player ?? "").trim();

        return (
            name !== "" &&
            name !== "0" &&
            name.toLowerCase() !== "null" &&
            !name.includes("Team #") &&
            name !== "Sub Total" &&
            name !== "Handicap" &&
            name !== "Team Total"
        );
    }

    function isValidSinglesPlayer(player) {
        if (!player) return false;

        const name = String(player.player ?? "").trim();
        const team = String(player.team ?? "").trim();

        return (
            name !== "" &&
            team !== "" &&
            name !== "0" &&
            team !== "0" &&
            name.toLowerCase() !== "null" &&
            team.toLowerCase() !== "null" &&
            team !== "BYE"
        );
    }

    function cleanText(value) {
        return String(value ?? "").trim();
    }

    function formatNumber(value) {
        if (value === "" || value === null || value === undefined) return "";

        const number = Number(value);

        if (Number.isNaN(number)) return value;

        return Number.isInteger(number) ? number : number.toFixed(2);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const menuTriggers = document.querySelectorAll(".main-text");

    menuTriggers.forEach((trigger) => {
        trigger.addEventListener("click", (e) => {
            e.stopPropagation();

            const currentMenu =
                trigger.parentElement.parentElement.querySelector(".links-wrapper");

            document.querySelectorAll(".links-wrapper").forEach((menu) => {
                if (menu !== currentMenu) {
                    menu.classList.remove("show-links");
                }
            });

            currentMenu.classList.toggle("show-links");
        });
    });

    document.addEventListener("click", () => {
        document.querySelectorAll(".links-wrapper").forEach((menu) => {
            menu.classList.remove("show-links");
        });
    });

    document.querySelectorAll(".links-wrapper").forEach((menu) => {
        menu.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    });

    document.querySelectorAll(".hiddenLink").forEach((link) => {
        link.addEventListener("click", () => {
            document.querySelectorAll(".links-wrapper").forEach((menu) => {
                menu.classList.remove("show-links");
            });
        });
    });
});

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".schedWrapper").forEach((wrapper) => {
        const table = wrapper.querySelector(".schedTable");
        if (!table) return;

        const scrollbar = document.createElement("div");
        scrollbar.className = "scheduleScrollbar";

        const scrollbarInner = document.createElement("div");
        scrollbarInner.className = "scheduleScrollbarInner";

        scrollbar.appendChild(scrollbarInner);
        wrapper.appendChild(scrollbar);

        function syncScrollbarWidth() {
            scrollbarInner.style.width = `${table.scrollWidth}px`;
        }

        syncScrollbarWidth();
        window.addEventListener("resize", syncScrollbarWidth);

        wrapper.addEventListener("scroll", () => {
            scrollbar.scrollLeft = wrapper.scrollLeft;
        });

        scrollbar.addEventListener("scroll", () => {
            wrapper.scrollLeft = scrollbar.scrollLeft;
        });
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const siteMenuBurger = document.getElementById("siteMenuBurger");
    const siteNavPanel = document.getElementById("siteNavPanel");
    const siteNavOverlay = document.getElementById("siteNavOverlay");
    const closeSiteNav = document.getElementById("closeSiteNav");

    if (!siteMenuBurger || !siteNavPanel || !siteNavOverlay || !closeSiteNav) return;

    function openSiteNav() {
        siteNavPanel.classList.add("open");
        siteNavOverlay.classList.add("open");
        document.body.classList.add("siteNavIsOpen");
        siteNavPanel.setAttribute("aria-hidden", "false");
    }

    function closeSiteNavigation() {
        siteNavPanel.classList.remove("open");
        siteNavOverlay.classList.remove("open");
        document.body.classList.remove("siteNavIsOpen");
        siteNavPanel.setAttribute("aria-hidden", "true");
    }

    siteMenuBurger.addEventListener("click", openSiteNav);
    siteNavOverlay.addEventListener("click", closeSiteNavigation);
    closeSiteNav.addEventListener("click", closeSiteNavigation);

    siteMenuBurger.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openSiteNav();
        }
    });

    closeSiteNav.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            closeSiteNavigation();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSiteNavigation();
        }
    });
});

let currentPlayerCount = 0;
let currentPlayers = [];

function showPlayerPage(playerCount) {
    currentPlayerCount = Number(playerCount);
    currentPlayers = getPlayerNames(currentPlayerCount);

    renderScorerPage();
}

function getPlayerNames(playerCount) {
    const players = [];

    for (let i = 1; i <= playerCount; i++) {
        const name = prompt(`What is player ${i}'s name?`) || `Player ${i}`;

        players.push({
            name: name,
            score: 0
        });
    }

    return players;
}

function renderScorerPage() {
    document.querySelectorAll(".playerPage").forEach(page => {
        page.style.display = "none";
        page.innerHTML = "";
    });

    document.getElementById("scorerHeaderWrapper").style.display = "none";
    document.getElementById("inputHeader").style.display = "none";

    const selectedPage = document.getElementById(`page${currentPlayerCount}`);

    selectedPage.innerHTML = `
        <div class="scorerContainer">
            <div class="scoreboard">
                ${currentPlayers.map((player, index) => `
                    <div class="playerCard player${index + 1}">
                        <h3>${player.name}</h3>

                        <p id="score${index}" class="score">
                            ${player.score}
                        </p>

                        <div class="scoreButtons">
                            <button onclick="changeScore(${index}, -1)">-</button>
                            <button onclick="changeScore(${index}, 1)">+</button>
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
        <div class="scorerControls">
            <button onclick="resetScores()">Reset Scores</button>
            <button onclick="newNamesSameCount()">New Names</button>
            <button onclick="backToStart()">Back</button>
        </div>
    `;

    selectedPage.style.display = "block";
}

function changeScore(playerIndex, amount) {
    currentPlayers[playerIndex].score += amount;

    document.getElementById(`score${playerIndex}`).textContent =
        currentPlayers[playerIndex].score;
}

function resetScores() {
    currentPlayers.forEach(player => {
        player.score = 0;
    });

    renderScorerPage();
}

function newNamesSameCount() {
    currentPlayers = getPlayerNames(currentPlayerCount);

    renderScorerPage();
}

function backToStart() {
    location.reload();
}