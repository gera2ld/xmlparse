export interface IPosition {
  start: number;
  end: number;
}

export interface IAttributeValue {
  value: string | true | null;
  position: IPosition;
}

export interface IAttributes {
  [key: string]: IAttributeValue;
}

export interface INode {
  type: 'element' | 'text' | 'comment';
  name?: string;
  attrs?: IAttributes;
  children?: INode[];
  value?: string;
  posOpen?: IPosition;
  posClose?: IPosition;
}

export interface ITag {
  name: string;
  attrs?: IAttributes;
  isClosed: boolean;
  isComment: boolean;
  position: IPosition;
}

export interface IError {
  input: string;
  offset: number;
  message?: string;
}

const WHITE_SPACE = ' \t\r\n';
const TAG_END = '/>';
const WHITE_SPACE_OR_TAG_END = WHITE_SPACE + TAG_END;

class AssertionError extends Error {
  error?: IError;

  constructor(error?: IError, message?: string) {
    super(message);
    this.error = error;
  }
}

function assert(value: any, callback?: () => IError): void {
  if (!value) {
    throw new AssertionError(callback?.(), 'Assertion failed');
  }
}

function findNext(input: string, chars: string, offset = 0, offsetEnd = -1): number {
  if (offsetEnd < 0) offsetEnd = input.length;
  let index = offset;
  while (index < offsetEnd && !chars.includes(input[index])) index += 1;
  return index;
}

function scanTag(input: string, offset: number): {
  tag: ITag;
  isClose: boolean;
  warnings: IError[];
} {
  const warnings: IError[] = [];
  assert(input[offset] === '<', () => ({ input, offset }));
  const attrs: IAttributes = {};
  const tag: ITag = {
    name: '',
    attrs,
    isClosed: false,
    isComment: false,
    position: {
      start: offset,
      end: -1,
    },
  };
  const result = {
    tag,
    isClose: false,
    warnings: [],
  };
  offset += 1;
  if (input[offset] === '/') {
    // close tag
    result.isClose = true;
    offset += 1;
  } else if (input[offset] === '!') {
    // comment element
    assert(input.slice(offset, offset + 3) === '!--');
    const end = input.indexOf('-->', offset + 3);
    assert(end > 0);
    tag.position.end = end + 2;
    tag.isComment = true;
    tag.isClosed = true;
    return result;
  }
  let sep = findNext(input, WHITE_SPACE_OR_TAG_END, offset);
  tag.name = input.slice(offset, sep);
  while (WHITE_SPACE.includes(input[sep])) {
    while (WHITE_SPACE.includes(input[sep])) sep += 1;
    if (TAG_END.includes(input[sep])) break;
    let nextSep = findNext(input, WHITE_SPACE_OR_TAG_END + '=', sep + 1);
    const attrPos: IPosition = {
      start: sep,
      end: nextSep - 1,
    };
    const key = input.slice(sep, nextSep);
    if (key in attrs) {
      warnings.push({ input, offset: nextSep, message: `Duplicate key: ${key}` });
    }
    if (input[nextSep] === '=') {
      sep = nextSep;
      nextSep = sep + 1;
      const firstChar = input[nextSep];
      let quote: string | undefined;
      if ('\'"'.includes(firstChar)) {
        quote = firstChar;
        nextSep += 1;
      }
      nextSep = findNext(input, quote || WHITE_SPACE_OR_TAG_END, nextSep);
      if (quote) {
        assert(input[nextSep] === quote, () => ({ input, offset: nextSep }));
        nextSep += 1;
        // White space after quotes can be omitted
        // assert(WHITE_SPACE_OR_TAG_END.includes(input[nextSep]), () => reprStr(input, nextSep));
      }
      attrPos.end = nextSep - 1;
      let value = input.slice(sep + 1, nextSep);
      if (quote) value = value.slice(1, -1);
      attrs[key] = {
        value: value.trim(),
        position: attrPos,
      };
    } else {
      attrs[key] = {
        value: true,
        position: attrPos,
      };
    }
    sep = nextSep;
  }
  if (input[sep] === '/') {
    tag.isClosed = true;
    sep += 1;
  }
  tag.position.end = sep;
  return result;
}

export function parseXml(input: string): {
  node: INode;
  warnings: IError[];
} {
  const stack: INode[] = [
    {
      type: 'element',
      children: [],
    },
  ];
  let offset = 0;
  const warnings: IError[] = [];
  while (offset < input.length) {
    const tagStart = findNext(input, '<', offset);
    const value = input.slice(offset, tagStart).trim();
    let current = stack[stack.length - 1];
    if (value) current.children?.push({ type: 'text', value });
    if (tagStart >= input.length) break;
    const {
      tag: {
        name,
        attrs,
        isClosed,
        isComment,
        position,
      },
      isClose,
      warnings: scanWarnings,
    } = scanTag(input, tagStart);
    warnings.push(...scanWarnings);
    const node: INode = {
      name,
      attrs,
      type: isComment ? 'comment' : 'element',
      children: [],
    };
    if (isClose) {
      while (current.posOpen && current.name !== name) {
        warnings.push({ input, offset: current.posOpen?.start, message: `Unclosed tag: ${current.name}` });
        stack.pop();
        current = stack[stack.length - 1];
      }
      if (current.name !== name) {
        warnings.push({ input, offset: position.start, message: `Unmatched tag: ${name}` });
      } else {
        current.posClose = position;
        stack.pop();
      }
    } else {
      assert(current.children);
      node.posOpen = position;
      current.children?.push(node);
      if (!isClosed) stack.push(node);
    }
    offset = position.end + 1;
  }
  if (stack.length > 1) {
    warnings.push({ input, offset, message: `Unclosed tag: ${stack[stack.length - 1].name}` });
  }
  return {
    node: stack[0],
    warnings,
  };
}

export function traverse(node: INode, callback: (node: INode) => void): void {
  callback(node);
  node.children?.forEach(child => traverse(child, callback));
}
