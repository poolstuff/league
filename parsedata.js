const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const FILES = [
    {
        input: "./data/CCCL# 335.xlsm",
        output: "./assets/data/wednesday.json",
        label: "Wednesday",
    },
    {
        input: "./data/CCCL# 336.xlsm",
        output: "./assets/data/thursday.json",
        label: "Thursday",
    },
];

const MAX_WEEKS = 22;
const HANDICAP_ROW_OFFSET = 9;
const TEAM_ROW_STARTS = [4, 17, 30, 43, 56, 69, 82, 95, 108, 121];

FILES.forEach(parseWorkbook);

function parseWorkbook({ input, output, label }) {
    const workbook = XLSX.readFile(input, { raw: true });

    const teams = new Map();
    const teamOrder = [];
    const foundWeeks = [];

    workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: "",
            raw: true,
        });

        const weekNumber = getWeekNumber(rows);

        if (!weekNumber) return;

        foundWeeks.push(weekNumber);
        parseWeek(rows, weekNumber, teams, teamOrder);
    });

    const team = buildTeams(teams, teamOrder);
    const singles = buildSingles(team);

    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify({ team, singles }, null, 2));

    console.log(`\n${label}`);
    console.log(`Input: ${input}`);
    console.log(`Output: ${output}`);
    console.log(`Weeks found: ${foundWeeks.join(", ") || "none"}`);
    console.log(`Current week with scores: ${getCurrentWeek(team)}`);
    console.log(`Teams: ${team.length}`);
    console.log(`Singles: ${singles.length}`);
}

function getWeekNumber(rows) {
    const cell = String(rows?.[0]?.[0] ?? "").trim();
    const match = cell.match(/^WEEK\s+(\d+)$/i);
    return match ? Number(match[1]) : null;
}

function parseWeek(rows, weekNumber, teams, teamOrder) {
    const weekIndex = weekNumber - 1;

    TEAM_ROW_STARTS.forEach((teamRow) => {
        parseTeamBlock(rows, teamRow, 0, 1, weekIndex, teams, teamOrder);
        parseTeamBlock(rows, teamRow, 5, 6, weekIndex, teams, teamOrder);
    });
}

function parseTeamBlock(
    rows,
    teamRow,
    nameCol,
    scoreCol,
    weekIndex,
    teams,
    teamOrder
) {
    const teamName = clean(rows?.[teamRow - 1]?.[nameCol]);

    if (!isValidTeam(teamName)) return;

    const teamKey = key(teamName);

    if (!teams.has(teamKey)) {
        teams.set(teamKey, {
            team: teamName,
            players: new Map(),
            playerOrder: [],
            handicaps: Array(MAX_WEEKS).fill(0),
        });

        teamOrder.push(teamKey);
    }

    const team = teams.get(teamKey);

    const handicapRowIndex = teamRow - 1 + HANDICAP_ROW_OFFSET;

    team.handicaps[weekIndex] = toNumber(
        rows?.[handicapRowIndex]?.[scoreCol]
    );

    for (let i = 1; i <= 5; i++) {
        const rowIndex = teamRow - 1 + i;
        const playerName = clean(rows?.[rowIndex]?.[nameCol]);
        const score = toNumber(rows?.[rowIndex]?.[scoreCol]);

        if (!isValidPlayer(playerName)) continue;

        const playerKey = key(playerName);

        if (!team.players.has(playerKey)) {
            team.players.set(playerKey, {
                player: playerName,
                weeks: Array(MAX_WEEKS).fill(0),
            });

            team.playerOrder.push(playerKey);
        }

        team.players.get(playerKey).weeks[weekIndex] = score;
    }
}

function buildTeams(teams, teamOrder) {
    return teamOrder.map((teamKey) => {
        const team = teams.get(teamKey);

        return {
            team: team.team,
            handicaps: team.handicaps.map(round),

            players: team.playerOrder.map((playerKey) => {
                const player = team.players.get(playerKey);

                const total = player.weeks.reduce(
                    (sum, score) => sum + score,
                    0
                );

                const weeksPlayed = player.weeks.filter(
                    (score) => score > 0
                ).length;

                const average = weeksPlayed
                    ? total / weeksPlayed
                    : 0;

                return {
                    player: player.player,
                    total: round(total),
                    average: round(average),
                    weeks: player.weeks.map(round),
                };
            }),
        };
    });
}

function buildSingles(teams) {
    return teams
        .flatMap((team) =>
            team.players.map((player) => ({
                player: player.player,
                team: team.team,
                score: player.total,
                average: player.average,
                weeks: player.weeks,
            }))
        )
        .filter((player) => player.score > 0)
        .sort((a, b) => b.score - a.score);
}

function getCurrentWeek(teams) {
    let currentWeek = 0;

    teams.forEach((team) => {
        team.players.forEach((player) => {
            player.weeks.forEach((score, index) => {
                if (score > 0) {
                    currentWeek = Math.max(
                        currentWeek,
                        index + 1
                    );
                }
            });
        });
    });

    return currentWeek || 1;
}

function isValidTeam(value) {
    const text = clean(value).toUpperCase();

    return (
        text &&
        text !== "BYE" &&
        text !== "SCORE" &&
        !text.includes("TEAM #")
    );
}

function isValidPlayer(value) {
    const text = clean(value).toUpperCase();

    return (
        text &&
        text !== "0" &&
        text !== "BYE" &&
        text !== "HANDICAP" &&
        text !== "TOTALS" &&
        text !== "TEAM TOTAL" &&
        text !== "SUB TOTAL"
    );
}

function clean(value) {
    return String(value ?? "").trim();
}

function key(value) {
    return clean(value)
        .toUpperCase()
        .replace(/\s+/g, " ");
}

function toNumber(value) {
    const number = Number(value);

    return Number.isNaN(number)
        ? 0
        : number;
}

function round(value) {
    return Number(
        Number(value).toFixed(2)
    );
}