import type { RequestHandler } from 'msw';
import type { ReactElement } from 'react';

/** Signed-in identity a fixture may request. Omit to render signed-out. */
export interface FixtureAuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

/**
 * A named, statically-addressable screen state for the visual gate. `?__fixture=<name>`
 * selects one; the harness installs its MSW handlers, applies its auth, and mounts
 * its screen. Kept as a curated inline registry (not a committed scenarios.json)
 * until the shape stabilizes.
 */
export interface Fixture {
  /** kebab-case id used in ?__fixture= and report filenames. */
  readonly name: string;
  readonly description: string;
  /** MSW handlers to install for this fixture, in match order (fallthrough last). */
  readonly handlers: () => RequestHandler[];
  /** Optional signed-in identity. Omit to render signed-out (stable, no cached-user flip). */
  readonly auth?: FixtureAuthUser;
  /** The screen mounted under [data-gate-root]. Owns its own router context. */
  readonly render: () => ReactElement;
}
