export type WorldModelInput = {
  state: Record<string, unknown>;
  action?: Record<string, unknown>;
  horizonMs: number;
  context?: Record<string, unknown>;
};

export type WorldModelPrediction = {
  modelId: string;
  predictedState: Record<string, unknown>;
  confidence: number;
  uncertainty: number;
  generatedAt: number;
  evidence?: string[];
};

export interface WorldModelAdapter {
  readonly id: string;
  predict(input: WorldModelInput): Promise<WorldModelPrediction>;
}

export type EnsemblePrediction = {
  accepted: WorldModelPrediction[];
  rejected: Array<{ modelId: string; reason: string }>;
  consensus?: WorldModelPrediction;
  disagreement: number;
};

export class WorldModelEnsemble {
  private readonly models = new Map<string, WorldModelAdapter>();

  register(model: WorldModelAdapter): void {
    if (!model.id.trim()) throw new Error("World model id is required");
    if (this.models.has(model.id)) throw new Error(`World model already registered: ${model.id}`);
    this.models.set(model.id, model);
  }

  unregister(modelId: string): void {
    this.models.delete(modelId);
  }

  list(): string[] {
    return [...this.models.keys()].sort();
  }

  async predict(input: WorldModelInput, minConfidence = 0): Promise<EnsemblePrediction> {
    if (!Number.isFinite(input.horizonMs) || input.horizonMs <= 0) throw new RangeError("horizonMs must be positive");
    if (!Number.isFinite(minConfidence) || minConfidence < 0 || minConfidence > 1) {
      throw new RangeError("minConfidence must be between 0 and 1");
    }

    const settled = await Promise.all([...this.models.values()].map(async (model) => {
      try {
        const prediction = await model.predict(structuredClone(input));
        if (prediction.modelId !== model.id) throw new Error("prediction modelId mismatch");
        if (!Number.isFinite(prediction.confidence) || prediction.confidence < 0 || prediction.confidence > 1) {
          throw new Error("prediction confidence must be between 0 and 1");
        }
        if (!Number.isFinite(prediction.uncertainty) || prediction.uncertainty < 0 || prediction.uncertainty > 1) {
          throw new Error("prediction uncertainty must be between 0 and 1");
        }
        if (prediction.confidence < minConfidence) {
          return { rejected: { modelId: model.id, reason: "below-minimum-confidence" } } as const;
        }
        return { accepted: structuredClone(prediction) } as const;
      } catch (error) {
        return { rejected: { modelId: model.id, reason: error instanceof Error ? error.message : String(error) } } as const;
      }
    }));

    const accepted = settled.flatMap((item) => "accepted" in item ? [item.accepted] : []);
    const rejected = settled.flatMap((item) => "rejected" in item ? [item.rejected] : []);
    const confidenceValues = accepted.map((item) => item.confidence);
    const disagreement = confidenceValues.length < 2
      ? 0
      : Math.max(...confidenceValues) - Math.min(...confidenceValues);
    const consensus = accepted.length
      ? [...accepted].sort((a, b) => (b.confidence - b.uncertainty) - (a.confidence - a.uncertainty))[0]
      : undefined;

    return {
      accepted,
      rejected,
      ...(consensus ? { consensus: structuredClone(consensus) } : {}),
      disagreement
    };
  }
}
