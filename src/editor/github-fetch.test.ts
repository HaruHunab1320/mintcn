import { describe, expect, it } from 'vitest';
import { parseGitHubUrl } from './github-fetch';

describe('parseGitHubUrl', () => {
  it('parses the bare repo form', () => {
    expect(parseGitHubUrl('https://github.com/anthropics/claude-code')).toEqual({
      owner: 'anthropics',
      repo: 'claude-code',
      branch: 'main',
      subdir: '',
    });
  });

  it('trims the .git suffix', () => {
    expect(parseGitHubUrl('https://github.com/anthropics/claude-code.git')).toMatchObject({
      repo: 'claude-code',
    });
  });

  it('recognises /tree/<branch>', () => {
    expect(parseGitHubUrl('https://github.com/foo/bar/tree/develop')).toMatchObject({
      branch: 'develop',
      subdir: '',
    });
  });

  it('recognises /tree/<branch>/<subdir>', () => {
    expect(parseGitHubUrl('https://github.com/foo/bar/tree/main/apps/web')).toMatchObject({
      branch: 'main',
      subdir: 'apps/web',
    });
  });

  it('accepts http:// too', () => {
    expect(parseGitHubUrl('http://github.com/foo/bar')?.repo).toBe('bar');
  });

  it('returns null for unrecognized input', () => {
    expect(parseGitHubUrl('not a url')).toBeNull();
    expect(parseGitHubUrl('https://gitlab.com/foo/bar')).toBeNull();
    expect(parseGitHubUrl('https://github.com/only-one-part')).toBeNull();
  });
});
