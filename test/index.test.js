import test from 'tape';
import { parseXml } from '../mod.ts';

test('parseXml', t => {
  t.test('ok', q => {
    q.deepEqual(parseXml(``), {
      node: {
        type: 'element',
        children: [],
      },
      warnings: [],
    });
    q.end();
  });
});
