import type { z } from 'zod';
export type Results = Record<string, string | number | undefined | null>[];
export type ToolConfig = {
    name: string;
    description: string;
    zodSchema?: z.ZodSchema<unknown>;
    func: (args: unknown) => Promise<Results>;
};
