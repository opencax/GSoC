import { type Solid } from './geometry.js';
export interface StepExportOptions {
    author?: string;
    description?: string;
    fileName?: string;
    modelName?: string;
    organization?: string;
    timestamp?: Date;
}
export declare function exportSolidsToStep(solids: Solid[], options?: StepExportOptions): string;
//# sourceMappingURL=step-exporter.d.ts.map