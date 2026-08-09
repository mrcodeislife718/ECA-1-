export type EmbodimentDimension = string;

export type UniversalEmbodimentDescriptor = {
  id: string;
  morphology: EmbodimentDimension[];
  mobility: EmbodimentDimension[];
  manipulation: EmbodimentDimension[];
  sensing: EmbodimentDimension[];
  actuation: EmbodimentDimension[];
  controlSurfaces: EmbodimentDimension[];
  operatingMedia: EmbodimentDimension[];
  energySources: EmbodimentDimension[];
  communicationModes: EmbodimentDimension[];
  humanInteractionModes: EmbodimentDimension[];
  environmentTags: EmbodimentDimension[];
  constraints: Record<string, unknown>;
  unknownDimensions: Record<string, unknown>;
};

/**
 * ECA-1 must not encode a closed taxonomy of robot bodies. This descriptor is
 * intentionally open-ended: new morphology, mobility, sensing, actuation,
 * media, energy, communication, or interaction dimensions can be represented
 * without changing the cognitive core.
 */
export class UniversalEmbodimentDescriptorRegistry {
  private readonly descriptors = new Map<string, UniversalEmbodimentDescriptor>();

  put(descriptor: UniversalEmbodimentDescriptor): void {
    this.descriptors.set(descriptor.id, structuredClone(descriptor));
  }

  get(id: string): UniversalEmbodimentDescriptor | undefined {
    const value = this.descriptors.get(id);
    return value ? structuredClone(value) : undefined;
  }

  list(): UniversalEmbodimentDescriptor[] {
    return [...this.descriptors.values()].map((value) => structuredClone(value));
  }
}
