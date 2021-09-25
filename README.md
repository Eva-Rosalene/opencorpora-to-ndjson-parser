## Opencorpora to NDJSON parser

### How to use

0. Clone this repo
1. `npm i`
2. Place `dict.opcorpora.xml` file near package.json
3. `node index.js` and wait
4. File `dict.ndjson` should appear in the same folder

### Output file format

Info about original dictionary: [OpenCorpora](http://opencorpora.org/?page=export)

```ts
interface GrammemeRecord {
  type: "grammeme";
  name: string;
  parent: string | null; // references parent by name (consider name a primary key for GrammemeRecord)
  alias: string;
  description: string;
}

interface LemmaRecord {
  type: "lemma";
  id: string;
  rev: string;
  text: string;
  grammemes: string[]; // grammeme names for this lemma
  forms: Array<{
    text: string;
    grammemes: string[]; // grammeme names for this form
  }>;
}

interface LinkTypeRecord {
  type: "linkType";
  id: string;
  name: string; // name here ISN't primary key, it just describes what this link is
}

interface LinkRecord {
  type: "link";
  id: string;
  from: string; // lemma id
  to: string; // lemma id
  linkType: string; // linkType id
}

type DictRecord = GrammemeRecord | LemmaRecord | LinkTypeRecord | LinkRecord;
```

Each line in resulting `dict.ndjson` file is a valid JSON object of type `DictRecord`.

### Why?

1. You shall not parse XML this big in memory.
2. Because of (1) you should use streaming XML parser and this is painful

`.ndjson` seems like nice alternative to XML because each individual record contains more meaningful information than each opening/closing XML tag.
