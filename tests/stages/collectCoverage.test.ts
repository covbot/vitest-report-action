import { sep } from 'path';

import { readFile } from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFixture } from 'zod-fixture';

import { collectCoverage } from '../../src/stages/collectCoverage';
import { ActionError } from '../../src/typings/ActionError';
import { reportSchema } from '../../src/typings/JsonReport';
import { FailReason } from '../../src/typings/Report';
import { createDataCollector } from '../../src/utils/DataCollector';

vi.mock('fs-extra');
vi.mock('@actions/core');

const clearMocks = () => {
    vi.mocked(readFile).mockClear();
};

beforeEach(clearMocks);

const createReportFixture = () => {
    const fixture = createFixture(reportSchema);

    const mockedReportSource = Object.fromEntries(
        Object.entries(fixture).filter(([key]) => key !== 'coverageMap')
    );
    const mockedReport = JSON.stringify(mockedReportSource);
    const mockedCoverageMap = JSON.stringify(fixture.coverageMap);

    return {
        fullReport: fixture,
        runReport: mockedReport,
        coverageMap: mockedCoverageMap,
    };
};

describe('collectCoverage', () => {
    it('should read report.json and coverage/coverage-final.json by default', async () => {
        const dataCollector = createDataCollector();

        const { fullReport, coverageMap, runReport } = createReportFixture();

        vi.mocked(readFile).mockImplementation(async (path) => {
            console.log(path);
            if (path === 'report.json') {
                return Buffer.from(runReport);
            }

            if (path === `coverage${sep}coverage-final.json`) {
                return Buffer.from(coverageMap);
            }

            throw new Error('File not found');
        });

        await expect(collectCoverage(dataCollector)).resolves.toStrictEqual(
            fullReport
        );
    });

    it('should read report.json & coverage-final.json from correct path when working directory is provided', async () => {
        const dataCollector = createDataCollector();
        const { fullReport, coverageMap, runReport } = createReportFixture();

        vi.mocked(readFile).mockImplementation(async (path) => {
            if (path === `customFolder${sep}report.json`) {
                return Buffer.from(runReport);
            }

            if (
                path === `customFolder${sep}coverage${sep}coverage-final.json`
            ) {
                return Buffer.from(coverageMap);
            }

            throw new Error('File not found');
        });

        await expect(
            collectCoverage(dataCollector, 'customFolder')
        ).resolves.toStrictEqual(fullReport);
    });

    it('should read report from correct path when working directory and custom report path is provided', async () => {
        const dataCollector = createDataCollector();

        const fixture = createFixture(reportSchema);

        vi.mocked(readFile).mockImplementationOnce(() =>
            Promise.resolve(Buffer.from(JSON.stringify(fixture)))
        );

        await expect(
            collectCoverage(
                dataCollector,
                'customFolder',
                './customReport.json'
            )
        ).resolves.toStrictEqual(fixture);
        expect(readFile).toBeCalledWith(`customFolder${sep}customReport.json`);
    });

    it('should throw error if report not found', async () => {
        const dataCollector = createDataCollector();

        vi.mocked(readFile).mockImplementationOnce(() => {
            throw {
                code: 'ENOENT',
            };
        });

        await expect(collectCoverage(dataCollector)).rejects.toStrictEqual(
            new ActionError(FailReason.REPORT_NOT_FOUND, {
                coveragePath: 'report.json',
            })
        );
    });

    it('should throw unknown error', async () => {
        const dataCollector = createDataCollector();

        vi.mocked(readFile).mockImplementationOnce(() => {
            throw new Error('Custom error');
        });

        await expect(collectCoverage(dataCollector)).rejects.not.toStrictEqual(
            new ActionError(FailReason.REPORT_NOT_FOUND, {
                coveragePath: 'report.json',
            })
        );
    });
});
