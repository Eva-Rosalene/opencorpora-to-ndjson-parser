const Saxophone = require('saxophone');
const fs = require('fs');
const { EventEmitter } = require('events');

const ENTITY_TYPES = {
  NONE: 'none',
  LEMMA: 'lemma',
  FORM: 'form',
  NAME: 'name',
  ALIAS: 'alias',
  DESCRIPTION: 'description',
  TYPE: 'type',
};

class DictionaryParser extends EventEmitter {
  constructor() {
    super();
    this.parser = new Saxophone();
    this.lemma = null;
    this.form = null;
    this.grammeme = null;
    this.linkType = null;
    this.currentEntityType = ENTITY_TYPES.NONE;
  }

  onTagOpen(tag) {
    switch (tag.name) {
      case 'type': {
        const attrs = Saxophone.parseAttrs(tag.attrs);
        this.linkType = { id: attrs.id };
        this.currentEntityType = ENTITY_TYPES.TYPE;
        break;
      }
      case 'grammeme': {
        const attrs = Saxophone.parseAttrs(tag.attrs);
        this.grammeme = { parent: attrs.parent || null };
        break;
      };
      case 'name': {
        this.currentEntityType = ENTITY_TYPES.NAME;
        break;
      };
      case 'alias': {
        this.currentEntityType = ENTITY_TYPES.ALIAS;
        break;
      }
      case 'description': {
        this.currentEntityType = ENTITY_TYPES.DESCRIPTION;
        break;
      }
      case 'lemma': {
        const attrs = Saxophone.parseAttrs(tag.attrs);
        this.lemma = { ...attrs, grammemes: [], forms: [] };
        break;
      };
      case 'l': {
        this.currentEntityType = ENTITY_TYPES.LEMMA;
        const attrs = Saxophone.parseAttrs(tag.attrs);
        this.lemma.text = attrs.t;
        break;
      }
      case 'g': {
        const attrs = Saxophone.parseAttrs(tag.attrs);
        if (this.currentEntityType === ENTITY_TYPES.LEMMA) {
          this.lemma.grammemes.push(attrs.v);
        } else {
          this.form.grammemes.push(attrs.v);
        }
        break;
      };
      case 'f': {
        const attrs = Saxophone.parseAttrs(tag.attrs);
        this.form = { text: attrs.t, grammemes: [] };
        this.currentEntityType = ENTITY_TYPES.FORM;
        break;
      };
      case 'link': {
        const attrs = Saxophone.parseAttrs(tag.attrs);
        this.emit('link', { id: attrs.id, from: attrs.from, to: attrs.to, linkType: attrs.type });
        break;
      };
    }
  }

  onTagClose(tag) {
    switch (tag.name) {
      case 'lemma': {
        this.emit('lemma', this.lemma);
        this.lemma = null;
        this.currentEntityType = ENTITY_TYPES.NONE;
        break;
      }
      case 'f': {
        this.lemma.forms.push(this.form);
        this.form = null;
        this.currentEntityType = ENTITY_TYPES.NONE;
        break;
      }
      case 'name':
      case 'alias':
      case 'description': {
        this.currentEntityType = ENTITY_TYPES.NONE;
        break;
      }
      case 'grammeme': {
        this.emit('grammeme', this.grammeme);
        break;
      }
      case 'type': {
        this.emit('linkType', this.linkType);
        break;
      }
    }
  }

  onText(text) {
    const parsed = Saxophone.parseEntities(text.contents);
    switch (this.currentEntityType) {
      case ENTITY_TYPES.NAME: {
        this.grammeme.name = parsed;
        break;
      }
      case ENTITY_TYPES.DESCRIPTION: {
        this.grammeme.description = parsed;
        break;
      }
      case ENTITY_TYPES.ALIAS: {
        this.grammeme.alias = parsed;
        break;
      }
      case ENTITY_TYPES.TYPE: {
        this.linkType.name = parsed;
        break;
      }
    }
  }

  parse(stream) {
    return new Promise((resolve, reject) => {
      this.parser.on('finish', resolve);
      this.parser.on('error', reject);
      this.parser.on('tagopen', this.onTagOpen.bind(this));
      this.parser.on('tagclose', this.onTagClose.bind(this));
      this.parser.on('text', this.onText.bind(this));

      stream.pipe(this.parser);
    });
  }
}

async function main() {
  const parser = new DictionaryParser();
  const xmlstream = fs.createReadStream('dict.opcorpora.xml');
  const ndjsonstream = fs.createWriteStream('dict.ndjson');
  xmlstream.setEncoding('utf-8');
  parser.on('lemma', lemma => {
    ndjsonstream.write(JSON.stringify({ type: 'lemma', ...lemma }) + '\n');
  });
  parser.on('grammeme', grammeme => {
    ndjsonstream.write(JSON.stringify({ type: 'grammeme', ...grammeme }) + '\n');
  });
  parser.on('linkType', linkType => {
    ndjsonstream.write(JSON.stringify({ type: 'linkType', ...linkType }) + '\n');
  });
  parser.on('link', link => {
    ndjsonstream.write(JSON.stringify({ type: 'link', ...link }) + '\n');
  });
  await parser.parse(xmlstream);
  ndjsonstream.end();
}

main();
