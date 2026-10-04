import { afterEach, describe, expect, it, vi } from 'vitest';
import { ensureHubProject, validateProjectName } from '../../scripts/provision-vercel-hub.mjs';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('P3 Vercel Hub provisioning', () => {
  it('validates the canonical project name shape', () => {
    expect(validateProjectName('thiepn-hub')).toBe('thiepn-hub');
    expect(() => validateProjectName('THIEPN Hub')).toThrow();
  });

  it('reuses an existing unlinked project', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ id: 'prj_existing', name: 'thiepn-hub', link: null }),
    );

    const result = await ensureHubProject({
      token: 'test-token',
      fetchImpl,
    });

    expect(result).toEqual({
      project: {
        id: 'prj_existing',
        name: 'thiepn-hub',
        linkedGit: false,
      },
      created: false,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('creates a missing Astro project without Git linkage', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(Response.json({}, { status: 404 }))
      .mockResolvedValueOnce(
        Response.json(
          { id: 'prj_new', name: 'thiepn-hub', link: null },
          { status: 201 },
        ),
      );

    const result = await ensureHubProject({
      token: 'test-token',
      fetchImpl,
    });

    expect(result.created).toBe(true);
    const createCall = fetchImpl.mock.calls[1];
    expect(String(createCall?.[0])).toBe('https://api.vercel.com/v11/projects');
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      name: 'thiepn-hub',
      framework: 'astro',
      outputDirectory: 'dist',
    });
  });

  it('rejects a Git-linked project so pushes cannot become a deploy path', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        id: 'prj_linked',
        name: 'thiepn-hub',
        link: { type: 'github', repo: 'thiepn/thiepn.github.io' },
      }),
    );

    await expect(
      ensureHubProject({ token: 'test-token', fetchImpl }),
    ).rejects.toThrow('manual CLI deployment only');
  });
});
