import test from 'node:test';
import assert from 'node:assert/strict';
import { youtubeLinks } from '../assets/js/atlas-videos.js';

test('video links allow HTTPS YouTube URLs and remove duplicates', () => {
  const example = 'https://youtu.be/o0B57aJn7CM';
  assert.deepEqual(youtubeLinks([example, example, 'https://www.youtube.com/watch?v=o0B57aJn7CM&t=10']),
    [example, 'https://www.youtube.com/watch?v=o0B57aJn7CM&t=10']);
});
test('video links reject untrusted URLs and malformed catalog data', () => {
  assert.deepEqual(youtubeLinks(['javascript:alert(1)', 'https://youtube.com.evil.test', 'https://user@youtube.com', 'http://youtu.be/x', null, {}]), []);
  assert.deepEqual(youtubeLinks(undefined), []);
  assert.deepEqual(youtubeLinks('https://youtu.be/o0B57aJn7CM'), []);
});
