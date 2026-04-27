const WIKTIONARY_API = "https://en.wiktionary.org/w/api.php";

export async function lookupWord(word) {
  const url = `${WIKTIONARY_API}?action=parse&format=json&page=${encodeURIComponent(word)}&prop=text&origin=*`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Network error");
  const json = await res.json();
  if (json.error) return null;
  const html = json.parse?.text?.["*"];
  if (!html) return null;
  return parseGermanEntry(html, word);
}

function parseGermanEntry(html, word) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const content = doc.querySelector(".mw-parser-output");
  if (!content) return null;

  // Find the German h2 section
  const germanSection = findGermanSection(content);
  if (!germanSection) return null;

  // Extract word type sections (Noun, Verb, Adjective, etc.)
  const posSections = extractPosSections(germanSection);
  if (posSections.length === 0) return null;

  // Use the first/primary POS section
  const primary = posSections[0];

  const ipa = extractIPA(germanSection);
  const type = normalizeWordType(primary.type);
  const definitions = extractDefinitions(primary.nodes);
  const headwordText = extractHeadwordText(primary.nodes);
  const forms = extractForms(primary.nodes, type, headwordText);

  return {
    word,
    type,
    ipa,
    definitions,
    forms,
    examples: [],
    allPos: posSections.map(s => s.type)
  };
}

function findGermanSection(content) {
  const children = Array.from(content.children);
  let inGerman = false;
  const germanNodes = [];

  for (const el of children) {
    if (el.tagName === "H2") {
      const headline = el.querySelector(".mw-headline");
      const id = el.id || (headline?.id ?? "");
      const text = (headline?.textContent ?? el.textContent).trim();
      if (text === "German" || id === "German") {
        inGerman = true;
        continue;
      } else if (inGerman) {
        break; // next language section — stop
      }
    }
    // Newer Wiktionary structure: <div class="mw-heading mw-heading2"><h2 id="German">German</h2>[edit]</div>
    // el.textContent includes the "[edit]" link text so we must read the h2 directly
    if (
      el.tagName === "DIV" &&
      el.classList.contains("mw-heading") &&
      el.classList.contains("mw-heading2")
    ) {
      const h2 = el.querySelector("h2");
      const id = h2?.id ?? "";
      const text = h2?.textContent.trim() ?? "";
      if (text === "German" || id === "German") {
        inGerman = true;
        continue;
      } else if (inGerman) {
        break;
      }
    }
    if (inGerman) germanNodes.push(el);
  }

  return germanNodes.length > 0 ? germanNodes : null;
}

function extractPosSections(nodes) {
  const sections = [];
  let currentType = null;
  let currentNodes = [];

  const POS_TERMS = [
    "Noun",
    "Verb",
    "Adjective",
    "Adverb",
    "Pronoun",
    "Preposition",
    "Conjunction",
    "Article",
    "Interjection",
    "Numeral",
    "Particle"
  ];

  for (const node of nodes) {
    const isH3 = node.tagName === "H3";
    const isHeading3 =
      node.tagName === "DIV" &&
      node.classList.contains("mw-heading") &&
      node.classList.contains("mw-heading3");
    const isH4 = node.tagName === "H4";
    const isHeading4 =
      node.tagName === "DIV" &&
      node.classList.contains("mw-heading") &&
      node.classList.contains("mw-heading4");

    if (isH3 || isHeading3 || isH4 || isHeading4) {
      const text = node.textContent.trim();
      const matched = POS_TERMS.find(pos => text.startsWith(pos));
      if (matched) {
        if (currentType)
          sections.push({ type: currentType, nodes: currentNodes });
        currentType = matched;
        currentNodes = [];
        continue;
      }
    }
    if (currentType) currentNodes.push(node);
  }
  if (currentType) sections.push({ type: currentType, nodes: currentNodes });
  return sections;
}

function extractIPA(nodes) {
  for (const node of nodes) {
    const ipaSpan = node.querySelector ? node.querySelector("span.IPA") : null;
    if (ipaSpan) {
      const text = ipaSpan.textContent.trim();
      if (text) return text;
    }
  }
  return null;
}

function extractDefinitions(nodes) {
  const defs = [];
  for (const node of nodes) {
    if (node.tagName === "OL") {
      const items = node.querySelectorAll(":scope > li");
      for (const li of items) {
        // Get the text, stripping sub-lists and usage examples
        const clone = li.cloneNode(true);
        clone
          .querySelectorAll("dl, ul, ol, style, script")
          .forEach(el => el.remove());
        clone.querySelectorAll("sup").forEach(el => el.remove());
        // Remove wiki-links formatting but keep text
        const text = cleanDefinitionText(clone.textContent.trim());
        if (text) {
          defs.push({ english: text });
        }
      }
    }
  }
  return defs;
}

function cleanDefinitionText(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/^\s*[\d.]+\s*/, "") // remove leading numbers
    .trim();
}

function extractHeadwordText(nodes) {
  for (const node of nodes) {
    if (node.tagName === "P")
      return cleanDefinitionText(node.textContent || "");
  }
  return "";
}

function extractForms(nodes, type, headwordText = "") {
  const tables = extractInflectionTables(nodes);

  if (type === "noun") {
    const tableForms = tables[0] ? extractNounForms(tables[0]) : null;
    return mergeForms(extractNounFormsFromHeadword(headwordText), tableForms);
  }

  if (type === "verb") {
    const tableForms = tables.length ? extractVerbForms(tables, nodes) : null;
    return mergeForms(extractVerbFormsFromHeadword(headwordText), tableForms);
  }

  if (type === "adjective") {
    const tableForms = tables[0] ? extractAdjectiveForms(tables[0]) : null;
    return mergeForms(
      extractAdjectiveFormsFromHeadword(headwordText),
      tableForms
    );
  }

  return null;
}

function extractInflectionTables(nodes) {
  const tables = [];
  for (const node of nodes) {
    if (node.tagName === "TABLE" && isInflectionTable(node)) {
      tables.push(node);
    }
    if (node.querySelectorAll) {
      tables.push(
        ...Array.from(node.querySelectorAll("table")).filter(isInflectionTable)
      );
    }
  }
  return tables;
}

function isInflectionTable(table) {
  return (
    table.classList?.contains("inflection-table") ||
    /declension|conjugation/i.test(table.textContent || "")
  );
}

function mergeForms(fallback, primary) {
  const merged = {};
  for (const source of [fallback, primary]) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      if (value != null) merged[key] = value;
    }
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

function cleanCellText(text) {
  return (text || "")
    .replace(/\[\d+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getRowCells(row) {
  return Array.from(row.querySelectorAll("th, td")).map(cell => {
    const clone = cell.cloneNode(true);
    clone.querySelectorAll("br").forEach(br => br.replaceWith(" / "));
    return cleanCellText(clone.textContent);
  });
}

function extractNounForms(table) {
  const rows = Array.from(table.querySelectorAll("tr"));
  const result = {};

  // Try to find article/gender from the first row header
  const headerRow = rows[0];
  if (headerRow) {
    const abbrs = headerRow.querySelectorAll("abbr");
    for (const abbr of abbrs) {
      const title = (abbr.getAttribute("title") || "").toLowerCase();
      if (title.includes("neuter")) {
        result.article = "das";
        break;
      }
      if (title.includes("masculine")) {
        result.article = "der";
        break;
      }
      if (title.includes("feminine")) {
        result.article = "die";
        break;
      }
    }
    // Also check cell text for der/die/das
    if (!result.article) {
      const text = headerRow.textContent;
      if (/\bder\b/i.test(text)) result.article = "der";
      else if (/\bdie\b/i.test(text)) result.article = "die";
      else if (/\bdas\b/i.test(text)) result.article = "das";
    }
  }

  // Build a row-indexed object
  const rowData = {};
  for (const row of rows) {
    const th = row.querySelector("th");
    if (!th) continue;
    const label = cleanCellText(th.textContent).toLowerCase();
    const cells = Array.from(row.querySelectorAll("td"));
    const values = cells.map(td => cleanCellText(td.textContent));
    rowData[label] = values;
  }

  // Extract nominative (article), genitive, plural
  const nomRow = Object.keys(rowData).find(k => k.includes("nominativ"));
  const genRow = Object.keys(rowData).find(k => k.includes("genitiv"));

  if (nomRow && rowData[nomRow]) {
    const nom = rowData[nomRow];
    if (nom[0] && !result.article) {
      const m = nom.join(" ").match(/\b(der|die|das)\b/i);
      if (m) result.article = m[1].toLowerCase();
    }
    if (nom.length >= 5) result.plural = nom[4];
    else if (nom.length >= 2 && /plural/i.test(table.textContent))
      result.plural = nom[nom.length - 1];
  }
  if (genRow && rowData[genRow]) {
    const gen = rowData[genRow];
    if (gen.length >= 3) result.genitive = gen[2];
    else if (gen[0]) result.genitive = gen[gen.length - 1];
  }

  // Fallback: extract plural from header columns
  if (!result.plural) {
    const headerCells = rows[0]?.querySelectorAll("th");
    if (headerCells) {
      for (const cell of headerCells) {
        if (cell.textContent.includes("Plural")) {
          // column index of plural
          // find nom row and get that column
          break;
        }
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

function extractNounFormsFromHeadword(text) {
  if (!text) return null;
  const result = {};
  const genderMatch = text.match(
    /\b(m|f|n)\b|\b(masculine|feminine|neuter)\b/i
  );
  if (genderMatch) {
    const gender = (genderMatch[1] || genderMatch[2]).toLowerCase();
    if (gender === "m" || gender === "masculine") result.article = "der";
    if (gender === "f" || gender === "feminine") result.article = "die";
    if (gender === "n" || gender === "neuter") result.article = "das";
  }
  const genitive = text.match(/\bgenitive\s+([^,;)]+)/i);
  if (genitive) result.genitive = cleanCellText(genitive[1]);
  const plural = text.match(/\bplural\s+([^,;)]+)/i);
  if (plural) result.plural = cleanCellText(plural[1]);
  return Object.keys(result).length > 0 ? result : null;
}

function extractVerbForms(tables, nodes) {
  const simpleRows = Array.from(tables[0]?.querySelectorAll("tr") || []).map(
    getRowCells
  );
  const composedRows = Array.from(tables[1]?.querySelectorAll("tr") || []).map(
    getRowCells
  );
  const tenseMap = {};

  tenseMap.praesens = extractSimpleVerbTense(simpleRows, [
    "present",
    "präsens"
  ]);
  tenseMap.praeteritum = extractSimpleVerbTense(simpleRows, [
    "preterite",
    "präteritum"
  ]);
  tenseMap.perfekt = extractComposedVerbTense(composedRows, "perfect");
  tenseMap.futur = extractComposedVerbTense(composedRows, "future i");

  // Extract Partizip II and Imperativ — often in separate rows/section
  let partizipII = extractLabeledValue(simpleRows, [
    "past participle",
    "partizip ii"
  ]);
  let imperativ = extractImperative(simpleRows);

  // Also check for partizip in non-table nodes
  if (!partizipII) {
    for (const node of nodes) {
      if (node.textContent?.includes("Partizip")) {
        const m = node.textContent.match(/Partizip\s*II[:\s]+([^\n,;]+)/i);
        if (m) partizipII = m[1].trim();
      }
    }
  }

  return {
    ...tenseMap,
    partizipII,
    imperativ
  };
}

function extractSimpleVerbTense(rows, labels) {
  const start = rows.findIndex(row => labels.includes(row[0]?.toLowerCase()));
  if (start < 0) return null;

  const first = rows[start] || [];
  const second = rows[start + 1] || [];
  const third = rows[start + 2] || [];

  return cleanVerbTense({
    ich: stripPronoun(first[1], "ich"),
    wir: stripPronoun(first[2], "wir"),
    du: stripPronoun(second[0], "du"),
    ihr: stripPronoun(second[1], "ihr"),
    "er/sie/es": stripPronoun(third[0], "er"),
    sie: stripPronoun(third[1], "sie")
  });
}

function extractComposedVerbTense(rows, label) {
  const sectionStart = rows.findIndex(row => row[0]?.toLowerCase() === label);
  if (sectionStart < 0) return null;

  const nextSection = rows.findIndex(
    (row, index) =>
      index > sectionStart &&
      /^(pluperfect|future i|future ii)$/i.test(row[0] || "")
  );
  const sectionRows = rows.slice(
    sectionStart + 1,
    nextSection > -1 ? nextSection : rows.length
  );
  const indicativeIndex = sectionRows.findIndex(
    row => row[0]?.toLowerCase() === "indicative"
  );
  if (indicativeIndex < 0) return null;

  const first = sectionRows[indicativeIndex] || [];
  const second = sectionRows[indicativeIndex + 1] || [];
  const third = sectionRows[indicativeIndex + 2] || [];

  return cleanVerbTense({
    ich: stripPronoun(first[1], "ich"),
    wir: stripPronoun(first[2], "wir"),
    du: stripPronoun(second[0], "du"),
    ihr: stripPronoun(second[1], "ihr"),
    "er/sie/es": stripPronoun(third[0], "er"),
    sie: stripPronoun(third[1], "sie")
  });
}

function extractLabeledValue(rows, labels) {
  const row = rows.find(cells => labels.includes(cells[0]?.toLowerCase()));
  return row?.[1] || null;
}

function extractImperative(rows) {
  const row = rows.find(cells => cells[0]?.toLowerCase() === "imperative");
  if (!row) return null;
  const forms = row
    .slice(1)
    .filter(Boolean)
    .map(form => form.replace(/\)\s*(?=[A-Za-zÄÖÜäöüß])/g, ") / "));
  return forms.length ? forms.join(" / ") : null;
}

function stripPronoun(value, pronoun) {
  if (!value) return null;
  return cleanCellText(value).replace(
    new RegExp(`(^| / )${pronoun}\\s+`, "gi"),
    "$1"
  );
}

function cleanVerbTense(forms) {
  const cleaned = Object.fromEntries(
    Object.entries(forms).filter(
      ([, value]) => value && value !== "—" && value !== "-"
    )
  );
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

function extractVerbFormsFromHeadword(text) {
  if (!text) return null;
  const result = {};
  const participle = text.match(/\bpast participle\s+([^,;)]+)/i);
  if (participle) result.partizipII = cleanCellText(participle[1]);
  return Object.keys(result).length > 0 ? result : null;
}

function extractAdjectiveForms(table) {
  const rows = Array.from(table.querySelectorAll("tr"));
  let comparative = null;
  let superlative = null;

  for (const row of rows) {
    const text = row.textContent.toLowerCase();
    const td = row.querySelector("td");
    if (!td) continue;
    const value = td.textContent.trim();
    if (text.includes("komparativ") || text.includes("comparative"))
      comparative = value;
    if (text.includes("superlativ") || text.includes("superlative"))
      superlative = value;
  }

  // Try header row approach
  if (!comparative && !superlative) {
    const headerRow = rows[0];
    const dataRow = rows[1];
    if (headerRow && dataRow) {
      const headers = Array.from(headerRow.querySelectorAll("th")).map(th =>
        th.textContent.trim().toLowerCase()
      );
      const cells = Array.from(dataRow.querySelectorAll("td")).map(td =>
        td.textContent.trim()
      );
      const compIdx = headers.findIndex(
        h => h.includes("komparativ") || h.includes("comparative")
      );
      const supIdx = headers.findIndex(
        h => h.includes("superlativ") || h.includes("superlative")
      );
      if (compIdx >= 0) comparative = cells[compIdx];
      if (supIdx >= 0) superlative = cells[supIdx];
    }
  }

  if (!comparative && !superlative) return null;
  return { comparative, superlative };
}

function extractAdjectiveFormsFromHeadword(text) {
  if (!text) return null;
  const result = {};
  const comparative = text.match(/\bcomparative\s+([^,;)]+)/i);
  if (comparative) result.comparative = cleanCellText(comparative[1]);
  const superlative = text.match(/\bsuperlative\s+([^,;)]+)/i);
  if (superlative) result.superlative = cleanCellText(superlative[1]);
  return Object.keys(result).length > 0 ? result : null;
}

function normalizeWordType(raw) {
  const map = {
    Noun: "noun",
    Verb: "verb",
    Adjective: "adjective",
    Adverb: "adverb",
    Pronoun: "pronoun",
    Preposition: "preposition",
    Conjunction: "conjunction",
    Article: "article",
    Interjection: "interjection",
    Numeral: "numeral",
    Particle: "particle"
  };
  return map[raw] || raw.toLowerCase();
}
