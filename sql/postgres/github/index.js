const fs = require("fs");

function splitColumns(line) {
    const results = [];
    let i = 0;

    while (i < line.length) {
        while (i < line.length && /\s/.test(line[i])) i++;

        let start = i;

        // column name
        while (i < line.length && !/\s/.test(line[i])) i++;

        // type
        while (i < line.length && /\s/.test(line[i])) i++;
        while (i < line.length && !/\s|\[/.test(line[i])) i++;

        // skip whitespace
        while (i < line.length && /\s/.test(line[i])) i++;

        // attributes [...]
        if (line[i] === "[") {
            let depth = 1;
            i++;

            while (i < line.length && depth > 0) {
                if (line[i] === "[") depth++;
                else if (line[i] === "]") depth--;

                // 🔥 handle backticks inside attributes
                else if (line[i] === "`") {
                    i++;
                    while (i < line.length && line[i] !== "`") i++;
                }

                i++;
            }
        }

        const chunk = line.slice(start, i).trim();
        if (chunk) results.push(chunk);
    }

    return results;
}

function splitIndexes(line) {
    const results = [];
    let i = 0;

    while (i < line.length) {
        // Skip whitespace
        while (i < line.length && /\s/.test(line[i])) i++;

        let start = i;

        // --- Parse index expression ---
        if (line[i] === "(") {
            let depth = 1;
            i++;
            while (i < line.length && depth > 0) {
                if (line[i] === "(") depth++;
                else if (line[i] === ")") depth--;
                i++;
            }
        } else {
            while (i < line.length && !/\s|\[/.test(line[i])) i++;
        }

        // --- Skip whitespace ---
        while (i < line.length && /\s/.test(line[i])) i++;

        // --- Parse optional [attributes] ---
        if (line[i] === "[") {
            let depth = 1;
            i++;
            while (i < line.length && depth > 0) {
                if (line[i] === "[") depth++;
                else if (line[i] === "]") depth--;
                i++;
            }
        }

        const chunk = line.slice(start, i).trim();
        if (chunk) results.push(chunk);
    }

    return results;
}

function formatDBML(input) {
    let output = "";
    let indent = 0;
    const INDENT = "  ";

    input = input.replace(/\s+/g, " ").trim();

    input = input
        .replace(/\b(Table|Ref|Indexes)\b/g, "\n$1")
        .replace(/{/g, "{\n")
        .replace(/}/g, "\n}\n");

    const lines = input.split("\n");

    let insideTable = false;
    let insideIndexes = false;

    for (let rawLine of lines) {
        let line = rawLine.trim();
        if (!line) continue;

        if (line.startsWith("Table")) insideTable = true;
        if (line.startsWith("Indexes")) insideIndexes = true;

        if (line.startsWith("}")) {
            indent--;
            if (insideIndexes) insideIndexes = false;
            else if (insideTable) insideTable = false;
        }

        // 🔹 Handle indexes splitting
        if (insideIndexes && !line.endsWith("{") && !line.startsWith("Indexes")) {
            const indexes = splitIndexes(line);
            for (let idx of indexes) {
                output += INDENT.repeat(indent) + idx.trim() + "\n";
            }
            continue;
        }

        // 🔹 Handle column splitting
        if (insideTable && !insideIndexes && !line.endsWith("{") && !line.startsWith("Indexes")) {
            const cols = splitColumns(line);
            for (let col of cols) {
                output += INDENT.repeat(indent) + col.trim() + "\n";
            }
            continue;
        }

        output += INDENT.repeat(indent) + line + "\n";

        if (line.endsWith("{")) {
            indent++;
        }
    }

    return output;
}

// ---- Usage ----
const input = fs.readFileSync("input.dbml", "utf-8");
const formatted = formatDBML(input);
fs.writeFileSync("output.dbml", formatted);

console.log("DBML fully formatted with indexes.");