import { readFile } from 'fs-extra';

import { REPORT_PATH } from '../constants/REPORT_PATH';
import { ActionError } from '../typings/ActionError';
import { reportSchema } from '../typings/JsonReport';
import { FailReason } from '../typings/Report';
import { DataCollector } from '../utils/DataCollector';
import { i18n } from '../utils/i18n';
import { joinPaths } from '../utils/joinPaths';

const safeReadFile = async (path: string) => {
    try {
        const output = await readFile(path);

        return output;
    } catch (error) {
        if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'ENOENT'
        ) {
            throw new ActionError(FailReason.REPORT_NOT_FOUND, {
                coveragePath: path,
            });
        }

        if (error !== undefined && error !== null) {
            throw new ActionError(FailReason.READING_COVERAGE_FILE_FAILED, {
                error: error.toString(),
            });
        } else {
            throw new ActionError(FailReason.READING_COVERAGE_FILE_FAILED, {
                error: JSON.stringify(error),
            });
        }
    }
};

const extractReportJson = async (
    dataCollector: DataCollector<unknown>,
    workingDirectory?: string,
    coverageFile?: string
) => {
    // Coverage file is specified via parameters, no need to collect, parse only
    if (coverageFile) {
        const reportFilePath = joinPaths(workingDirectory, coverageFile);

        dataCollector.info(
            i18n('loadingCoverageFromFile', {
                reportFilePath,
            })
        );

        const result = await safeReadFile(reportFilePath);

        try {
            return JSON.parse(result.toString());
        } catch {
            throw new ActionError(FailReason.INVALID_COVERAGE_FORMAT);
        }
    }

    // Combine report file and coverage map, in order to get normalized (jest-like) coverage report
    const reportFilePath = joinPaths(workingDirectory, REPORT_PATH);
    const coverageMapPath = joinPaths(
        workingDirectory,
        'coverage',
        'coverage-final.json'
    );

    dataCollector.info(
        i18n('loadingCoverageFromFile', {
            reportFilePath,
        })
    );
    const reportBuffer = await safeReadFile(reportFilePath);
    dataCollector.info(
        i18n('loadingCoverageFromFile', {
            coverageMapPath,
        })
    );
    const coverageMapBuffer = await safeReadFile(coverageMapPath);

    try {
        const report = JSON.parse(reportBuffer.toString());
        const coverageMap = JSON.parse(coverageMapBuffer.toString());

        report.coverageMap = coverageMap;

        return report;
    } catch (error) {
        throw new ActionError(FailReason.INVALID_COVERAGE_FORMAT);
    }
};

export const collectCoverage = async (
    dataCollector: DataCollector<unknown>,
    workingDirectory?: string,
    coverageFile?: string
) => {
    const json = await extractReportJson(
        dataCollector,
        workingDirectory,
        coverageFile
    );

    const parseResult = reportSchema.safeParse(json);

    if (!parseResult.success) {
        dataCollector.info(
            'Report did not match the schema. Issues: ' +
                JSON.stringify(parseResult.error.flatten())
        );
        throw new ActionError(FailReason.INVALID_COVERAGE_FORMAT);
    }

    return parseResult.data;
};
