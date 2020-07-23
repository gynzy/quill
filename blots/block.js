import extend from 'extend';
import Delta from 'quill-delta';
import Parchment from 'parchment';
import Break from './break';
import Inline from './inline';
import TextBlot from './text';


const NEWLINE_LENGTH = 1;


class BlockEmbed extends Parchment.Embed {
  attach() {
    super.attach();
    this.attributes = new Parchment.Attributor.Store(this.domNode);
  }

  delta() {
    return new Delta().insert(this.value(), extend(this.formats(), this.attributes.values()));
  }

  format(name, value) {
    let attribute = Parchment.query(name, Parchment.Scope.BLOCK_ATTRIBUTE);
    if (attribute != null) {
      this.attributes.attribute(attribute, value);
    }
  }

  formatAt(index, length, name, value) {
    this.format(name, value);
  }

  insertAt(index, value, def) {
    if (typeof value === 'string' && value.endsWith('\n')) {
      let block = Parchment.create(Block.blotName);
      this.parent.insertBefore(block, index === 0 ? this : this.next);
      block.insertAt(0, value.slice(0, -1));
    } else {
      super.insertAt(index, value, def);
    }
  }
}
BlockEmbed.scope = Parchment.Scope.BLOCK_BLOT;
// It is important for cursor behavior BlockEmbeds use tags that are block level elements


class Block extends Parchment.Block {
  constructor(domNode) {
    super(domNode);
    this.cache = {};
  }

  delta() {
    if (this.cache.delta == null) {
      this.cache.delta = this.descendants(Parchment.Leaf).reduce((delta, leaf) => {
        if (leaf.length() === 0) {
          return delta;
        } else {
          return delta.insert(leaf.value(), bubbleFormats(leaf));
        }
      }, new Delta());
      var des = this.descendants(Parchment.Leaf);
      if (des.length === 1 && (des[0].domNode.nodeName === 'BR' || des[0].statics.blotName === 'cursor')) {
        // special case for retrieving format of an empty line

        // Gynzy
        // BB-514: Ensure attributes are generated for restoring lists.
        // Previously the number (or bullet) for the last line of a list
        // was lost when saving and restoring the text. The only case where
        // this did work was when the line did not have any formatting at all.
        const attributes = bubbleFormats(des[0]);
        if (this.domNode.nodeName === 'LI') {
          switch (this.parent.domNode.nodeName) {
            case 'OL':
              attributes.list = 'ordered';
            break;
            case 'UL':
              attributes.list = 'bullet';
              break;
            default:
              break;
          }
        }

        const indent = this.formats().indent;
        if (typeof indent === 'number') {
          attributes.indent = indent;
        }

        this.cache.delta = this.cache.delta.insert('\n', attributes);
      } else {
        this.cache.delta = this.cache.delta.insert('\n', bubbleFormats(this));
      }
    }
    return this.cache.delta;
  }

  deleteAt(index, length) {
    super.deleteAt(index, length);
    this.cache = {};
  }

  formatAt(index, length, name, value) {
    if (length <= 0) return;
    if (Parchment.query(name, Parchment.Scope.BLOCK)) {
      if (index + length === this.length()) {
        this.format(name, value);
      }
    } else {
      super.formatAt(index, Math.min(length, this.length() - index), name, value);
    }
    this.cache = {};
  }

  insertAt(index, value, def) {
    if (def != null) return super.insertAt(index, value, def);
    if (value.length === 0) return;
    let lines = value.split('\n');
    let text = lines.shift();
    if (text.length > 0) {
      if (index < this.length() - 1 || this.children.tail == null) {
        super.insertAt(Math.min(index, this.length() - 1), text);
      } else {
        this.children.tail.insertAt(this.children.tail.length(), text);
      }
      this.cache = {};
    }
    let block = this;
    lines.reduce(function(index, line) {
      block = block.split(index, true);
      block.insertAt(0, line);
      return line.length;
    }, index + text.length);
  }

  insertBefore(blot, ref) {
    let head = this.children.head;
    super.insertBefore(blot, ref);
    if (head instanceof Break) {
      // break blot is removed temperarily from the tree, shouldn't call .remove() because it will detach it permanently (defined in shadowBlot)
      // head.remove();
      if (head.domNode.parentNode != null) {
        head.domNode.parentNode.removeChild(head.domNode);
      }
      if (head.parent != null) {
        head.parent.removeChild(head);
      }
    }
    this.cache = {};
  }

  length() {
    if (this.cache.length == null) {
      this.cache.length = super.length() + NEWLINE_LENGTH;
    }
    return this.cache.length;
  }

  moveChildren(target, ref) {
    super.moveChildren(target, ref);
    this.cache = {};
  }

  optimize(context) {
    super.optimize(context);
    this.cache = {};
  }

  path(index) {
    return super.path(index, true);
  }

  removeChild(child) {
    super.removeChild(child);
    this.cache = {};
  }

  split(index, force = false) {
    if (force && (index === 0 || index >= this.length() - NEWLINE_LENGTH)) {
      let clone = this.clone();
      // add de defaultChild so it can be formatted correctly
      clone.optimize();
      // insert newline before current line if cursor is at start of line, because newline needs to be formatted afterward
      if (index === 0/* && this.length() > 1*/) {
        // newline should be inserted before current line if cursor is at start of line && line is not empty
        this.parent.insertBefore(clone, this);
        return this;
      } else {
        // formatting of the newline is handled in the keyboard enter handler, formatting in quill.insertText does not work as expected
        this.parent.insertBefore(clone, this.next);
        return clone;
      }
    } else {
      let next = super.split(index, force);
      this.cache = {};
      return next;
    }
  }
}
Block.blotName = 'block';
Block.tagName = 'P';
Block.defaultChild = 'break';
Block.allowedChildren = [Inline, Parchment.Embed, TextBlot];


function bubbleFormats(blot, formats = {}) {
  if (blot == null) return formats;
  if (typeof blot.formats === 'function') {
    formats = extend(formats, blot.formats());
  }
  if (blot.parent == null || blot.parent.blotName == 'scroll' || blot.parent.statics.scope !== blot.statics.scope) {
    return formats;
  }
  return bubbleFormats(blot.parent, formats);
}


export { bubbleFormats, BlockEmbed, Block as default };
