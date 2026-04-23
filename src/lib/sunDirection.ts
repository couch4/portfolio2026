import { Vector3 } from "three";

/**
 * Shared mutable sun direction vector.
 * Atmos writes to it; Water (and any other consumer) reads it each frame.
 * Using a module singleton avoids re-renders and prop-drilling.
 */
export const sunDirection = new Vector3(0.5, 1, 0.5).normalize();
