import type { Capability } from "../contracts.js";
import { SimulatedEmbodiment } from "../simulation/SimulatedEmbodiments.js";
import type { UniversalEmbodimentDescriptor } from "../integration/UniversalEmbodimentDescriptor.js";

export type UniversalEmbodimentCase = {
  descriptor: UniversalEmbodimentDescriptor;
  capabilities: Capability[];
  initialBody?: Record<string, unknown>;
  initialWorld?: Record<string, unknown>;
};

/**
 * Generates embodiments from open descriptors instead of a fixed list of robot
 * categories. The purpose is to test ECA-1 against combinations we did not
 * hand-name in advance.
 */
export class UniversalEmbodimentSpace {
  instantiate(testCase: UniversalEmbodimentCase): SimulatedEmbodiment {
    return new SimulatedEmbodiment({
      id: testCase.descriptor.id,
      kind: testCase.descriptor.morphology[0] ?? "unknown",
      capabilities: testCase.capabilities,
      initialBody: {
        descriptor: testCase.descriptor,
        ...(testCase.initialBody ?? {})
      },
      ...(testCase.initialWorld !== undefined
        ? { initialWorld: testCase.initialWorld }
        : {})
    });
  }

  combine(base: UniversalEmbodimentCase, variations: Partial<UniversalEmbodimentDescriptor>[]): UniversalEmbodimentCase[] {
    return variations.map((variation, index) => ({
      ...base,
      descriptor: {
        ...base.descriptor,
        ...variation,
        id: variation.id ?? `${base.descriptor.id}:variant:${index}`,
        unknownDimensions: {
          ...base.descriptor.unknownDimensions,
          ...(variation.unknownDimensions ?? {})
        }
      }
    }));
  }
}
