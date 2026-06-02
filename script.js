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
            weekStatusElement.textContent = `After ${currentWeek} Week${currentWeek === 1 ? "" : "s"
                }`;
        }

        thead.innerHTML = `
            <tr>
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

        teamStandings.forEach((team) => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
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
                    const weeklyScore = players.reduce((sum, player) => {
                        const score = Number(player.weeks?.[i] ?? 0);
                        return sum + (Number.isNaN(score) ? 0 : score);
                    }, 0);

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

        header.textContent = `After ${currentWeek} Week${currentWeek === 1 ? "" : "s"
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

        validPlayers.forEach((player) => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
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