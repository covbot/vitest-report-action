import { z } from 'zod';

const location = z.object({
    column: z.number().optional(),
    line: z.number(),
});

const range = z.object({
    start: location.optional(),
    end: location.optional(),
});

const statementCoverage = z.object({
    start: location,
    end: location,
});

const statementMap = z.record(z.coerce.number(), statementCoverage);

const functionCoverage = z.object({
    decl: range,
});

const fnMap = z.record(z.coerce.number(), functionCoverage);

const branchCoverage = z.object({
    locations: z.array(range).optional(),
});

const branchMap = z.record(z.coerce.number(), branchCoverage);

const hitMap = z.record(z.coerce.number(), z.number());

const branchHitMap = z.record(z.coerce.number(), z.array(z.number()));

const fileCoverage = z.object({
    path: z.string(),
    statementMap,
    fnMap,
    branchMap,
    s: hitMap,
    f: hitMap,
    b: branchHitMap,
});

const assertionResult = z.object({
    status: z.string(),
    location: location,
    title: z.string(),
    ancestorTitles: z.array(z.string()).optional(),
    failureMessages: z.array(z.string()).optional(),
});

const testResult = z.object({
    status: z.string(),
    name: z.string(),
    message: z.string(),
    assertionResults: z.array(assertionResult).optional(),
});

const coverageMap = z.record(
    z.string(),
    z.union([
        fileCoverage,
        z
            .object({
                data: fileCoverage,
            })
            .transform((value) => value.data),
    ])
);

export const reportSchema = z.object({
    success: z.boolean(),
    numPassedTests: z.number(),
    numPassedTestSuites: z.number(),
    numFailedTests: z.number(),
    numFailedTestSuites: z.number(),
    numTotalTests: z.number(),
    numTotalTestSuites: z.number(),
    coverageMap,
    testResults: z.array(testResult).optional(),
});

export type JsonReport = z.infer<typeof reportSchema>;
export type FileCoverage = z.infer<typeof fileCoverage>;
export type Location = z.infer<typeof location>;
export type CoverageMap = z.infer<typeof coverageMap>;
