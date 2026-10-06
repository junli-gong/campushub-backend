import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint, type Linter } from 'eslint';

interface BoundaryProbe {
  filename: string;
  code: string;
  rule: string;
}

void test('ESLint rejects representative cross-layer imports and misplaced environment reads', async (): Promise<void> => {
  const eslint = new ESLint({ flags: ['unstable_native_nodejs_ts_config'] });
  const probes: BoundaryProbe[] = [
    {
      filename: 'src/controllers/resource.controller.ts',
      code: "import { ResourceModel } from '../models/Resource.model'; void ResourceModel;",
      rule: 'no-restricted-imports',
    },
    {
      filename: 'src/routes/resource.routes.ts',
      code: "import mongoose from 'mongoose'; void mongoose;",
      rule: 'no-restricted-imports',
    },
    {
      filename: 'src/services/resource.service.ts',
      code: "import type { Request } from 'express'; export interface BadInput { request: Request; }",
      rule: 'no-restricted-imports',
    },
    {
      filename: 'src/models/Resource.model.ts',
      code: "import type { Response } from 'express'; export interface BadInput { response: Response; }",
      rule: 'no-restricted-imports',
    },
    {
      filename: 'src/server.ts',
      code: "export const bad = process.env['PORT'];",
      rule: 'no-restricted-properties',
    },
  ];
  for (const probe of probes) {
    const results = await eslint.lintText(probe.code, {
      filePath: probe.filename,
    });
    assert.ok(
      results.some((result: ESLint.LintResult): boolean =>
        result.messages.some(
          (message: Linter.LintMessage): boolean =>
            message.ruleId === probe.rule,
        ),
      ),
      `${probe.filename} must reject ${probe.rule}`,
    );
  }
});
