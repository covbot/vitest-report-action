import { relative } from 'path';

import stripAnsi from 'strip-ansi';

import { Annotation } from './Annotation';
import { JsonReport } from '../typings/JsonReport';
import { isValidNumber } from '../utils/isValidNumber';

export const createFailedTestsAnnotations = (
    jsonReport: JsonReport
): Array<Annotation> => {
    const testResults = jsonReport.testResults;

    if (!testResults) {
        return [];
    }

    const annotations: Array<Partial<Annotation>> = [];

    const cwd = process.cwd();

    testResults.forEach(({ assertionResults, name: testResultFilename }) => {
        if (!assertionResults) {
            return;
        }

        annotations.push(
            ...assertionResults
                .filter(({ status }) => status === 'failed')
                .map<Annotation>(
                    ({ location, ancestorTitles, title, failureMessages }) => ({
                        annotation_level: 'failure',
                        path: relative(cwd, testResultFilename),
                        start_line: location?.line ?? 0,
                        end_line: location?.line ?? 0,
                        title: ancestorTitles?.concat(title).join(' > '),
                        message: stripAnsi(failureMessages?.join('\n\n') ?? ''),
                    })
                )
        );
    });

    return annotations.filter(
        (value): value is Annotation =>
            isValidNumber(value.start_line) && isValidNumber(value.end_line)
    );
};
