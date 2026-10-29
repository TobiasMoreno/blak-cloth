import { describe, expect, it } from 'vitest';
import { hasWorkspaceRevision } from './google-drive.service';

describe('Google Drive workspace conflict detection', () => {
  it('accepts a server metadata change when the workspace revision is unchanged', () => {
    expect(hasWorkspaceRevision({ schemaVersion: 2, revision: 7 }, 7)).toBe(true);
  });

  it('detects a real workspace revision conflict', () => {
    expect(hasWorkspaceRevision({ schemaVersion: 2, revision: 8 }, 7)).toBe(false);
  });

  it('rejects files without a numeric revision', () => {
    expect(hasWorkspaceRevision({ revision: '7' }, 7)).toBe(false);
    expect(hasWorkspaceRevision(null, 7)).toBe(false);
  });
});
